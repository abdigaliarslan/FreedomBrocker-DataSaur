package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/arslan/fire-challenge/internal/domain"
)

type TicketRepo struct {
	pool *pgxpool.Pool
}

func NewTicketRepo(pool *pgxpool.Pool) *TicketRepo {
	return &TicketRepo{pool: pool}
}

func (r *TicketRepo) Insert(ctx context.Context, t *domain.Ticket) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO tickets (id, external_id, subject, body, client_name, client_segment, source_channel, status, raw_address, attachments)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		t.ID, t.ExternalID, t.Subject, t.Body, t.ClientName, t.ClientSegment, t.SourceChannel, t.Status, t.RawAddress, t.Attachments,
	)
	return err
}

func (r *TicketRepo) BulkInsert(ctx context.Context, tickets []domain.Ticket) ([]uuid.UUID, error) {
	batch := &pgx.Batch{}
	for _, t := range tickets {
		batch.Queue(
			`INSERT INTO tickets (id, external_id, subject, body, client_name, client_segment, source_channel, status, raw_address, attachments)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			 ON CONFLICT (external_id) DO UPDATE SET
			   subject = EXCLUDED.subject,
			   body = EXCLUDED.body,
			   client_name = EXCLUDED.client_name,
			   client_segment = EXCLUDED.client_segment,
			   source_channel = EXCLUDED.source_channel,
			   raw_address = EXCLUDED.raw_address,
			   attachments = EXCLUDED.attachments
			 RETURNING id`,
			t.ID, t.ExternalID, t.Subject, t.Body, t.ClientName, t.ClientSegment, t.SourceChannel, t.Status, t.RawAddress, t.Attachments,
		)
	}
	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	ids := make([]uuid.UUID, 0, len(tickets))
	for range tickets {
		var id uuid.UUID
		err := br.QueryRow().Scan(&id)
		if err != nil {
			return ids, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (r *TicketRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Ticket, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT t.id, t.external_id, t.subject, t.body, t.client_name, t.client_segment, t.source_channel, t.status, t.raw_address, t.attachments, t.created_at, t.updated_at,
		        a.manager_id, a.office_id
		 FROM tickets t
		 LEFT JOIN ticket_assignment a ON a.ticket_id = t.id AND a.is_current = true
		 WHERE t.id = $1`, id)

	var t domain.Ticket
	err := row.Scan(&t.ID, &t.ExternalID, &t.Subject, &t.Body, &t.ClientName, &t.ClientSegment, &t.SourceChannel, &t.Status, &t.RawAddress, &t.Attachments, &t.CreatedAt, &t.UpdatedAt,
		&t.ManagerID, &t.OfficeID)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TicketRepo) List(ctx context.Context, f domain.TicketListFilter) ([]domain.Ticket, int, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("t.status = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}
	if f.Segment != "" {
		conditions = append(conditions, fmt.Sprintf("t.client_segment = $%d", argIdx))
		args = append(args, f.Segment)
		argIdx++
	}
	if f.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(t.subject ILIKE $%d OR t.body ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}
	if f.Sentiment != "" {
		conditions = append(conditions, fmt.Sprintf("ai.sentiment = $%d", argIdx))
		args = append(args, f.Sentiment)
		argIdx++
	}
	if f.Type != "" {
		conditions = append(conditions, fmt.Sprintf("ai.type = $%d", argIdx))
		args = append(args, f.Type)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Always join ticket_ai so sentiment/type filters work
	joins := `LEFT JOIN ticket_assignment a ON a.ticket_id = t.id AND a.is_current = true
		 LEFT JOIN ticket_ai ai ON ai.ticket_id = t.id`

	// Count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM tickets t %s %s", joins, where)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	if f.PerPage <= 0 {
		f.PerPage = 20
	}
	if f.Page <= 0 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.PerPage

	query := fmt.Sprintf(
		`SELECT t.id, t.external_id, t.subject, t.body, t.client_name, t.client_segment, t.source_channel, t.status, t.raw_address, t.attachments, t.created_at, t.updated_at,
		        a.manager_id, a.office_id
		 FROM tickets t
		 %s
		 %s
		 ORDER BY CASE WHEN t.status IN ('enriched','routed') THEN 0 WHEN t.status = 'enriching' THEN 1 ELSE 2 END, t.created_at DESC
		 LIMIT $%d OFFSET $%d`, joins, where, argIdx, argIdx+1)
	args = append(args, f.PerPage, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	tickets := []domain.Ticket{}
	for rows.Next() {
		var t domain.Ticket
		if err := rows.Scan(&t.ID, &t.ExternalID, &t.Subject, &t.Body, &t.ClientName, &t.ClientSegment, &t.SourceChannel, &t.Status, &t.RawAddress, &t.Attachments, &t.CreatedAt, &t.UpdatedAt,
			&t.ManagerID, &t.OfficeID); err != nil {
			return nil, 0, err
		}
		tickets = append(tickets, t)
	}

	return tickets, total, nil
}

func (r *TicketRepo) ListByManager(ctx context.Context, managerID uuid.UUID) ([]domain.Ticket, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT t.id, t.external_id, t.subject, t.body, t.client_name, t.client_segment, t.source_channel, t.status, t.raw_address, t.attachments, t.created_at, t.updated_at,
		        ta.manager_id, ta.office_id
		 FROM tickets t
		 JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_current = true
		 WHERE ta.manager_id = $1
		 ORDER BY t.created_at DESC
		 LIMIT 20`, managerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tickets := []domain.Ticket{}
	for rows.Next() {
		var t domain.Ticket
		if err := rows.Scan(&t.ID, &t.ExternalID, &t.Subject, &t.Body, &t.ClientName, &t.ClientSegment, &t.SourceChannel, &t.Status, &t.RawAddress, &t.Attachments, &t.CreatedAt, &t.UpdatedAt,
			&t.ManagerID, &t.OfficeID); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	return tickets, nil
}

func (r *TicketRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE tickets SET status = $1, updated_at = now() WHERE id = $2`, status, id)
	return err
}

func (r *TicketRepo) GetAI(ctx context.Context, ticketID uuid.UUID) (*domain.TicketAI, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, ticket_id, type, sentiment, priority_1_10, lang, summary, recommended_actions,
		        lat, lon, geo_status, confidence_type, confidence_sentiment, confidence_priority, processing_ms, enriched_at, created_at
		 FROM ticket_ai WHERE ticket_id = $1`, ticketID)

	var ai domain.TicketAI
	err := row.Scan(&ai.ID, &ai.TicketID, &ai.Type, &ai.Sentiment, &ai.Priority110, &ai.Lang,
		&ai.Summary, &ai.RecommendedActions, &ai.Lat, &ai.Lon, &ai.GeoStatus,
		&ai.ConfidenceType, &ai.ConfidenceSentiment, &ai.ConfidencePriority, &ai.ProcessingMs, &ai.EnrichedAt, &ai.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ai, nil
}

func (r *TicketRepo) UpsertAI(ctx context.Context, ai *domain.TicketAI) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO ticket_ai (id, ticket_id, type, sentiment, priority_1_10, lang, summary, recommended_actions,
		                        lat, lon, geo_status, confidence_type, confidence_sentiment, confidence_priority, processing_ms, enriched_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		 ON CONFLICT (ticket_id) DO UPDATE SET
		   type = EXCLUDED.type, sentiment = EXCLUDED.sentiment, priority_1_10 = EXCLUDED.priority_1_10,
		   lang = EXCLUDED.lang, summary = EXCLUDED.summary, recommended_actions = EXCLUDED.recommended_actions,
		   lat = EXCLUDED.lat, lon = EXCLUDED.lon, geo_status = EXCLUDED.geo_status,
		   confidence_type = EXCLUDED.confidence_type, confidence_sentiment = EXCLUDED.confidence_sentiment,
		   confidence_priority = EXCLUDED.confidence_priority, processing_ms = EXCLUDED.processing_ms, enriched_at = EXCLUDED.enriched_at`,
		ai.ID, ai.TicketID, ai.Type, ai.Sentiment, ai.Priority110, ai.Lang,
		ai.Summary, ai.RecommendedActions, ai.Lat, ai.Lon, ai.GeoStatus,
		ai.ConfidenceType, ai.ConfidenceSentiment, ai.ConfidencePriority, ai.ProcessingMs, ai.EnrichedAt,
	)
	return err
}

// GetResolvedCity looks up geo_cache for a previously geocoded raw address.
// Returns nil, nil when the address is not in cache (not an error).
func (r *TicketRepo) GetResolvedCity(ctx context.Context, rawAddress string) (*string, error) {
	var city *string
	err := r.pool.QueryRow(ctx,
		`SELECT resolved_city FROM geo_cache WHERE raw_address = $1`, rawAddress,
	).Scan(&city)
	if err != nil {
		return nil, nil // not cached — treat as not-found, not an error
	}
	return city, nil
}
