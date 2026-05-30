package routes

import (
	"time"

	"backendify_idp/controllers"
	"backendify_idp/middlewares"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func SetupRoutes(app *fiber.App) {
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

	// Admin & Support Protected Endpoints
	admin := app.Group("/api/admin")
	admin.Use(middlewares.AuthMiddleware)
	
	// Client application registry management (strictly admin)
	admin.Get("/clients", middlewares.RequireRole("admin"), authController.GetClients)
	admin.Post("/clients", middlewares.RequireRole("admin"), authController.CreateClient)
	admin.Delete("/clients/:id", middlewares.RequireRole("admin"), authController.DeleteClient)
	
	// User directory management (admin or idp_support)
	admin.Get("/users", middlewares.RequireRole("admin", "idp_support"), authController.GetUsers)
	admin.Put("/users/:id/role", middlewares.RequireRole("admin"), authController.UpdateUserRole) // strictly admin
	admin.Put("/users/:id/status", middlewares.RequireRole("admin", "idp_support"), authController.UpdateUserStatus) // support can ban/unban/suspend
}

