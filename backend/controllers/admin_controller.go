package controllers

import (
	"fmt"
	"strconv"

	"backendify_idp/services"
	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CreateClientRequest struct {
	ClientName     string   `json:"client_name"`
	AppClientID    string   `json:"client_id"`
	IsPkceRequired bool     `json:"is_pkce_required"`
	RedirectURLs   []string `json:"redirect_urls"`
}

type UpdateClientRequest struct {
	ClientName     string   `json:"client_name"`
	IsPkceRequired bool     `json:"is_pkce_required"`
	RedirectURLs   []string `json:"redirect_urls"`
}

type UpdateUserRoleRequest struct {
	RoleName string `json:"role_name"`
	Assign   bool   `json:"assign"`
}

type UpdateUserStatusRequest struct {
	Status string `json:"status"`
}

func (c *AuthController) GetClients(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	rolesLocal := ctx.Locals("roles")
	isAdmin := false
	if rolesSlice, ok := rolesLocal.([]interface{}); ok {
		for _, r := range rolesSlice {
			if r == "admin" {
				isAdmin = true
				break
			}
		}
	} else if rolesStringSlice, ok := rolesLocal.([]string); ok {
		for _, r := range rolesStringSlice {
			if r == "admin" {
				isAdmin = true
				break
			}
		}
	}

	var dtos []services.ClientDTO
	var err error
	if isAdmin {
		dtos, err = c.authService.GetClients("")
	} else {
		dtos, err = c.authService.GetClients(userIDStr)
	}

	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}
	return utils.SendSuccess(ctx, fiber.StatusOK, "Clients retrieved successfully", dtos)
}

func (c *AuthController) CreateClient(ctx *fiber.Ctx) error {
	var req CreateClientRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.ClientName == "" || req.AppClientID == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Client name and client ID are required")
	}

	creatorUserIDStr := getLocalString(ctx, "user_id")
	var ownerID *uuid.UUID
	if creatorUserIDStr != "" {
		uid, err := uuid.Parse(creatorUserIDStr)
		if err == nil {
			ownerID = &uid
		}
	}

	client, rawSecret, err := c.authService.CreateClient(req.ClientName, req.AppClientID, req.IsPkceRequired, req.RedirectURLs, ownerID)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	adminUserID := getLocalString(ctx, "user_id")
	auditLog(ctx, "CREATE_OIDC_CLIENT", "", adminUserID, fmt.Sprintf("ClientID: %s, AppClientID: %s", client.ID.String(), client.AppClientID))

	return utils.SendSuccess(ctx, fiber.StatusCreated, "Client created successfully", fiber.Map{
		"client":        client,
		"client_secret": rawSecret,
	})
}

func (c *AuthController) DeleteClient(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Client UUID is required")
	}

	userIDStr := getLocalString(ctx, "user_id")
	rolesLocal := ctx.Locals("roles")
	isAdmin := false
	if rolesSlice, ok := rolesLocal.([]interface{}); ok {
		for _, r := range rolesSlice {
			if r == "admin" {
				isAdmin = true
				break
			}
		}
	} else if rolesStringSlice, ok := rolesLocal.([]string); ok {
		for _, r := range rolesStringSlice {
			if r == "admin" {
				isAdmin = true
				break
			}
		}
	}

	if !isAdmin {
		isOwner, err := c.authService.IsClientOwner(id, userIDStr)
		if err != nil || !isOwner {
			return utils.SendError(ctx, fiber.StatusForbidden, "You do not have permission to delete this client")
		}
	}

	if err := c.authService.DeleteClient(id); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	adminUserID := getLocalString(ctx, "user_id")
	auditLog(ctx, "DELETE_OIDC_CLIENT", "", adminUserID, fmt.Sprintf("ClientID: %s", id))

	return utils.SendSuccess(ctx, fiber.StatusOK, "Client deleted successfully", nil)
}

func (c *AuthController) UpdateClient(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Client UUID is required")
	}

	var req UpdateClientRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.ClientName == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Client name is required")
	}

	userIDStr := getLocalString(ctx, "user_id")
	rolesLocal := ctx.Locals("roles")
	isAdmin := false
	if rolesSlice, ok := rolesLocal.([]interface{}); ok {
		for _, r := range rolesSlice {
			if r == "admin" {
				isAdmin = true
				break
			}
		}
	} else if rolesStringSlice, ok := rolesLocal.([]string); ok {
		for _, r := range rolesStringSlice {
			if r == "admin" {
				isAdmin = true
				break
			}
		}
	}

	if !isAdmin {
		isOwner, err := c.authService.IsClientOwner(id, userIDStr)
		if err != nil || !isOwner {
			return utils.SendError(ctx, fiber.StatusForbidden, "You do not have permission to modify this client")
		}
	}

	if err := c.authService.UpdateClient(id, req.ClientName, req.IsPkceRequired, req.RedirectURLs); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	adminUserID := getLocalString(ctx, "user_id")
	auditLog(ctx, "UPDATE_OIDC_CLIENT", "", adminUserID, fmt.Sprintf("ClientID: %s, ClientName: %s", id, req.ClientName))

	return utils.SendSuccess(ctx, fiber.StatusOK, "Client updated successfully", nil)
}

func (c *AuthController) GetUsers(ctx *fiber.Ctx) error {
	dtos, err := c.authService.GetUsers()
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}
	return utils.SendSuccess(ctx, fiber.StatusOK, "Users retrieved successfully", dtos)
}

func (c *AuthController) UpdateUserRole(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "User ID is required")
	}

	var req UpdateUserRoleRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.RoleName == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Role name is required")
	}

	adminUserID := getLocalString(ctx, "user_id")
	if adminUserID == id && req.RoleName == "admin" && !req.Assign {
		return utils.SendError(ctx, fiber.StatusBadRequest, "You cannot revoke your own admin role")
	}

	if err := c.authService.UpdateUserRole(id, req.RoleName, req.Assign); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "UPDATE_USER_ROLE", "", adminUserID, fmt.Sprintf("TargetUserID: %s, Role: %s, Assigned: %t", id, req.RoleName, req.Assign))

	return utils.SendSuccess(ctx, fiber.StatusOK, "User role updated successfully", nil)
}

func (c *AuthController) UpdateUserStatus(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "User ID is required")
	}

	var req UpdateUserStatusRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Status == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Status is required")
	}

	allowedStatuses := map[string]bool{"active": true, "suspended": true, "banned": true}
	if !allowedStatuses[req.Status] {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid status. Allowed values: active, suspended, banned")
	}

	adminUserID := getLocalString(ctx, "user_id")

	// Enforce role privilege check: Support staff cannot suspend or ban Admin users
	targetUserID, err := uuid.Parse(id)
	if err == nil {
		targetRoles, err := c.authService.GetUserRoles(targetUserID)
		if err == nil {
			targetIsAdmin := false
			for _, r := range targetRoles {
				if r == "admin" {
					targetIsAdmin = true
					break
				}
			}

			if targetIsAdmin {
				requesterRolesLocal := ctx.Locals("roles")
				requesterIsAdmin := false
				if requesterRolesLocal != nil {
					if rolesSlice, ok := requesterRolesLocal.([]interface{}); ok {
						for _, r := range rolesSlice {
							if rStr, ok := r.(string); ok && rStr == "admin" {
								requesterIsAdmin = true
								break
							}
						}
					} else if rolesStringSlice, ok := requesterRolesLocal.([]string); ok {
						for _, r := range rolesStringSlice {
							if r == "admin" {
								requesterIsAdmin = true
								break
							}
						}
					}
				}

				if !requesterIsAdmin {
					return utils.SendError(ctx, fiber.StatusForbidden, "Support staff cannot modify administrator status")
				}
			}
		}
	}

	if adminUserID == id && req.Status != "active" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "You cannot ban or suspend your own admin account")
	}

	if err := c.authService.UpdateUserStatus(id, req.Status); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "UPDATE_USER_STATUS", "", adminUserID, fmt.Sprintf("TargetUserID: %s, Status: %s", id, req.Status))

	return utils.SendSuccess(ctx, fiber.StatusOK, "User status updated successfully", nil)
}

func (c *AuthController) DeleteUser(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "User ID is required")
	}

	adminUserID := getLocalString(ctx, "user_id")
	if adminUserID == id {
		return utils.SendError(ctx, fiber.StatusBadRequest, "You cannot delete your own admin account")
	}

	if err := c.authService.DeleteUser(id); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "DELETE_USER", "", adminUserID, fmt.Sprintf("TargetUserID: %s", id))

	return utils.SendSuccess(ctx, fiber.StatusOK, "User account deleted successfully", nil)
}

func (c *AuthController) UnlockUser(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "User ID is required")
	}

	adminUserID := getLocalString(ctx, "user_id")

	if err := c.authService.UnlockUser(id); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	auditLog(ctx, "UNLOCK_USER_SUCCESS", "", adminUserID, fmt.Sprintf("TargetUserID: %s", id))

	return utils.SendSuccess(ctx, fiber.StatusOK, "User account successfully unlocked", nil)
}

func (c *AuthController) GetAuditLogs(ctx *fiber.Ctx) error {
	pageStr := ctx.Query("page", "1")
	limitStr := ctx.Query("limit", "20")
	actionFilter := ctx.Query("action", "")
	searchQuery := ctx.Query("search", "")

	page := 1
	limit := 20
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	response, err := c.authService.GetAuditLogs(page, limit, actionFilter, searchQuery)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Audit logs retrieved successfully", response)
}
