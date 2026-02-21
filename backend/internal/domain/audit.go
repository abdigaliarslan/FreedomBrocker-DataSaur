package domain

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID         uuid.UUID `json:"id" db:"id"`
	TicketID   uuid.UUID `json:"ticket_id" db:"ticket_id"`
	Step       string    `json:"step" db:"step"`
	InputData  []byte    `json:"input_data" db:"input_data"`
	OutputData []byte    `json:"output_data" db:"output_data"`
	Decision   string    `json:"decision" db:"decision"`
	Candidates []byte    `json:"candidates" db:"candidates"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// Audit step constants.
const (
	AuditStepAIEnrich   = "ai_enrich"
	AuditStepGeoFilter  = "geo_filter"
	AuditStepSkillFilter = "skill_filter"
	AuditStepLoadBalance = "load_balance"
	AuditStepRoundRobin  = "round_robin"
)
