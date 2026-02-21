package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
)

type AIService struct {
	apiKey     string
	model      string
	httpClient *http.Client
	ticketRepo *repository.TicketRepo
	routingSvc *RoutingService
}

func NewAIService(apiKey, model string, ticketRepo *repository.TicketRepo, routingSvc *RoutingService) *AIService {
	return &AIService{
		apiKey:     apiKey,
		model:      model,
		httpClient: &http.Client{Timeout: 60 * time.Second},
		ticketRepo: ticketRepo,
		routingSvc: routingSvc,
	}
}

const systemPrompt = `Ты — AI-аналитик банка Freedom Broker. Анализируй клиентские обращения и возвращай ТОЛЬКО JSON без markdown.

Формат ответа (строго JSON):
{
  "type": "тип обращения: Жалоба | Консультация | Заявка | Благодарность | Спам | Техническая проблема | Другое",
  "sentiment": "Позитивный | Негативный | Нейтральный",
  "priority_1_10": число от 1 до 10,
  "lang": "RU | KZ | EN",
  "summary": "краткое резюме обращения в 1-2 предложениях",
  "recommended_actions": ["действие 1", "действие 2"],
  "geo_city": "город из текста или адреса если упоминается, иначе null",
  "confidence_type": число от 0.0 до 1.0,
  "confidence_sentiment": число от 0.0 до 1.0,
  "confidence_priority": число от 0.0 до 1.0
}

Правила:
- VIP и Priority клиенты автоматически получают приоритет >= 7
- Жалобы — приоритет >= 6
- Спам — приоритет 1
- Если клиент упоминает город — укажи в geo_city
- recommended_actions — конкретные действия для менеджера (2-4 пункта)
- summary — на русском языке`

type openAIRequest struct {
	Model    string          `json:"model"`
	Messages []openAIMessage `json:"messages"`
}

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

type aiResult struct {
	Type                string   `json:"type"`
	Sentiment           string   `json:"sentiment"`
	Priority110         int      `json:"priority_1_10"`
	Lang                string   `json:"lang"`
	Summary             string   `json:"summary"`
	RecommendedActions  []string `json:"recommended_actions"`
	GeoCity             *string  `json:"geo_city"`
	ConfidenceType      float64  `json:"confidence_type"`
	ConfidenceSentiment float64  `json:"confidence_sentiment"`
	ConfidencePriority  float64  `json:"confidence_priority"`
}

// EnrichTicket runs hybrid enrichment (deterministic + AI) and routing for a single ticket.
func (s *AIService) EnrichTicket(ctx context.Context, ticketID uuid.UUID) error {
	ticket, err := s.ticketRepo.GetByID(ctx, ticketID)
	if err != nil {
		return fmt.Errorf("get ticket: %w", err)
	}

	_ = s.ticketRepo.UpdateStatus(ctx, ticketID, "enriching")

	// ── Phase 1: Deterministic pre-enrichment (instant, no API) ──
	preResult := PreEnrich(ticket)

	var preLat, preLon *float64
	preGeoStatus := "unknown"
	if preResult.GeoCity != nil && *preResult.GeoCity != "" {
		preLat, preLon, preGeoStatus = s.resolveGeo(ctx, *preResult.GeoCity)
	}

	now := time.Now()
	preActionsJSON, _ := json.Marshal(preResult.RecommendedActions)
	aiID := uuid.New()

	preAI := &domain.TicketAI{
		ID:                  aiID,
		TicketID:            ticketID,
		Type:                &preResult.Type,
		Sentiment:           &preResult.Sentiment,
		Priority110:         &preResult.Priority110,
		Lang:                preResult.Lang,
		Summary:             &preResult.Summary,
		RecommendedActions:  preActionsJSON,
		Lat:                 preLat,
		Lon:                 preLon,
		GeoStatus:           preGeoStatus,
		ConfidenceType:      &preResult.ConfidenceType,
		ConfidenceSentiment: &preResult.ConfidenceSentiment,
		ConfidencePriority:  &preResult.ConfidencePriority,
		EnrichedAt:          &now,
	}

	if err := s.ticketRepo.UpsertAI(ctx, preAI); err != nil {
		return fmt.Errorf("save pre-enrichment: %w", err)
	}

	_ = s.ticketRepo.UpdateStatus(ctx, ticketID, "enriched")

	log.Info().Str("ticket_id", ticketID.String()).Str("type", preResult.Type).Str("mode", "deterministic").Msg("pre-enrichment saved")

	// ── Phase 2: AI enrichment (may fail — that's OK, we have fallback) ──
	userMsg := s.buildUserMessage(ticket)
	aiRes, err := s.callOpenAI(ctx, userMsg)
	if err != nil {
		log.Warn().Err(err).Str("ticket_id", ticketID.String()).Msg("OpenAI failed, using deterministic enrichment only")

		// Route with deterministic data (fallback)
		if preResult.Type != "Спам" {
			if routeErr := s.routingSvc.RouteTicket(ctx, ticket, preAI); routeErr != nil {
				log.Error().Err(routeErr).Str("ticket_id", ticketID.String()).Msg("routing failed")
			}
		} else {
			_ = s.ticketRepo.UpdateStatus(ctx, ticketID, "routed")
		}

		log.Info().Str("ticket_id", ticketID.String()).Str("type", preResult.Type).Str("mode", "deterministic_only").Msg("enrichment complete (AI fallback)")
		return nil
	}

	// ── Phase 3: Merge deterministic + AI results ──
	merged := MergeResults(preResult, aiRes)

	geoCity := merged.GeoCity
	if geoCity == nil {
		geoCity = preResult.GeoCity
	}

	var lat, lon *float64
	geoStatus := "unknown"
	if geoCity != nil && *geoCity != "" {
		lat, lon, geoStatus = s.resolveGeo(ctx, *geoCity)
	}

	mergedActionsJSON, _ := json.Marshal(merged.RecommendedActions)
	mergedAI := &domain.TicketAI{
		ID:                  aiID,
		TicketID:            ticketID,
		Type:                &merged.Type,
		Sentiment:           &merged.Sentiment,
		Priority110:         &merged.Priority110,
		Lang:                merged.Lang,
		Summary:             &merged.Summary,
		RecommendedActions:  mergedActionsJSON,
		Lat:                 lat,
		Lon:                 lon,
		GeoStatus:           geoStatus,
		ConfidenceType:      &merged.ConfidenceType,
		ConfidenceSentiment: &merged.ConfidenceSentiment,
		ConfidencePriority:  &merged.ConfidencePriority,
		EnrichedAt:          &now,
	}

	if err := s.ticketRepo.UpsertAI(ctx, mergedAI); err != nil {
		return fmt.Errorf("save merged AI: %w", err)
	}

	// Route with merged data
	if merged.Type != "Спам" {
		if err := s.routingSvc.RouteTicket(ctx, ticket, mergedAI); err != nil {
			log.Error().Err(err).Str("ticket_id", ticketID.String()).Msg("routing failed")
		}
	} else {
		_ = s.ticketRepo.UpdateStatus(ctx, ticketID, "routed")
	}

	log.Info().Str("ticket_id", ticketID.String()).Str("type", merged.Type).Str("sentiment", merged.Sentiment).Str("mode", "hybrid").Msg("AI enrichment complete")
	return nil
}

func (s *AIService) buildUserMessage(ticket *domain.Ticket) string {
	userMsg := fmt.Sprintf("Тема: %s\n\nОбращение: %s", ticket.Subject, ticket.Body)
	if ticket.ClientName != nil {
		userMsg += fmt.Sprintf("\n\nКлиент: %s", *ticket.ClientName)
	}
	if ticket.ClientSegment != nil {
		userMsg += fmt.Sprintf("\nСегмент: %s", *ticket.ClientSegment)
	}
	if ticket.RawAddress != nil {
		userMsg += fmt.Sprintf("\nАдрес: %s", *ticket.RawAddress)
	}
	if ticket.SourceChannel != nil {
		userMsg += fmt.Sprintf("\nКанал: %s", *ticket.SourceChannel)
	}
	return userMsg
}

func (s *AIService) callOpenAI(ctx context.Context, userMessage string) (*aiResult, error) {
	reqBody := openAIRequest{
		Model: s.model,
		Messages: []openAIMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMessage},
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
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("OpenAI API status %d: %s", resp.StatusCode, string(respBytes))
	}

	var openAIResp openAIResponse
	if err := json.Unmarshal(respBytes, &openAIResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if openAIResp.Error != nil {
		return nil, fmt.Errorf("OpenAI error: %s", openAIResp.Error.Message)
	}

	if len(openAIResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	content := openAIResp.Choices[0].Message.Content

	// Strip markdown code fences if present
	content = stripCodeFences(content)

	var result aiResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("parse AI JSON: %w (raw: %s)", err, content)
	}

	// Clamp priority
	if result.Priority110 < 1 {
		result.Priority110 = 1
	}
	if result.Priority110 > 10 {
		result.Priority110 = 10
	}

	return &result, nil
}

func (s *AIService) resolveGeo(ctx context.Context, city string) (*float64, *float64, string) {
	// Known Kazakhstan cities with approximate coordinates
	cities := map[string][2]float64{
		"алматы":         {43.2220, 76.8512},
		"астана":         {51.1694, 71.4491},
		"нур-султан":     {51.1694, 71.4491},
		"шымкент":        {42.3417, 69.5901},
		"караганда":      {49.8047, 73.1094},
		"актобе":         {50.2839, 57.1670},
		"тараз":          {42.9000, 71.3667},
		"павлодар":       {52.2873, 76.9674},
		"усть-каменогорск": {49.9481, 82.6279},
		"семей":          {50.4111, 80.2275},
		"атырау":         {47.1167, 51.8833},
		"костанай":       {53.2198, 63.6354},
		"кызылорда":      {44.8479, 65.5092},
		"уральск":        {51.2333, 51.3667},
		"петропавловск":  {54.8667, 69.1500},
		"актау":          {43.6500, 51.1500},
		"туркестан":      {43.2975, 68.2514},
		"кокшетау":       {53.2833, 69.3833},
		"талдыкорган":    {45.0000, 78.3667},
		"экибастуз":      {51.7333, 75.3167},
		"москва":         {55.7558, 37.6173},
	}

	lower := toLower(city)
	if coords, ok := cities[lower]; ok {
		lat := coords[0]
		lon := coords[1]
		return &lat, &lon, "known"
	}

	return nil, nil, "unknown"
}

func toLower(s string) string {
	result := make([]byte, 0, len(s)*2)
	for _, r := range s {
		if r >= 'А' && r <= 'Я' {
			result = append(result, string(r+32)...)
		} else if r >= 'A' && r <= 'Z' {
			result = append(result, byte(r+32))
		} else {
			result = append(result, string(r)...)
		}
	}
	return string(result)
}

func stripCodeFences(s string) string {
	// Remove ```json ... ``` or ``` ... ```
	if len(s) > 6 && s[:3] == "```" {
		// Find end of first line
		i := 3
		for i < len(s) && s[i] != '\n' {
			i++
		}
		if i < len(s) {
			s = s[i+1:]
		}
		// Remove trailing ```
		if len(s) > 3 && s[len(s)-3:] == "```" {
			s = s[:len(s)-3]
		}
	}
	return s
}
