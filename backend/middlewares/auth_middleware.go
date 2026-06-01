package middlewares

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"
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

	// Enforce Redis JWT Blacklist check to protect against stale/revoked active tokens
	jti, _ := claims["jti"].(string)
	redisCtx := context.Background()
	if jti != "" {
		isBlacklisted, errBlacklist := config.RedisClient.Exists(redisCtx, "blacklist:jwt:"+jti).Result()
		if errBlacklist == nil && isBlacklisted > 0 {
			return utils.SendError(c, fiber.StatusUnauthorized, "Session has been revoked or logged out")
		}
	}

	// Enforce active session validity check by checking bound session ID (sid claim)
	sid, _ := claims["sid"].(string)
	if sid != "" {
		// 1. Check high-performance Redis blacklist first
		isRevoked, errRevoked := config.RedisClient.Exists(redisCtx, "session:revoked:"+sid).Result()
		if errRevoked == nil && isRevoked > 0 {
			return utils.SendError(c, fiber.StatusUnauthorized, "Session has been revoked or is invalid")
		}

		// 2. Fallback to GORM database in case of Redis cache miss
		var session models.RefreshToken
		if err := config.DB.Select("revoked").Where("id = ?", sid).First(&session).Error; err != nil {
			// If session is deleted from GORM entirely, it is invalid
			config.RedisClient.Set(redisCtx, "session:revoked:"+sid, "1", time.Hour)
			return utils.SendError(c, fiber.StatusUnauthorized, "Session has been revoked or is invalid")
		}
		if session.Revoked {
			// Cache revoked status in Redis for 1 hour to prevent subsequent DB hits
			config.RedisClient.Set(redisCtx, "session:revoked:"+sid, "1", time.Hour)
			return utils.SendError(c, fiber.StatusUnauthorized, "Session has been revoked")
		}
	}

	userID, _ := claims["sub"].(string)
	email, _ := claims["email"].(string)

	// Enforce high-performance caching for user status and roles (core scalability)
	redisKey := "user:cache:" + userID
	var cachedData struct {
		Status string   `json:"status"`
		Roles  []string `json:"roles"`
	}

	cacheHit := false
	cachedJSON, errCache := config.RedisClient.Get(redisCtx, redisKey).Result()
	if errCache == nil {
		if errUnmarshal := json.Unmarshal([]byte(cachedJSON), &cachedData); errUnmarshal == nil {
			cacheHit = true
		}
	}

	var status string
	var roleNames []string

	if cacheHit {
		status = cachedData.Status
		roleNames = cachedData.Roles
	} else {
		// Enforce JWT stale claims check: query DB to verify active status
		var user models.User
		if err := config.DB.Select("status").Where("id = ?", userID).First(&user).Error; err != nil {
			return utils.SendError(c, fiber.StatusUnauthorized, "User session invalid or deleted")
		}
		status = user.Status

		// Fetch real-time roles from DB to bypass stale JWT claims
		err = config.DB.
			Table("roles").
			Select("roles.role_name").
			Joins("INNER JOIN user_roles ON user_roles.role_id = roles.id").
			Where("user_roles.user_id = ?", userID).
			Pluck("role_name", &roleNames).Error
		if err != nil {
			roleNames = []string{"user"}
		}

		// Cache user details in Redis with a 10-minute TTL to reduce DB overhead
		newData := map[string]interface{}{
			"status": status,
			"roles":  roleNames,
		}
		if newJSON, errMarshal := json.Marshal(newData); errMarshal == nil {
			config.RedisClient.Set(redisCtx, redisKey, newJSON, 10*time.Minute)
		}
	}

	if status != "active" {
		return utils.SendError(c, fiber.StatusUnauthorized, fmt.Sprintf("Account status is '%s'. Please contact support.", status))
	}

	c.Locals("user_id", userID)
	c.Locals("email", email)
	c.Locals("roles", roleNames)

	return c.Next()
}

func RequireRole(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRolesLocal := c.Locals("roles")
		if userRolesLocal == nil {
			return utils.SendError(c, fiber.StatusForbidden, "Access denied: missing role claims")
		}

		var userRoles []string
		if rolesSlice, ok := userRolesLocal.([]interface{}); ok {
			for _, r := range rolesSlice {
				if rStr, ok := r.(string); ok {
					userRoles = append(userRoles, rStr)
				}
			}
		} else if rolesStringSlice, ok := userRolesLocal.([]string); ok {
			userRoles = rolesStringSlice
		} else {
			return utils.SendError(c, fiber.StatusForbidden, "Access denied: invalid role claims format")
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
