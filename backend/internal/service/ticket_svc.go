package service

import (
	"context"
	"errors"
	"math"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
)

type TicketService struct {
	ticketRepo     *repository.TicketRepo
	assignmentRepo *repository.AssignmentRepo
	auditRepo      *repository.AuditRepo
	managerRepo    *repository.ManagerRepo
	buRepo         *repository.BusinessUnitRepo
}

func NewTicketService(tr *repository.TicketRepo, ar *repository.AssignmentRepo, audit *repository.AuditRepo, mr *repository.ManagerRepo, br *repository.BusinessUnitRepo) *TicketService {
	return &TicketService{ticketRepo: tr, assignmentRepo: ar, auditRepo: audit, managerRepo: mr, buRepo: br}
}

func (s *TicketService) List(ctx context.Context, filter domain.TicketListFilter) ([]domain.Ticket, int, error) {
	return s.ticketRepo.List(ctx, filter)
}

func (s *TicketService) GetWithDetails(ctx context.Context, id uuid.UUID) (*domain.TicketWithDetails, error) {
	ticket, err := s.ticketRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	result := &domain.TicketWithDetails{Ticket: *ticket}

	// AI enrichment (may not exist yet)
	ai, err := s.ticketRepo.GetAI(ctx, id)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	result.AI = ai

	// Assignment
	assignment, err := s.assignmentRepo.GetByTicketID(ctx, id)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	result.Assignment = assignment

	// Populate assigned manager details; keep bu for distance calc below
	var officeLat, officeLon *float64
	if assignment != nil {
		manager, err := s.managerRepo.GetByID(ctx, assignment.ManagerID)
		if err == nil {
			mwo := &domain.ManagerWithOffice{Manager: *manager}
			bu, err := s.buRepo.GetByID(ctx, manager.BusinessUnitID)
			if err == nil {
				mwo.OfficeName = bu.Name
				mwo.OfficeCity = bu.City
				mwo.OfficeLat = bu.Lat
				mwo.OfficeLon = bu.Lon
				officeLat = bu.Lat
				officeLon = bu.Lon
			}
			if manager.MaxLoad > 0 {
				mwo.Utilization = float64(manager.CurrentLoad) / float64(manager.MaxLoad) * 100
			}
			result.Manager = mwo
		}
	}

	// Resolved city from raw address (deterministic parse, no DB lookup needed)
	if result.Ticket.RawAddress != nil {
		result.GeoCity = extractCityFromAddress(result.Ticket.RawAddress)
	}

	// Distance: ticket coordinates → assigned office coordinates
	if result.AI != nil && result.AI.Lat != nil && result.AI.Lon != nil &&
		officeLat != nil && officeLon != nil {
		dist := haversineKm(*result.AI.Lat, *result.AI.Lon, *officeLat, *officeLon)
		result.DistanceKm = &dist
	}

	// Audit trail
	audit, err := s.auditRepo.ListByTicketID(ctx, id)
	if err != nil {
		return nil, err
	}
	result.AuditTrail = audit

	return result, nil
}

func (s *TicketService) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return s.ticketRepo.UpdateStatus(ctx, id, status)
}

func (s *TicketService) ListByManager(ctx context.Context, managerID uuid.UUID) ([]domain.Ticket, error) {
	return s.ticketRepo.ListByManager(ctx, managerID)
}

func (s *TicketService) ListMapPoints(ctx context.Context) ([]domain.TicketMapPoint, error) {
	return s.ticketRepo.ListMapPoints(ctx)
}

// haversineKm returns the great-circle distance in kilometres between two lat/lon points.
func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
