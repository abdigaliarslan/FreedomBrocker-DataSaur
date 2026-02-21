package domain

import (
	"time"

	"github.com/google/uuid"
)

type GeoCache struct {
	ID           uuid.UUID `json:"id" db:"id"`
	RawAddress   string    `json:"raw_address" db:"raw_address"`
	Lat          *float64  `json:"lat" db:"lat"`
	Lon          *float64  `json:"lon" db:"lon"`
	ResolvedCity *string   `json:"resolved_city" db:"resolved_city"`
	GeoStatus    string    `json:"geo_status" db:"geo_status"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type RRPointer struct {
	ID             uuid.UUID `json:"id" db:"id"`
	BusinessUnitID uuid.UUID `json:"business_unit_id" db:"business_unit_id"`
	SkillGroup     string    `json:"skill_group" db:"skill_group"`
	LastManagerIdx int       `json:"last_manager_idx" db:"last_manager_idx"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
