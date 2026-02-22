package domain

import (
	"time"

	"github.com/google/uuid"
)

type Manager struct {
	ID             uuid.UUID `json:"id" db:"id"`
	FullName       string    `json:"full_name" db:"full_name"`
	Email          *string   `json:"email" db:"email"`
	BusinessUnitID uuid.UUID `json:"business_unit_id" db:"business_unit_id"`
	IsVIPSkill     bool      `json:"is_vip_skill" db:"is_vip_skill"`
	IsChiefSpec    bool      `json:"is_chief_spec" db:"is_chief_spec"`
	Languages      []string  `json:"languages" db:"languages"`
	MaxLoad        int       `json:"max_load" db:"max_load"`
	CurrentLoad    int       `json:"current_load" db:"current_load"`
	IsActive       bool      `json:"is_active" db:"is_active"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type ManagerWithOffice struct {
	Manager
	OfficeName  string   `json:"office_name"`
	OfficeCity  string   `json:"office_city"`
	OfficeLat   *float64 `json:"office_lat"`
	OfficeLon   *float64 `json:"office_lon"`
	Utilization float64  `json:"utilization_pct"`
}
