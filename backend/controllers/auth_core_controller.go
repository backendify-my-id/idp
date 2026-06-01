package controllers

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"
	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type RegisterRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	CaptchaToken string `json:"captcha_token"`
}

type VerifyEmailRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

type ResendOtpRequest struct {
	Email string `json:"email"`
}

type LoginRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	CaptchaToken string `json:"captcha_token"`
}

func (c *AuthController) Register(ctx *fiber.Ctx) error {
	var req RegisterRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	// Verify Silent Captcha (Turnstile) if secret key is configured in env
	validCaptcha, errCaptcha := c.authService.VerifyCaptcha(req.CaptchaToken, "register")
	if errCaptcha != nil || !validCaptcha {
		auditLog(ctx, "REGISTER_FAILED_CAPTCHA", req.Email, "", "")
		return utils.SendError(ctx, fiber.StatusBadRequest, "Captcha verification failed. Please try again.")
	}

	if !utils.IsValidEmail(req.Email) {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid email format")
	}

	if !utils.IsValidPassword(req.Password) {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Password must be at least 8 characters and contain upper, lower, number, and special character")
	}

	user, err := c.authService.RegisterUser(req.Email, req.Password)
	if err != nil {
		if err.Error() == "email already registered" {
			auditLog(ctx, "REGISTER_FAILED_DUPLICATE", req.Email, "", "")
			return utils.SendError(ctx, fiber.StatusConflict, "Email is already registered")
		}
		auditLog(ctx, "REGISTER_FAILED", req.Email, "", err.Error())
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to register user")
	}

	// Trigger OTP generation and email dispatch
	_, _ = c.authService.SendVerificationOTP(req.Email)

	auditLog(ctx, "REGISTER_SUCCESS", req.Email, user.ID.String(), "")

	return utils.SendSuccess(ctx, fiber.StatusCreated, "User registered successfully. Please verify your email.", fiber.Map{
		"user_id": user.ID,
		"email":   user.Email,
	})
}

func (c *AuthController) VerifyEmail(ctx *fiber.Ctx) error {
	var req VerifyEmailRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Email == "" || req.OTP == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email and OTP are required")
	}

	success, err := c.authService.VerifyOTP(req.Email, req.OTP)
	if err != nil || !success {
		auditLog(ctx, "EMAIL_VERIFY_FAILED", req.Email, "", err.Error())
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "EMAIL_VERIFY_SUCCESS", req.Email, "", "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "Email verified successfully. You can now sign in.", nil)
}

func (c *AuthController) ResendOTP(ctx *fiber.Ctx) error {
	var req ResendOtpRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Email == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email is required")
	}

	// Check if user exists and is unverified
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		auditLog(ctx, "RESEND_OTP_EMAIL_NOT_FOUND", req.Email, "", "")
		return utils.SendSuccess(ctx, fiber.StatusOK, "If your email is registered and unverified, a new verification code has been sent.", nil)
	}

	if user.IsEmailVerified {
		auditLog(ctx, "RESEND_OTP_ALREADY_VERIFIED", req.Email, user.ID.String(), "")
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email is already verified. You can log in directly.")
	}

	// Send new OTP
	_, err := c.authService.SendVerificationOTP(req.Email)
	if err != nil {
		auditLog(ctx, "RESEND_OTP_FAILED", req.Email, user.ID.String(), err.Error())
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to send verification code")
	}

	auditLog(ctx, "RESEND_OTP_SUCCESS", req.Email, user.ID.String(), "")
	return utils.SendSuccess(ctx, fiber.StatusOK, "Verification code resent successfully. Please check your email.", nil)
}

func (c *AuthController) Login(ctx *fiber.Ctx) error {
	var req LoginRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	// Verify Silent Captcha (Turnstile) if secret key is configured in env
	validCaptcha, errCaptcha := c.authService.VerifyCaptcha(req.CaptchaToken, "login")
	if errCaptcha != nil || !validCaptcha {
		auditLog(ctx, "LOGIN_FAILED_CAPTCHA", req.Email, "", "")
		return utils.SendError(ctx, fiber.StatusBadRequest, "Captcha verification failed. Please try again.")
	}

	// 1. Check Lockout Status with Fail-Secure handling
	attempts, err := c.authService.GetFailedLoginAttempts(req.Email)
	if err != nil {
		log.Printf("[SECURITY ALERT] Redis error during login lockout check for %s: %v. Blocking request for safety (fail-secure).", req.Email, err)
		return ctx.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"success": false,
			"message": "Authentication services are temporarily unavailable. Please try again shortly.",
		})
	}

	if attempts >= 5 {
		ttl, _ := c.authService.GetLockoutTTL(req.Email)
		minutes := int(ttl.Minutes())
		seconds := int(ttl.Seconds()) % 60

		var msg string
		if minutes > 0 {
			msg = fmt.Sprintf("Account locked due to too many failed attempts. Try again in %d minutes and %d seconds.", minutes, seconds)
		} else {
			msg = fmt.Sprintf("Account locked due to too many failed attempts. Try again in %d seconds.", seconds)
		}

		auditLog(ctx, "LOGIN_BLOCKED_LOCKOUT", req.Email, "", fmt.Sprintf("Lockout time remaining: %s", ttl.String()))
		return ctx.Status(fiber.StatusLocked).JSON(fiber.Map{
			"success":     false,
			"message":     msg,
			"retry_after": int(ttl.Seconds()),
		})
	}

	user, err := c.authService.AuthenticateUser(req.Email, req.Password)
	if err != nil {
		// Increment failed attempts
		newAttempts, _ := c.authService.IncrementFailedLoginAttempts(req.Email)
		auditLog(ctx, "LOGIN_FAILED", req.Email, "", fmt.Sprintf("Failed attempts: %d", newAttempts))
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Invalid credentials")
	}

	// 2. Check if Email is Verified
	if !user.IsEmailVerified {
		auditLog(ctx, "LOGIN_BLOCKED_UNVERIFIED", req.Email, user.ID.String(), "")
		return utils.SendError(ctx, fiber.StatusForbidden, "Please verify your email address first.")
	}

	// Reset failed attempts on success!
	_ = c.authService.ResetFailedLoginAttempts(req.Email)

	// 3. Check if MFA is enabled
	if user.MfaEnabled {
		mfaToken, err := c.authService.GenerateMfaToken(user)
		if err != nil {
			return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate MFA token")
		}
		auditLog(ctx, "LOGIN_MFA_REQUIRED", req.Email, user.ID.String(), "")
		return utils.SendSuccess(ctx, fiber.StatusOK, "MFA verification required", fiber.Map{
			"mfa_required": true,
			"mfa_token":    mfaToken,
			"email":        user.Email,
		})
	}

	refreshToken, sessionID, err := c.authService.CreateRefreshToken(user.ID, nil, ctx.IP(), ctx.Get("User-Agent"))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate refresh token")
	}

	token, err := c.authService.GenerateToken(user, "", sessionID)
	if err != nil {
		config.DB.Where("id = ?", sessionID).Delete(&models.RefreshToken{})
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate token")
	}

	// Also set cookie for easier OIDC web-redirection flow!
	ctx.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    token,
		Expires:  time.Now().Add(time.Hour * 1),
		HTTPOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: "Lax",
	})

	auditLog(ctx, "LOGIN_SUCCESS", req.Email, user.ID.String(), "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "Login successful", fiber.Map{
		"access_token":  token,
		"refresh_token": refreshToken,
	})
}

func (c *AuthController) Logout(ctx *fiber.Ctx) error {
	// Extract active token from Authorization header or cookie
	var tokenStr string
	authHeader := ctx.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenStr = parts[1]
		}
	}
	if tokenStr == "" {
		tokenStr = ctx.Cookies("jwt")
	}

	if tokenStr != "" {
		// Invalidate active stateless JWT by adding its jti to the Redis blacklist
		secret := os.Getenv("APP_SECRET")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err == nil && token.Valid {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if jti, ok := claims["jti"].(string); ok && jti != "" {
					if expVal, ok := claims["exp"].(float64); ok {
						remaining := time.Unix(int64(expVal), 0).Sub(time.Now())
						if remaining > 0 {
							redisCtx := context.Background()
							config.RedisClient.Set(redisCtx, "blacklist:jwt:"+jti, "1", remaining)
						}
					}
				}
			}
		}
	}

	ctx.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   false,
		SameSite: "Lax",
	})

	auditLog(ctx, "USER_LOGOUT_SUCCESS", "", "", "")
	return utils.SendSuccess(ctx, fiber.StatusOK, "Logged out successfully from session", nil)
}
