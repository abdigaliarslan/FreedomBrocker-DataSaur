package service

import (
	"context"
	"errors"

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

	// Populate assigned manager details
	if assignment != nil {
		manager, err := s.managerRepo.GetByID(ctx, assignment.ManagerID)
		if err == nil {
			mwo := &domain.ManagerWithOffice{Manager: *manager}
			bu, err := s.buRepo.GetByID(ctx, manager.BusinessUnitID)
			if err == nil {
				mwo.OfficeName = bu.Name
				mwo.OfficeCity = bu.City
			}
			if manager.MaxLoad > 0 {
				mwo.Utilization = float64(manager.CurrentLoad) / float64(manager.MaxLoad) * 100
			}
			result.Manager = mwo
		}
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
