package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID              uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Email           string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	PasswordHash    string    `gorm:"type:text;not null"`
	Status          string    `gorm:"type:varchar(20);default:'active'"` // active, banned, suspended
	IsEmailVerified bool      `gorm:"default:false"`
	MfaEnabled      bool      `gorm:"default:false"`
	MfaSecret       string    `gorm:"type:text"` // Encrypted
	LastLoginAt     *time.Time
	CreatedAt       time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt       time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	Profile         Profile   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;"`
}

type Profile struct {
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey"`
	FullName  string    `gorm:"type:varchar(255)"`
	AvatarUrl string    `gorm:"type:text"`
	Bio       string    `gorm:"type:text"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

type Role struct {
	ID        int       `gorm:"primaryKey;autoIncrement"`
	RoleName  string    `gorm:"type:varchar(50);uniqueIndex;not null"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

type UserRole struct {
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey"`
	RoleID    int       `gorm:"primaryKey"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

type Client struct {
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	AppClientID      string    `gorm:"column:client_id;type:varchar(255);not null"`
	ClientName       string    `gorm:"type:varchar(255);not null"`
	ClientSecretHash string    `gorm:"type:text;not null"`
	IsPkceRequired   bool      `gorm:"default:true"`
	CreatedAt        time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt        time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

type ClientRedirectUrl struct {
	ID        int       `gorm:"primaryKey;autoIncrement"`
	ClientID  uuid.UUID `gorm:"type:uuid"`
	Url       string    `gorm:"type:text;not null"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	Client    Client    `gorm:"constraint:OnDelete:CASCADE;"`
}

type Scope struct {
	ID          int       `gorm:"primaryKey;autoIncrement"`
	ScopeName   string    `gorm:"type:varchar(100);uniqueIndex;not null"`
	Description string    `gorm:"type:text"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

type ClientScope struct {
	ClientID  uuid.UUID `gorm:"type:uuid;primaryKey"`
	ScopeID   int       `gorm:"primaryKey"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

type AuthorizationCode struct {
	Code                string    `gorm:"type:varchar(255);primaryKey"`
	UserID              uuid.UUID `gorm:"type:uuid"`
	ClientID            uuid.UUID `gorm:"type:uuid"`
	CodeChallenge       string    `gorm:"type:text"`
	CodeChallengeMethod string    `gorm:"type:varchar(20)"`
	Scope               string    `gorm:"type:text"` // Persist requested OIDC scopes
	ExpiresAt           time.Time `gorm:"not null"`
	CreatedAt           time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt           time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	User                User      `gorm:"constraint:OnDelete:CASCADE;"`
	Client              Client    `gorm:"constraint:OnDelete:CASCADE;"`
}

type RefreshToken struct {
	ID        uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	TokenHash string     `gorm:"type:text;uniqueIndex;not null"`
	UserID    uuid.UUID  `gorm:"type:uuid"`
	ClientID  *uuid.UUID `gorm:"type:uuid"`
	UserAgent string     `gorm:"type:text"`
	IpAddress string     `gorm:"type:varchar(45)"`
	ExpiresAt time.Time  `gorm:"not null"`
	CreatedAt time.Time  `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time  `gorm:"default:CURRENT_TIMESTAMP"`
	User      User       `gorm:"constraint:OnDelete:CASCADE;"`
	Client    Client     `gorm:"constraint:OnDelete:CASCADE;"`
}

type UserAuthorization struct {
	ID        int       `gorm:"primaryKey;autoIncrement"`
	UserID    uuid.UUID `gorm:"type:uuid"`
	ClientID  uuid.UUID `gorm:"type:uuid"`
	ScopeID   int       `gorm:"primaryKey"`
	GrantedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	User      User      `gorm:"constraint:OnDelete:CASCADE;"`
	Client    Client    `gorm:"constraint:OnDelete:CASCADE;"`
	Scope     Scope     `gorm:"constraint:OnDelete:CASCADE;"`
}
