package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/arslan/fire-challenge/internal/domain"
)

type BusinessUnitRepo struct {
	pool *pgxpool.Pool
}

func NewBusinessUnitRepo(pool *pgxpool.Pool) *BusinessUnitRepo {
	return &BusinessUnitRepo{pool: pool}
}

func (r *BusinessUnitRepo) Insert(ctx context.Context, bu *domain.BusinessUnit) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO business_units (id, name, city, address, lat, lon)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (name) DO NOTHING`,
		bu.ID, bu.Name, bu.City, bu.Address, bu.Lat, bu.Lon,
	)
	return err
}

func (r *BusinessUnitRepo) BulkInsert(ctx context.Context, units []domain.BusinessUnit) (int, error) {
	batch := &pgx.Batch{}
	for _, bu := range units {
		batch.Queue(
			`INSERT INTO business_units (id, name, city, address, lat, lon)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (name) DO UPDATE SET
			   city = EXCLUDED.city,
			   address = EXCLUDED.address`,
			bu.ID, bu.Name, bu.City, bu.Address, bu.Lat, bu.Lon,
		)
	}
	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	inserted := 0
	for range units {
		ct, err := br.Exec()
		if err != nil {
			return inserted, err
		}
		inserted += int(ct.RowsAffected())
	}
	return inserted, nil
}

func (r *BusinessUnitRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.BusinessUnit, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, name, city, address, lat, lon, created_at FROM business_units WHERE id = $1`, id)

	var bu domain.BusinessUnit
	err := row.Scan(&bu.ID, &bu.Name, &bu.City, &bu.Address, &bu.Lat, &bu.Lon, &bu.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &bu, nil
}

func (r *BusinessUnitRepo) List(ctx context.Context) ([]domain.BusinessUnit, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, city, address, lat, lon, created_at FROM business_units ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	units := []domain.BusinessUnit{}
	for rows.Next() {
		var bu domain.BusinessUnit
		if err := rows.Scan(&bu.ID, &bu.Name, &bu.City, &bu.Address, &bu.Lat, &bu.Lon, &bu.CreatedAt); err != nil {
			return nil, err
		}
		units = append(units, bu)
	}
	return units, nil
}

func (r *BusinessUnitRepo) GetAll(ctx context.Context) ([]domain.BusinessUnit, error) {
	return r.List(ctx)
}
