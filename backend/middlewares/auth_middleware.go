package middlewares

import (
	"os"
	"strings"

	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return utils.SendError(c, fiber.StatusUnauthorized, "Missing Authorization header")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return utils.SendError(c, fiber.StatusUnauthorized, "Invalid Authorization header format")
	}

	tokenStr := parts[1]
	secret := os.Getenv("APP_SECRET")

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		return utils.SendError(c, fiber.StatusUnauthorized, "Invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return utils.SendError(c, fiber.StatusUnauthorized, "Invalid token claims")
	}

	userID, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)
	c.Locals("user_id", userID)
	c.Locals("email", email)
	c.Locals("roles", claims["roles"])

	return c.Next()
}

func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRolesLocal := c.Locals("roles")
		if userRolesLocal == nil {
			return utils.SendError(c, fiber.StatusForbidden, "Access denied: missing role claims")
		}

		userRolesInterface, ok := userRolesLocal.([]interface{})
		if !ok {
			return utils.SendError(c, fiber.StatusForbidden, "Access denied: invalid role claims format")
		}

		userRoles := make([]string, len(userRolesInterface))
		for i, v := range userRolesInterface {
			if str, ok := v.(string); ok {
				userRoles[i] = str
			}
		}

		for _, allowedRole := range allowedRoles {
			for _, userRole := range userRoles {
				if userRole == allowedRole {
					return c.Next()
				}
			}
		}

		return utils.SendError(c, fiber.StatusForbidden, "Access denied: insufficient permissions")
	}
}
