package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
	"github.com/arslan/fire-challenge/internal/service"
)

type CallbackHandler struct {
	ticketRepo *repository.TicketRepo
	routingSvc *service.RoutingService
}

func NewCallbackHandler(tr *repository.TicketRepo, rs *service.RoutingService) *CallbackHandler {
	return &CallbackHandler{ticketRepo: tr, routingSvc: rs}
}

func (h *CallbackHandler) HandleEnrichment(w http.ResponseWriter, r *http.Request) {
	var req domain.EnrichmentResult
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	ctx := r.Context()

	// Get ticket
	ticket, err := h.ticketRepo.GetByID(ctx, req.TicketID)
	if err != nil {
		RespondError(w, http.StatusNotFound, "ticket not found: "+err.Error())
		return
	}

	// Save AI enrichment
	now := time.Now()
	actionsJSON, _ := json.Marshal(req.RecommendedActions)

	ai := &domain.TicketAI{
		ID:                  uuid.New(),
		TicketID:            req.TicketID,
		Type:                &req.Type,
		Sentiment:           &req.Sentiment,
		Priority110:         &req.Priority110,
		Lang:                req.Lang,
		Summary:             &req.Summary,
		RecommendedActions:  actionsJSON,
		Lat:                 req.Lat,
		Lon:                 req.Lon,
		GeoStatus:           req.GeoStatus,
		ConfidenceType:      &req.ConfidenceType,
		ConfidenceSentiment: &req.ConfidenceSentiment,
		ConfidencePriority:  &req.ConfidencePriority,
		EnrichedAt:          &now,
	}

	if err := h.ticketRepo.UpsertAI(ctx, ai); err != nil {
		RespondError(w, http.StatusInternalServerError, "save AI result: "+err.Error())
		return
	}

	// Update ticket status
	if err := h.ticketRepo.UpdateStatus(ctx, req.TicketID, "enriched"); err != nil {
		RespondError(w, http.StatusInternalServerError, "update status: "+err.Error())
		return
	}

	// Run routing engine
	if err := h.routingSvc.RouteTicket(ctx, ticket, ai); err != nil {
		RespondError(w, http.StatusInternalServerError, "routing: "+err.Error())
		return
	}

	RespondOK(w, map[string]interface{}{
		"status":    "ok",
		"ticket_id": req.TicketID,
	})
}

// StarQueryCallback is the result from n8n for Star Task.
type StarQueryCallback struct {
	SessionID      string `json:"session_id"`
	Question       string `json:"question"`
	GeneratedSQL   string `json:"generated_sql"`
	ChartSuggestion string `json:"chart_suggestion"`
	AnswerText     string `json:"answer_text"`
}

func (h *CallbackHandler) HandleStarQuery(w http.ResponseWriter, r *http.Request) {
	var req StarQueryCallback
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	// For now, store in memory or pass through — Star Task handled synchronously in star_handler
	RespondOK(w, map[string]string{"status": "ok"})
}
