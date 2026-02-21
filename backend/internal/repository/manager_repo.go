package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/arslan/fire-challenge/internal/domain"
)

type ManagerRepo struct {
	pool *pgxpool.Pool
}

func NewManagerRepo(pool *pgxpool.Pool) *ManagerRepo {
	return &ManagerRepo{pool: pool}
}

func (r *ManagerRepo) Insert(ctx context.Context, m *domain.Manager) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO managers (id, full_name, email, business_unit_id, is_vip_skill, is_chief_spec, languages, max_load, current_load, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		m.ID, m.FullName, m.Email, m.BusinessUnitID, m.IsVIPSkill, m.IsChiefSpec, m.Languages, m.MaxLoad, m.CurrentLoad, m.IsActive,
	)
	return err
}

func (r *ManagerRepo) BulkInsert(ctx context.Context, managers []domain.Manager) (int, error) {
	batch := &pgx.Batch{}
	for _, m := range managers {
		batch.Queue(
			`INSERT INTO managers (id, full_name, email, business_unit_id, is_vip_skill, is_chief_spec, languages, max_load, current_load, is_active)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			 ON CONFLICT (email) DO NOTHING`,
			m.ID, m.FullName, m.Email, m.BusinessUnitID, m.IsVIPSkill, m.IsChiefSpec, m.Languages, m.MaxLoad, m.CurrentLoad, m.IsActive,
		)
	}
	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	inserted := 0
	for range managers {
		ct, err := br.Exec()
		if err != nil {
			return inserted, err
		}
		inserted += int(ct.RowsAffected())
	}
	return inserted, nil
}

func (r *ManagerRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Manager, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, full_name, email, business_unit_id, is_vip_skill, is_chief_spec, languages, max_load, current_load, is_active, created_at
		 FROM managers WHERE id = $1`, id)

	var m domain.Manager
	err := row.Scan(&m.ID, &m.FullName, &m.Email, &m.BusinessUnitID, &m.IsVIPSkill, &m.IsChiefSpec, &m.Languages, &m.MaxLoad, &m.CurrentLoad, &m.IsActive, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ManagerRepo) List(ctx context.Context) ([]domain.ManagerWithOffice, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT m.id, m.full_name, m.email, m.business_unit_id, m.is_vip_skill, m.is_chief_spec, m.languages,
		        m.max_load, m.current_load, m.is_active, m.created_at,
		        bu.name as office_name, bu.city as office_city
		 FROM managers m
		 JOIN business_units bu ON bu.id = m.business_unit_id
		 ORDER BY m.full_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []domain.ManagerWithOffice{}
	for rows.Next() {
		var m domain.ManagerWithOffice
		if err := rows.Scan(&m.ID, &m.FullName, &m.Email, &m.BusinessUnitID, &m.IsVIPSkill, &m.IsChiefSpec, &m.Languages,
			&m.MaxLoad, &m.CurrentLoad, &m.IsActive, &m.CreatedAt, &m.OfficeName, &m.OfficeCity); err != nil {
			return nil, err
		}
		if m.MaxLoad > 0 {
			m.Utilization = float64(m.CurrentLoad) / float64(m.MaxLoad) * 100
		}
		result = append(result, m)
	}
	return result, nil
}

func (r *ManagerRepo) ListByBusinessUnit(ctx context.Context, buID uuid.UUID) ([]domain.Manager, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, full_name, email, business_unit_id, is_vip_skill, is_chief_spec, languages, max_load, current_load, is_active, created_at
		 FROM managers WHERE business_unit_id = $1 AND is_active = true
		 ORDER BY current_load ASC`, buID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	managers := []domain.Manager{}
	for rows.Next() {
		var m domain.Manager
		if err := rows.Scan(&m.ID, &m.FullName, &m.Email, &m.BusinessUnitID, &m.IsVIPSkill, &m.IsChiefSpec, &m.Languages, &m.MaxLoad, &m.CurrentLoad, &m.IsActive, &m.CreatedAt); err != nil {
			return nil, err
		}
		managers = append(managers, m)
	}
	return managers, nil
}

func (r *ManagerRepo) IncrementLoad(ctx context.Context, tx pgx.Tx, managerID uuid.UUID) error {
	_, err := tx.Exec(ctx,
		`UPDATE managers SET current_load = current_load + 1 WHERE id = $1`, managerID)
	return err
}
