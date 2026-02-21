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
		`INSERT INTO ticket_assignment (id, ticket_id, manager_id, business_unit_id, routing_reason, is_current)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		a.ID, a.TicketID, a.ManagerID, a.BusinessUnitID, a.RoutingReason, a.IsCurrent,
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
