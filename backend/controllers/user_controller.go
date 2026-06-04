package controllers

import (
	"context"
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

type EmailChangeStep1VerifyRequest struct {
	OTP string `json:"otp"`
}

type EmailChangeStep2CheckRequest struct {
	TempToken string `json:"temp_token"`
	NewEmail  string `json:"new_email"`
}

type EmailChangeStep3ConfirmRequest struct {
	TempToken string `json:"temp_token"`
	OTP       string `json:"otp"`
}

type ChangePasswordStep1Request struct {
	OldPassword string `json:"old_password"`
}

type ChangePasswordStep2Request struct {
	TempToken string `json:"temp_token"`
	Code      string `json:"code"`
}

type ChangePasswordStep3Request struct {
	TempToken   string `json:"temp_token"`
	NewPassword string `json:"new_password"`
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

func (c *AuthController) InitiateEmailChangeStep1(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	otp, err := c.authService.InitiateEmailChangeStep1(userIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}

	auditLog(ctx, "INITIATE_EMAIL_CHANGE_STEP1", "", userIDStr, "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "Verification OTP sent to your current email.", fiber.Map{
		"otp": otp,
	})
}

func (c *AuthController) VerifyEmailChangeStep1(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req EmailChangeStep1VerifyRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.OTP == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "OTP is required")
	}

	tempToken, err := c.authService.VerifyEmailChangeStep1(userIDStr, req.OTP)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "VERIFY_EMAIL_CHANGE_STEP1_SUCCESS", "", userIDStr, "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "Current email verified successfully.", fiber.Map{
		"temp_token": tempToken,
	})
}

func (c *AuthController) CheckNewEmailStep2(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req EmailChangeStep2CheckRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.TempToken == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Temporary verification token is required")
	}

	if !utils.IsValidEmail(req.NewEmail) {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid email format")
	}

	otp, err := c.authService.CheckNewEmailStep2(userIDStr, req.TempToken, req.NewEmail)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "CHECK_NEW_EMAIL_STEP2_SUCCESS", req.NewEmail, userIDStr, "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "New email is available. Verification OTP sent to new email.", fiber.Map{
		"otp": otp,
	})
}

func (c *AuthController) ConfirmEmailChangeStep3(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req EmailChangeStep3ConfirmRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.TempToken == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Temporary verification token is required")
	}

	if req.OTP == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "OTP is required")
	}

	if err := c.authService.ConfirmEmailChangeStep3(userIDStr, req.TempToken, req.OTP); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "CONFIRM_EMAIL_CHANGE_STEP3_SUCCESS", "", userIDStr, "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "Email updated successfully.", nil)
}

func (c *AuthController) ChangePasswordStep1(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req ChangePasswordStep1Request
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.OldPassword == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Old password is required")
	}

	mfaRequired, tempToken, err := c.authService.ChangePasswordStep1Verify(userIDStr, req.OldPassword)
	if err != nil {
		auditLog(ctx, "CHANGE_PASSWORD_STEP1_FAILED", "", userIDStr, err.Error())
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "CHANGE_PASSWORD_STEP1_SUCCESS", "", userIDStr, "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "Verification succeeded.", fiber.Map{
		"mfa_required": mfaRequired,
		"temp_token":   tempToken,
	})
}

func (c *AuthController) ChangePasswordStep2Mfa(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req ChangePasswordStep2Request
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.TempToken == "" || req.Code == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Both temp_token and MFA code are required")
	}

	err := c.authService.ChangePasswordStep2VerifyMFA(userIDStr, req.TempToken, req.Code)
	if err != nil {
		auditLog(ctx, "CHANGE_PASSWORD_STEP2_FAILED", "", userIDStr, err.Error())
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "CHANGE_PASSWORD_STEP2_SUCCESS", "", userIDStr, "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "MFA code verified.", fiber.Map{
		"temp_token": req.TempToken,
	})
}

func (c *AuthController) ChangePasswordStep3Update(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req ChangePasswordStep3Request
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.TempToken == "" || req.NewPassword == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Both temp_token and new_password are required")
	}

	err := c.authService.ChangePasswordStep3Update(userIDStr, req.TempToken, req.NewPassword)
	if err != nil {
		auditLog(ctx, "CHANGE_PASSWORD_STEP3_FAILED", "", userIDStr, err.Error())
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "CHANGE_PASSWORD_STEP3_SUCCESS", "", userIDStr, "")

	return utils.SendSuccess(ctx, fiber.StatusOK, "Password changed successfully. You have been logged out of all devices.", nil)
}
