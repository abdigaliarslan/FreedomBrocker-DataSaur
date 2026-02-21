package service

import (
	"strings"
	"unicode"

	"github.com/arslan/fire-challenge/internal/domain"
)

// PreEnrichResult holds deterministic enrichment data extracted without any API calls.
type PreEnrichResult struct {
	Type                string
	Sentiment           string
	Priority110         int
	Lang                string
	Summary             string
	RecommendedActions  []string
	GeoCity             *string
	ConfidenceType      float64
	ConfidenceSentiment float64
	ConfidencePriority  float64
}

// PreEnrich runs deterministic enrichment on a ticket. Pure function — no DB, no HTTP.
func PreEnrich(ticket *domain.Ticket) *PreEnrichResult {
	result := &PreEnrichResult{}

	body := ticket.Body
	subject := ticket.Subject

	result.Lang = detectLangDet(body)
	result.GeoCity = extractCityFromAddress(ticket.RawAddress)
	result.Type, result.ConfidenceType = classifyType(body, subject)
	result.Sentiment, result.ConfidenceSentiment = classifySentiment(body)
	result.Priority110, result.ConfidencePriority = calculatePriority(ticket.ClientSegment, result.Type, result.Sentiment)
	result.Summary = generateDeterministicSummary(body)
	result.RecommendedActions = suggestActions(result.Type, ticket.ClientSegment)

	return result
}

// detectLangDet detects language from text using character analysis.
// Kazakh has unique characters (ә,ғ,қ,ң,ө,ұ,ү,і,һ) that don't exist in Russian.
func detectLangDet(body string) string {
	kazChars := "әғқңөұүіһӘҒҚҢӨҰҮІҺ"

	var kazCount, cyrCount, latCount, totalLetters int

	for _, r := range body {
		if unicode.IsLetter(r) {
			totalLetters++
			if strings.ContainsRune(kazChars, r) {
				kazCount++
			}
			if (r >= 'а' && r <= 'я') || (r >= 'А' && r <= 'Я') || r == 'ё' || r == 'Ё' {
				cyrCount++
			}
			if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
				latCount++
			}
		}
	}

	if totalLetters == 0 {
		return "RU"
	}

	if kazCount > 0 {
		return "KZ"
	}

	if latCount > cyrCount && float64(latCount)/float64(totalLetters) > 0.6 {
		return "EN"
	}

	return "RU"
}

// knownCitiesSet is used by extractCityFromAddress for fallback matching.
var knownCitiesSet = map[string]bool{
	"алматы": true, "астана": true, "нур-султан": true, "шымкент": true,
	"караганда": true, "актобе": true, "тараз": true, "павлодар": true,
	"усть-каменогорск": true, "семей": true, "атырау": true, "костанай": true,
	"кызылорда": true, "уральск": true, "петропавловск": true, "актау": true,
	"туркестан": true, "кокшетау": true, "талдыкорган": true, "экибастуз": true,
	"москва": true,
}

// extractCityFromAddress extracts city from raw_address.
// raw_address format from composeAddress(): "country, region, city, street, house"
// City is the 3rd comma-separated element (index 2).
func extractCityFromAddress(rawAddress *string) *string {
	if rawAddress == nil || *rawAddress == "" {
		return nil
	}

	parts := strings.Split(*rawAddress, ",")

	// 3rd part is city from CSV "населённый пункт"
	if len(parts) >= 3 {
		city := strings.TrimSpace(parts[2])
		if city != "" {
			return &city
		}
	}

	// Fallback: check all parts against known cities
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		lower := strings.ToLower(part)
		if knownCitiesSet[lower] {
			return &part
		}
	}

	return nil
}

// typeKeywordEntry maps a ticket type to its detection keywords and priority weight.
type typeKeywordEntry struct {
	Type     string
	Keywords []string
	Weight   int
}

var typeKeywords = []typeKeywordEntry{
	{"Спам", []string{
		"http://", "https://", "www.", "bit.ly", "перейди", "акция", "выигр",
		"заработ", "бесплатн", "нажми", "подписк",
	}, 10},
	{"Претензия", []string{
		"претензи", "компенсац", "возврат", "возместит", "ущерб",
		"требую возврат", "верните деньги", "требую компенсац",
		"официальн", "юрист", "суд ",
	}, 9},
	{"Жалоба", []string{
		"жалоба", "жалоб", "недовол", "возмущ",
		"безобрази", "хамств", "нарушен", "обман",
	}, 8},
	{"Неработоспособность", []string{
		"не работает", "ошибка", "сбой", "зависа", "не открыва",
		"баг", "глюч", "не загруж", "не могу войти", "не отображ",
		"техническ", "приложени", "неработоспособн", "экран",
	}, 7},
	{"Смена данных", []string{
		"смена данных", "изменить данные", "сменить", "обновить данные",
		"изменить фио", "изменить адрес", "новый номер", "смена телефон",
		"изменить реквизит", "обновить информац",
	}, 6},
	{"Консультация", []string{
		"вопрос", "подскажите", "как ", "можно ли", "интересу",
		"расскажите", "объясните", "уточните", "информаци",
		"узнать", "консультаци", "спасибо", "благодар",
	}, 5},
}

// classifyType classifies ticket type by keyword matching.
func classifyType(body, subject string) (string, float64) {
	text := strings.ToLower(body + " " + subject)

	bestType := "Консультация"
	bestScore := 0
	bestWeight := 0

	for _, tk := range typeKeywords {
		score := 0
		for _, kw := range tk.Keywords {
			if strings.Contains(text, kw) {
				score++
			}
		}
		effectiveScore := score * tk.Weight
		if score > 0 && effectiveScore > bestScore {
			bestScore = effectiveScore
			bestWeight = tk.Weight
			bestType = tk.Type
		}
	}

	if bestType == "Консультация" && bestScore == 0 {
		return "Консультация", 0.3
	}

	matchCount := bestScore / bestWeight
	confidence := 0.5 + float64(matchCount-1)*0.15
	if confidence > 0.80 {
		confidence = 0.80
	}
	return bestType, confidence
}

var negativeWords = []string{
	"плохо", "ужасн", "недовол", "проблем", "жалоб", "разочаров",
	"не устраива", "возмущ", "безобрази", "хамств", "обман",
	"не работ", "ошибк", "сбой", "отврат", "кошмар",
}

var positiveWords = []string{
	"спасибо", "благодар", "отлично", "хорош", "прекрасн",
	"довол", "рад", "замечател", "великолепн", "молодц",
	"супер", "класс",
}

// classifySentiment determines sentiment by keyword counting.
func classifySentiment(body string) (string, float64) {
	lower := strings.ToLower(body)

	negScore := 0
	for _, w := range negativeWords {
		if strings.Contains(lower, w) {
			negScore++
		}
	}

	posScore := 0
	for _, w := range positiveWords {
		if strings.Contains(lower, w) {
			posScore++
		}
	}

	if negScore > posScore && negScore > 0 {
		confidence := 0.5 + float64(negScore)*0.1
		if confidence > 0.75 {
			confidence = 0.75
		}
		return "Негативный", confidence
	}
	if posScore > negScore && posScore > 0 {
		confidence := 0.5 + float64(posScore)*0.1
		if confidence > 0.75 {
			confidence = 0.75
		}
		return "Позитивный", confidence
	}

	return "Нейтральный", 0.60
}

// calculatePriority computes priority from segment, type and sentiment.
func calculatePriority(segment *string, ticketType, sentiment string) (int, float64) {
	priority := 5
	confidence := 0.60

	if segment != nil {
		switch *segment {
		case "VIP":
			priority = 8
			confidence = 0.90
		case "Priority":
			priority = 7
			confidence = 0.90
		case "Standard":
			priority = 5
			confidence = 0.85
		}
	}

	switch ticketType {
	case "Претензия":
		if priority < 8 {
			priority = 8
		}
	case "Жалоба":
		if priority < 7 {
			priority = 7
		}
	case "Неработоспособность":
		if priority < 6 {
			priority = 6
		}
	case "Смена данных":
		if priority < 4 {
			priority = 4
		}
	case "Спам":
		priority = 1
	}

	if sentiment == "Негативный" && priority < 7 {
		priority++
	}

	if priority > 10 {
		priority = 10
	}
	if priority < 1 {
		priority = 1
	}

	return priority, confidence
}

// generateDeterministicSummary creates a simple truncated summary from the body.
func generateDeterministicSummary(body string) string {
	body = strings.Join(strings.Fields(body), " ")
	runes := []rune(body)
	if len(runes) <= 200 {
		return body
	}
	cutoff := 200
	for cutoff > 150 && runes[cutoff] != ' ' {
		cutoff--
	}
	return string(runes[:cutoff]) + "..."
}

// suggestActions returns template-based recommended actions by ticket type.
func suggestActions(ticketType string, segment *string) []string {
	switch ticketType {
	case "Жалоба":
		actions := []string{
			"Связаться с клиентом для уточнения деталей жалобы",
			"Зарегистрировать жалобу в системе",
		}
		if segment != nil && (*segment == "VIP" || *segment == "Priority") {
			actions = append(actions, "Назначить персонального менеджера для решения")
		}
		return actions
	case "Претензия":
		actions := []string{
			"Зарегистрировать претензию в системе",
			"Проверить основания для компенсации",
			"Связаться с клиентом в течение 24 часов",
		}
		if segment != nil && (*segment == "VIP" || *segment == "Priority") {
			actions = append(actions, "Эскалировать руководителю подразделения")
		}
		return actions
	case "Неработоспособность":
		return []string{
			"Передать в техническую поддержку",
			"Запросить скриншоты/логи у клиента",
			"Проверить статус системы",
		}
	case "Смена данных":
		return []string{
			"Запросить подтверждающие документы",
			"Обработать заявку на смену данных",
			"Уведомить клиента о сроках обработки",
		}
	case "Консультация":
		return []string{
			"Предоставить запрашиваемую информацию",
			"Направить ссылку на соответствующую документацию",
		}
	case "Спам":
		return []string{"Пометить как спам, не требует обработки"}
	default:
		return []string{
			"Изучить обращение и определить тип",
			"Связаться с клиентом для уточнения",
		}
	}
}

// MergeResults combines deterministic pre-enrichment with AI results.
// AI is the base; deterministic overrides where it's more reliable.
func MergeResults(pre *PreEnrichResult, ai *aiResult) *aiResult {
	merged := *ai

	// Language: KZ detection by Unicode chars is near-perfect — always wins
	if pre.Lang == "KZ" {
		merged.Lang = "KZ"
	}

	// Type: AI wins when confident; deterministic catches low-confidence AI
	if ai.ConfidenceType < 0.5 && pre.ConfidenceType >= 0.6 {
		merged.Type = pre.Type
		merged.ConfidenceType = pre.ConfidenceType
	}
	// Spam: if deterministic says spam, trust it (AI sometimes misclassifies promo)
	if pre.Type == "Спам" && pre.ConfidenceType >= 0.65 && ai.Type != "Спам" {
		merged.Type = "Спам"
		merged.ConfidenceType = pre.ConfidenceType
	}

	// Sentiment: AI generally better, but override when AI is unsure
	if ai.ConfidenceSentiment < 0.5 && pre.ConfidenceSentiment >= 0.6 {
		merged.Sentiment = pre.Sentiment
		merged.ConfidenceSentiment = pre.ConfidenceSentiment
	}

	// Priority: segment-based rules are authoritative — serve as floor
	if pre.ConfidencePriority >= 0.85 && pre.Priority110 > ai.Priority110 {
		merged.Priority110 = pre.Priority110
	}
	if merged.Type == "Спам" {
		merged.Priority110 = 1
	}

	// Geo: structured CSV data beats AI text extraction
	if pre.GeoCity != nil && *pre.GeoCity != "" {
		merged.GeoCity = pre.GeoCity
	}

	// Summary & RecommendedActions: AI always wins (qualitatively better)

	return &merged
}
