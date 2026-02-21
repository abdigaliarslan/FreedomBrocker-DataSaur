package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/arslan/fire-challenge/internal/domain"
)

type GeoRepo struct {
	pool *pgxpool.Pool
}

func NewGeoRepo(pool *pgxpool.Pool) *GeoRepo {
	return &GeoRepo{pool: pool}
}

func (r *GeoRepo) Upsert(ctx context.Context, g *domain.GeoCache) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO geo_cache (id, raw_address, lat, lon, resolved_city, geo_status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (raw_address) DO UPDATE SET
		   lat = EXCLUDED.lat, lon = EXCLUDED.lon,
		   resolved_city = EXCLUDED.resolved_city, geo_status = EXCLUDED.geo_status`,
		g.ID, g.RawAddress, g.Lat, g.Lon, g.ResolvedCity, g.GeoStatus,
	)
	return err
}

func (r *GeoRepo) GetByAddress(ctx context.Context, rawAddress string) (*domain.GeoCache, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, raw_address, lat, lon, resolved_city, geo_status, created_at
		 FROM geo_cache WHERE raw_address = $1`, rawAddress)

	var g domain.GeoCache
	err := row.Scan(&g.ID, &g.RawAddress, &g.Lat, &g.Lon, &g.ResolvedCity, &g.GeoStatus, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *GeoRepo) InsertIfNotExists(ctx context.Context, g *domain.GeoCache) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO geo_cache (id, raw_address, lat, lon, resolved_city, geo_status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (raw_address) DO NOTHING`,
		uuid.New(), g.RawAddress, g.Lat, g.Lon, g.ResolvedCity, g.GeoStatus,
	)
	return err
}
