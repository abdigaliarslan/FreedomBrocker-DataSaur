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
		httpClient: &http.Client{Timeout: 60 * time.Second},
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

1. tickets (тикеты / обращения клиентов):
   - id UUID PRIMARY KEY
   - external_id TEXT — внешний идентификатор
   - subject TEXT — тема обращения
   - body TEXT — текст обращения
   - client_name TEXT — имя клиента
   - client_segment TEXT — сегмент: 'Mass', 'VIP', 'Priority'
   - source_channel TEXT — канал: 'Email', 'Telegram', 'WhatsApp', 'Phone'
   - status TEXT — статус: 'new', 'enriching', 'enriched', 'routed', 'in_progress', 'resolved'
   - raw_address TEXT — адрес клиента
   - created_at TIMESTAMPTZ

2. ticket_ai (AI-обогащение тикетов, связь ticket_id → tickets.id):
   - ticket_id UUID REFERENCES tickets(id)
   - type TEXT — тип обращения: 'Жалоба', 'Претензия', 'Консультация', 'Неработоспособность', 'Смена данных', 'Спам'
   - sentiment TEXT — 'Позитивный', 'Негативный', 'Нейтральный'
   - priority_1_10 INT — приоритет от 1 до 10
   - lang TEXT — язык: 'RU', 'KZ', 'EN'
   - summary TEXT — краткое резюме
   - lat FLOAT, lon FLOAT — координаты
   - geo_status TEXT — 'known', 'unknown'
   - processing_ms INT — время обработки AI в мс
   - enriched_at TIMESTAMPTZ

3. ticket_assignment (назначение тикетов менеджерам):
   - ticket_id UUID REFERENCES tickets(id)
   - manager_id UUID REFERENCES managers(id)
   - business_unit_id UUID REFERENCES business_units(id)
   - routing_reason TEXT — причина маршрутизации
   - assigned_at TIMESTAMPTZ
   - is_current BOOL — текущее назначение

4. managers (менеджеры):
   - id UUID PRIMARY KEY
   - full_name TEXT
   - email TEXT
   - business_unit_id UUID REFERENCES business_units(id)
   - is_vip_skill BOOL — может обрабатывать VIP
   - is_chief_spec BOOL — главный специалист
   - languages TEXT[] — массив языков
   - current_load INT — текущая нагрузка
   - max_load INT — максимальная нагрузка
   - is_active BOOL

5. business_units (офисы / бизнес-юниты):
   - id UUID PRIMARY KEY
   - name TEXT — название офиса
   - city TEXT — город
   - address TEXT — адрес

Ответь СТРОГО JSON без markdown-обёрток, без тройных кавычек, без слова json:
{
  "sql": "SELECT ...",
  "chart_type": "bar" | "pie" | "line" | "table" | "number",
  "answer_text": "Текстовый ответ на русском",
  "x_label": "название оси X",
  "y_label": "название оси Y"
}

Правила генерации SQL:
- ТОЛЬКО SELECT запросы! Никаких INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE
- **ВАЖНО**: Если ты используешь колонки из разных таблиц, ты ОБЯЗАН их правильно связать (JOIN):
  * Чтобы использовать `ticket_ai`, сделай `JOIN ticket_ai ON tickets.id = ticket_ai.ticket_id`
  * Чтобы использовать `business_units` (офисы), сделай `JOIN ticket_assignment ON tickets.id = ticket_assignment.ticket_id JOIN business_units ON business_units.id = ticket_assignment.business_unit_id` (используй `is_current = true`)
  * Чтобы использовать `managers`, сделай `JOIN ticket_assignment ON tickets.id = ticket_assignment.ticket_id JOIN managers ON managers.id = ticket_assignment.manager_id`
- Для офисов/городов: используй business_units.city
- Для типов обращений: используй ticket_ai.type. Используй ILIKE и учитывай разные варианты (например, 'Жалоба' или 'Complaint')
- Для менеджеров и нагрузки: используй managers.current_load, managers.max_load
- Поиск по тексту: используй оператор ILIKE для регистронезависимого поиска
- Поиск по тональности (sentiment): ВСЕГДА используй ILIKE и учитывай как русские, так и английские варианты:
  * Негативный: sentiment ILIKE 'негатив%' OR sentiment ILIKE 'negative%'
  * Позитивный: sentiment ILIKE 'позитив%' OR sentiment ILIKE 'positive%'
  * Нейтральный: sentiment ILIKE 'нейтраль%' OR sentiment ILIKE 'neutral%'
- Для VIP клиентов: tickets.client_segment ILIKE 'VIP'
- **Округление**: Для средних значений (AVG) и других дробных чисел ВСЕГДА используй `ROUND(..., 1)` для округления до одного знака после запятой (например, `ROUND(AVG(priority_1_10), 1)`).

Правила выбора chart_type:
- "number" — для одного числового ответа (SELECT COUNT(*), AVG(...), SUM(...))
- "bar" — для сравнения категорий (распределение, топ-N, по городам/типам)
- "pie" — для долей/процентов (распределение по долям)
- "line" — для временных данных (по дням, месяцам)
- "table" — когда результат лучше показать таблицей (детальные списки)

Правила для данных:
- Для графиков (bar, pie): первая колонка = label/категория (TEXT), вторая = число (COUNT/SUM/AVG)
- Для line: первая колонка = дата (DATE/TIMESTAMP), вторая = число
- LIMIT 20 для списков
- answer_text — краткий ответ на вопрос на русском
- Используй алиасы колонок на русском: AS "Тип", AS "Количество" и т.д.
- Всегда используй ORDER BY для упорядочивания результатов`

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

type starAIRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
}

type starAIResponse struct {
	SQL        string `json:"sql"`
	ChartType  string `json:"chart_type"`
	AnswerText string `json:"answer_text"`
	XLabel     string `json:"x_label"`
	YLabel     string `json:"y_label"`
}

// QueryWithAI generates SQL from natural language question via OpenAI, executes it, returns data.
func (s *StarService) QueryWithAI(ctx context.Context, question string) (*StarQueryResponse, error) {
	if s.apiKey == "" {
		return &StarQueryResponse{
			Question:   question,
			AnswerText: "OpenAI API ключ не настроен. Установите переменную окружения OPENAI_API_KEY.",
			ChartType:  "table",
			Error:      "OPENAI_API_KEY is empty",
		}, nil
	}

	// Call OpenAI to generate SQL
	aiResp, err := s.callStarAI(ctx, question)
	if err != nil {
		log.Error().Err(err).Str("question", question).Msg("Star AI: OpenAI call failed")
		return &StarQueryResponse{
			Question:   question,
			AnswerText: fmt.Sprintf("Ошибка при обращении к AI: %v", err),
			ChartType:  "table",
			Error:      err.Error(),
		}, nil
	}

	log.Info().Str("question", question).Str("sql", aiResp.SQL).Str("chart", aiResp.ChartType).Msg("Star AI: generated SQL")

	// Execute the generated SQL
	result, err := s.ExecuteReadOnlySQL(ctx, aiResp.SQL)
	if err != nil {
		log.Warn().Err(err).Str("sql", aiResp.SQL).Msg("Star AI: SQL execution failed, requesting fix")

		// Retry: ask AI to fix the SQL
		fixedResp, retryErr := s.retryWithError(ctx, question, aiResp.SQL, err.Error())
		if retryErr != nil {
			log.Error().Err(retryErr).Msg("Star AI: retry also failed")
			return &StarQueryResponse{
				Question:   question,
				SQL:        aiResp.SQL,
				AnswerText: fmt.Sprintf("Не удалось выполнить запрос: %v", err),
				ChartType:  "table",
				Error:      err.Error(),
			}, nil
		}

		// Try executing the fixed SQL
		result, err = s.ExecuteReadOnlySQL(ctx, fixedResp.SQL)
		if err != nil {
			return &StarQueryResponse{
				Question:   question,
				SQL:        fixedResp.SQL,
				AnswerText: fmt.Sprintf("Повторный запрос тоже не удался: %v", err),
				ChartType:  "table",
				Error:      err.Error(),
			}, nil
		}

		aiResp = fixedResp
		log.Info().Str("sql", fixedResp.SQL).Msg("Star AI: retry succeeded")
	}

	result.Question = question
	result.ChartType = aiResp.ChartType
	result.AnswerText = aiResp.AnswerText
	result.XLabel = aiResp.XLabel
	result.YLabel = aiResp.YLabel

	return result, nil
}

// callStarAI sends a question to OpenAI and parses the structured JSON response.
func (s *StarService) callStarAI(ctx context.Context, question string) (*starAIResponse, error) {
	return s.callStarAIWithMessages(ctx, []openAIMessage{
		{Role: "system", Content: starSystemPrompt},
		{Role: "user", Content: question},
	})
}

// retryWithError sends the original question + error back to OpenAI for a corrected SQL.
func (s *StarService) retryWithError(ctx context.Context, question, failedSQL, sqlError string) (*starAIResponse, error) {
	retryMsg := fmt.Sprintf(
		"Мой предыдущий SQL-запрос вызвал ошибку. Исправь его.\n\nВопрос: %s\n\nНеверный SQL:\n%s\n\nОшибка PostgreSQL:\n%s\n\nВерни исправленный JSON в том же формате.",
		question, failedSQL, sqlError,
	)

	return s.callStarAIWithMessages(ctx, []openAIMessage{
		{Role: "system", Content: starSystemPrompt},
		{Role: "user", Content: question},
		{Role: "assistant", Content: fmt.Sprintf(`{"sql": "%s"}`, strings.ReplaceAll(failedSQL, `"`, `\"`))},
		{Role: "user", Content: retryMsg},
	})
}

// callStarAIWithMessages is the core OpenAI call for the Star service.
func (s *StarService) callStarAIWithMessages(ctx context.Context, messages []openAIMessage) (*starAIResponse, error) {
	reqBody := starAIRequest{
		Model:       s.model,
		Messages:    messages,
		Temperature: 0,
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
		return nil, fmt.Errorf("OpenAI request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("OpenAI API вернул статус %d: %s", resp.StatusCode, string(respBytes))
	}

	var openAIResp openAIResponse
	if err := json.Unmarshal(respBytes, &openAIResp); err != nil {
		return nil, fmt.Errorf("не удалось разобрать ответ OpenAI: %w", err)
	}

	if openAIResp.Error != nil {
		return nil, fmt.Errorf("OpenAI ошибка: %s", openAIResp.Error.Message)
	}

	if len(openAIResp.Choices) == 0 {
		return nil, fmt.Errorf("OpenAI вернул пустой ответ (нет choices)")
	}

	content := strings.TrimSpace(openAIResp.Choices[0].Message.Content)
	content = stripCodeFences(content)
	content = strings.TrimSpace(content)

	log.Debug().Str("raw_content", content).Msg("Star AI: raw OpenAI response")

	var aiResp starAIResponse
	if err := json.Unmarshal([]byte(content), &aiResp); err != nil {
		return nil, fmt.Errorf("не удалось разобрать JSON от AI (raw: %s): %w", content, err)
	}

	if aiResp.SQL == "" {
		return nil, fmt.Errorf("AI вернул пустой SQL")
	}

	return &aiResp, nil
}

// stripCodeFences removes markdown code fences from AI response.
func stripCodeFences(s string) string {
	if len(s) > 6 && s[:3] == "```" {
		i := 3
		for i < len(s) && s[i] != '\n' {
			i++
		}
		if i < len(s) {
			s = s[i+1:]
		}
		if len(s) > 3 && s[len(s)-3:] == "```" {
			s = s[:len(s)-3]
		}
	}
	return s
}

// ExecuteReadOnlySQL safely executes a read-only SQL query.
func (s *StarService) ExecuteReadOnlySQL(ctx context.Context, sql string) (*StarQueryResponse, error) {
	trimmed := strings.TrimSpace(strings.ToUpper(sql))
	if !strings.HasPrefix(trimmed, "SELECT") && !strings.HasPrefix(trimmed, "WITH") {
		return nil, fmt.Errorf("only SELECT queries are allowed")
	}

	forbidden := []string{"INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE"}
	for _, kw := range forbidden {
		if strings.Contains(trimmed, " "+kw+" ") || strings.HasPrefix(trimmed, kw+" ") {
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
		cleaned := make([]interface{}, len(values))
		for i, v := range values {
			switch val := v.(type) {
			case time.Time:
				cleaned[i] = val.Format("2006-01-02 15:04")
			case []byte:
				cleaned[i] = string(val)
			default:
				cleaned[i] = val
			}
		}
		resultRows = append(resultRows, cleaned)
	}

	if resultRows == nil {
		resultRows = [][]interface{}{}
	}

	return &StarQueryResponse{
		SQL:     sql,
		Columns: columns,
		Rows:    resultRows,
	}, nil
}
