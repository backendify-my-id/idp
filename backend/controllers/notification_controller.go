package controllers

import (
	"backendify_idp/config"
	"backendify_idp/models"
	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CreateNotificationRequest struct {
	Text string `json:"text"`
}

func (c *AuthController) GetNotifications(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid user ID")
	}

	var notifications []models.Notification
	err = config.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(25).Find(&notifications).Error
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to retrieve notifications")
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Notifications retrieved successfully", notifications)
}

func (c *AuthController) CreateNotification(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid user ID")
	}

	var req CreateNotificationRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Text == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Notification text is required")
	}

	notification := models.Notification{
		UserID: userID,
		Text:   req.Text,
		Unread: true,
	}

	if err := config.DB.Create(&notification).Error; err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to create notification")
	}

	return utils.SendSuccess(ctx, fiber.StatusCreated, "Notification created successfully", notification)
}

func (c *AuthController) MarkAllNotificationsRead(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid user ID")
	}

	err = config.DB.Model(&models.Notification{}).Where("user_id = ? AND unread = ?", userID, true).Update("unread", false).Error
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to update notifications")
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "All notifications marked as read", nil)
}
