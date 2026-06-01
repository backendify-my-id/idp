package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"

	"github.com/google/uuid"
)

type CachedSession struct {
	TokenHash string    `json:"token_hash"`
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	ClientID  *string   `json:"client_id,omitempty"`
	UserAgent string    `json:"user_agent"`
	IpAddress string    `json:"ip_address"`
	ExpiresAt time.Time `json:"expires_at"`
	Revoked   bool      `json:"revoked"`
}

func (s *AuthService) CreateRefreshToken(userID uuid.UUID, clientID *uuid.UUID, ipAddress, userAgent string) (string, string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", err
	}
	rawToken := hex.EncodeToString(bytes)

	hash := sha256.Sum256([]byte(rawToken))
	hashedToken := hex.EncodeToString(hash[:])

	refreshToken := models.RefreshToken{
		TokenHash: hashedToken,
		UserID:    userID,
		ClientID:  clientID,
		IpAddress: ipAddress,
		UserAgent: userAgent,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days expiration
	}

	// Persist to GORM database for permanent audit log
	if err := config.DB.Create(&refreshToken).Error; err != nil {
		return "", "", err
	}

	// Fetch user email to cache along with session for stateless JWT generation compatibility
	var user models.User
	if err := config.DB.Select("email").Where("id = ?", userID).First(&user).Error; err != nil {
		return rawToken, refreshToken.ID.String(), nil // Fail gracefully back to GORM-only, do not block login
	}

	var clientIDStr *string
	if clientID != nil {
		str := clientID.String()
		clientIDStr = &str
	}

	cachedSession := CachedSession{
		TokenHash: hashedToken,
		UserID:    userID.String(),
		Email:     user.Email,
		ClientID:  clientIDStr,
		UserAgent: userAgent,
		IpAddress: ipAddress,
		ExpiresAt: refreshToken.ExpiresAt,
		Revoked:   false,
	}

	// Cache in Redis with 7-day TTL matching DB expiration to avoid relational db read/write cycles
	ctx := context.Background()
	sessionJSON, err := json.Marshal(cachedSession)
	if err == nil {
		config.RedisClient.Set(ctx, "session:refresh_token:"+hashedToken, sessionJSON, 7*24*time.Hour)
	}

	return rawToken, refreshToken.ID.String(), nil
}

func (s *AuthService) RefreshAccessToken(rawRefreshToken string, ipAddress, userAgent string) (string, string, error) {
	hash := sha256.Sum256([]byte(rawRefreshToken))
	hashedToken := hex.EncodeToString(hash[:])

	var cached CachedSession
	var user models.User
	ctx := context.Background()
	cacheHit := false

	// 1. Try fetching from high-performance Redis cache
	sessionJSON, err := config.RedisClient.Get(ctx, "session:refresh_token:"+hashedToken).Result()
	if err == nil {
		if errUnmarshal := json.Unmarshal([]byte(sessionJSON), &cached); errUnmarshal == nil {
			cacheHit = true
		}
	}

	if cacheHit {
		// Verify if user is still active in Postgres database (protects against stale/banned tokens)
		if errUser := config.DB.Select("id", "email", "status").Where("id = ?", cached.UserID).First(&user).Error; errUser != nil || user.Status != "active" {
			config.RedisClient.Del(ctx, "session:refresh_token:"+hashedToken)
			return "", "", errors.New("user account is inactive, suspended, or deleted")
		}

		// Token Reuse Detection
		if cached.Revoked {
			// Purge all user's sessions from GORM as immediate security response, and blacklist them in Redis
			var sessions []models.RefreshToken
			if errSess := config.DB.Where("user_id = ?", user.ID).Find(&sessions).Error; errSess == nil {
				for _, sess := range sessions {
					config.RedisClient.Del(ctx, "session:refresh_token:"+sess.TokenHash)
					config.RedisClient.Set(ctx, "session:revoked:"+sess.ID.String(), "1", time.Hour)
				}
			}
			config.DB.Where("user_id = ?", user.ID).Delete(&models.RefreshToken{})
			config.RedisClient.Del(ctx, "session:refresh_token:"+hashedToken)
			return "", "", errors.New("refresh token reuse detected. all active sessions revoked for security")
		}

		// Expiry verification
		if time.Now().After(cached.ExpiresAt) {
			config.DB.Where("token_hash = ?", hashedToken).Delete(&models.RefreshToken{})
			config.RedisClient.Del(ctx, "session:refresh_token:"+hashedToken)
			return "", "", errors.New("refresh token has expired")
		}
	} else {
		// 2. Cache Miss: Fall back to PostgreSQL relational database query
		var storedToken models.RefreshToken
		if errDb := config.DB.Preload("User").Where("token_hash = ?", hashedToken).First(&storedToken).Error; errDb != nil {
			return "", "", errors.New("invalid or expired refresh token")
		}

		user = storedToken.User
		cached = CachedSession{
			TokenHash: storedToken.TokenHash,
			UserID:    storedToken.UserID.String(),
			Email:     user.Email,
			ExpiresAt: storedToken.ExpiresAt,
			Revoked:   storedToken.Revoked,
		}

		if user.Status != "active" {
			return "", "", errors.New("user account is inactive, suspended, or deleted")
		}

		// Token Reuse Detection
		if storedToken.Revoked {
			var sessions []models.RefreshToken
			if errSess := config.DB.Where("user_id = ?", storedToken.UserID).Find(&sessions).Error; errSess == nil {
				for _, sess := range sessions {
					config.RedisClient.Del(ctx, "session:refresh_token:"+sess.TokenHash)
					config.RedisClient.Set(ctx, "session:revoked:"+sess.ID.String(), "1", time.Hour)
				}
			}
			config.DB.Where("user_id = ?", storedToken.UserID).Delete(&models.RefreshToken{})
			return "", "", errors.New("refresh token reuse detected. all active sessions revoked for security")
		}

		if time.Now().After(storedToken.ExpiresAt) {
			config.DB.Delete(&storedToken)
			return "", "", errors.New("refresh token has expired")
		}
	}

	// 3. Generate rotated refresh token first to retrieve sessionID for access token binding
	var clientID *uuid.UUID
	if cached.ClientID != nil {
		if parsed, errParse := uuid.Parse(*cached.ClientID); errParse == nil {
			clientID = &parsed
		}
	}

	userID, _ := uuid.Parse(cached.UserID)
	newRawRefreshToken, sessionID, err := s.CreateRefreshToken(userID, clientID, ipAddress, userAgent)
	if err != nil {
		return "", "", err
	}

	newAccessToken, err := s.GenerateToken(&user, "", sessionID)
	if err != nil {
		// Clean up the created refresh token if access token generation fails
		config.DB.Where("id = ?", sessionID).Delete(&models.RefreshToken{})
		return "", "", err
	}

	// 4. Mark old token as revoked in Postgres database
	config.DB.Model(&models.RefreshToken{}).Where("token_hash = ?", hashedToken).Update("revoked", true)

	// 5. Invalidate old token in Redis cache immediately
	config.RedisClient.Del(ctx, "session:refresh_token:"+hashedToken)

	return newAccessToken, newRawRefreshToken, nil
}

func (s *AuthService) GetUserSessions(userID uuid.UUID) ([]models.RefreshToken, error) {
	var sessions []models.RefreshToken
	// Preload Client relation if ClientID is present
	err := config.DB.Preload("Client").Where("user_id = ? AND revoked = ?", userID, false).Order("created_at desc").Find(&sessions).Error
	return sessions, err
}

func (s *AuthService) RevokeSession(userID uuid.UUID, sessionID uuid.UUID) error {
	var storedToken models.RefreshToken
	if err := config.DB.Where("id = ? AND user_id = ?", sessionID, userID).First(&storedToken).Error; err != nil {
		return err
	}

	// Mark revoked in GORM
	if err := config.DB.Model(&storedToken).Update("revoked", true).Error; err != nil {
		return err
	}

	// Invalidate in Redis cache
	ctx := context.Background()
	config.RedisClient.Del(ctx, "session:refresh_token:"+storedToken.TokenHash)

	// Blacklist the session ID in Redis to instantly invalidate existing access tokens
	config.RedisClient.Set(ctx, "session:revoked:"+sessionID.String(), "1", time.Hour)

	return nil
}

func (s *AuthService) RevokeAllOtherSessions(userID uuid.UUID, currentTokenHash string) error {
	var sessions []models.RefreshToken
	if err := config.DB.Where("user_id = ? AND token_hash != ?", userID, currentTokenHash).Find(&sessions).Error; err == nil {
		ctx := context.Background()
		for _, sess := range sessions {
			config.RedisClient.Del(ctx, "session:refresh_token:"+sess.TokenHash)
			config.RedisClient.Set(ctx, "session:revoked:"+sess.ID.String(), "1", time.Hour)
		}
	}
	return config.DB.Model(&models.RefreshToken{}).Where("user_id = ? AND token_hash != ?", userID, currentTokenHash).Update("revoked", true).Error
}
