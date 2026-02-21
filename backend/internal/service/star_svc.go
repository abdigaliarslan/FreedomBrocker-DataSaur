package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

type StarService struct {
	pool       *pgxpool.Pool
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewStarService(pool *pgxpool.Pool, apiKey, model string) *StarService {
	return &StarService{
		pool:       pool,
		apiKey:     apiKey,
		model:      model,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type StarQueryRequest struct {
	Question  string `json:"question"`
	SessionID string `json:"session_id,omitempty"`
}

type StarQueryResponse struct {
	Question   string          `json:"question"`
	SQL        string          `json:"sql,omitempty"`
	Columns    []string        `json:"columns,omitempty"`
	Rows       [][]interface{} `json:"rows,omitempty"`
	ChartType  string          `json:"chart_type,omitempty"`
	AnswerText string          `json:"answer_text,omitempty"`
	XLabel     string          `json:"x_label,omitempty"`
	YLabel     string          `json:"y_label,omitempty"`
	Error      string          `json:"error,omitempty"`
}

const starSystemPrompt = `Ты — AI-аналитик Freedom Broker. Генерируй SQL-запросы для PostgreSQL на основе вопросов пользователя.

Схема базы данных:
- tickets(id UUID, external_id TEXT, subject TEXT, body TEXT, client_name TEXT, client_segment TEXT, source_channel TEXT, status TEXT, raw_address TEXT, created_at TIMESTAMPTZ)
- ticket_ai(ticket_id UUID, type TEXT, sentiment TEXT, priority_1_10 INT, lang TEXT, summary TEXT, lat FLOAT, lon FLOAT, geo_status TEXT, processing_ms INT, enriched_at TIMESTAMPTZ)
- ticket_assignment(ticket_id UUID, manager_id UUID, business_unit_id UUID, routing_reason TEXT, assigned_at TIMESTAMPTZ, is_current BOOL)
- managers(id UUID, full_name TEXT, email TEXT, business_unit_id UUID, is_vip_skill BOOL, is_chief_spec BOOL, languages TEXT[], current_load INT, max_load INT, is_active BOOL)
- business_units(id UUID, name TEXT, city TEXT, address TEXT)

Ответь ТОЛЬКО JSON без markdown:
{
  "sql": "SELECT ...",
  "chart_type": "bar" | "pie" | "line" | "table" | "number",
  "answer_text": "Текстовый ответ на русском",
  "x_label": "название оси X",
  "y_label": "название оси Y"
}

Правила:
- ТОЛЬКО SELECT запросы, без INSERT/UPDATE/DELETE/DROP
- Используй JOIN когда нужно связать таблицы
- Для офисов/городов: используй business_units.city
- chart_type="number" для одного числового ответа (SELECT COUNT/AVG/SUM)
- chart_type="bar" для сравнения категорий
- chart_type="pie" для долей/процентов
- chart_type="line" для временных данных
- chart_type="table" если результат лучше показать таблицей
- answer_text — краткий ответ на вопрос на русском
- Для первых 2 колонок: 1-я = label/категория, 2-я = число (для графиков)
- LIMIT 20 для списков`

type starAIResponse struct {
	SQL        string `json:"sql"`
	ChartType  string `json:"chart_type"`
	AnswerText string `json:"answer_text"`
	XLabel     string `json:"x_label"`
	YLabel     string `json:"y_label"`
}

// QueryWithAI generates SQL from natural language question via OpenAI, executes it, returns data.
func (s *StarService) QueryWithAI(ctx context.Context, question string) (*StarQueryResponse, error) {
	// Call OpenAI to generate SQL
	reqBody := openAIRequest{
		Model: s.model,
		Messages: []openAIMessage{
			{Role: "system", Content: starSystemPrompt},
			{Role: "user", Content: question},
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OpenAI request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("OpenAI status %d: %s", resp.StatusCode, string(respBytes))
	}

	var openAIResp openAIResponse
	if err := json.Unmarshal(respBytes, &openAIResp); err != nil {
		return nil, fmt.Errorf("parse OpenAI response: %w", err)
	}

	if openAIResp.Error != nil {
		return nil, fmt.Errorf("OpenAI error: %s", openAIResp.Error.Message)
	}

	if len(openAIResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in OpenAI response")
	}

	content := stripCodeFences(openAIResp.Choices[0].Message.Content)

	var aiResp starAIResponse
	if err := json.Unmarshal([]byte(content), &aiResp); err != nil {
		return nil, fmt.Errorf("parse AI JSON: %w (raw: %s)", err, content)
	}

	log.Info().Str("question", question).Str("sql", aiResp.SQL).Str("chart", aiResp.ChartType).Msg("Star Task AI generated SQL")

	// Execute the generated SQL
	result, err := s.ExecuteReadOnlySQL(ctx, aiResp.SQL)
	if err != nil {
		return &StarQueryResponse{
			Question:   question,
			SQL:        aiResp.SQL,
			AnswerText: fmt.Sprintf("Ошибка выполнения запроса: %v", err),
			ChartType:  "table",
			Error:      err.Error(),
		}, nil
	}

	result.Question = question
	result.ChartType = aiResp.ChartType
	result.AnswerText = aiResp.AnswerText
	result.XLabel = aiResp.XLabel
	result.YLabel = aiResp.YLabel

	return result, nil
}

// ExecuteReadOnlySQL safely executes a read-only SQL query.
func (s *StarService) ExecuteReadOnlySQL(ctx context.Context, sql string) (*StarQueryResponse, error) {
	trimmed := strings.TrimSpace(strings.ToUpper(sql))
	if !strings.HasPrefix(trimmed, "SELECT") {
		return nil, fmt.Errorf("only SELECT queries are allowed")
	}

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

	fieldDescs := rows.FieldDescriptions()
	columns := make([]string, len(fieldDescs))
	for i, fd := range fieldDescs {
		columns[i] = string(fd.Name)
	}

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
