package services

import (
	"math"

	"backendify_idp/config"
	"backendify_idp/models"
)

type AuditLogsResponse struct {
	Logs       []models.AuditEvent `json:"logs"`
	Total      int64               `json:"total"`
	Page       int                 `json:"page"`
	Limit      int                 `json:"limit"`
	TotalPages int                 `json:"total_pages"`
}

func (s *AuthService) GetAuditLogs(page, limit int, actionFilter, searchQuery string) (*AuditLogsResponse, error) {
	var logs []models.AuditEvent
	var total int64

	db := config.DB.Model(&models.AuditEvent{})

	if actionFilter != "" {
		db = db.Where("action = ?", actionFilter)
	}

	if searchQuery != "" {
		searchLike := "%" + searchQuery + "%"
		db = db.Where("actor_id LIKE ? OR details LIKE ? OR ip_address LIKE ? OR email_hash LIKE ? OR action LIKE ?", searchLike, searchLike, searchLike, searchLike, searchLike)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, err
	}

	offset := (page - 1) * limit
	if err := db.Order("timestamp desc").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	return &AuditLogsResponse{
		Logs:       logs,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}
