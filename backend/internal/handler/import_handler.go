package handler

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/arslan/fire-challenge/internal/service"
)

type ImportHandler struct {
	svc *service.ImportService
	ai  *service.AIService
}

func NewImportHandler(svc *service.ImportService, ai *service.AIService) *ImportHandler {
	return &ImportHandler{svc: svc, ai: ai}
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

	// Broadcast newly imported ticket IDs so frontend shows them live
	for _, id := range result.ImportedIDs {
		GlobalHub.Broadcast(WSEvent{Type: "ticket_update", TicketID: id.String(), Status: "new"})
	}

	// Auto-trigger AI enrichment for imported tickets in background
	if result.Type == "tickets" && len(result.ImportedIDs) > 0 && h.ai != nil {
		go h.enrichImportedTickets(result.ImportedIDs)
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

	// Auto-trigger AI enrichment
	if len(result.ImportedIDs) > 0 && h.ai != nil {
		go h.enrichImportedTickets(result.ImportedIDs)
	}

	RespondOK(w, result)
}

// enrichImportedTickets runs AI enrichment sequentially for each imported ticket.
func (h *ImportHandler) enrichImportedTickets(ids []uuid.UUID) {
	ctx := context.Background()
	log.Info().Int("count", len(ids)).Msg("starting auto AI enrichment for imported tickets")

	for _, id := range ids {
		GlobalHub.Broadcast(WSEvent{Type: "ticket_update", TicketID: id.String(), Status: "enriching"})

		if err := h.ai.EnrichTicket(ctx, id); err != nil {
			log.Error().Err(err).Str("ticket_id", id.String()).Msg("auto enrichment failed")
			GlobalHub.Broadcast(WSEvent{Type: "ticket_update", TicketID: id.String(), Status: "error"})
			continue
		}

		GlobalHub.Broadcast(WSEvent{Type: "ticket_update", TicketID: id.String(), Status: "enriched"})
	}

	log.Info().Int("count", len(ids)).Msg("auto AI enrichment completed")
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
