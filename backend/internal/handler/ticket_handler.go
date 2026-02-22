package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/service"
)

type TicketHandler struct {
	svc *service.TicketService
	ai  *service.AIService
}

func NewTicketHandler(svc *service.TicketService, ai *service.AIService) *TicketHandler {
	return &TicketHandler{svc: svc, ai: ai}
}

func (h *TicketHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	if page <= 0 {
		page = 1
	}
	if perPage <= 0 {
		perPage = 20
	}

	filter := domain.TicketListFilter{
		Page:      page,
		PerPage:   perPage,
		Status:    r.URL.Query().Get("status"),
		Sentiment: r.URL.Query().Get("sentiment"),
		Segment:   r.URL.Query().Get("segment"),
		Type:      r.URL.Query().Get("type"),
		Lang:      r.URL.Query().Get("lang"),
		Search:    r.URL.Query().Get("search"),
	}

	tickets, total, err := h.svc.List(r.Context(), filter)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	totalPages := total / perPage
	if total%perPage > 0 {
		totalPages++
	}

	RespondJSON(w, http.StatusOK, PaginatedResponse{
		Data: tickets,
		Pagination: Pagination{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

func (h *TicketHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid ticket id")
		return
	}

	details, err := h.svc.GetWithDetails(r.Context(), id)
	if err != nil {
		RespondError(w, http.StatusNotFound, "ticket not found: "+err.Error())
		return
	}

	RespondOK(w, details)
}

func (h *TicketHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid ticket id")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if err := h.svc.UpdateStatus(r.Context(), id, req.Status); err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondOK(w, map[string]string{"status": req.Status})
}

// Enrich runs AI enrichment for a single ticket (no n8n, direct OpenAI).
func (h *TicketHandler) Enrich(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid ticket id")
		return
	}

	// Run enrichment async with detached context
	go func() {
		ctx := context.Background()
		if err := h.ai.EnrichTicket(ctx, id); err != nil {
			log.Error().Err(err).Str("ticket_id", id.String()).Msg("enrichment failed")
		}
		GlobalHub.Broadcast(WSEvent{Type: "ticket_update", TicketID: id.String(), Status: "enriched"})
	}()

	RespondOK(w, map[string]interface{}{
		"ticket_id": id,
		"status":    "enriching",
		"message":   "AI enrichment started",
	})
}

// EnrichAll runs AI enrichment for all tickets with status "new".
func (h *TicketHandler) EnrichAll(w http.ResponseWriter, r *http.Request) {
	tickets, _, err := h.svc.List(r.Context(), domain.TicketListFilter{
		Status:  "new",
		Page:    1,
		PerPage: 1000,
	})
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Run all enrichments in background with detached context
	go func() {
		ctx := context.Background()
		for _, t := range tickets {
			if err := h.ai.EnrichTicket(ctx, t.ID); err != nil {
				log.Error().Err(err).Str("ticket_id", t.ID.String()).Msg("enrichment failed")
				continue
			}
			GlobalHub.Broadcast(WSEvent{Type: "ticket_update", TicketID: t.ID.String(), Status: "enriched"})
		}
		log.Info().Int("count", len(tickets)).Msg("batch enrichment complete")
	}()

	RespondOK(w, map[string]interface{}{
		"total":   len(tickets),
		"message": fmt.Sprintf("AI enrichment started for %d tickets", len(tickets)),
	})
}
