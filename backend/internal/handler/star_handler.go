package handler

import (
	"encoding/json"
	"net/http"

	"github.com/arslan/fire-challenge/internal/service"
)

type StarHandler struct {
	svc *service.StarService
}

func NewStarHandler(svc *service.StarService) *StarHandler {
	return &StarHandler{svc: svc}
}

type StarRequest struct {
	Question string `json:"question"`
	SQL      string `json:"sql,omitempty"`
}

func (h *StarHandler) Query(w http.ResponseWriter, r *http.Request) {
	var req StarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	// If SQL is provided directly (from n8n callback), execute it
	if req.SQL != "" {
		result, err := h.svc.ExecuteReadOnlySQL(r.Context(), req.SQL)
		if err != nil {
			RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
		result.Question = req.Question
		RespondOK(w, result)
		return
	}

	// If only question is provided, would forward to n8n
	// For now, return a placeholder
	RespondOK(w, service.StarQueryResponse{
		Question:   req.Question,
		AnswerText: "Star Task agent is processing your question. Please wait for the n8n callback.",
	})
}
