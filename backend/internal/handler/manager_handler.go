package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/arslan/fire-challenge/internal/service"
)

type ManagerHandler struct {
	svc *service.ManagerService
}

func NewManagerHandler(svc *service.ManagerService) *ManagerHandler {
	return &ManagerHandler{svc: svc}
}

func (h *ManagerHandler) List(w http.ResponseWriter, r *http.Request) {
	managers, err := h.svc.List(r.Context())
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondOK(w, managers)
}

func (h *ManagerHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}

	manager, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		RespondError(w, http.StatusNotFound, "not found")
		return
	}
	RespondOK(w, manager)
}

func (h *ManagerHandler) ListOffices(w http.ResponseWriter, r *http.Request) {
	offices, err := h.svc.ListOffices(r.Context())
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	RespondOK(w, offices)
}

func (h *ManagerHandler) GetOffice(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}

	office, err := h.svc.GetOffice(r.Context(), id)
	if err != nil {
		RespondError(w, http.StatusNotFound, "not found")
		return
	}
	RespondOK(w, office)
}
