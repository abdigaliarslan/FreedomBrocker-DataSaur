package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/service"
)

type TicketHandler struct {
	svc *service.TicketService
}

func NewTicketHandler(svc *service.TicketService) *TicketHandler {
	return &TicketHandler{svc: svc}
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
