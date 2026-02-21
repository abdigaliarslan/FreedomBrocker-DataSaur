package domain

import (
	"time"

	"github.com/google/uuid"
)

type TicketAssignment struct {
	ID             uuid.UUID `json:"id" db:"id"`
	TicketID       uuid.UUID `json:"ticket_id" db:"ticket_id"`
	ManagerID      uuid.UUID `json:"manager_id" db:"manager_id"`
	BusinessUnitID uuid.UUID `json:"business_unit_id" db:"business_unit_id"`
	AssignedAt     time.Time `json:"assigned_at" db:"assigned_at"`
	RoutingReason  *string   `json:"routing_reason" db:"routing_reason"`
	IsCurrent      bool      `json:"is_current" db:"is_current"`
}
