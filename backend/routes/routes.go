package routes

import (
	"time"

	"backendify_idp/controllers"
	"backendify_idp/middlewares"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/websocket/v2"
)

func SetupRoutes(app *fiber.App) {
	// Real-time WebSocket Telemetry Route (Registered first to bypass global group auth middlewares)
	app.Get("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}, websocket.New(controllers.HandleWebSocket))

	authController := controllers.NewAuthController()

	// General API Limiter: max 60 requests per minute per IP
	apiLimiter := limiter.New(limiter.Config{
		Max:        60,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"message": "Too many requests from this IP. Please try again in a minute.",
			})
		},
	})

	// Dedicated Login Limiter: max 20 login attempts per minute per IP
	loginLimiter := limiter.New(limiter.Config{
		Max:        20,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"message": "Too many login attempts. Please try again in a minute.",
			})
		},
	})

	// General Auth Group
	api := app.Group("/api")
	api.Post("/register", apiLimiter, authController.Register)
	api.Post("/verify-email", apiLimiter, authController.VerifyEmail)
	api.Post("/resend-otp", apiLimiter, authController.ResendOTP)
	api.Post("/forgot-password", apiLimiter, authController.ForgotPassword)
	api.Post("/reset-password", apiLimiter, authController.ResetPassword)
	api.Post("/login", loginLimiter, authController.Login)
	api.Post("/login/mfa", loginLimiter, authController.VerifyMfaLogin)
	api.Post("/refresh", apiLimiter, authController.Refresh)
	api.Post("/logout", authController.Logout) // Single Logout (SLO)

	// OIDC & OAuth2 Endpoints
	app.Get("/authorize", authController.Authorize)
	app.Post("/token", authController.Token)
	app.Get("/.well-known/openid-configuration", authController.OpenIDConfiguration)

	// Protected Endpoints
	protected := app.Group("/")
	protected.Use(middlewares.AuthMiddleware)
	protected.Get("/userinfo", authController.UserInfo)
	protected.Get("/api/profile", authController.GetProfile)
	protected.Put("/api/profile", authController.UpdateProfile)
	protected.Get("/api/mfa/setup", authController.SetupMfa)
	protected.Post("/api/mfa/enable", authController.EnableMfa)
	protected.Post("/api/mfa/disable", authController.DisableMfa)

	// User Active Sessions Management
	protected.Get("/api/profile/sessions", authController.GetSessions)
	protected.Delete("/api/profile/sessions/:id", authController.RevokeSession)
	protected.Delete("/api/profile/sessions", authController.RevokeAllOtherSessions)

	// High-Security 3-Step Email Change Flow
	protected.Post("/api/profile/email-change/step1-initiate", authController.InitiateEmailChangeStep1)
	protected.Post("/api/profile/email-change/step1-verify", authController.VerifyEmailChangeStep1)
	protected.Post("/api/profile/email-change/step2-check", authController.CheckNewEmailStep2)
	protected.Post("/api/profile/email-change/step3-confirm", authController.ConfirmEmailChangeStep3)

	// High-Security 3-Step Change Password Flow
	protected.Post("/api/profile/change-password/step1-verify", authController.ChangePasswordStep1)
	protected.Post("/api/profile/change-password/step2-mfa", authController.ChangePasswordStep2Mfa)
	protected.Post("/api/profile/change-password/step3-update", authController.ChangePasswordStep3Update)

	// Notifications API
	protected.Get("/api/notifications", authController.GetNotifications)
	protected.Post("/api/notifications", authController.CreateNotification)
	protected.Put("/api/notifications/read", authController.MarkAllNotificationsRead)

	// Admin & Support Protected Endpoints
	admin := app.Group("/api/admin")
	admin.Use(middlewares.AuthMiddleware)
	
	// Client application registry management (admin & developer)
	admin.Get("/clients", middlewares.RequireRole("admin", "developer"), authController.GetClients)
	admin.Post("/clients", middlewares.RequireRole("admin", "developer"), authController.CreateClient)
	admin.Put("/clients/:id", middlewares.RequireRole("admin", "developer"), authController.UpdateClient)
	admin.Delete("/clients/:id", middlewares.RequireRole("admin", "developer"), authController.DeleteClient)
	
	admin.Get("/users", middlewares.RequireRole("admin", "idp_support"), authController.GetUsers)
	admin.Put("/users/:id/role", middlewares.RequireRole("admin"), authController.UpdateUserRole) // strictly admin
	admin.Put("/users/:id/status", middlewares.RequireRole("admin", "idp_support"), authController.UpdateUserStatus) // support can ban/unban/suspend
	admin.Put("/users/:id/unlock", middlewares.RequireRole("admin", "idp_support"), authController.UnlockUser)
	admin.Delete("/users/:id", middlewares.RequireRole("admin"), authController.DeleteUser) // strictly admin delete
	admin.Get("/audit-logs", middlewares.RequireRole("admin"), authController.GetAuditLogs)
}

