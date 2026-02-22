package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
	"github.com/arslan/fire-challenge/internal/routing"
)

type RoutingService struct {
	pool         *pgxpool.Pool
	geoFilter    *routing.GeoFilter
	skillFilter  *routing.SkillFilter
	loadBalancer *routing.LoadBalancer
	roundRobin   *routing.RoundRobin
	managerRepo  *repository.ManagerRepo
	auditRepo    *repository.AuditRepo
	ticketRepo   *repository.TicketRepo
}

func NewRoutingService(
	pool *pgxpool.Pool,
	gf *routing.GeoFilter, sf *routing.SkillFilter, lb *routing.LoadBalancer, rr *routing.RoundRobin,
	mr *repository.ManagerRepo, ar *repository.AuditRepo, tr *repository.TicketRepo,
) *RoutingService {
	return &RoutingService{
		pool: pool, geoFilter: gf, skillFilter: sf, loadBalancer: lb, roundRobin: rr,
		managerRepo: mr, auditRepo: ar, ticketRepo: tr,
	}
}

// RouteTicket runs the full 4-step routing pipeline for a ticket.
func (s *RoutingService) RouteTicket(ctx context.Context, ticket *domain.Ticket, ai *domain.TicketAI) error {
	// Step 1: Geo filter
	geoResult, err := s.geoFilter.Resolve(ctx, ticket.ID, ai.Lat, ai.Lon, ai.GeoStatus)
	if err != nil {
		return fmt.Errorf("geo filter: %w", err)
	}

	s.writeAudit(ctx, ticket.ID, domain.AuditStepGeoFilter, nil, geoResult, geoResult.Decision)

	// Step 2: Skill filter
	managers, err := s.managerRepo.ListByBusinessUnit(ctx, geoResult.BusinessUnitID)
	if err != nil {
		return fmt.Errorf("list managers: %w", err)
	}
	// Fallback: if no managers in resolved office, use all active managers
	if len(managers) == 0 {
		managers, err = s.managerRepo.ListAllActive(ctx)
		if err != nil {
			return fmt.Errorf("list all managers fallback: %w", err)
		}
	}

	segment := ""
	if ticket.ClientSegment != nil {
		segment = *ticket.ClientSegment
	}
	ticketType := ""
	if ai.Type != nil {
		ticketType = *ai.Type
	}

	skillResult := s.skillFilter.Filter(managers, segment, ticketType, ai.Lang)

	candidateIDs := make([]uuid.UUID, len(skillResult.Candidates))
	for i, c := range skillResult.Candidates {
		candidateIDs[i] = c.ID
	}
	s.writeAuditWithCandidates(ctx, ticket.ID, domain.AuditStepSkillFilter, skillResult, skillResult.Decision, candidateIDs)

	// Step 3: Load balancer
	loadResult := s.loadBalancer.PickTwo(skillResult.Candidates)

	finalistIDs := make([]uuid.UUID, len(loadResult.Finalists))
	for i, f := range loadResult.Finalists {
		finalistIDs[i] = f.ID
	}
	s.writeAuditWithCandidates(ctx, ticket.ID, domain.AuditStepLoadBalance, loadResult, loadResult.Decision, finalistIDs)

	if len(loadResult.Finalists) == 0 {
		return fmt.Errorf("no candidates after load balancing")
	}

	// Step 4: Round robin (transactional)
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	routingReason := fmt.Sprintf("Geo: %s | Skills: %s | Load: %s", geoResult.Decision, skillResult.Decision, loadResult.Decision)

	rrResult, err := s.roundRobin.Assign(ctx, tx, ticket.ID, geoResult.BusinessUnitID, skillResult.SkillGroup, loadResult.Finalists, routingReason)
	if err != nil {
		return fmt.Errorf("round robin: %w", err)
	}

	// Update ticket status to routed
	if _, err := tx.Exec(ctx, `UPDATE tickets SET status = 'routed', updated_at = now() WHERE id = $1`, ticket.ID); err != nil {
		return fmt.Errorf("update ticket status: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	s.writeAuditWithCandidates(ctx, ticket.ID, domain.AuditStepRoundRobin, rrResult, rrResult.Decision, []uuid.UUID{rrResult.SelectedManager.ID})

	return nil
}

func (s *RoutingService) writeAudit(ctx context.Context, ticketID uuid.UUID, step string, input, output interface{}, decision string) {
	inputJSON, _ := json.Marshal(input)
	outputJSON, _ := json.Marshal(output)

	s.auditRepo.Insert(ctx, &domain.AuditLog{
		ID:         uuid.New(),
		TicketID:   ticketID,
		Step:       step,
		InputData:  inputJSON,
		OutputData: outputJSON,
		Decision:   decision,
	})
}

func (s *RoutingService) writeAuditWithCandidates(ctx context.Context, ticketID uuid.UUID, step string, output interface{}, decision string, candidates []uuid.UUID) {
	outputJSON, _ := json.Marshal(output)
	candidatesJSON, _ := json.Marshal(candidates)

	s.auditRepo.Insert(ctx, &domain.AuditLog{
		ID:         uuid.New(),
		TicketID:   ticketID,
		Step:       step,
		OutputData: outputJSON,
		Decision:   decision,
		Candidates: candidatesJSON,
	})
}
