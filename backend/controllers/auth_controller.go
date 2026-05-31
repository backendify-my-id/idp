package controllers

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"
	"backendify_idp/services"
	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AuthController struct {
	authService *services.AuthService
}

func NewAuthController() *AuthController {
	return &AuthController{
		authService: services.NewAuthService(),
	}
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

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (c *AuthController) Register(ctx *fiber.Ctx) error {
	var req RegisterRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if !utils.IsValidEmail(req.Email) {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid email format")
	}

	if !utils.IsValidPassword(req.Password) {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Password must be at least 8 characters and contain upper, lower, number, and special character")
	}

	user, err := c.authService.RegisterUser(req.Email, req.Password)
	if err != nil {
		if err.Error() == "email already registered" {
			log.Printf("[AUDIT] Action: REGISTER_FAILED_DUPLICATE, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
			return utils.SendError(ctx, fiber.StatusConflict, "Email is already registered")
		}
		log.Printf("[AUDIT] Action: REGISTER_FAILED, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to register user")
	}

	// Trigger OTP generation and email dispatch
	_, _ = c.authService.SendVerificationOTP(req.Email)

	log.Printf("[AUDIT] Action: REGISTER_SUCCESS, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))

	return utils.SendSuccess(ctx, fiber.StatusCreated, "User registered successfully. Please verify your email.", fiber.Map{
		"user_id": user.ID,
		"email":   user.Email,
	})
}

type VerifyEmailRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

func (c *AuthController) VerifyEmail(ctx *fiber.Ctx) error {
	var req VerifyEmailRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Email == "" || req.OTP == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email and OTP are required")
	}

	success, err := c.authService.VerifyOTP(req.Email, req.OTP)
	if err != nil || !success {
		log.Printf("[AUDIT] Action: EMAIL_VERIFY_FAILED, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	log.Printf("[AUDIT] Action: EMAIL_VERIFY_SUCCESS, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))

	return utils.SendSuccess(ctx, fiber.StatusOK, "Email verified successfully. You can now sign in.", nil)
}

type ResendOtpRequest struct {
	Email string `json:"email"`
}

func (c *AuthController) ResendOTP(ctx *fiber.Ctx) error {
	var req ResendOtpRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Email == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email is required")
	}

	// Check if user exists and is unverified
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		log.Printf("[AUDIT] Action: RESEND_OTP_EMAIL_NOT_FOUND, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendSuccess(ctx, fiber.StatusOK, "If your email is registered and unverified, a new verification code has been sent.", nil)
	}

	if user.IsEmailVerified {
		log.Printf("[AUDIT] Action: RESEND_OTP_ALREADY_VERIFIED, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email is already verified. You can log in directly.")
	}

	// Send new OTP
	_, err := c.authService.SendVerificationOTP(req.Email)
	if err != nil {
		log.Printf("[AUDIT] Action: RESEND_OTP_FAILED, Email: %s, Error: %s, IP: %s, UserAgent: %s", req.Email, err.Error(), ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to send verification code")
	}

	log.Printf("[AUDIT] Action: RESEND_OTP_SUCCESS, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
	return utils.SendSuccess(ctx, fiber.StatusOK, "Verification code resent successfully. Please check your email.", nil)
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (c *AuthController) Login(ctx *fiber.Ctx) error {
	var req LoginRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	// 1. Check Lockout Status
	attempts, _ := c.authService.GetFailedLoginAttempts(req.Email)
	if attempts >= 5 {
		ttl, _ := c.authService.GetLockoutTTL(req.Email)
		minutes := int(ttl.Minutes())
		seconds := int(ttl.Seconds()) % 60

		var msg string
		if minutes > 0 {
			msg = fmt.Sprintf("Account locked due to too many failed attempts. Try again in %d minutes and %d seconds.", minutes, seconds)
		} else {
			msg = fmt.Sprintf("Account locked due to too many failed attempts. Try again in %d seconds.", seconds)
		}

		log.Printf("[AUDIT] Action: LOGIN_BLOCKED_LOCKOUT, Email: %s, IP: %s, UserAgent: %s, LockoutTimeLeft: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"), ttl.String())
		return ctx.Status(fiber.StatusLocked).JSON(fiber.Map{
			"success":     false,
			"message":     msg,
			"retry_after": int(ttl.Seconds()),
		})
	}

	user, err := c.authService.AuthenticateUser(req.Email, req.Password)
	if err != nil {
		// Increment failed attempts
		newAttempts, _ := c.authService.IncrementFailedLoginAttempts(req.Email)
		log.Printf("[AUDIT] Action: LOGIN_FAILED, Email: %s, IP: %s, UserAgent: %s, FailedAttempts: %d", req.Email, ctx.IP(), ctx.Get("User-Agent"), newAttempts)
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Invalid credentials")
	}

	// 2. Check if Email is Verified
	if !user.IsEmailVerified {
		log.Printf("[AUDIT] Action: LOGIN_BLOCKED_UNVERIFIED, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendError(ctx, fiber.StatusForbidden, "Please verify your email address first.")
	}

	// Reset failed attempts on success!
	_ = c.authService.ResetFailedLoginAttempts(req.Email)

	// 3. Check if MFA is enabled
	if user.MfaEnabled {
		mfaToken, err := c.authService.GenerateMfaToken(user)
		if err != nil {
			return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate MFA token")
		}
		log.Printf("[AUDIT] Action: LOGIN_MFA_REQUIRED, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendSuccess(ctx, fiber.StatusOK, "MFA verification required", fiber.Map{
			"mfa_required": true,
			"mfa_token":    mfaToken,
			"email":        user.Email,
		})
	}

	token, err := c.authService.GenerateToken(user, "")
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate token")
	}

	refreshToken, err := c.authService.CreateRefreshToken(user.ID, nil, ctx.IP(), ctx.Get("User-Agent"))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate refresh token")
	}

	// Also set cookie for easier OIDC web-redirection flow!
	ctx.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    token,
		Expires:  time.Now().Add(time.Hour * 1),
		HTTPOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: "Lax",
	})

	log.Printf("[AUDIT] Action: LOGIN_SUCCESS, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))

	return utils.SendSuccess(ctx, fiber.StatusOK, "Login successful", fiber.Map{
		"access_token":  token,
		"refresh_token": refreshToken,
	})
}



// OIDC & OAuth2 Endpoints
func (c *AuthController) Authorize(ctx *fiber.Ctx) error {
	clientID := ctx.Query("client_id")
	redirectURI := ctx.Query("redirect_uri")
	responseType := ctx.Query("response_type")
	scope := ctx.Query("scope")
	state := ctx.Query("state")
	codeChallenge := ctx.Query("code_challenge")
	codeChallengeMethod := ctx.Query("code_challenge_method")

	// Validate mandatory OAuth2 params
	if clientID == "" || redirectURI == "" || responseType != "code" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Missing or invalid client_id, redirect_uri, or response_type")
	}

	// Validate client and its redirect URL
	client, err := c.authService.ValidateClient(clientID, redirectURI)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	// Check if PKCE is required
	if client.IsPkceRequired && codeChallenge == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "code_challenge is required for PKCE-enabled clients")
	}

	// Determine authentication status
	var tokenStr string

	// 1. Check Cookie
	if cookie := ctx.Cookies("jwt"); cookie != "" {
		tokenStr = cookie
	}
	// 2. Check Authorization Header
	if authHeader := ctx.Get("Authorization"); authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenStr = parts[1]
		}
	}
	// 3. Check Query Param (helps for direct testing / Postman redirects)
	if qToken := ctx.Query("token"); qToken != "" {
		tokenStr = qToken
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	if tokenStr == "" {
		// Redirect to login page on the frontend
		loginURL := fmt.Sprintf("%s/login?client_id=%s&redirect_uri=%s&response_type=%s&scope=%s&state=%s&code_challenge=%s&code_challenge_method=%s",
			frontendURL, clientID, redirectURI, responseType, scope, state, codeChallenge, codeChallengeMethod)
		return ctx.Redirect(loginURL)
	}

	// Validate Token
	secret := os.Getenv("APP_SECRET")
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		// If token is invalid or expired, redirect to login page
		loginURL := fmt.Sprintf("%s/login?client_id=%s&redirect_uri=%s&response_type=%s&scope=%s&state=%s&code_challenge=%s&code_challenge_method=%s",
			frontendURL, clientID, redirectURI, responseType, scope, state, codeChallenge, codeChallengeMethod)
		return ctx.Redirect(loginURL)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Invalid token claims")
	}

	userIDStr, ok := claims["sub"].(string)
	if !ok {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Invalid subject claim")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to parse user ID")
	}

	// User is authenticated! Create authorization code
	code, err := c.authService.CreateAuthorizationCode(userID, client.ID, codeChallenge, codeChallengeMethod, scope)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to create authorization code")
	}

	// Redirect back to client redirect_uri with code and state
	redirectURL := fmt.Sprintf("%s?code=%s", redirectURI, code)
	if state != "" {
		redirectURL = fmt.Sprintf("%s&state=%s", redirectURL, state)
	}

	return ctx.Redirect(redirectURL)
}

type TokenRequest struct {
	GrantType    string `json:"grant_type" form:"grant_type"`
	ClientID     string `json:"client_id" form:"client_id"`
	ClientSecret string `json:"client_secret" form:"client_secret"`
	Code         string `json:"code" form:"code"`
	RedirectURI  string `json:"redirect_uri" form:"redirect_uri"`
	CodeVerifier string `json:"code_verifier" form:"code_verifier"`
	RefreshToken string `json:"refresh_token" form:"refresh_token"`
}

func (c *AuthController) Token(ctx *fiber.Ctx) error {
	var req TokenRequest
	// Support parsing both form-urlencoded and JSON body!
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	// If form parser failed or empty, double-check query params or form post values
	if req.GrantType == "" {
		req.GrantType = ctx.FormValue("grant_type")
		req.ClientID = ctx.FormValue("client_id")
		req.ClientSecret = ctx.FormValue("client_secret")
		req.Code = ctx.FormValue("code")
		req.RedirectURI = ctx.FormValue("redirect_uri")
		req.CodeVerifier = ctx.FormValue("code_verifier")
		req.RefreshToken = ctx.FormValue("refresh_token")
	}

	if req.GrantType != "authorization_code" && req.GrantType != "refresh_token" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Unsupported grant_type. Supported types: 'authorization_code', 'refresh_token'.")
	}

	if req.GrantType == "refresh_token" {
		if req.RefreshToken == "" {
			return utils.SendError(ctx, fiber.StatusBadRequest, "Missing refresh_token")
		}

		accessToken, newRefreshToken, err := c.authService.RefreshAccessToken(req.RefreshToken, ctx.IP(), ctx.Get("User-Agent"))
		if err != nil {
			return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
		}

		return ctx.JSON(fiber.Map{
			"access_token":  accessToken,
			"refresh_token": newRefreshToken,
			"token_type":    "Bearer",
			"expires_in":    3600,
		})
	}

	if req.ClientID == "" || req.Code == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Missing client_id or code")
	}

	user, client, scope, err := c.authService.ExchangeCode(req.ClientID, req.ClientSecret, req.Code, req.CodeVerifier, req.RedirectURI)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	// Exchanged successfully! Generate Access Token & ID Token
	accessToken, err := c.authService.GenerateToken(user, scope)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate access token")
	}

	refreshToken, err := c.authService.CreateRefreshToken(user.ID, &client.ID, ctx.IP(), ctx.Get("User-Agent"))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate refresh token")
	}

	idTokenClaims := jwt.MapClaims{
		"iss":   "http://localhost:8800",
		"sub":   user.ID.String(),
		"aud":   client.AppClientID,
		"email": user.Email,
		"exp":   time.Now().Add(time.Hour * 1).Unix(),
		"iat":   time.Now().Unix(),
	}

	// Conditionally embed roles claim in ID Token if requested
	if scope != "" {
		scopes := strings.Split(scope, " ")
		for _, sc := range scopes {
			if sc == "roles" || sc == "groups" {
				roles, err := c.authService.GetUserRoles(user.ID)
				if err == nil {
					idTokenClaims["roles"] = roles
				}
				break
			}
		}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, idTokenClaims)
	secret := os.Getenv("APP_SECRET")
	idToken, err := token.SignedString([]byte(secret))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate ID token")
	}

	responseScope := "openid email profile"
	if scope != "" {
		responseScope = scope
	}

	return ctx.JSON(fiber.Map{
		"access_token":  accessToken,
		"id_token":      idToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    3600, // 1 hour
		"scope":         responseScope,
	})
}

func (c *AuthController) UserInfo(ctx *fiber.Ctx) error {
	userIDStr := getLocalString(ctx, "user_id")
	if userIDStr == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var user models.User
	if err := config.DB.Preload("Profile").Where("id = ?", userIDStr).First(&user).Error; err != nil {
		return utils.SendError(ctx, fiber.StatusNotFound, "User not found")
	}

	response := fiber.Map{
		"sub":            user.ID.String(),
		"email":          user.Email,
		"email_verified": user.IsEmailVerified,
	}

	// Safely add profile details if profile exists
	if user.Profile.UserID != uuid.Nil {
		response["name"] = user.Profile.FullName
		response["picture"] = user.Profile.AvatarUrl
		response["bio"] = user.Profile.Bio
	}

	// Add roles if roles claim is present in the access token claims
	if roles := ctx.Locals("roles"); roles != nil {
		response["roles"] = roles
	}

	return ctx.JSON(response)
}

type UpdateProfileRequest struct {
	FullName  string `json:"full_name"`
	AvatarUrl string `json:"avatar_url"`
	Bio       string `json:"bio"`
}

func (c *AuthController) GetProfile(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}
	profile, err := c.authService.GetUserProfile(userID)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusNotFound, err.Error())
	}

	var user models.User
	if err := config.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		return utils.SendError(ctx, fiber.StatusNotFound, "User not found")
	}

	roles, err := c.authService.GetUserRoles(user.ID)
	if err != nil {
		roles = []string{"user"}
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Profile retrieved successfully", fiber.Map{
		"user_id":     userID,
		"profile":     profile,
		"mfa_enabled": user.MfaEnabled,
		"email":       user.Email,
		"roles":       roles,
	})
}


func (c *AuthController) UpdateProfile(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}
	
	var req UpdateProfileRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	profile, err := c.authService.UpdateUserProfile(userID, req.FullName, req.AvatarUrl, req.Bio)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to update profile")
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Profile updated successfully", profile)
}


func (c *AuthController) OpenIDConfiguration(ctx *fiber.Ctx) error {
	base := appURL()
	return ctx.JSON(fiber.Map{
		"issuer":                                base,
		"authorization_endpoint":                base + "/authorize",
		"token_endpoint":                        base + "/token",
		"userinfo_endpoint":                     base + "/userinfo",
		"jwks_uri":                              base + "/.well-known/jwks.json",
		"response_types_supported":              []string{"code"},
		"subject_types_supported":               []string{"public"},
		"id_token_signing_alg_values_supported": []string{"HS256"},
		"scopes_supported":                      []string{"openid", "email", "profile", "roles"},
	})
}

type MfaCodeRequest struct {
	Code string `json:"code"`
}

type MfaLoginRequest struct {
	MfaToken string `json:"mfa_token"`
	Code     string `json:"code"`
}

func (c *AuthController) SetupMfa(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	email := getLocalString(ctx, "email")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	secret, url, err := c.authService.GenerateMfaSetup(userID, email)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "MFA setup initiated successfully", fiber.Map{
		"secret": secret,
		"url":    url,
	})
}

func (c *AuthController) EnableMfa(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req MfaCodeRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Code == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Verification code is required")
	}

	success, err := c.authService.EnableMfa(userID, req.Code)
	if err != nil || !success {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Multi-Factor Authentication enabled successfully", nil)
}

func (c *AuthController) DisableMfa(ctx *fiber.Ctx) error {
	userID := getLocalString(ctx, "user_id")
	if userID == "" {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req MfaCodeRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Code == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Verification code is required")
	}

	success, err := c.authService.DisableMfa(userID, req.Code)
	if err != nil || !success {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Multi-Factor Authentication disabled successfully", nil)
}

func (c *AuthController) VerifyMfaLogin(ctx *fiber.Ctx) error {
	var req MfaLoginRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.MfaToken == "" || req.Code == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "MFA token and verification code are required")
	}

	// Validate MFA Token
	secret := os.Getenv("APP_SECRET")
	token, err := jwt.Parse(req.MfaToken, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		log.Printf("[AUDIT] Action: MFA_LOGIN_FAILED_EXPIRED_TOKEN, IP: %s, UserAgent: %s", ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendError(ctx, fiber.StatusUnauthorized, "MFA session expired or invalid")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["mfa_pending"] != true {
		log.Printf("[AUDIT] Action: MFA_LOGIN_FAILED_INVALID_TOKEN, IP: %s, UserAgent: %s", ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Invalid MFA token claims")
	}

	userIDStr := claims["sub"].(string)

	// Validate TOTP code
	success, err := c.authService.VerifyMfaCode(userIDStr, req.Code)
	if err != nil || !success {
		log.Printf("[AUDIT] Action: MFA_LOGIN_FAILED_WRONG_CODE, UserID: %s, IP: %s, UserAgent: %s", userIDStr, ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Incorrect verification code")
	}

	// Code is valid! Get User and generate final JWT tokens
	var user models.User
	if err := config.DB.Where("id = ?", userIDStr).First(&user).Error; err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "User not found")
	}

	finalToken, err := c.authService.GenerateToken(&user, "")
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate token")
	}

	refreshToken, err := c.authService.CreateRefreshToken(user.ID, nil, ctx.IP(), ctx.Get("User-Agent"))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate refresh token")
	}

	// Also set cookie
	ctx.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    finalToken,
		Expires:  time.Now().Add(time.Hour * 1),
		HTTPOnly: true,
		Secure:   false,
		SameSite: "Lax",
	})

	log.Printf("[AUDIT] Action: MFA_LOGIN_SUCCESS, Email: %s, IP: %s, UserAgent: %s", user.Email, ctx.IP(), ctx.Get("User-Agent"))

	return utils.SendSuccess(ctx, fiber.StatusOK, "Login successful", fiber.Map{
		"access_token":  finalToken,
		"refresh_token": refreshToken,
	})
}

// ─── Forgot / Reset Password ──────────────────────────────────────────────────

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Email       string `json:"email"`
	OTP         string `json:"otp"`
	NewPassword string `json:"new_password"`
}

func (c *AuthController) ForgotPassword(ctx *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Email == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email is required")
	}

	// Always return the same success message to prevent user enumeration
	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		log.Printf("[AUDIT] Action: FORGOT_PASSWORD_NOT_FOUND, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
		return utils.SendSuccess(ctx, fiber.StatusOK, "If your email is registered, you will receive a reset code shortly.", nil)
	}

	if _, err := c.authService.SendPasswordResetOTP(req.Email); err != nil {
		log.Printf("[AUDIT] Action: FORGOT_PASSWORD_SEND_FAILED, Email: %s, IP: %s, Error: %s", req.Email, ctx.IP(), err.Error())
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to send reset code. Please try again.")
	}

	log.Printf("[AUDIT] Action: FORGOT_PASSWORD_OTP_SENT, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
	return utils.SendSuccess(ctx, fiber.StatusOK, "If your email is registered, you will receive a reset code shortly.", nil)
}

func (c *AuthController) ResetPassword(ctx *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Email == "" || req.OTP == "" || req.NewPassword == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Email, OTP code, and new password are required")
	}

	if !utils.IsValidPassword(req.NewPassword) {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Password must be at least 8 characters and contain upper, lower, number, and special character")
	}

	if err := c.authService.ResetPassword(req.Email, req.OTP, req.NewPassword); err != nil {
		log.Printf("[AUDIT] Action: RESET_PASSWORD_FAILED, Email: %s, IP: %s, Error: %s", req.Email, ctx.IP(), err.Error())
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	log.Printf("[AUDIT] Action: RESET_PASSWORD_SUCCESS, Email: %s, IP: %s, UserAgent: %s", req.Email, ctx.IP(), ctx.Get("User-Agent"))
	return utils.SendSuccess(ctx, fiber.StatusOK, "Password has been reset successfully. You can now sign in with your new password.", nil)
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (c *AuthController) Refresh(ctx *fiber.Ctx) error {
	var req RefreshRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.RefreshToken == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Refresh token is required")
	}

	accessToken, newRefreshToken, err := c.authService.RefreshAccessToken(req.RefreshToken, ctx.IP(), ctx.Get("User-Agent"))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusUnauthorized, "Invalid or expired refresh token")
	}

	return utils.SendSuccess(ctx, fiber.StatusOK, "Token refreshed successfully", fiber.Map{
		"access_token":  accessToken,
		"refresh_token": newRefreshToken,
	})
}

// ─── OIDC Client Management (Admin Only) ──────────────────────────────────────

type CreateClientRequest struct {
	ClientName     string   `json:"client_name"`
	AppClientID    string   `json:"client_id"`
	IsPkceRequired bool     `json:"is_pkce_required"`
	RedirectURLs   []string `json:"redirect_urls"`
}

func (c *AuthController) GetClients(ctx *fiber.Ctx) error {
	dtos, err := c.authService.GetClients()
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}
	return utils.SendSuccess(ctx, fiber.StatusOK, "Clients retrieved successfully", dtos)
}

func (c *AuthController) CreateClient(ctx *fiber.Ctx) error {
	var req CreateClientRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.ClientName == "" || req.AppClientID == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Client name and client ID are required")
	}

	client, rawSecret, err := c.authService.CreateClient(req.ClientName, req.AppClientID, req.IsPkceRequired, req.RedirectURLs)
	if err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	log.Printf("[AUDIT] Action: CREATE_OIDC_CLIENT, ClientID: %s, AppClientID: %s, IP: %s, UserAgent: %s", client.ID.String(), client.AppClientID, ctx.IP(), ctx.Get("User-Agent"))

	return utils.SendSuccess(ctx, fiber.StatusCreated, "Client created successfully", fiber.Map{
		"client":        client,
		"client_secret": rawSecret,
	})
}

func (c *AuthController) DeleteClient(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Client UUID is required")
	}

	if err := c.authService.DeleteClient(id); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	log.Printf("[AUDIT] Action: DELETE_OIDC_CLIENT, ClientID: %s, IP: %s, UserAgent: %s", id, ctx.IP(), ctx.Get("User-Agent"))

	return utils.SendSuccess(ctx, fiber.StatusOK, "Client deleted successfully", nil)
}

// ─── User Management (Admin Only) ────────────────────────────────────────────

type UpdateUserRoleRequest struct {
	RoleName string `json:"role_name"`
	Assign   bool   `json:"assign"`
}

type UpdateUserStatusRequest struct {
	Status string `json:"status"`
}

func (c *AuthController) GetUsers(ctx *fiber.Ctx) error {
	dtos, err := c.authService.GetUsers()
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, err.Error())
	}
	return utils.SendSuccess(ctx, fiber.StatusOK, "Users retrieved successfully", dtos)
}

func (c *AuthController) UpdateUserRole(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "User ID is required")
	}

	var req UpdateUserRoleRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.RoleName == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Role name is required")
	}

	adminUserID := getLocalString(ctx, "user_id")
	if adminUserID == id && req.RoleName == "admin" && !req.Assign {
		return utils.SendError(ctx, fiber.StatusBadRequest, "You cannot revoke your own admin role")
	}

	if err := c.authService.UpdateUserRole(id, req.RoleName, req.Assign); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	log.Printf("[AUDIT] Action: UPDATE_USER_ROLE, TargetUserID: %s, AdminUserID: %s, Role: %s, Assigned: %t, IP: %s", id, adminUserID, req.RoleName, req.Assign, ctx.IP())

	return utils.SendSuccess(ctx, fiber.StatusOK, "User role updated successfully", nil)
}

func (c *AuthController) UpdateUserStatus(ctx *fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "User ID is required")
	}

	var req UpdateUserStatusRequest
	if err := ctx.BodyParser(&req); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid request payload")
	}

	if req.Status == "" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Status is required")
	}

	allowedStatuses := map[string]bool{"active": true, "suspended": true, "banned": true}
	if !allowedStatuses[req.Status] {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Invalid status. Allowed values: active, suspended, banned")
	}

	adminUserID := getLocalString(ctx, "user_id")
	if adminUserID == id && req.Status != "active" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "You cannot ban or suspend your own admin account")
	}

	if err := c.authService.UpdateUserStatus(id, req.Status); err != nil {
		return utils.SendError(ctx, fiber.StatusBadRequest, err.Error())
	}

	log.Printf("[AUDIT] Action: UPDATE_USER_STATUS, TargetUserID: %s, AdminUserID: %s, Status: %s, IP: %s", id, adminUserID, req.Status, ctx.IP())

	return utils.SendSuccess(ctx, fiber.StatusOK, "User status updated successfully", nil)
}


