package domain

import (
	"time"

	"github.com/google/uuid"
)

type Ticket struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	ExternalID    *string    `json:"external_id" db:"external_id"`
	Subject       string     `json:"subject" db:"subject"`
	Body          string     `json:"body" db:"body"`
	ClientName    *string    `json:"client_name" db:"client_name"`
	ClientSegment *string    `json:"client_segment" db:"client_segment"`
	SourceChannel *string    `json:"source_channel" db:"source_channel"`
	Status        string     `json:"status" db:"status"`
	RawAddress    *string    `json:"raw_address" db:"raw_address"`
	ManagerID     *uuid.UUID `json:"manager_id,omitempty" db:"manager_id"`
	OfficeID      *uuid.UUID `json:"office_id,omitempty" db:"office_id"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type TicketAI struct {
	ID                  uuid.UUID  `json:"id" db:"id"`
	TicketID            uuid.UUID  `json:"ticket_id" db:"ticket_id"`
	Type                *string    `json:"type" db:"type"`
	Sentiment           *string    `json:"sentiment" db:"sentiment"`
	Priority110         *int       `json:"priority_1_10" db:"priority_1_10"`
	Lang                string     `json:"lang" db:"lang"`
	Summary             *string    `json:"summary" db:"summary"`
	RecommendedActions  []byte     `json:"recommended_actions" db:"recommended_actions"`
	Lat                 *float64   `json:"lat" db:"lat"`
	Lon                 *float64   `json:"lon" db:"lon"`
	GeoStatus           string     `json:"geo_status" db:"geo_status"`
	ConfidenceType      *float64   `json:"confidence_type" db:"confidence_type"`
	ConfidenceSentiment *float64   `json:"confidence_sentiment" db:"confidence_sentiment"`
	ConfidencePriority  *float64   `json:"confidence_priority" db:"confidence_priority"`
	EnrichedAt          *time.Time `json:"enriched_at" db:"enriched_at"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
}

type TicketListFilter struct {
	Page      int
	PerPage   int
	Status    string
	Sentiment string
	Segment   string
	Type      string
	Lang      string
	Search    string
}

type TicketWithDetails struct {
	Ticket     Ticket            `json:"ticket"`
	AI         *TicketAI         `json:"ai"`
	Assignment *TicketAssignment `json:"assignment"`
	Manager    *ManagerWithOffice `json:"assigned_manager"`
	AuditTrail []AuditLog        `json:"audit_trail"`
}

// EnrichmentResult is the payload from n8n callback.
type EnrichmentResult struct {
	TicketID            uuid.UUID `json:"ticket_id"`
	Type                string    `json:"type"`
	Sentiment           string    `json:"sentiment"`
	Priority110         int       `json:"priority_1_10"`
	Lang                string    `json:"lang"`
	Summary             string    `json:"summary"`
	RecommendedActions  []string  `json:"recommended_actions"`
	Lat                 *float64  `json:"lat"`
	Lon                 *float64  `json:"lon"`
	GeoStatus           string    `json:"geo_status"`
	ConfidenceType      float64   `json:"confidence_type"`
	ConfidenceSentiment float64   `json:"confidence_sentiment"`
	ConfidencePriority  float64   `json:"confidence_priority"`
}
