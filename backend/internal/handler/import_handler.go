package handler

import (
	"net/http"

	"github.com/arslan/fire-challenge/internal/service"
)

type ImportHandler struct {
	svc *service.ImportService
}

func NewImportHandler(svc *service.ImportService) *ImportHandler {
	return &ImportHandler{svc: svc}
}

// Import auto-detects file type from CSV headers and imports accordingly.
func (h *ImportHandler) Import(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("file")
	if err != nil {
		RespondError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	result, err := h.svc.DetectAndImport(r.Context(), file)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondOK(w, result)
}

func (h *ImportHandler) ImportTickets(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("file")
	if err != nil {
		RespondError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	result, err := h.svc.ImportTickets(r.Context(), file)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondOK(w, result)
}

func (h *ImportHandler) ImportManagers(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("file")
	if err != nil {
		RespondError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	result, err := h.svc.ImportManagers(r.Context(), file)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondOK(w, result)
}

func (h *ImportHandler) ImportBusinessUnits(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("file")
	if err != nil {
		RespondError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	result, err := h.svc.ImportBusinessUnits(r.Context(), file)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondOK(w, result)
}
