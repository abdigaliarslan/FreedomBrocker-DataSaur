package service

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardService struct {
	pool *pgxpool.Pool
}

func NewDashboardService(pool *pgxpool.Pool) *DashboardService {
	return &DashboardService{pool: pool}
}

type DashboardStats struct {
	TotalTickets     int     `json:"total_tickets"`
	RoutedTickets    int     `json:"routed_tickets"`
	PendingTickets   int     `json:"pending_tickets"`
	AvgPriority      float64 `json:"avg_priority"`
	AvgConfidence    float64 `json:"avg_confidence"`
	VIPCount         int     `json:"vip_count"`
	UnknownGeoCount  int     `json:"unknown_geo_count"`
	ActiveManagers   int     `json:"active_managers"`
	TotalOffices     int     `json:"total_offices"`
	AIProcessedCount int     `json:"ai_processed_count"`
	TicketsChangePct float64 `json:"tickets_change_pct"`
}

func (s *DashboardService) Stats(ctx context.Context) (*DashboardStats, error) {
	var stats DashboardStats

	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tickets`).Scan(&stats.TotalTickets)
	if err != nil {
		return nil, err
	}

	s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tickets WHERE status = 'routed'`).Scan(&stats.RoutedTickets)
	s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tickets WHERE status IN ('new', 'enriching')`).Scan(&stats.PendingTickets)
	s.pool.QueryRow(ctx, `SELECT COALESCE(AVG(priority_1_10), 0) FROM ticket_ai`).Scan(&stats.AvgPriority)
	s.pool.QueryRow(ctx, `SELECT COALESCE(AVG(confidence_type), 0) FROM ticket_ai`).Scan(&stats.AvgConfidence)
	s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tickets WHERE client_segment = 'VIP'`).Scan(&stats.VIPCount)
	s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM ticket_ai WHERE geo_status IN ('unknown', 'NOT_FOUND', 'NO_ADDRESS', 'pending')`).Scan(&stats.UnknownGeoCount)
	s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM managers WHERE is_active = true`).Scan(&stats.ActiveManagers)
	s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM business_units`).Scan(&stats.TotalOffices)
	s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM ticket_ai`).Scan(&stats.AIProcessedCount)

	return &stats, nil
}

type SentimentData struct {
	Sentiment string `json:"sentiment"`
	Count     int    `json:"count"`
}

func (s *DashboardService) Sentiment(ctx context.Context) ([]SentimentData, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT COALESCE(sentiment, 'unknown'), COUNT(*)
		 FROM ticket_ai GROUP BY sentiment ORDER BY COUNT(*) DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []SentimentData{}
	for rows.Next() {
		var d SentimentData
		if err := rows.Scan(&d.Sentiment, &d.Count); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}

type CategoryData struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}

func (s *DashboardService) Categories(ctx context.Context) ([]CategoryData, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT COALESCE(type, 'unknown'), COUNT(*)
		 FROM ticket_ai GROUP BY type ORDER BY COUNT(*) DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []CategoryData{}
	for rows.Next() {
		var d CategoryData
		if err := rows.Scan(&d.Type, &d.Count); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}

type ManagerLoadData struct {
	ManagerName string  `json:"manager_name"`
	Office      string  `json:"office"`
	CurrentLoad int     `json:"current_load"`
	MaxLoad     int     `json:"max_load"`
	Utilization float64 `json:"utilization_pct"`
}

func (s *DashboardService) ManagerLoad(ctx context.Context) ([]ManagerLoadData, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT m.full_name, bu.city, m.current_load, m.max_load
		 FROM managers m JOIN business_units bu ON bu.id = m.business_unit_id
		 WHERE m.is_active = true
		 ORDER BY m.current_load DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []ManagerLoadData{}
	for rows.Next() {
		var d ManagerLoadData
		if err := rows.Scan(&d.ManagerName, &d.Office, &d.CurrentLoad, &d.MaxLoad); err != nil {
			return nil, err
		}
		if d.MaxLoad > 0 {
			d.Utilization = float64(d.CurrentLoad) / float64(d.MaxLoad) * 100
		}
		result = append(result, d)
	}
	return result, nil
}

type TimelineData struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func (s *DashboardService) Timeline(ctx context.Context) ([]TimelineData, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT DATE(created_at)::text, COUNT(*)
		 FROM tickets
		 GROUP BY DATE(created_at)
		 ORDER BY DATE(created_at) DESC
		 LIMIT 30`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []TimelineData{}
	for rows.Next() {
		var d TimelineData
		if err := rows.Scan(&d.Date, &d.Count); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}
