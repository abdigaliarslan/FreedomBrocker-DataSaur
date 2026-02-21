package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RRPointerRepo struct {
	pool *pgxpool.Pool
}

func NewRRPointerRepo(pool *pgxpool.Pool) *RRPointerRepo {
	return &RRPointerRepo{pool: pool}
}

// GetAndAdvance atomically reads the current RR pointer and advances it.
// Must be called within a transaction with FOR UPDATE to prevent races.
func (r *RRPointerRepo) GetAndAdvance(ctx context.Context, tx pgx.Tx, buID uuid.UUID, skillGroup string, candidateCount int) (int, error) {
	var lastIdx int

	err := tx.QueryRow(ctx,
		`SELECT last_manager_idx FROM rr_pointer
		 WHERE business_unit_id = $1 AND skill_group = $2
		 FOR UPDATE`, buID, skillGroup).Scan(&lastIdx)

	if errors.Is(err, pgx.ErrNoRows) {
		// First time: create pointer, start at 0
		_, err = tx.Exec(ctx,
			`INSERT INTO rr_pointer (id, business_unit_id, skill_group, last_manager_idx)
			 VALUES ($1, $2, $3, 0)`,
			uuid.New(), buID, skillGroup)
		if err != nil {
			return 0, err
		}
		lastIdx = -1 // so next = 0
	} else if err != nil {
		return 0, err
	}

	nextIdx := (lastIdx + 1) % candidateCount

	_, err = tx.Exec(ctx,
		`UPDATE rr_pointer SET last_manager_idx = $1, updated_at = now()
		 WHERE business_unit_id = $2 AND skill_group = $3`,
		nextIdx, buID, skillGroup)
	if err != nil {
		return 0, err
	}

	return nextIdx, nil
}
