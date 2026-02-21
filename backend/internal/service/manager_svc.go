package service

import (
	"context"

	"github.com/google/uuid"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
)

type ManagerService struct {
	managerRepo *repository.ManagerRepo
	buRepo      *repository.BusinessUnitRepo
}

func NewManagerService(mr *repository.ManagerRepo, br *repository.BusinessUnitRepo) *ManagerService {
	return &ManagerService{managerRepo: mr, buRepo: br}
}

func (s *ManagerService) List(ctx context.Context) ([]domain.ManagerWithOffice, error) {
	return s.managerRepo.List(ctx)
}

func (s *ManagerService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Manager, error) {
	return s.managerRepo.GetByID(ctx, id)
}

func (s *ManagerService) ListOffices(ctx context.Context) ([]domain.BusinessUnit, error) {
	return s.buRepo.List(ctx)
}

func (s *ManagerService) GetOffice(ctx context.Context, id uuid.UUID) (*domain.BusinessUnit, error) {
	return s.buRepo.GetByID(ctx, id)
}
