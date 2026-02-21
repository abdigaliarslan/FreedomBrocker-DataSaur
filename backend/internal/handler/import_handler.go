package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/arslan/fire-challenge/internal/service"
)

type ImportHandler struct {
	svc           *service.ImportService
	n8nWebhookURL string
	httpClient    *http.Client
}

func NewImportHandler(svc *service.ImportService, n8nWebhookURL string) *ImportHandler {
	return &ImportHandler{
		svc:           svc,
		n8nWebhookURL: n8nWebhookURL,
		httpClient:    &http.Client{Timeout: 30 * time.Second},
	}
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

	RespondOK(w, result)

	// Trigger n8n for imported tickets
	if result.Type == "tickets" && len(result.ImportedIDs) > 0 {
		go h.triggerN8NBatch(result.ImportedIDs)
	}
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

	if len(result.ImportedIDs) > 0 {
		go h.triggerN8NBatch(result.ImportedIDs)
	}
}

func (h *ImportHandler) triggerN8NBatch(ids []uuid.UUID) {
	for _, id := range ids {
		payload, _ := json.Marshal(map[string]string{
			"ticket_id": id.String(),
		})

		resp, err := h.httpClient.Post(h.n8nWebhookURL, "application/json", bytes.NewReader(payload))
		if err != nil {
			log.Error().Err(err).Str("ticket_id", id.String()).Msg("failed to trigger n8n enrichment")
			continue
		}
		resp.Body.Close()

		if resp.StatusCode >= 400 {
			log.Error().Int("status", resp.StatusCode).Str("ticket_id", id.String()).Msg("n8n returned error status")
			continue
		}

		log.Info().Str("ticket_id", id.String()).Msg("n8n enrichment triggered after import")
		// Give n8n stable time between calls
		time.Sleep(100 * time.Millisecond)
	}
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
