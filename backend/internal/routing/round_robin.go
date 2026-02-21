package routing

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
)

type RoundRobin struct {
	rrRepo         *repository.RRPointerRepo
	assignmentRepo *repository.AssignmentRepo
	managerRepo    *repository.ManagerRepo
	auditRepo      *repository.AuditRepo
}

func NewRoundRobin(rr *repository.RRPointerRepo, ar *repository.AssignmentRepo, mr *repository.ManagerRepo, audit *repository.AuditRepo) *RoundRobin {
	return &RoundRobin{rrRepo: rr, assignmentRepo: ar, managerRepo: mr, auditRepo: audit}
}

type RRResult struct {
	SelectedManager domain.Manager
	Decision        string
}

// Assign performs the transactional round-robin assignment.
// Must be called within a transaction.
func (rr *RoundRobin) Assign(ctx context.Context, tx pgx.Tx, ticketID, buID uuid.UUID, skillGroup string, finalists []domain.Manager, routingReason string) (*RRResult, error) {
	// Check if already assigned (idempotency for n8n)
	var existingID uuid.UUID
	err := tx.QueryRow(ctx, `SELECT manager_id FROM ticket_assignment WHERE ticket_id = $1 AND is_current = true FOR UPDATE`, ticketID).Scan(&existingID)
	if err == nil {
		// Already assigned. Reusing existing.
		return &RRResult{
			SelectedManager: domain.Manager{ID: existingID},
			Decision:        "Already assigned (reusing existing)",
		}, nil
	}

	if len(finalists) == 0 {
		return nil, fmt.Errorf("no finalists for round robin")
	}

	if len(finalists) == 1 {
		selected := finalists[0]

		assignment := &domain.TicketAssignment{
			ID:             uuid.New(),
			TicketID:       ticketID,
			ManagerID:      selected.ID,
			BusinessUnitID: buID,
			OfficeID:       buID, // Assuming BU is office here for simplicity
			RoutingBucket:  skillGroup,
			RoutingReason:  &routingReason,
			IsCurrent:      true,
		}

		if err := rr.assignmentRepo.Insert(ctx, tx, assignment); err != nil {
			return nil, fmt.Errorf("insert assignment: %w", err)
		}

		if err := rr.managerRepo.IncrementLoad(ctx, tx, selected.ID); err != nil {
			return nil, fmt.Errorf("increment load: %w", err)
		}

		return &RRResult{
			SelectedManager: selected,
			Decision:        fmt.Sprintf("Single candidate — assigned to %s", selected.FullName),
		}, nil
	}

	// Get RR pointer and advance
	nextIdx, err := rr.rrRepo.GetAndAdvance(ctx, tx, buID, skillGroup, len(finalists))
	if err != nil {
		return nil, fmt.Errorf("rr get and advance: %w", err)
	}

	selected := finalists[nextIdx]

	assignment := &domain.TicketAssignment{
		ID:             uuid.New(),
		TicketID:       ticketID,
		ManagerID:      selected.ID,
		BusinessUnitID: buID,
		OfficeID:       buID,
		RoutingBucket:  skillGroup,
		RoutingReason:  &routingReason,
		IsCurrent:      true,
	}

	if err := rr.assignmentRepo.Insert(ctx, tx, assignment); err != nil {
		return nil, fmt.Errorf("insert assignment: %w", err)
	}

	if err := rr.managerRepo.IncrementLoad(ctx, tx, selected.ID); err != nil {
		return nil, fmt.Errorf("increment load: %w", err)
	}

	return &RRResult{
		SelectedManager: selected,
		Decision:        fmt.Sprintf("Round-robin index=%d → assigned to %s", nextIdx, selected.FullName),
	}, nil
}
