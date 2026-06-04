package config

import (
	"fmt"
	"log"
	"os"

	"backendify_idp/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Automatically create database if it doesn't exist
	// createDatabaseIfNotExists()

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Jakarta",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	// In a real scenario to "auto-create" the DB if it doesn't exist, we usually connect to the default 'postgres' db
	// and run a CREATE DATABASE query. For now, we assume the DB is created or we will connect directly.
	// We handle standard connection here.

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}

	// Limit connections as per PRD
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(20)

	// Auto Migrate the models
	err = db.AutoMigrate(
		&models.User{},
		&models.Profile{},
		&models.Role{},
		&models.UserRole{},
		&models.Client{},
		&models.ClientRedirectUrl{},
		&models.Scope{},
		&models.ClientScope{},
		&models.AuthorizationCode{},
		&models.RefreshToken{},
		&models.UserAuthorization{},
		&models.MfaBackupCode{},
		&models.Notification{},
		&models.LoginHistory{},
		&models.AuditEvent{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	DB = db
	fmt.Println("Connected to Database and migrated successfully.")

	// Seed default client data
	SeedData(db)
}

func SeedData(db *gorm.DB) {
	// Seed Roles
	roles := []string{"admin", "user", "idp_support", "developer"}
	for _, roleName := range roles {
		var count int64
		db.Model(&models.Role{}).Where("role_name = ?", roleName).Count(&count)
		if count == 0 {
			db.Create(&models.Role{RoleName: roleName})
			log.Printf("Seeded role: %s", roleName)
		}
	}

	// Seed Scopes
	scopes := []struct {
		Name string
		Desc string
	}{
		{"openid", "Required for OpenID Connect"},
		{"profile", "Access to profile info"},
		{"email", "Access to email address"},
		{"roles", "Access to user roles/groups"},
	}
	for _, s := range scopes {
		var count int64
		db.Model(&models.Scope{}).Where("scope_name = ?", s.Name).Count(&count)
		if count == 0 {
			db.Create(&models.Scope{ScopeName: s.Name, Description: s.Desc})
			log.Printf("Seeded scope: %s", s.Name)
		}
	}

	var count int64
	db.Model(&models.Client{}).Where("client_id = ?", "test-client-id").Count(&count)
	if count == 0 {
		hashedSecret, _ := bcrypt.GenerateFromPassword([]byte("test-client-secret"), bcrypt.DefaultCost)
		client := models.Client{
			AppClientID:      "test-client-id",
			ClientName:       "Test Client App",
			ClientSecretHash: string(hashedSecret),
			IsPkceRequired:   true,
		}
		if err := db.Create(&client).Error; err != nil {
			log.Printf("Failed to seed client: %v", err)
			return
		}

		// Add Redirect URLs
		redirectUrls := []models.ClientRedirectUrl{
			{ClientID: client.ID, Url: "http://localhost:3000/callback"},
			{ClientID: client.ID, Url: "https://oauth.pstmn.io/v1/callback"},
		}
		for _, r := range redirectUrls {
			db.Create(&r)
		}
		log.Println("Seeded test-client-id and redirect URLs successfully.")
	}
}

func createDatabaseIfNotExists() {
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	// Connect to default 'postgres' database first to perform administrative tasks
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=postgres port=%s sslmode=disable TimeZone=Asia/Jakarta",
		host, user, password, port,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Printf("Warning: Failed to connect to default 'postgres' database to check database existence: %v", err)
		return
	}

	sqlDB, err := db.DB()
	if err != nil {
		return
	}
	defer sqlDB.Close()

	// Check if target database exists
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ?)"
	err = db.Raw(query, dbName).Scan(&exists).Error
	if err != nil {
		log.Printf("Warning: Failed to query database existence: %v", err)
		return
	}

	if !exists {
		log.Printf("Database '%s' does not exist. Creating it now...", dbName)
		// CREATE DATABASE cannot run inside a transaction block. We run it directly.
		createDBQuery := fmt.Sprintf("CREATE DATABASE %s", dbName)
		if err := db.Exec(createDBQuery).Error; err != nil {
			log.Printf("Warning: Failed to create database '%s': %v", dbName, err)
		} else {
			log.Printf("Database '%s' created successfully.", dbName)
		}
	}
}
