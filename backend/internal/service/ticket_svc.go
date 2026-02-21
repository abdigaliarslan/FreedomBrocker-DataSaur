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
}

func NewTicketService(tr *repository.TicketRepo, ar *repository.AssignmentRepo, audit *repository.AuditRepo) *TicketService {
	return &TicketService{ticketRepo: tr, assignmentRepo: ar, auditRepo: audit}
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
