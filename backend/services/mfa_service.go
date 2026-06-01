package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm/clause"
)

func (s *AuthService) GenerateMfaSetup(userIDStr string, email string) (string, string, error) {
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		return "", "", errors.New("invalid user ID")
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Backendify",
		AccountName: email,
	})
	if err != nil {
		return "", "", err
	}

	// Save temporary secret to Redis with a 15-minute expiration instead of polluting the GORM User table!
	ctx := context.Background()
	err = config.RedisClient.Set(ctx, "mfa_setup:"+userIDStr, key.Secret(), 15*time.Minute).Err()
	if err != nil {
		return "", "", errors.New("failed to initiate MFA setup in cache")
	}

	return key.Secret(), key.URL(), nil
}

func (s *AuthService) EnableMfa(userIDStr string, code string) (bool, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	// Retrieve temporary secret from Redis
	ctx := context.Background()
	tempSecret, err := config.RedisClient.Get(ctx, "mfa_setup:"+userIDStr).Result()
	if err != nil {
		return false, errors.New("MFA setup session has expired. Please initiate setup again")
	}

	// Validate code
	valid := totp.Validate(code, tempSecret)
	if !valid {
		return false, errors.New("invalid verification code")
	}

	// Update DB to enable MFA and persist the verified secret!
	err = config.DB.Model(&user).Updates(map[string]interface{}{
		"mfa_enabled": true,
		"mfa_secret":  tempSecret,
	}).Error
	if err != nil {
		return false, err
	}

	// Invalidate setup session in Redis after successful confirmation
	config.RedisClient.Del(ctx, "mfa_setup:"+userIDStr)

	return true, nil
}

func (s *AuthService) DisableMfa(userIDStr string, code string) (bool, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	// Validate code against secret
	valid := totp.Validate(code, user.MfaSecret)
	if !valid {
		return false, errors.New("invalid verification code")
	}

	// Disable MFA and clear secret
	err = config.DB.Model(&user).Updates(map[string]interface{}{
		"mfa_enabled": false,
		"mfa_secret":  "",
	}).Error
	if err != nil {
		return false, err
	}

	return true, nil
}

func (s *AuthService) VerifyMfaCode(userIDStr string, code string) (bool, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return false, errors.New("invalid user ID")
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false, errors.New("user not found")
	}

	valid := totp.Validate(code, user.MfaSecret)
	if !valid {
		return false, errors.New("invalid verification code")
	}

	return true, nil
}

func (s *AuthService) GenerateMfaToken(user *models.User) (string, error) {
	// Generates a temporary MFA verification token valid for 3 minutes
	claims := jwt.MapClaims{
		"sub":         user.ID.String(),
		"email":       user.Email,
		"mfa_pending": true,
		"exp":         time.Now().Add(time.Minute * 3).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("APP_SECRET")

	t, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return t, nil
}

func (s *AuthService) GenerateBackupCodes(userID uuid.UUID) ([]string, error) {
	var rawCodes []string
	tx := config.DB.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	// Purge previous backup codes to prevent accumulation
	if err := tx.Where("user_id = ?", userID).Delete(&models.MfaBackupCode{}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	for i := 0; i < 8; i++ {
		bytes := make([]byte, 4)
		if _, err := rand.Read(bytes); err != nil {
			tx.Rollback()
			return nil, err
		}
		rawCode := hex.EncodeToString(bytes) // e.g. "a1b2c3d4"
		formattedCode := rawCode[:4] + "-" + rawCode[4:]
		rawCodes = append(rawCodes, formattedCode)

		hash, err := bcrypt.GenerateFromPassword([]byte(formattedCode), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			return nil, err
		}

		backupCode := models.MfaBackupCode{
			UserID:   userID,
			CodeHash: string(hash),
			Used:     false,
		}
		if err := tx.Create(&backupCode).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	return rawCodes, nil
}

func (s *AuthService) VerifyBackupCode(userID uuid.UUID, rawCode string) (bool, error) {
	tx := config.DB.Begin()
	if tx.Error != nil {
		return false, tx.Error
	}

	var codes []models.MfaBackupCode
	// Enforce Pessimistic Locking (SELECT FOR UPDATE) to prevent concurrency race conditions with MFA resets
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("user_id = ? AND used = ?", userID, false).Find(&codes).Error
	if err != nil {
		tx.Rollback()
		return false, err
	}

	for _, c := range codes {
		err := bcrypt.CompareHashAndPassword([]byte(c.CodeHash), []byte(rawCode))
		if err == nil {
			// Code matches! Mark as used in database
			if errUpdate := tx.Model(&c).Update("used", true).Error; errUpdate != nil {
				tx.Rollback()
				return false, errUpdate
			}
			if errCommit := tx.Commit().Error; errCommit != nil {
				return false, errCommit
			}
			return true, nil
		}
	}

	tx.Rollback()
	return false, nil
}
