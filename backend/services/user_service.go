package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func (s *AuthService) RegisterUser(email, password string) (*models.User, error) {
	// Check if user already exists
	var count int64
	config.DB.Model(&models.User{}).Where("email = ?", email).Count(&count)
	if count > 0 {
		return nil, errors.New("email already registered")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Profile: models.Profile{
			FullName:  "",
			AvatarUrl: "",
			Bio:       "",
		},
	}

	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Assign default "user" role
	var role models.Role
	if err := tx.Where("role_name = ?", "user").First(&role).Error; err == nil {
		userRole := models.UserRole{
			UserID: user.ID,
			RoleID: role.ID,
		}
		if err := tx.Create(&userRole).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	} else {
		tx.Rollback()
		return nil, errors.New("default user role not found in directory")
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	return user, nil
}

func (s *AuthService) GetUserRoles(userID uuid.UUID) ([]string, error) {
	var roleNames []string
	err := config.DB.
		Table("roles").
		Select("roles.role_name").
		Joins("INNER JOIN user_roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Pluck("role_name", &roleNames).Error
	if err != nil {
		return nil, err
	}
	if roleNames == nil {
		return []string{}, nil
	}
	return roleNames, nil
}

func (s *AuthService) GetUserProfile(userIDStr string) (*models.Profile, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	var profile models.Profile
	err = config.DB.Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		// If profile doesn't exist, create a default one for backward compatibility!
		var user models.User
		if dbErr := config.DB.Where("id = ?", userID).First(&user).Error; dbErr == nil {
			profile = models.Profile{
				UserID:    userID,
				FullName:  "",
				AvatarUrl: "",
				Bio:       "",
			}
			config.DB.Create(&profile)
			return &profile, nil
		}
		return nil, errors.New("profile not found")
	}

	return &profile, nil
}

func (s *AuthService) UpdateUserProfile(userIDStr string, fullName string, avatarURL string, bio string) (*models.Profile, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	var profile models.Profile
	err = config.DB.Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		// Create it if not exists
		profile = models.Profile{
			UserID:    userID,
			FullName:  fullName,
			AvatarUrl: avatarURL,
			Bio:       bio,
		}
		if dbErr := config.DB.Create(&profile).Error; dbErr != nil {
			return nil, dbErr
		}
		return &profile, nil
	}

	profile.FullName = fullName
	profile.AvatarUrl = avatarURL
	profile.Bio = bio

	if dbErr := config.DB.Save(&profile).Error; dbErr != nil {
		return nil, dbErr
	}

	return &profile, nil
}

func (s *AuthService) GetUsers() ([]AdminUserDTO, error) {
	var users []models.User
	if err := config.DB.Preload("Profile").Order("created_at desc").Find(&users).Error; err != nil {
		return nil, err
	}

	var dtos []AdminUserDTO
	for _, u := range users {
		roles, err := s.GetUserRoles(u.ID)
		if err != nil {
			roles = []string{"user"}
		}

		dtos = append(dtos, AdminUserDTO{
			ID:              u.ID.String(),
			Email:           u.Email,
			FullName:        u.Profile.FullName,
			AvatarUrl:       u.Profile.AvatarUrl,
			Status:          u.Status,
			IsEmailVerified: u.IsEmailVerified,
			MfaEnabled:      u.MfaEnabled,
			Roles:           roles,
			CreatedAt:       u.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return dtos, nil
}

func (s *AuthService) UpdateUserRole(userIDStr string, roleName string, assign bool) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	var role models.Role
	if err := config.DB.Where("role_name = ?", roleName).First(&role).Error; err != nil {
		return errors.New("role not found")
	}

	var dbErr error
	if assign {
		var count int64
		config.DB.Model(&models.UserRole{}).Where("user_id = ? AND role_id = ?", userID, role.ID).Count(&count)
		if count == 0 {
			userRole := models.UserRole{
				UserID: userID,
				RoleID: role.ID,
			}
			dbErr = config.DB.Create(&userRole).Error
		}
	} else {
		dbErr = config.DB.Where("user_id = ? AND role_id = ?", userID, role.ID).Delete(&models.UserRole{}).Error
	}

	if dbErr != nil {
		return dbErr
	}

	// Evict user cache in Redis
	ctx := context.Background()
	config.RedisClient.Del(ctx, "user:cache:"+userIDStr)

	return nil
}

func (s *AuthService) UpdateUserStatus(userIDStr string, status string) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	if status != "active" && status != "banned" && status != "suspended" {
		return errors.New("invalid status value")
	}

	if err := config.DB.Model(&models.User{}).Where("id = ?", userID).Update("status", status).Error; err != nil {
		return err
	}

	// Evict user cache in Redis to instantly enforce status ban/suspension
	ctx := context.Background()
	config.RedisClient.Del(ctx, "user:cache:"+userIDStr)

	return nil
}

func (s *AuthService) DeleteUser(userIDStr string) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	tx := config.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	// 1. Explicitly delete associated refresh tokens to prevent orphans
	if err := tx.Where("user_id = ?", userID).Delete(&models.RefreshToken{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 2. Explicitly delete associated authorization codes to prevent orphans
	if err := tx.Where("user_id = ?", userID).Delete(&models.AuthorizationCode{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 3. Explicitly delete associated user authorizations to prevent orphans
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserAuthorization{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 4. Delete from UserRole
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserRole{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 5. Delete from Profile (optional as cascade is declared, but safe)
	if err := tx.Where("user_id = ?", userID).Delete(&models.Profile{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 6. Delete the User
	result := tx.Where("id = ?", userID).Delete(&models.User{})
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return errors.New("user not found")
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		return err
	}

	// Evict user cache in Redis
	ctx := context.Background()
	config.RedisClient.Del(ctx, "user:cache:"+userIDStr)

	return nil
}

func (s *AuthService) UnlockUser(userIDStr string) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	var user models.User
	if err := config.DB.Select("email").Where("id = ?", userID).First(&user).Error; err != nil {
		return errors.New("user not found")
	}

	return s.ResetFailedLoginAttempts(user.Email)
}

func (s *AuthService) InitiateEmailChange(userIDStr, currentEmail, newEmail string) (string, error) {
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		return "", errors.New("invalid user ID")
	}

	// Generate secure verification token
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(bytes)

	// Save change request payload in Redis with a 15-minute TTL
	ctx := context.Background()
	payload := map[string]string{
		"new_email": newEmail,
		"token":     token,
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	err = config.RedisClient.Set(ctx, "email_change_request:"+userIDStr, payloadJSON, 15*time.Minute).Err()
	if err != nil {
		return "", errors.New("failed to initiate email change in cache")
	}

	log.Printf("[DEV] Email change token for User %s to %s: %s", userIDStr, newEmail, token)

	return token, nil
}

func (s *AuthService) ConfirmEmailChange(userIDStr, token string) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	ctx := context.Background()
	redisKey := "email_change_request:" + userIDStr

	// Fetch and delete atomically using Lua script to prevent double-click race conditions
	script := `
		local val = redis.call('get', KEYS[1])
		if val then
			redis.call('del', KEYS[1])
		end
		return val
	`
	res, err := config.RedisClient.Eval(ctx, script, []string{redisKey}).Result()
	if err != nil {
		if err.Error() == "redis: nil" {
			return errors.New("email change session expired or not initiated")
		}
		return err
	}

	payloadStr, ok := res.(string)
	if !ok || payloadStr == "" {
		return errors.New("email change session expired or not initiated")
	}

	var payload map[string]string
	if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
		return err
	}

	if payload["token"] != token {
		return errors.New("invalid verification token")
	}

	newEmail := payload["new_email"]

	// Check if the new email is already registered to another user in GORM
	var count int64
	config.DB.Model(&models.User{}).Where("email = ? AND id != ?", newEmail, userID).Count(&count)
	if count > 0 {
		return errors.New("email is already in use by another account")
	}

	// Update user email in GORM database
	err = config.DB.Model(&models.User{}).Where("id = ?", userID).Update("email", newEmail).Error
	if err != nil {
		return err
	}

	return nil
}
