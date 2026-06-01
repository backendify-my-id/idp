package controllers

import (
	"fmt"
	"os"
	"strings"
	"time"

	"backendify_idp/config"
	"backendify_idp/models"
	"backendify_idp/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenRequest struct {
	GrantType    string `json:"grant_type" form:"grant_type"`
	ClientID     string `json:"client_id" form:"client_id"`
	ClientSecret string `json:"client_secret" form:"client_secret"`
	Code         string `json:"code" form:"code"`
	RedirectURI  string `json:"redirect_uri" form:"redirect_uri"`
	CodeVerifier string `json:"code_verifier" form:"code_verifier"`
	RefreshToken string `json:"refresh_token" form:"refresh_token"`
}

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

	// Strictly validate code_challenge_method and enforce S256 for PKCE security
	if client.IsPkceRequired {
		if codeChallenge == "" {
			return utils.SendError(ctx, fiber.StatusBadRequest, "code_challenge is required for PKCE-enabled clients")
		}
		if codeChallengeMethod != "S256" {
			return utils.SendError(ctx, fiber.StatusBadRequest, "Only S256 code_challenge_method is supported for security")
		}
	} else if codeChallenge != "" && codeChallengeMethod != "S256" {
		return utils.SendError(ctx, fiber.StatusBadRequest, "Only S256 code_challenge_method is supported for security")
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
	refreshToken, sessionID, err := c.authService.CreateRefreshToken(user.ID, &client.ID, ctx.IP(), ctx.Get("User-Agent"))
	if err != nil {
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate refresh token")
	}

	accessToken, err := c.authService.GenerateToken(user, scope, sessionID)
	if err != nil {
		config.DB.Where("id = ?", sessionID).Delete(&models.RefreshToken{})
		return utils.SendError(ctx, fiber.StatusInternalServerError, "Failed to generate access token")
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
