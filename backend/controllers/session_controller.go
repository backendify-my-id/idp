package controllers

import (
	"fmt"

	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func (c *AuthController) GetSessions(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid user ID")
	}

	sessions, err := c.authService.GetUserSessions(userID)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to retrieve sessions")
	}

	type SessionDTO struct {
		ID        string `json:"id"`
		IpAddress string `json:"ip_address"`
		UserAgent string `json:"user_agent"`
		ExpiresAt string `json:"expires_at"`
		CreatedAt string `json:"created_at"`
		AppName   string `json:"app_name"`
	}

	var dtos []SessionDTO
	for _, s := range sessions {
		appName := "IdP Dashboard Portal"
		if s.ClientID != nil && s.Client.ClientName != "" {
			appName = s.Client.ClientName
		}
		dtos = append(dtos, SessionDTO{
			ID:        s.ID.String(),
			IpAddress: s.IpAddress,
			UserAgent: s.UserAgent,
			ExpiresAt: s.ExpiresAt.Format("2006-01-02 15:04:05"),
			CreatedAt: s.CreatedAt.Format("2006-01-02 15:04:05"),
			AppName:   appName,
		})
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Active sessions retrieved successfully", dtos)
}

func (c *AuthController) RevokeSession(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid user ID")
	}

	sessionIDStr := ctx.Params("id")
	if sessionIDStr == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Session ID is required")
	}

	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid session ID")
	}

	if err := c.authService.RevokeSession(userID, sessionID); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Failed to revoke session")
	}

	auditLog(ctx, "REVOKE_SESSION_SUCCESS", "", userIDStr, fmt.Sprintf("SessionID: %s", sessionIDStr))
	return utils.SendSuccess(ctx, fiber.StatusOK, "Session successfully revoked", nil)
}

func (c *AuthController) RevokeAllOtherSessions(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid user ID")
	}

	sidStr := getLocalString(ctx, "sid")
	var currentSessionID *uuid.UUID
	if sidStr != "" {
		if parsedSid, err := uuid.Parse(sidStr); err == nil {
			currentSessionID = &parsedSid
		}
	}

	if err := c.authService.RevokeAllOtherSessions(userID, currentSessionID); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Failed to revoke other sessions")
	}

	auditLog(ctx, "REVOKE_ALL_OTHER_SESSIONS_SUCCESS", "", userIDStr, "")
	return utils.SendSuccess(ctx, fiber.StatusOK, "All other sessions successfully revoked", nil)
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (c *AuthController) Refresh(ctx *fiber.Ctx) error {
	var req RefreshRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.RefreshToken == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Refresh token is required")
	}

	accessToken, newRefreshToken, err := c.authService.RefreshAccessToken(req.RefreshToken, ctx.IP(), ctx.Get("User-Agent"))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Invalid or expired refresh token")
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Token refreshed successfully", fiber.Map{
		"access_token":  accessToken,
		"refresh_token": newRefreshToken,
	})
}
