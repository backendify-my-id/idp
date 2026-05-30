package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"
	"backendify_idp/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct{}

func NewAuthService() *AuthService {
	return &AuthService{}
}

func (s *AuthService) RegisterUser(email, password string) (*models.User, error) {
	// Check if user already exists
	var count int64
	config.DB.Model(&models.User{}).Where("email = ?", email).Count(&count)
	if count > 0 {
		return nil, errors.New("email already registered")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Profile: models.Profile{
			FullName:  "",
			AvatarUrl: "",
			Bio:       "",
		},
	}

	result := config.DB.Create(user)
	if result.Error != nil {
		return nil, result.Error
	}

	// Assign default "user" role
	var role models.Role
	if err := config.DB.Where("role_name = ?", "user").First(&role).Error; err == nil {
		userRole := models.UserRole{
			UserID: user.ID,
			RoleID: role.ID,
		}
		config.DB.Create(&userRole)
	}

	return user, nil
}

func (s *AuthService) AuthenticateUser(email, password string) (*models.User, error) {
	var user models.User
	result := config.DB.Where("email = ?", email).First(&user)
	if result.Error != nil {
		return nil, errors.New("invalid email or password")
	}

	if user.Status != "active" {
		return nil, fmt.Errorf("account status is '%s'. please contact support", user.Status)
	}

	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	return &user, nil
}

func (s *AuthService) GetUserRoles(userID uuid.UUID) ([]string, error) {
	var userRoles []models.UserRole
	if err := config.DB.Where("user_id = ?", userID).Find(&userRoles).Error; err != nil {
		return nil, err
	}

	var roleIDs []int
	for _, ur := range userRoles {
		roleIDs = append(roleIDs, ur.RoleID)
	}

	if len(roleIDs) == 0 {
		return []string{}, nil
	}

	var roles []models.Role
	if err := config.DB.Where("id IN ?", roleIDs).Find(&roles).Error; err != nil {
		return nil, err
	}

	var roleNames []string
	for _, r := range roles {
		roleNames = append(roleNames, r.RoleName)
	}

	return roleNames, nil
}

func (s *AuthService) GenerateToken(user *models.User, scope string) (string, error) {
	roles, err := s.GetUserRoles(user.ID)
	if err != nil {
		roles = []string{"user"}
	}

	// Only include roles in claims if the "roles" or "groups" scope is requested,
	// OR if this is an internal token request (no scope provided) to maintain compatibility.
	hasRolesScope := false
	if scope == "" {
		hasRolesScope = true
	} else {
		scopes := strings.Split(scope, " ")
		for _, sc := range scopes {
			if sc == "roles" || sc == "groups" {
				hasRolesScope = true
				break
			}
		}
	}

	claims := jwt.MapClaims{
		"sub":   user.ID.String(),
		"email": user.Email,
		"exp":   time.Now().Add(time.Hour * 1).Unix(), // 1 hour expiration
	}

	if hasRolesScope {
		claims["roles"] = roles
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("APP_SECRET")
	
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return t, nil
}

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
	if method == "plain" || method == "" {
		return verifier == challenge
	}
	if method == "S256" {
		hash := sha256.Sum256([]byte(verifier))
		calculatedChallenge := base64.RawURLEncoding.EncodeToString(hash[:])
		return calculatedChallenge == challenge
	}
	return false
}

func (s *AuthService) SendVerificationOTP(email string) (string, error) {
	otp, err := utils.GenerateOTP(6)
	if err != nil {
		return "", err
	}

	ctx := context.Background()
	err = config.RedisClient.Set(ctx, "otp:"+email, otp, 5*time.Minute).Err()
	if err != nil {
		return "", err
	}

	// Print to console for development ease
	log.Printf("[DEV] Verification OTP for %s: %s", email, otp)

	// Try sending SMTP email (do not block flow if SMTP fails)
	go func() {
		subject := "Verify Your Backendify IdP Account"
		body := fmt.Sprintf("Hello,\n\nThank you for registering at Backendify Identity Provider.\nYour account verification code is: %s\n\nThis code will expire in 5 minutes.\n\nRegards,\nBackendify Team", otp)
		err := utils.SendEmail(email, subject, body)
		if err != nil {
			log.Printf("Warning: Failed to send SMTP email: %v", err)
		} else {
			log.Printf("Verification email sent to %s successfully.", email)
		}
	}()

	return otp, nil
}

func (s *AuthService) VerifyOTP(email string, otp string) (bool, error) {
	ctx := context.Background()
	storedOTP, err := config.RedisClient.Get(ctx, "otp:"+email).Result()
	if err != nil {
		return false, errors.New("OTP expired or invalid")
	}

	if storedOTP != otp {
		return false, errors.New("incorrect OTP code")
	}

	// Delete OTP from Redis
	config.RedisClient.Del(ctx, "otp:"+email)

	// Update user in DB
	result := config.DB.Model(&models.User{}).Where("email = ?", email).Update("is_email_verified", true)
	if result.Error != nil {
		return false, result.Error
	}

	return true, nil
}

func (s *AuthService) GetUserProfile(userIDStr string) (*models.Profile, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	var profile models.Profile
	err = config.DB.Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		// If profile doesn't exist, create a default one for backward compatibility!
		var user models.User
		if dbErr := config.DB.Where("id = ?", userID).First(&user).Error; dbErr == nil {
			profile = models.Profile{
				UserID:    userID,
				FullName:  "",
				AvatarUrl: "",
				Bio:       "",
			}
			config.DB.Create(&profile)
			return &profile, nil
		}
		return nil, errors.New("profile not found")
	}

	return &profile, nil
}

func (s *AuthService) UpdateUserProfile(userIDStr string, fullName string, avatarURL string, bio string) (*models.Profile, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	var profile models.Profile
	err = config.DB.Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		// Create it if not exists
		profile = models.Profile{
			UserID:    userID,
			FullName:  fullName,
			AvatarUrl: avatarURL,
			Bio:       bio,
		}
		if dbErr := config.DB.Create(&profile).Error; dbErr != nil {
			return nil, dbErr
		}
		return &profile, nil
	}

	profile.FullName = fullName
	profile.AvatarUrl = avatarURL
	profile.Bio = bio

	if dbErr := config.DB.Save(&profile).Error; dbErr != nil {
		return nil, dbErr
	}

	return &profile, nil
}

func (s *AuthService) GenerateMfaSetup(userIDStr string, email string) (string, string, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return "", "", errors.New("invalid user ID")
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Backendify",
		AccountName: email,
	})
	if err != nil {
		return "", "", err
	}

	// Save temporary secret to user record in DB
	err = config.DB.Model(&models.User{}).Where("id = ?", userID).Update("mfa_secret", key.Secret()).Error
	if err != nil {
		return "", "", err
	}

	return key.Secret(), key.URL(), nil
}

func (s *AuthService) EnableMfa(userIDStr string, code string) (bool, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	if user.MfaSecret == "" {
		return false, errors.New("MFA setup has not been initiated")
	}

	// Validate code
	valid := totp.Validate(code, user.MfaSecret)
	if !valid {
		return false, errors.New("invalid verification code")
	}

	// Update DB to enable MFA
	err = config.DB.Model(&user).Updates(map[string]interface{}{
		"mfa_enabled": true,
	}).Error
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *AuthService) DisableMfa(userIDStr string, code string) (bool, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	// Validate code against secret
	valid := totp.Validate(code, user.MfaSecret)
	if !valid {
		return false, errors.New("invalid verification code")
	}

	// Disable MFA and clear secret
	err = config.DB.Model(&user).Updates(map[string]interface{}{
		"mfa_enabled": false,
		"mfa_secret":  "",
	}).Error
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *AuthService) VerifyMfaCode(userIDStr string, code string) (bool, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	valid := totp.Validate(code, user.MfaSecret)
	if !valid {
		return false, errors.New("invalid verification code")
	}

	return true, nil
}

func (s *AuthService) GenerateMfaToken(user *models.User) (string, error) {
	// Generates a temporary MFA verification token valid for 3 minutes
	claims := jwt.MapClaims{
		"sub":         user.ID.String(),
		"email":       user.Email,
		"mfa_pending": true,
		"exp":         time.Now().Add(time.Minute * 3).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("APP_SECRET")
	
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return t, nil
}

func (s *AuthService) GetFailedLoginAttempts(email string) (int64, error) {
	ctx := context.Background()
	val, err := config.RedisClient.Get(ctx, "failed_logins:"+email).Int64()
	if err != nil {
		return 0, nil // key doesn't exist
	}
	return val, nil
}

func (s *AuthService) GetLockoutTTL(email string) (time.Duration, error) {
	ctx := context.Background()
	ttl, err := config.RedisClient.TTL(ctx, "failed_logins:"+email).Result()
	if err != nil {
		return 0, err
	}
	return ttl, nil
}

func (s *AuthService) IncrementFailedLoginAttempts(email string) (int64, error) {
	ctx := context.Background()
	key := "failed_logins:" + email
	val, err := config.RedisClient.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	// Set 15 minutes TTL if it's a new lockout tracker
	if val == 1 {
		config.RedisClient.Expire(ctx, key, 15*time.Minute)
	}
	return val, nil
}

func (s *AuthService) ResetFailedLoginAttempts(email string) error {
	ctx := context.Background()
	return config.RedisClient.Del(ctx, "failed_logins:"+email).Err()
}

func (s *AuthService) SendPasswordResetOTP(email string) (string, error) {
	otp, err := utils.GenerateOTP(6)
	if err != nil {
		return "", err
	}

	ctx := context.Background()
	err = config.RedisClient.Set(ctx, "pwd_reset:"+email, otp, 15*time.Minute).Err()
	if err != nil {
		return "", err
	}

	log.Printf("[DEV] Password reset OTP for %s: %s", email, otp)

	go func() {
		subject := "Backendify IdP - Password Reset Code"
		body := fmt.Sprintf(
			"Hello,\n\nYour password reset verification code is: %s\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nBackendify Team",
			otp,
		)
		if err := utils.SendEmail(email, subject, body); err != nil {
			log.Printf("Warning: Failed to send password reset email: %v", err)
		}
	}()

	return otp, nil
}

func (s *AuthService) ResetPassword(email, otp, newPassword string) error {
	ctx := context.Background()

	storedOTP, err := config.RedisClient.Get(ctx, "pwd_reset:"+email).Result()
	if err != nil {
		return errors.New("reset code has expired or is invalid")
	}

	if storedOTP != otp {
		return errors.New("incorrect reset code")
	}

	// Invalidate the OTP immediately after use
	config.RedisClient.Del(ctx, "pwd_reset:"+email)

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	result := config.DB.Model(&models.User{}).Where("email = ?", email).Update("password_hash", string(hashedPassword))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}

	return nil
}

func (s *AuthService) CreateRefreshToken(userID uuid.UUID, clientID *uuid.UUID, ipAddress, userAgent string) (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
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

	if err := config.DB.Create(&refreshToken).Error; err != nil {
		return "", err
	}

	return rawToken, nil
}

func (s *AuthService) RefreshAccessToken(rawRefreshToken string, ipAddress, userAgent string) (string, string, error) {
	hash := sha256.Sum256([]byte(rawRefreshToken))
	hashedToken := hex.EncodeToString(hash[:])

	var storedToken models.RefreshToken
	if err := config.DB.Preload("User").Where("token_hash = ?", hashedToken).First(&storedToken).Error; err != nil {
		return "", "", errors.New("invalid or expired refresh token")
	}

	if time.Now().After(storedToken.ExpiresAt) {
		config.DB.Delete(&storedToken)
		return "", "", errors.New("refresh token has expired")
	}

	newAccessToken, err := s.GenerateToken(&storedToken.User, "")
	if err != nil {
		return "", "", err
	}

	newRawRefreshToken, err := s.CreateRefreshToken(storedToken.UserID, storedToken.ClientID, ipAddress, userAgent)
	if err != nil {
		return "", "", err
	}

	config.DB.Delete(&storedToken)

	return newAccessToken, newRawRefreshToken, nil
}

type ClientDTO struct {
	ID             string   `json:"id"`
	AppClientID    string   `json:"client_id"`
	ClientName     string   `json:"client_name"`
	IsPkceRequired bool     `json:"is_pkce_required"`
	RedirectURLs   []string `json:"redirect_urls"`
	CreatedAt      string   `json:"created_at"`
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

	result := config.DB.Delete(&models.Client{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("client not found")
	}

	return nil
}

type AdminUserDTO struct {
	ID              string   `json:"id"`
	Email           string   `json:"email"`
	FullName        string   `json:"full_name"`
	AvatarUrl       string   `json:"avatar_url"`
	Status          string   `json:"status"`
	IsEmailVerified bool     `json:"is_email_verified"`
	MfaEnabled      bool     `json:"mfa_enabled"`
	Roles           []string `json:"roles"`
	CreatedAt       string   `json:"created_at"`
}

func (s *AuthService) GetUsers() ([]AdminUserDTO, error) {
	var users []models.User
	if err := config.DB.Preload("Profile").Order("created_at desc").Find(&users).Error; err != nil {
		return nil, err
	}

	var dtos []AdminUserDTO
	for _, u := range users {
		roles, err := s.GetUserRoles(u.ID)
		if err != nil {
			roles = []string{"user"}
		}

		dtos = append(dtos, AdminUserDTO{
			ID:              u.ID.String(),
			Email:           u.Email,
			FullName:        u.Profile.FullName,
			AvatarUrl:       u.Profile.AvatarUrl,
			Status:          u.Status,
			IsEmailVerified: u.IsEmailVerified,
			MfaEnabled:      u.MfaEnabled,
			Roles:           roles,
			CreatedAt:       u.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return dtos, nil
}

func (s *AuthService) UpdateUserRole(userIDStr string, roleName string, assign bool) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	var role models.Role
	if err := config.DB.Where("role_name = ?", roleName).First(&role).Error; err != nil {
		return errors.New("role not found")
	}

	if assign {
		var count int64
		config.DB.Model(&models.UserRole{}).Where("user_id = ? AND role_id = ?", userID, role.ID).Count(&count)
		if count == 0 {
			userRole := models.UserRole{
				UserID: userID,
				RoleID: role.ID,
			}
			return config.DB.Create(&userRole).Error
		}
	} else {
		return config.DB.Where("user_id = ? AND role_id = ?", userID, role.ID).Delete(&models.UserRole{}).Error
	}

	return nil
}

func (s *AuthService) UpdateUserStatus(userIDStr string, status string) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	if status != "active" && status != "banned" && status != "suspended" {
		return errors.New("invalid status value")
	}

	result := config.DB.Model(&models.User{}).Where("id = ?", userID).Update("status", status)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}

	return nil
}



