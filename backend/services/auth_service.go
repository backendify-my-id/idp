package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"
	"backendify_idp/utils"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct{}

func NewAuthService() *AuthService {
	return &AuthService{}
}

type ClientDTO struct {
	ID             string   `json:"id"`
	AppClientID    string   `json:"client_id"`
	ClientName     string   `json:"client_name"`
	IsPkceRequired bool     `json:"is_pkce_required"`
	RedirectURLs   []string `json:"redirect_urls"`
	CreatedAt      string   `json:"created_at"`
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

func (s *AuthService) GenerateToken(user *models.User, scope string, sessionID string) (string, error) {
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
		"jti":   uuid.New().String(),
		"exp":   time.Now().Add(time.Hour * 1).Unix(), // 1 hour expiration
	}

	if sessionID != "" {
		claims["sid"] = sessionID
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

	// Update user in DB first
	result := config.DB.Model(&models.User{}).Where("email = ?", email).Update("is_email_verified", true)
	if result.Error != nil {
		return false, result.Error
	}

	// Delete OTP from Redis after successful DB write
	config.RedisClient.Del(ctx, "otp:"+email)

	return true, nil
}

func (s *AuthService) GetFailedLoginAttempts(email string) (int64, error) {
	ctx := context.Background()
	val, err := config.RedisClient.Get(ctx, "failed_logins:"+email).Int64()
	if err != nil {
		if err.Error() == "redis: nil" {
			return 0, nil
		}
		return 0, err
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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update password and implicitly verify email in DB first
	result := config.DB.Model(&models.User{}).Where("email = ?", email).Updates(map[string]interface{}{
		"password_hash":     string(hashedPassword),
		"is_email_verified": true,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}

	// Invalidate the OTP immediately after successful DB write
	config.RedisClient.Del(ctx, "pwd_reset:"+email)

	return nil
}

func (s *AuthService) VerifyCaptcha(token string, expectedAction string) (bool, error) {
	secretKey := os.Getenv("TURNSTILE_SECRET_KEY")
	if secretKey == "" {
		// Silent Captcha skipped/disabled in development environment
		return true, nil
	}

	// Hit Cloudflare Turnstile API endpoint
	apiURL := "https://challenges.cloudflare.com/turnstile/v0/siteverify"
	resp, err := http.PostForm(apiURL, url.Values{
		"secret":   {secretKey},
		"response": {token},
	})
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	var result struct {
		Success  bool     `json:"success"`
		Hostname string   `json:"hostname"`
		Action   string   `json:"action"`
		Errors   []string `json:"error-codes"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}

	if result.Success {
		// Verify that the hostname matches our registered domain to prevent cross-domain token reuse!
		allowedHostname := os.Getenv("APP_HOSTNAME")
		if allowedHostname != "" && result.Hostname != allowedHostname {
			log.Printf("[SECURITY WARNING] Turnstile Hostname mismatch: expected %s, got %s", allowedHostname, result.Hostname)
			return false, errors.New("hostname mismatch")
		}

		// Verify action to prevent cross-action token reuse
		if expectedAction != "" && result.Action != "" && result.Action != expectedAction {
			log.Printf("[SECURITY WARNING] Turnstile Action mismatch: expected %s, got %s", expectedAction, result.Action)
			return false, errors.New("action mismatch")
		}
	}

	return result.Success, nil
}
