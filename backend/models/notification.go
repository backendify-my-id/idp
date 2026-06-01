package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Text      string    `gorm:"type:text;not null" json:"text"`
	Unread    bool      `gorm:"default:true" json:"unread"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	User      User      `gorm:"constraint:OnDelete:CASCADE;" json:"-"`
}
