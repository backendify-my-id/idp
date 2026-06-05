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
	"backendify_idp/utils"

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

	tx := config.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	var role models.Role
	if err := tx.Where("role_name = ?", roleName).First(&role).Error; err != nil {
		tx.Rollback()
		return errors.New("role not found")
	}

	if assign {
		// Enforce mutual exclusivity
		if roleName == "admin" {
			// If assigning admin, remove all other roles for this user
			if err := tx.Where("user_id = ?", userID).Delete(&models.UserRole{}).Error; err != nil {
				tx.Rollback()
				return err
			}
		} else {
			// If assigning a non-admin role, remove the admin role if it currently exists for this user
			var adminRole models.Role
			if err := tx.Where("role_name = ?", "admin").First(&adminRole).Error; err == nil {
				if err := tx.Where("user_id = ? AND role_id = ?", userID, adminRole.ID).Delete(&models.UserRole{}).Error; err != nil {
					tx.Rollback()
					return err
				}
			}
		}

		// Ensure the new role mapping is created
		var count int64
		tx.Model(&models.UserRole{}).Where("user_id = ? AND role_id = ?", userID, role.ID).Count(&count)
		if count == 0 {
			userRole := models.UserRole{
				UserID: userID,
				RoleID: role.ID,
			}
			if err := tx.Create(&userRole).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	} else {
		// Just unassign the role
		if err := tx.Where("user_id = ? AND role_id = ?", userID, role.ID).Delete(&models.UserRole{}).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return err
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

func (s *AuthService) InitiateEmailChangeStep1(userIDStr string) (string, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return "", errors.New("invalid user ID")
	}

	// Fetch current email from DB
	var user models.User
	if err := config.DB.Select("email").Where("id = ?", userID).First(&user).Error; err != nil {
		return "", errors.New("user not found")
	}
	currentEmail := user.Email

	// Generate 6-digit numeric OTP
	otp, err := utils.GenerateOTP(6)
	if err != nil {
		return "", err
	}

	// Save OTP in Redis with 5-minute TTL
	ctx := context.Background()
	err = config.RedisClient.Set(ctx, "email_change:otp:old:"+userIDStr, otp, 5*time.Minute).Err()
	if err != nil {
		return "", errors.New("failed to save OTP in cache")
	}

	// Dispatch OTP to current email
	subject := "Change Email Request - Verification OTP"
	title := "Verifikasi Perubahan Email"
	subtitle := "Langkah 1: Verifikasi Identitas Email Lama"
	bodyText := "Anda telah meminta untuk mengubah alamat email terdaftar pada akun Anda. Silakan verifikasi identitas email lama Anda menggunakan kode OTP di bawah ini."
	warning := "Jika Anda tidak meminta perubahan email ini, harap segera amankan akun Anda atau hubungi tim administrasi."

	go func() {
		err := utils.SendHTMLTemplateEmail(currentEmail, subject, title, subtitle, bodyText, otp, "5 Menit", warning)
		if err != nil {
			log.Printf("Failed to send step 1 OTP to %s: %v", currentEmail, err)
		}
	}()

	log.Printf("[DEV] Step 1 OTP for User %s to old email (%s): %s", userIDStr, currentEmail, otp)

	return otp, nil
}

func (s *AuthService) VerifyEmailChangeStep1(userIDStr, otp string) (string, error) {
	_, err := uuid.Parse(userIDStr)
	if err != nil {
		return "", errors.New("invalid user ID")
	}

	ctx := context.Background()
	redisKey := "email_change:otp:old:" + userIDStr

	// Fetch and delete immediately to prevent replay attacks
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
			return "", errors.New("OTP expired or not requested")
		}
		return "", err
	}

	cachedOtp, ok := res.(string)
	if !ok || cachedOtp == "" {
		return "", errors.New("OTP expired or not requested")
	}

	if cachedOtp != otp {
		return "", errors.New("invalid OTP code")
	}

	// Generate secure temp_token
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	tempToken := hex.EncodeToString(bytes)

	// Save temp_token in Redis with 10-minute TTL
	sessionKey := "email_change:session:" + userIDStr
	err = config.RedisClient.Set(ctx, sessionKey, tempToken, 10*time.Minute).Err()
	if err != nil {
		return "", errors.New("failed to create temporary session in cache")
	}

	return tempToken, nil
}

func (s *AuthService) CheckNewEmailStep2(userIDStr, tempToken, newEmail string) (string, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return "", errors.New("invalid user ID")
	}

	ctx := context.Background()
	sessionKey := "email_change:session:" + userIDStr

	// Validate tempToken
	cachedToken, err := config.RedisClient.Get(ctx, sessionKey).Result()
	if err != nil || cachedToken != tempToken {
		return "", errors.New("invalid or expired verification session")
	}

	// Check if new email is already registered
	var count int64
	config.DB.Model(&models.User{}).Where("email = ? AND id != ?", newEmail, userID).Count(&count)
	if count > 0 {
		return "", errors.New("email address is already registered")
	}

	// Generate 6-digit OTP for new email
	otp, err := utils.GenerateOTP(6)
	if err != nil {
		return "", err
	}

	// Store step 3 payload in Redis with 5-minute TTL
	payload := map[string]string{
		"new_email":  newEmail,
		"otp":        otp,
		"temp_token": tempToken,
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	step3Key := "email_change:step3:" + userIDStr
	err = config.RedisClient.Set(ctx, step3Key, payloadJSON, 5*time.Minute).Err()
	if err != nil {
		return "", errors.New("failed to store step 3 state in cache")
	}

	// Dispatch OTP to the new email
	subject := "Verify Your New Email Address - Verification OTP"
	title := "Konfirmasi Email Baru"
	subtitle := "Langkah 3: Konfirmasi Kepemilikan Email Baru"
	bodyText := "Langkah terakhir untuk memperbarui email Anda. Silakan verifikasi kepemilikan alamat email baru ini dengan menggunakan kode OTP di bawah ini."
	warning := "Jika Anda tidak mengajukan perubahan email ini, abaikan email ini secara aman."

	go func() {
		err := utils.SendHTMLTemplateEmail(newEmail, subject, title, subtitle, bodyText, otp, "5 Menit", warning)
		if err != nil {
			log.Printf("Failed to send step 3 OTP to %s: %v", newEmail, err)
		}
	}()

	log.Printf("[DEV] Step 3 OTP for User %s to new email (%s): %s", userIDStr, newEmail, otp)

	return otp, nil
}

func (s *AuthService) ConfirmEmailChangeStep3(userIDStr, tempToken, otp string) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid user ID")
	}

	ctx := context.Background()
	step3Key := "email_change:step3:" + userIDStr

	// Fetch and delete immediately to prevent replay attacks
	script := `
		local val = redis.call('get', KEYS[1])
		if val then
			redis.call('del', KEYS[1])
		end
		return val
	`
	res, err := config.RedisClient.Eval(ctx, script, []string{step3Key}).Result()
	if err != nil {
		if err.Error() == "redis: nil" {
			return errors.New("verification session expired or not initiated")
		}
		return err
	}

	payloadStr, ok := res.(string)
	if !ok || payloadStr == "" {
		return errors.New("verification session expired or not initiated")
	}

	var payload map[string]string
	if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
		return err
	}

	// Validate tempToken and OTP
	if payload["temp_token"] != tempToken {
		return errors.New("invalid verification session")
	}
	if payload["otp"] != otp {
		return errors.New("invalid OTP code for the new email")
	}

	newEmail := payload["new_email"]

	// DB Transaction to ensure atomic updates
	tx := config.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Double-check email availability with GORM lock/check
	var count int64
	if err := tx.Model(&models.User{}).Where("email = ? AND id != ?", newEmail, userID).Count(&count).Error; err != nil {
		tx.Rollback()
		return err
	}
	if count > 0 {
		tx.Rollback()
		return errors.New("email address is already registered to another user")
	}

	// Perform atomic update
	err = tx.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"email":              newEmail,
		"is_email_verified": true,
	}).Error
	if err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	// Invalidate temporary token and active cached session
	sessionKey := "email_change:session:" + userIDStr
	config.RedisClient.Del(ctx, sessionKey)
	config.RedisClient.Del(ctx, "user:cache:"+userIDStr)

	return nil
}

func (s *AuthService) ChangePasswordStep1Verify(userIDStr, oldPassword string) (bool, string, error) {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return false, "", errors.New("invalid request or verification failed")
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return false, "", errors.New("invalid request or verification failed")
	}

	// Verify old password hash
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword))
	if err != nil {
		return false, "", errors.New("invalid request or verification failed")
	}

	// Generate secure tempToken
	bytes := make([]byte, 24)
	if _, err := rand.Read(bytes); err != nil {
		return false, "", err
	}
	tempToken := hex.EncodeToString(bytes)

	// Determine initial step state based on MFA status
	step := "authenticated"
	if !user.MfaEnabled {
		step = "mfa_verified"
	}

	// Save session in Redis
	ctx := context.Background()
	payload := map[string]string{
		"step":       step,
		"temp_token": tempToken,
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return false, "", err
	}

	sessionKey := "password_change:session:" + userIDStr
	err = config.RedisClient.Set(ctx, sessionKey, payloadJSON, 10*time.Minute).Err()
	if err != nil {
		return false, "", errors.New("failed to save password change session in cache")
	}

	return user.MfaEnabled, tempToken, nil
}

func (s *AuthService) ChangePasswordStep2VerifyMFA(userIDStr, tempToken, code string) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid request or verification failed")
	}

	ctx := context.Background()
	sessionKey := "password_change:session:" + userIDStr

	payloadStr, err := config.RedisClient.Get(ctx, sessionKey).Result()
	if err != nil {
		return errors.New("verification session expired or not initiated")
	}

	var payload map[string]string
	if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
		return err
	}

	if payload["temp_token"] != tempToken || payload["step"] != "authenticated" {
		return errors.New("invalid or expired verification session")
	}

	// Try validating TOTP code first
	totpValid, err := s.VerifyMfaCode(userIDStr, code)
	if !totpValid {
		// Fallback to emergency backup code check
		backupValid, errBackup := s.VerifyBackupCode(userID, code)
		if errBackup != nil || !backupValid {
			return errors.New("invalid verification code")
		}
	}

	// Update step state to mfa_verified
	payload["step"] = "mfa_verified"
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	err = config.RedisClient.Set(ctx, sessionKey, payloadJSON, 10*time.Minute).Err()
	if err != nil {
		return errors.New("failed to update password change session in cache")
	}

	return nil
}

func (s *AuthService) ChangePasswordStep3Update(userIDStr, tempToken, newPassword string) error {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("invalid request or verification failed")
	}

	ctx := context.Background()
	sessionKey := "password_change:session:" + userIDStr

	payloadStr, err := config.RedisClient.Get(ctx, sessionKey).Result()
	if err != nil {
		return errors.New("verification session expired or not initiated")
	}

	var payload map[string]string
	if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
		return err
	}

	if payload["temp_token"] != tempToken || payload["step"] != "mfa_verified" {
		return errors.New("invalid or expired verification session")
	}

	// Validate password strength
	if len(newPassword) < 8 {
		return errors.New("password must be at least 8 characters long")
	}
	if !utils.IsValidPassword(newPassword) {
		return errors.New("password must contain uppercase, lowercase, numbers, and symbols")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// DB Transaction to ensure atomic updates and complete session revocation
	tx := config.DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update user password
	var user models.User
	if err := tx.Where("id = ?", userID).First(&user).Error; err != nil {
		tx.Rollback()
		return errors.New("user not found")
	}

	if err := tx.Model(&user).Update("password_hash", string(hashedPassword)).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Fetch all user sessions/refresh tokens to blacklist them in Redis
	var sessions []models.RefreshToken
	tx.Select("id").Where("user_id = ?", userID).Find(&sessions)

	// Purge all active sessions in Database
	if err := tx.Where("user_id = ?", userID).Delete(&models.RefreshToken{}).Error; err != nil {
		tx.Rollback()
		return err
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.AuthorizationCode{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	// Blacklist all active session IDs in Redis
	for _, sess := range sessions {
		config.RedisClient.Set(ctx, "session:revoked:"+sess.ID.String(), "1", 24*time.Hour)
	}

	// Evict user cache in Redis
	config.RedisClient.Del(ctx, "user:cache:"+userIDStr)
	config.RedisClient.Del(ctx, sessionKey)

	// Send notification email asynchronously
	subject := "Security Notification: Password Changed"
	title := "Kata Sandi Diperbarui"
	subtitle := "Notifikasi Keamanan Akun"
	bodyText := "Kata sandi untuk akun Backendify Anda telah berhasil diubah secara aman. Semua sesi login aktif lainnya di perangkat lain telah dinonaktifkan demi keselamatan Anda."
	warning := "Jika Anda tidak melakukan perubahan ini, silakan hubungi tim administrator atau dukungan kami segera untuk mengunci akun Anda."

	go func() {
		_ = utils.SendHTMLTemplateEmail(user.Email, subject, title, subtitle, bodyText, "", "", warning)
	}()

	return nil
}
