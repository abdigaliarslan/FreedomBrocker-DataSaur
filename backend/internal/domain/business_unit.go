package domain

import (
	"time"

	"github.com/google/uuid"
)

type BusinessUnit struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	City      string    `json:"city" db:"city"`
	Address   *string   `json:"address" db:"address"`
	Lat       *float64  `json:"lat" db:"lat"`
	Lon       *float64  `json:"lon" db:"lon"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
