package controllers

import (
	"os"

	"backendify_idp/services"
	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
)

type AuthController struct {
	authService *services.AuthService
}

func NewAuthController() *AuthController {
	return &AuthController{
		authService: services.NewAuthService(),
	}
}

// auditLog helper calls the GDPR structured JSON audit logger
func auditLog(c *fiber.Ctx, action, email, actorID, details string) {
	utils.LogSecurityEvent(actorID, action, email, c.IP(), c.Get("User-Agent"), details)
}

// getLocalString safely extracts a string from fiber.Ctx.Locals.
// Returns empty string if key is missing or not a string — prevents panic.
func getLocalString(c *fiber.Ctx, key string) string {
	v := c.Locals(key)
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// appURL returns the base URL of this IdP from env, defaulting to localhost.
func appURL() string {
	if u := os.Getenv("APP_URL"); u != "" {
		return u
	}
	return "http://localhost:8800"
}
