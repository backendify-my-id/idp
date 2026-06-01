package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func (s *AuthService) ValidateClient(clientID string, redirectURI string) (*models.Client, error) {
	var client models.Client
	result := config.DB.Where("client_id = ?", clientID).First(&client)
	if result.Error != nil {
		return nil, errors.New("client not found")
	}

	var redirectUrl models.ClientRedirectUrl
	result = config.DB.Where("client_id = ? AND url = ?", client.ID, redirectURI).First(&redirectUrl)
	if result.Error != nil {
		return nil, errors.New("redirect URI not registered for this client")
	}

	return &client, nil
}

func (s *AuthService) CreateAuthorizationCode(userID uuid.UUID, clientID uuid.UUID, codeChallenge string, codeChallengeMethod string, scope string) (string, error) {
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	code := hex.EncodeToString(bytes)

	authCode := models.AuthorizationCode{
		Code:                code,
		UserID:              userID,
		ClientID:            clientID,
		CodeChallenge:       codeChallenge,
		CodeChallengeMethod: codeChallengeMethod,
		Scope:               scope,
		ExpiresAt:           time.Now().Add(5 * time.Minute), // 5 min expiration
	}

	if err := config.DB.Create(&authCode).Error; err != nil {
		return "", err
	}

	return code, nil
}

func (s *AuthService) ExchangeCode(clientID string, clientSecret string, code string, codeVerifier string, redirectURI string) (*models.User, *models.Client, string, error) {
	var authCode models.AuthorizationCode
	// Preload User and Client relations
	if err := config.DB.Preload("User").Preload("Client").Where("code = ?", code).First(&authCode).Error; err != nil {
		return nil, nil, "", errors.New("invalid authorization code")
	}

	// Delete the code after one-time usage as per OAuth2 spec!
	config.DB.Delete(&authCode)

	// Verify if expired
	if time.Now().After(authCode.ExpiresAt) {
		return nil, nil, "", errors.New("authorization code expired")
	}

	// Verify ClientID matches
	if authCode.Client.AppClientID != clientID {
		return nil, nil, "", errors.New("client ID mismatch")
	}

	// If PKCE is required
	if authCode.Client.IsPkceRequired {
		if codeVerifier == "" {
			return nil, nil, "", errors.New("code_verifier is required for PKCE")
		}
		// Verify PKCE
		if !verifyPKCE(codeVerifier, authCode.CodeChallenge, authCode.CodeChallengeMethod) {
			return nil, nil, "", errors.New("invalid code_verifier (PKCE verification failed)")
		}
	} else {
		// Standard flow: verify client secret
		err := bcrypt.CompareHashAndPassword([]byte(authCode.Client.ClientSecretHash), []byte(clientSecret))
		if err != nil {
			return nil, nil, "", errors.New("invalid client secret")
		}
	}

	return &authCode.User, &authCode.Client, authCode.Scope, nil
}

func verifyPKCE(verifier, challenge, method string) bool {
	if method == "S256" {
		hash := sha256.Sum256([]byte(verifier))
		calculatedChallenge := base64.RawURLEncoding.EncodeToString(hash[:])
		return calculatedChallenge == challenge
	}
	// Strictly enforce SHA-256 (S256) PKCE flow for OAuth 2.1 compliance; reject plain challenges.
	return false
}

func (s *AuthService) GetClients() ([]ClientDTO, error) {
	var clients []models.Client
	if err := config.DB.Order("created_at desc").Find(&clients).Error; err != nil {
		return nil, err
	}

	var dtos []ClientDTO
	for _, c := range clients {
		var redirectUrls []models.ClientRedirectUrl
		config.DB.Where("client_id = ?", c.ID).Find(&redirectUrls)

		var urls []string
		for _, ru := range redirectUrls {
			urls = append(urls, ru.Url)
		}

		dtos = append(dtos, ClientDTO{
			ID:             c.ID.String(),
			AppClientID:    c.AppClientID,
			ClientName:     c.ClientName,
			IsPkceRequired: c.IsPkceRequired,
			RedirectURLs:   urls,
			CreatedAt:      c.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return dtos, nil
}

func (s *AuthService) CreateClient(name string, appClientID string, isPkceRequired bool, redirectURLs []string) (*models.Client, string, error) {
	var count int64
	config.DB.Model(&models.Client{}).Where("client_id = ?", appClientID).Count(&count)
	if count > 0 {
		return nil, "", errors.New("client ID already registered")
	}

	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return nil, "", err
	}
	rawSecret := "bcy_" + hex.EncodeToString(bytes)

	hashedSecret, err := bcrypt.GenerateFromPassword([]byte(rawSecret), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}

	client := models.Client{
		ClientName:       name,
		AppClientID:      appClientID,
		ClientSecretHash: string(hashedSecret),
		IsPkceRequired:   isPkceRequired,
	}

	if err := config.DB.Create(&client).Error; err != nil {
		return nil, "", err
	}

	for _, url := range redirectURLs {
		if url == "" {
			continue
		}
		redirectUrl := models.ClientRedirectUrl{
			ClientID: client.ID,
			Url:      url,
		}
		config.DB.Create(&redirectUrl)
	}

	return &client, rawSecret, nil
}

func (s *AuthService) DeleteClient(clientIDStr string) error {
	id, err := uuid.Parse(clientIDStr)
	if err != nil {
		return errors.New("invalid client ID")
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// 1. Explicitly purge redirect URLs to prevent orphan entries
	if err := tx.Where("client_id = ?", id).Delete(&models.ClientRedirectUrl{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 2. Explicitly purge refresh tokens linked to this client
	if err := tx.Where("client_id = ?", id).Delete(&models.RefreshToken{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 3. Delete Client
	result := tx.Delete(&models.Client{}, "id = ?", id)
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return errors.New("client not found")
	}

	return tx.Commit().Error
}
