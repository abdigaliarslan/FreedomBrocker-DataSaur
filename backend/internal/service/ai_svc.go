package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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
	imagesDir  string
}

func NewAIService(apiKey, model, imagesDir string, ticketRepo *repository.TicketRepo, routingSvc *RoutingService) *AIService {
	return &AIService{
		apiKey:     apiKey,
		model:      model,
		httpClient: &http.Client{Timeout: 60 * time.Second},
		ticketRepo: ticketRepo,
		routingSvc: routingSvc,
		imagesDir:  imagesDir,
	}
}

const systemPrompt = `Ты — AI-аналитик банка Freedom Broker. Анализируй клиентские обращения и возвращай ТОЛЬКО JSON без markdown.

Формат ответа (строго JSON):
{
  "type": "тип обращения: Жалоба | Претензия | Консультация | Неработоспособность | Смена данных | Спам",
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

Типы обращений:
- Жалоба — выражение недовольства качеством обслуживания, без требования компенсации
- Претензия — недовольство + требование компенсации, возврата средств, официальная претензия
- Консультация — запрос информации, вопрос, нейтральное обращение
- Неработоспособность — технический сбой, ошибка в приложении/системе, что-то не работает
- Смена данных — запрос на изменение личных данных, реквизитов, адреса, ФИО
- Спам — нежелательная корреспонденция, реклама, мошенничество

Правила:
- VIP и Priority клиенты автоматически получают приоритет >= 7
- Жалобы и Претензии — приоритет >= 6, Претензии >= 8
- Спам — приоритет 1
- Неработоспособность — приоритет >= 6
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
	startTime := time.Now()

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

	// Use Vision API if ticket has image attachments
	var aiRes *aiResult
	imagePaths := s.resolveImagePaths(ticket.Attachments)
	if len(imagePaths) > 0 {
		log.Info().Str("ticket_id", ticketID.String()).Int("images", len(imagePaths)).Msg("using Vision API for image analysis")
		aiRes, err = s.callOpenAIWithVision(ctx, userMsg, imagePaths)
	} else {
		aiRes, err = s.callOpenAI(ctx, userMsg)
	}
	if err != nil {
		log.Warn().Err(err).Str("ticket_id", ticketID.String()).Msg("OpenAI failed, using deterministic enrichment only")

		// Save processing time for deterministic-only path
		processingMs := int(time.Since(startTime).Milliseconds())
		preAI.ProcessingMs = &processingMs
		_ = s.ticketRepo.UpsertAI(ctx, preAI)

		// Route with deterministic data (fallback)
		if preResult.Type != "Спам" {
			if routeErr := s.routingSvc.RouteTicket(ctx, ticket, preAI); routeErr != nil {
				log.Error().Err(routeErr).Str("ticket_id", ticketID.String()).Msg("routing failed")
			}
		} else {
			_ = s.ticketRepo.UpdateStatus(ctx, ticketID, "routed")
		}

		log.Info().Str("ticket_id", ticketID.String()).Str("type", preResult.Type).Str("mode", "deterministic_only").Int("processing_ms", processingMs).Msg("enrichment complete (AI fallback)")
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

	processingMs := int(time.Since(startTime).Milliseconds())
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
		ProcessingMs:        &processingMs,
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

	log.Info().Str("ticket_id", ticketID.String()).Str("type", merged.Type).Str("sentiment", merged.Sentiment).Int("processing_ms", processingMs).Str("mode", "hybrid").Msg("AI enrichment complete")
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
	// Known Kazakhstan cities, towns, and region aliases with approximate coordinates
	cities := map[string][2]float64{
		// Major cities
		"алматы":             {43.2220, 76.8512},
		"астана":             {51.1694, 71.4491},
		"нур-султан":         {51.1694, 71.4491},
		"nur-sultan":         {51.1694, 71.4491},
		"шымкент":            {42.3417, 69.5901},
		"shymkent":           {42.3417, 69.5901},
		"chimkent":           {42.3417, 69.5901},
		"чимкент":            {42.3417, 69.5901},
		"караганда":          {49.8047, 73.1094},
		"актобе":             {50.2839, 57.1670},
		"актюбинск":          {50.2839, 57.1670},
		"aktobe":             {50.2839, 57.1670},
		"aktyubinsk":         {50.2839, 57.1670},
		"тараз":              {42.9000, 71.3667},
		"taraz":              {42.9000, 71.3667},
		"джамбул":            {42.9000, 71.3667},
		"dzhambul":           {42.9000, 71.3667},
		"павлодар":           {52.2873, 76.9674},
		"усть-каменогорск":   {49.9481, 82.6279},
		"ust-kamenogorsk":    {49.9481, 82.6279},
		"усть каменогорск":   {49.9481, 82.6279},
		"семей":              {50.4111, 80.2275},
		"атырау":             {47.1167, 51.8833},
		"atyrau":             {47.1167, 51.8833},
		"гурьев":             {47.1167, 51.8833},
		"костанай":           {53.2198, 63.6354},
		"кустанай":           {53.2198, 63.6354},
		"кызылорда":          {44.8479, 65.5092},
		"уральск":            {51.2333, 51.3667},
		"оральск":            {51.2333, 51.3667},
		"uralsk":             {51.2333, 51.3667},
		"петропавловск":      {54.8667, 69.1500},
		"актау":              {43.6500, 51.1500},
		"туркестан":          {43.2975, 68.2514},
		"кокшетау":           {53.2833, 69.3833},
		"талдыкорган":        {45.0000, 78.3667},
		"экибастуз":          {51.7333, 75.3167},

		// Small and medium towns — Карагандинская обл
		"темиртау":    {50.0546, 72.9568},
		"сарань":      {49.7833, 72.9167},
		"жезказган":   {47.7972, 67.7128},
		"жезқазған":   {47.7972, 67.7128},
		"балхаш":      {46.8486, 74.9953},
		"балқаш":      {46.8486, 74.9953},
		"осакаровка":  {50.5500, 72.5500},
		"приозерск":   {46.0500, 73.9167},

		// Акмолинская обл
		"степногорск": {52.3500, 71.8833},
		"щучинск":     {52.9333, 70.2333},
		"степняк":     {52.8500, 71.9000},
		"акколь":      {51.9750, 70.9417},
		"атбасар":     {51.8167, 68.3500},
		"есиль":       {51.9617, 66.4078},
		"державинск":  {51.0833, 66.3167},
		"аркалык":     {50.2500, 66.9000},

		// Костанайская обл
		"рудный":    {52.9667, 63.1167},
		"лисаковск": {52.6500, 62.5000},
		"житикара":  {52.1833, 61.2000},
		"тобыл":     {53.0000, 62.8667},
		"тобол":     {53.0000, 62.8667},
		"фёдоровка": {53.4833, 62.1500},
		"федоровка": {53.4833, 62.1500},

		// СКО
		"мамлютка":  {54.6167, 68.7000},
		"булаево":   {54.9000, 70.4500},
		"пресновка": {54.9500, 68.4167},

		// Павлодарская обл
		"аксу": {52.4469, 76.9139},

		// ВКО
		"риддер":     {50.3500, 83.5167},
		"аягоз":      {47.9667, 80.4333},
		"зыряновск":  {49.7167, 84.2667},
		"шемонаиха":  {50.6333, 81.9167},
		"глубокое":   {50.1167, 82.3000},
		"серебрянск": {49.7000, 82.0000},
		"курчатов":   {50.7381, 78.5317},

		// Актюбинская обл
		"хромтау":   {50.2667, 58.4500},
		"алга":      {49.9000, 57.3333},
		"кандыагаш": {49.4667, 57.4000},

		// Атырауская обл
		"кульсары":  {46.9833, 54.0167},
		"ганюшкино": {46.5833, 52.0000},

		// Мангистауская обл
		"жанаозен":      {43.3400, 52.8600},
		"форт-шевченко": {44.5000, 50.2500},
		"бейнеу":        {45.2500, 55.1000},

		// Кызылординская обл
		"аральск":   {46.7928, 61.6700},
		"казалы":    {45.7600, 62.1067},
		"жалагаш":   {45.0167, 64.6000},
		"теренозек": {44.9833, 64.1167},
		"байконыр":  {45.6214, 63.3144},

		// ЮКО / Туркестанская обл
		"арысь":   {42.4333, 68.8000},
		"кентау":  {43.5167, 68.5000},
		"шардара": {41.2500, 68.0833},
		"жанатас": {43.5843, 70.6198},
		"каратау": {43.1833, 70.7167},
		"шу":      {43.5972, 73.7669},
		"ленгер":  {42.1833, 69.8833},
		"сайрам":  {42.3100, 69.7400},
		"бадам":   {42.3100, 69.7400},
		"отрар":   {42.8667, 68.2500},

		// Алматинская обл
		"каскелен":   {43.1978, 76.6206},
		"талгар":     {43.3028, 77.2428},
		"есик":       {43.3572, 77.4442},
		"капшагай":   {43.8667, 77.0667},
		"капчагай":   {43.8667, 77.0667},
		"конаев":     {43.8667, 77.0667},
		"тургень":    {43.1833, 77.7833},
		"кокпек":     {43.4300, 77.4500},
		"кыргауылды": {43.3000, 77.2000},
		"текели":     {44.8667, 78.7167},
		"жаркент":    {44.1667, 80.0000},
		"хоргос":     {44.2000, 80.4167},

		// Акмолинская обл — дополнительно
		"шортанды":   {51.5667, 71.0167},
		"красный яр": {52.6000, 70.1000},
		"косшы":      {51.1833, 71.5833},

		// ВКО — дополнительно
		"кокпекты":  {50.3667, 82.7667},
		"бескарагай": {51.2833, 79.3833},

		// Атырауская обл — дополнительно
		"индербор": {48.5667, 51.8833},
		"индер":    {48.5667, 51.8833},

		// Latin spellings (для адресов на английском)
		"aktau":     {43.6500, 51.1500},
		"almaty":    {43.2220, 76.8512},
		"astana":    {51.1694, 71.4491},
		"pavlodar":  {52.2873, 76.9674},
		"karaganda": {49.8047, 73.1094},
		"mangystau": {43.6500, 51.1500},

		// Region/oblast aliases → regional center
		"карагандинская":          {49.8047, 73.1094},
		"карагандинская обл":      {49.8047, 73.1094},
		"карагандинская область":  {49.8047, 73.1094},
		"акмолинская":             {51.1694, 71.4491},
		"акмолинская обл":         {51.1694, 71.4491},
		"акмолинская область":     {51.1694, 71.4491},
		"алматинская":             {43.2220, 76.8512},
		"алматинская обл":         {43.2220, 76.8512},
		"алматинская область":     {43.2220, 76.8512},
		"туркестанская":           {42.3417, 69.5901},
		"туркестанская обл":       {42.3417, 69.5901},
		"туркестанская область":   {42.3417, 69.5901},
		"южно-казахстанская":      {42.3417, 69.5901},
		"юко":                     {42.3417, 69.5901},
		"северо-казахстанская":    {54.8667, 69.1500},
		"ско":                     {54.8667, 69.1500},
		"северо-казахстанская область": {54.8667, 69.1500},
		"восточно-казахстанская":       {49.9481, 82.6279},
		"вко":                          {49.9481, 82.6279},
		"восточно-казахстанская область": {49.9481, 82.6279},
		"западно-казахстанская":          {51.2333, 51.3667},
		"зко":                            {51.2333, 51.3667},
		"западно-казахстанская область":  {51.2333, 51.3667},
		"актюбинская":           {50.2839, 57.1670},
		"актюбинская обл":       {50.2839, 57.1670},
		"актюбинская область":   {50.2839, 57.1670},
		"атырауская":            {47.1167, 51.8833},
		"атырауская обл":        {47.1167, 51.8833},
		"атырауская область":    {47.1167, 51.8833},
		"жамбылская":            {42.9000, 71.3667},
		"жамбылская обл":        {42.9000, 71.3667},
		"жамбылская область":    {42.9000, 71.3667},
		"костанайская":          {53.2198, 63.6354},
		"костанайская обл":      {53.2198, 63.6354},
		"костанайская область":  {53.2198, 63.6354},
		"кызылординская":        {44.8479, 65.5092},
		"кызылординская обл":    {44.8479, 65.5092},
		"кызылординская область": {44.8479, 65.5092},
		"мангистауская":          {43.6500, 51.1500},
		"мангистауская обл":      {43.6500, 51.1500},
		"мангистауская область":  {43.6500, 51.1500},
		"павлодарская":           {52.2873, 76.9674},
		"павлодарская обл":       {52.2873, 76.9674},
		"павлодарская область":   {52.2873, 76.9674},
		"абайская":               {50.4111, 80.2275},
		"абайская обл":           {50.4111, 80.2275},
		"абайская область":       {50.4111, 80.2275},
		"улытауская":             {47.7972, 67.7128},
		"улытауская обл":         {47.7972, 67.7128},
		"улытауская область":     {47.7972, 67.7128},

		// Foreign / neighboring
		"москва":          {55.7558, 37.6173},
		"санкт-петербург": {59.9311, 30.3609},
		"бишкек":          {42.8746, 74.5698},
		"ташкент":         {41.2995, 69.2401},
	}

	lower := toLower(city)

	// 1. Exact match
	if coords, ok := cities[lower]; ok {
		lat := coords[0]
		lon := coords[1]
		return &lat, &lon, "known"
	}

	// 2. First-token match — handles "Алматы, пр. Достык" → token "алматы"
	if idx := strings.Index(lower, ","); idx > 0 {
		firstToken := strings.TrimSpace(lower[:idx])
		if coords, ok := cities[firstToken]; ok {
			lat := coords[0]
			lon := coords[1]
			return &lat, &lon, "known"
		}
	}

	// 3. Contains match — check if input contains a known city/region name (min 4 chars to avoid false positives)
	for name, coords := range cities {
		if len(name) >= 4 && strings.Contains(lower, name) {
			lat := coords[0]
			lon := coords[1]
			return &lat, &lon, "known"
		}
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

// ── Vision API support ──

// contentPart represents a part of a multimodal message content.
type contentPart struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	ImageURL *imageURL `json:"image_url,omitempty"`
}

type imageURL struct {
	URL string `json:"url"`
}

type openAIVisionMessage struct {
	Role    string        `json:"role"`
	Content interface{}   `json:"content"` // string for system, []contentPart for user
}

type openAIVisionRequest struct {
	Model    string                `json:"model"`
	Messages []openAIVisionMessage `json:"messages"`
	MaxTokens int                  `json:"max_tokens,omitempty"`
}

// callOpenAIWithVision sends text + images to OpenAI Vision API.
func (s *AIService) callOpenAIWithVision(ctx context.Context, userMessage string, imagePaths []string) (*aiResult, error) {
	parts := []contentPart{
		{Type: "text", Text: userMessage + "\n\nВНИМАНИЕ: К обращению приложены изображения. Проанализируй их содержимое и учти при классификации. Если на изображении видна ошибка/скриншот проблемы — тип 'Неработоспособность'. Если документ — учти контекст."},
	}

	for _, imgPath := range imagePaths {
		dataURI, err := loadImageAsBase64(imgPath)
		if err != nil {
			log.Warn().Err(err).Str("path", imgPath).Msg("failed to load image, skipping")
			continue
		}
		parts = append(parts, contentPart{
			Type:     "image_url",
			ImageURL: &imageURL{URL: dataURI},
		})
	}

	reqBody := openAIVisionRequest{
		Model: s.model,
		Messages: []openAIVisionMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: parts},
		},
		MaxTokens: 1000,
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
		return nil, fmt.Errorf("OpenAI Vision API status %d: %s", resp.StatusCode, string(respBytes))
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

	content := stripCodeFences(openAIResp.Choices[0].Message.Content)

	var result aiResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("parse AI JSON: %w (raw: %s)", err, content)
	}

	if result.Priority110 < 1 {
		result.Priority110 = 1
	}
	if result.Priority110 > 10 {
		result.Priority110 = 10
	}

	return &result, nil
}

// resolveImagePaths parses comma-separated attachment filenames and returns paths to existing image files.
func (s *AIService) resolveImagePaths(attachments *string) []string {
	if attachments == nil || *attachments == "" || s.imagesDir == "" {
		return nil
	}

	imageExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true, ".bmp": true}
	var paths []string

	for _, name := range strings.Split(*attachments, ",") {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		ext := strings.ToLower(filepath.Ext(name))
		if !imageExts[ext] {
			continue
		}
		fullPath := filepath.Join(s.imagesDir, name)
		if _, err := os.Stat(fullPath); err == nil {
			paths = append(paths, fullPath)
		}
	}

	return paths
}

// loadImageAsBase64 reads an image file and returns a data URI for the OpenAI Vision API.
func loadImageAsBase64(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	ext := strings.ToLower(filepath.Ext(path))
	mimeType := "image/jpeg"
	switch ext {
	case ".png":
		mimeType = "image/png"
	case ".gif":
		mimeType = "image/gif"
	case ".webp":
		mimeType = "image/webp"
	case ".bmp":
		mimeType = "image/bmp"
	}

	encoded := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:%s;base64,%s", mimeType, encoded), nil
}
