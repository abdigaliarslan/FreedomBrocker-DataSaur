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
	Query    string `json:"query"` // alias for frontend compatibility
	SQL      string `json:"sql,omitempty"`
}

func (h *StarHandler) Query(w http.ResponseWriter, r *http.Request) {
	var req StarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	// Accept both "question" and "query" fields
	question := req.Question
	if question == "" {
		question = req.Query
	}

	// If SQL is provided directly, execute it
	if req.SQL != "" {
		result, err := h.svc.ExecuteReadOnlySQL(r.Context(), req.SQL)
		if err != nil {
			RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
		result.Question = question
		RespondOK(w, result)
		return
	}

	if question == "" {
		RespondError(w, http.StatusBadRequest, "question is required")
		return
	}

	// AI-powered path: generate SQL from natural language
	result, err := h.svc.QueryWithAI(r.Context(), question)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondOK(w, result)
}
