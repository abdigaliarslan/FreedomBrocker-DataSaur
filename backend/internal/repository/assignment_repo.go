package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/arslan/fire-challenge/internal/domain"
)

type AssignmentRepo struct {
	pool *pgxpool.Pool
}

func NewAssignmentRepo(pool *pgxpool.Pool) *AssignmentRepo {
	return &AssignmentRepo{pool: pool}
}

func (r *AssignmentRepo) Insert(ctx context.Context, tx pgx.Tx, a *domain.TicketAssignment) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO ticket_assignment (id, ticket_id, manager_id, business_unit_id, office_id, routing_bucket, routing_reason, is_current)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (ticket_id) WHERE is_current = true DO UPDATE SET
		   manager_id = EXCLUDED.manager_id,
		   business_unit_id = EXCLUDED.business_unit_id,
		   office_id = EXCLUDED.office_id,
		   routing_bucket = EXCLUDED.routing_bucket,
		   routing_reason = EXCLUDED.routing_reason,
		   assigned_at = now()`,
		a.ID, a.TicketID, a.ManagerID, a.BusinessUnitID, a.OfficeID, a.RoutingBucket, a.RoutingReason, a.IsCurrent,
	)
	return err
}

func (r *AssignmentRepo) GetByTicketID(ctx context.Context, ticketID uuid.UUID) (*domain.TicketAssignment, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, ticket_id, manager_id, business_unit_id, assigned_at, routing_reason, is_current
		 FROM ticket_assignment WHERE ticket_id = $1 AND is_current = true`, ticketID)

	var a domain.TicketAssignment
	err := row.Scan(&a.ID, &a.TicketID, &a.ManagerID, &a.BusinessUnitID, &a.AssignedAt, &a.RoutingReason, &a.IsCurrent)
	if err != nil {
		return nil, err
	}
	return &a, nil
}
