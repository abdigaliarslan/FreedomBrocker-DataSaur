package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/arslan/fire-challenge/internal/domain"
)

type AuditRepo struct {
	pool *pgxpool.Pool
}

func NewAuditRepo(pool *pgxpool.Pool) *AuditRepo {
	return &AuditRepo{pool: pool}
}

func (r *AuditRepo) Insert(ctx context.Context, a *domain.AuditLog) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO audit_log (id, ticket_id, step, input_data, output_data, decision, candidates)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		a.ID, a.TicketID, a.Step, a.InputData, a.OutputData, a.Decision, a.Candidates,
	)
	return err
}

func (r *AuditRepo) InsertTx(ctx context.Context, tx pgx.Tx, a *domain.AuditLog) error {
	_, err := tx.Exec(ctx,
		`INSERT INTO audit_log (id, ticket_id, step, input_data, output_data, decision, candidates)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		a.ID, a.TicketID, a.Step, a.InputData, a.OutputData, a.Decision, a.Candidates,
	)
	return err
}

func (r *AuditRepo) ListByTicketID(ctx context.Context, ticketID uuid.UUID) ([]domain.AuditLog, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, ticket_id, step, input_data, output_data, decision, candidates, created_at
		 FROM audit_log WHERE ticket_id = $1 ORDER BY created_at ASC`, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := []domain.AuditLog{}
	for rows.Next() {
		var a domain.AuditLog
		if err := rows.Scan(&a.ID, &a.TicketID, &a.Step, &a.InputData, &a.OutputData, &a.Decision, &a.Candidates, &a.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, a)
	}
	return logs, nil
}
