package handler

import (
	"net/http"

	"github.com/arslan/fire-challenge/internal/service"
)

type DashboardHandler struct {
	svc *service.DashboardService
}

func NewDashboardHandler(svc *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

func (h *DashboardHandler) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondOK(w, stats)
}

func (h *DashboardHandler) Sentiment(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.Sentiment(r.Context())
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondOK(w, data)
}

func (h *DashboardHandler) Categories(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.Categories(r.Context())
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondOK(w, data)
}

func (h *DashboardHandler) ManagerLoad(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ManagerLoad(r.Context())
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondOK(w, data)
}

func (h *DashboardHandler) Timeline(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.Timeline(r.Context())
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondOK(w, data)
}
