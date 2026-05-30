package main

import (
	"log"
	"os"

	"backendify_idp/config"
	"backendify_idp/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	// Initialize Database and Redis
	config.ConnectDatabase()
	config.ConnectRedis()

	// Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName:      os.Getenv("APP_NAME"),
		ServerHeader: "Fiber",
	})

	// Setup Middlewares
	app.Use(logger.New())

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin != "" {
		app.Use(cors.New(cors.Config{
			AllowOrigins:     corsOrigin,
			AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
			AllowMethods:     "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
			AllowCredentials: true,
		}))
	} else {
		app.Use(cors.New(cors.Config{
			AllowCredentials: true,
		}))
	}

	// Setup Routes
	routes.SetupRoutes(app)

	// Start Server
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Starting server on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
