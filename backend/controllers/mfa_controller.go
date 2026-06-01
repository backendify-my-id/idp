package controllers

import (
	"os"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"
	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type MfaCodeRequest struct {
	Code string `json:"code"`
}

type MfaLoginRequest struct {
	MfaToken string `json:"mfa_token"`
	Code     string `json:"code"`
}

func (c *AuthController) SetupMfa(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	email := getLocalString(ctx, "email")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	secret, url, err := c.authService.GenerateMfaSetup(userID, email)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "MFA setup initiated successfully", fiber.Map{
		"secret": secret,
		"url":    url,
	})
}

func (c *AuthController) EnableMfa(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req MfaCodeRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Code == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Verification code is required")
	}

	success, err := c.authService.EnableMfa(userID, req.Code)
	if err != nil || !success {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	// Generate emergency MFA backup codes
	parsedUserID, errParse := uuid.Parse(userID)
	var backupCodes []string
	if errParse == nil {
		backupCodes, _ = c.authService.GenerateBackupCodes(parsedUserID)
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Multi-Factor Authentication enabled successfully. Please record your emergency backup codes.", fiber.Map{
		"backup_codes": backupCodes,
	})
}

func (c *AuthController) DisableMfa(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req MfaCodeRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Code == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Verification code is required")
	}

	success, err := c.authService.DisableMfa(userID, req.Code)
	if err != nil || !success {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Multi-Factor Authentication disabled successfully", nil)
}

func (c *AuthController) VerifyMfaLogin(ctx *fiber.Ctx) error {
	var req MfaLoginRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.MfaToken == "" || req.Code == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "MFA token and verification code are required")
	}

	// Validate MFA Token
	secret := os.Getenv("APP_SECRET")
	token, err := jwt.Parse(req.MfaToken, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		auditLog(ctx, "MFA_LOGIN_FAILED_EXPIRED_TOKEN", "", "", "")
		return utils.SendError(ctx, fiber.StatusUnauthorized, "MFA session expired or invalid")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["mfa_pending"] != true {
		auditLog(ctx, "MFA_LOGIN_FAILED_INVALID_TOKEN", "", "", "")
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Invalid MFA token claims")
	}

	userIDStr := claims["sub"].(string)

	// Validate TOTP code, fallback to emergency backup codes if standard TOTP verification fails
	success, err := c.authService.VerifyMfaCode(userIDStr, req.Code)
	if err != nil || !success {
		parsedUserID, errParse := uuid.Parse(userIDStr)
		backupSuccess := false
		if errParse == nil {
			var errBackup error
			backupSuccess, errBackup = c.authService.VerifyBackupCode(parsedUserID, req.Code)
			if errBackup != nil {
				backupSuccess = false
			}
		}

		if !backupSuccess {
			auditLog(ctx, "MFA_LOGIN_FAILED_WRONG_CODE", "", userIDStr, "")
			return utils.SendError(ctx, fiber.StatusUnauthorized, "Incorrect verification code or backup code")
		}
		auditLog(ctx, "MFA_LOGIN_SUCCESS_VIA_BACKUP_CODE", "", userIDStr, "")
	}

	// Code is valid! Get User and generate final JWT tokens
	var user models.User
	if err := config.DB.Where("id = ?", userIDStr).First(&user).Error; err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "User not found")
	}

	refreshToken, sessionID, err := c.authService.CreateRefreshToken(user.ID, nil, ctx.IP(), ctx.Get("User-Agent"))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate refresh token")
	}

	finalToken, err := c.authService.GenerateToken(&user, "", sessionID)
	if err != nil {
		config.DB.Where("id = ?", sessionID).Delete(&models.RefreshToken{})
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate token")
	}

	// Also set cookie
	ctx.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    finalToken,
		Expires:  time.Now().Add(time.Hour * 1),
		HTTPOnly: true,
		Secure:   false,
		SameSite: "Lax",
	})

	auditLog(ctx, "MFA_LOGIN_SUCCESS", user.Email, user.ID.String(), "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "Login successful", fiber.Map{
		"access_token":  finalToken,
		"refresh_token": refreshToken,
	})
}
