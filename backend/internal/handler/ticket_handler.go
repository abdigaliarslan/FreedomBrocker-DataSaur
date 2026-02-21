package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/service"
)

type TicketHandler struct {
	svc           *service.TicketService
	n8nWebhookURL string
	httpClient    *http.Client
}

func NewTicketHandler(svc *service.TicketService, n8nWebhookURL string) *TicketHandler {
	return &TicketHandler{
		svc:           svc,
		n8nWebhookURL: n8nWebhookURL,
		httpClient:    &http.Client{Timeout: 30 * time.Second},
	}
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

// Enrich triggers n8n enrichment for a single ticket.
func (h *TicketHandler) Enrich(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid ticket id")
		return
	}

	if err := h.triggerN8N(id); err != nil {
		RespondError(w, http.StatusInternalServerError, "failed to trigger n8n: "+err.Error())
		return
	}

	_ = h.svc.UpdateStatus(r.Context(), id, "enriching")

	RespondOK(w, map[string]interface{}{
		"ticket_id": id,
		"status":    "enriching",
		"message":   "n8n enrichment triggered",
	})
}

// EnrichAll triggers n8n enrichment for all tickets with status "new".
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

	triggered := 0
	errors := []string{}

	for _, t := range tickets {
		if err := h.triggerN8N(t.ID); err != nil {
			errors = append(errors, fmt.Sprintf("%s: %v", t.ID, err))
			continue
		}
		_ = h.svc.UpdateStatus(r.Context(), t.ID, "enriching")
		triggered++
	}

	RespondOK(w, map[string]interface{}{
		"total":     len(tickets),
		"triggered": triggered,
		"errors":    errors,
	})
}

func (h *TicketHandler) triggerN8N(ticketID uuid.UUID) error {
	payload, _ := json.Marshal(map[string]string{
		"ticket_id": ticketID.String(),
	})

	resp, err := h.httpClient.Post(h.n8nWebhookURL, "application/json", bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("POST to n8n: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("n8n returned status %d", resp.StatusCode)
	}

	log.Info().Str("ticket_id", ticketID.String()).Int("status", resp.StatusCode).Msg("n8n enrichment triggered")
	return nil
}
