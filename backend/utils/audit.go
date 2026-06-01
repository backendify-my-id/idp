package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"os"
	"time"
)

type SecurityAuditLog struct {
	Timestamp string `json:"timestamp"`
	ActorID   string `json:"actor_id,omitempty"`
	Action    string `json:"action"`
	EmailHash string `json:"email_hash,omitempty"`
	IpAddress string `json:"ip_address,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
	Details   string `json:"details,omitempty"`
}

// HashEmailGDPR hashes user emails to protect Personally Identifiable Information (PII) under GDPR compliance
func HashEmailGDPR(email string) string {
	if email == "" {
		return ""
	}
	secret := os.Getenv("APP_SECRET")
	if secret == "" {
		secret = "default_secure_audit_salt"
	}
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(email))
	return hex.EncodeToString(h.Sum(nil))
}

// LogSecurityEvent dispatches a structured JSON audit log for external indexing (Splunk/Elasticsearch)
func LogSecurityEvent(actorID string, action string, email string, ip string, userAgent string, details string) {
	emailHash := HashEmailGDPR(email)
	logEntry := SecurityAuditLog{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		ActorID:   actorID,
		Action:    action,
		EmailHash: emailHash,
		IpAddress: ip,
		UserAgent: userAgent,
		Details:   details,
	}

	jsonData, err := json.Marshal(logEntry)
	if err == nil {
		log.Printf("[AUDIT_JSON] %s", string(jsonData))
	} else {
		log.Printf("Failed to marshal audit log: %v", err)
	}
}
