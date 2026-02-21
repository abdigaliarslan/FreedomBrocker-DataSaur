package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StarService struct {
	pool *pgxpool.Pool
}

func NewStarService(pool *pgxpool.Pool) *StarService {
	return &StarService{pool: pool}
}

type StarQueryRequest struct {
	Question  string `json:"question"`
	SessionID string `json:"session_id,omitempty"`
}

type StarQueryResponse struct {
	Question        string          `json:"question"`
	SQL             string          `json:"sql,omitempty"`
	Columns         []string        `json:"columns,omitempty"`
	Rows            [][]interface{} `json:"rows,omitempty"`
	ChartSuggestion string          `json:"chart_suggestion,omitempty"`
	AnswerText      string          `json:"answer_text,omitempty"`
	Error           string          `json:"error,omitempty"`
}

// ExecuteReadOnlySQL safely executes a read-only SQL query.
func (s *StarService) ExecuteReadOnlySQL(ctx context.Context, sql string) (*StarQueryResponse, error) {
	// Safety: only allow SELECT statements
	trimmed := strings.TrimSpace(strings.ToUpper(sql))
	if !strings.HasPrefix(trimmed, "SELECT") {
		return nil, fmt.Errorf("only SELECT queries are allowed")
	}

	// Forbid dangerous keywords
	forbidden := []string{"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE"}
	for _, kw := range forbidden {
		if strings.Contains(trimmed, kw) {
			return nil, fmt.Errorf("forbidden keyword: %s", kw)
		}
	}

	rows, err := s.pool.Query(ctx, sql)
	if err != nil {
		return nil, fmt.Errorf("execute query: %w", err)
	}
	defer rows.Close()

	// Get column names
	fieldDescs := rows.FieldDescriptions()
	columns := make([]string, len(fieldDescs))
	for i, fd := range fieldDescs {
		columns[i] = string(fd.Name)
	}

	// Collect rows
	var resultRows [][]interface{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}
		resultRows = append(resultRows, values)
	}

	return &StarQueryResponse{
		SQL:     sql,
		Columns: columns,
		Rows:    resultRows,
	}, nil
}
