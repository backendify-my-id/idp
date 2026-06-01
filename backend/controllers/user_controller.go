package controllers

import (
	"context"
	"fmt"
	"log"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"
	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
)

type UpdateProfileRequest struct {
	FullName  string `json:"full_name"`
	AvatarUrl string `json:"avatar_url"`
	Bio       string `json:"bio"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Email       string `json:"email"`
	OTP         string `json:"otp"`
	NewPassword string `json:"new_password"`
}

type EmailChangeRequest struct {
	NewEmail string `json:"new_email"`
}

type ConfirmEmailChangeRequest struct {
	Token string `json:"token"`
}

func (c *AuthController) GetProfile(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}
	profile, err := c.authService.GetUserProfile(userID)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusNotFound, err.Error())
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return utils.SendError(ctx, fiber.StatusNotFound, "User not found")
	}

	roles, err := c.authService.GetUserRoles(user.ID)
	if err != nil {
		roles = []string{"user"}
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Profile retrieved successfully", fiber.Map{
		"user_id":     userID,
		"profile":     profile,
		"mfa_enabled": user.MfaEnabled,
		"email":       user.Email,
		"roles":       roles,
	})
}

func (c *AuthController) UpdateProfile(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req UpdateProfileRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	profile, err := c.authService.UpdateUserProfile(userID, req.FullName, req.AvatarUrl, req.Bio)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to update profile")
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Profile updated successfully", profile)
}

func (c *AuthController) ForgotPassword(ctx *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Email == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email is required")
	}

	// Rate-limit forgot password requests by email (max 3 requests per 5 minutes per email) to prevent mail-flooding DDoS
	limitKey := "rate_limit:forgot_password:" + req.Email
	ctxVal := context.Background()
	count, err := config.RedisClient.Incr(ctxVal, limitKey).Result()
	if err == nil {
		if count == 1 {
			config.RedisClient.Expire(ctxVal, limitKey, 5*time.Minute)
		}
		if count > 3 {
			log.Printf("[SECURITY ALERT] Forgot password rate limit exceeded for email: %s, IP: %s", req.Email, ctx.IP())
			return utils.SendError(ctx, fiber.StatusTooManyRequests, "Too many password reset requests. Please try again in 5 minutes.")
		}
	}

	// Always return the same success message to prevent user enumeration
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		auditLog(ctx, "FORGOT_PASSWORD_NOT_FOUND", req.Email, "", "")
		return utils.SendSuccess(ctx, fiber.StatusOK, "If your email is registered, you will receive a reset code shortly.", nil)
	}

	if _, err := c.authService.SendPasswordResetOTP(req.Email); err != nil {
		auditLog(ctx, "FORGOT_PASSWORD_SEND_FAILED", req.Email, user.ID.String(), err.Error())
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to send reset code. Please try again.")
	}

	auditLog(ctx, "FORGOT_PASSWORD_OTP_SENT", req.Email, user.ID.String(), "")
	return utils.SendSuccess(ctx, fiber.StatusOK, "If your email is registered, you will receive a reset code shortly.", nil)
}

func (c *AuthController) ResetPassword(ctx *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Email == "" || req.OTP == "" || req.NewPassword == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email, OTP code, and new password are required")
	}

	if !utils.IsValidPassword(req.NewPassword) {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Password must be at least 8 characters and contain upper, lower, number, and special character")
	}

	if err := c.authService.ResetPassword(req.Email, req.OTP, req.NewPassword); err != nil {
		auditLog(ctx, "RESET_PASSWORD_FAILED", req.Email, "", err.Error())
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "RESET_PASSWORD_SUCCESS", req.Email, "", "")
	return utils.SendSuccess(ctx, fiber.StatusOK, "Password has been reset successfully. You can now sign in with your new password.", nil)
}

func (c *AuthController) InitiateEmailChange(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	email := getLocalString(ctx, "email")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req EmailChangeRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if !utils.IsValidEmail(req.NewEmail) {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid email format")
	}

	token, err := c.authService.InitiateEmailChange(userIDStr, email, req.NewEmail)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}

	auditLog(ctx, "INITIATE_EMAIL_CHANGE", req.NewEmail, userIDStr, fmt.Sprintf("CurrentEmail: %s", email))

	return utils.SendSuccess(ctx, fiber.StatusOK, "Verification token sent to your new email. Please verify to complete the change.", fiber.Map{
		"token": token,
	})
}

func (c *AuthController) ConfirmEmailChange(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req ConfirmEmailChangeRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Token == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Verification token is required")
	}

	if err := c.authService.ConfirmEmailChange(userIDStr, req.Token); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "CONFIRM_EMAIL_CHANGE_SUCCESS", "", userIDStr, "")
	return utils.SendSuccess(ctx, fiber.StatusOK, "Email updated successfully. Please use your new email next time you sign in.", nil)
}
