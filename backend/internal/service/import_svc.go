package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
)

type ImportService struct {
	ticketRepo  *repository.TicketRepo
	managerRepo *repository.ManagerRepo
	buRepo      *repository.BusinessUnitRepo
}

func NewImportService(tr *repository.TicketRepo, mr *repository.ManagerRepo, br *repository.BusinessUnitRepo) *ImportService {
	return &ImportService{ticketRepo: tr, managerRepo: mr, buRepo: br}
}

type ImportResult struct {
	Type        string      `json:"type"`
	Total       int         `json:"total"`
	Imported    int         `json:"imported"`
	Skipped     int         `json:"skipped"`
	Errors      []string    `json:"errors"`
	ImportedIDs []uuid.UUID `json:"imported_ids,omitempty"`
}

// DetectAndImport reads CSV headers to auto-detect the file type, then imports accordingly.
func (s *ImportService) DetectAndImport(ctx context.Context, r io.Reader) (*ImportResult, error) {
	// Read all content so we can peek at headers then re-read
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}

	// Peek at headers
	peek := csv.NewReader(strings.NewReader(string(data)))
	peek.LazyQuotes = true
	peek.TrimLeadingSpace = true
	header, err := peek.Read()
	if err != nil {
		return nil, fmt.Errorf("read header: %w", err)
	}

	colIdx := mapColumns(header)
	fileType := detectFileType(colIdx)

	reader := strings.NewReader(string(data))
	switch fileType {
	case "tickets":
		res, err := s.ImportTickets(ctx, reader)
		if err != nil {
			return nil, err
		}
		res.Type = "tickets"
		return res, nil
	case "managers":
		res, err := s.ImportManagers(ctx, reader)
		if err != nil {
			return nil, err
		}
		res.Type = "managers"
		return res, nil
	case "business_units":
		res, err := s.ImportBusinessUnits(ctx, reader)
		if err != nil {
			return nil, err
		}
		res.Type = "business_units"
		return res, nil
	default:
		return nil, fmt.Errorf("unable to detect file type from CSV headers: %v", header)
	}
}

// detectFileType guesses the CSV type by checking which known columns are present.
func detectFileType(colIdx map[string]int) string {
	// Tickets: has "body" or "external_id" or "client_segment"
	if _, ok := colIdx["body"]; ok {
		return "tickets"
	}
	if _, ok := colIdx["external_id"]; ok {
		return "tickets"
	}
	if _, ok := colIdx["client_segment"]; ok {
		return "tickets"
	}
	// Managers: has "full_name" or "skills" or "current_load"
	if _, ok := colIdx["full_name"]; ok {
		return "managers"
	}
	if _, ok := colIdx["skills"]; ok {
		return "managers"
	}
	if _, ok := colIdx["current_load"]; ok {
		return "managers"
	}
	// Business units: has "address" column but not the others
	if _, ok := colIdx["address"]; ok {
		return "business_units"
	}
	return "unknown"
}

// mapColumns maps both English and Russian CSV headers to canonical internal keys.
func mapColumns(header []string) map[string]int {
	aliases := map[string]string{
		// Business units (Russian)
		"офис":  "name",
		"адрес": "address",
		// Managers (Russian)
		"фио":       "full_name",
		"должность": "position",
		"навыки":    "skills",
		"количество обращений в работе": "current_load",
		// Tickets (Russian)
		"guid клиента":     "external_id",
		"пол клиента":      "gender",
		"дата рождения":    "birth_date",
		"описание":         "body",
		"вложения":         "attachments",
		"сегмент клиента":  "client_segment",
		"страна":           "country",
		"область":          "region",
		"населённый пункт": "city",
		"улица":            "street",
		"дом":              "house",
	}

	m := make(map[string]int)
	for i, col := range header {
		key := strings.TrimSpace(strings.ToLower(col))
		// Strip UTF-8 BOM from first column
		key = strings.TrimPrefix(key, "\xef\xbb\xbf")
		if alias, ok := aliases[key]; ok {
			m[alias] = i
		}
		m[key] = i
	}
	return m
}

func getCol(record []string, colIdx map[string]int, key string) string {
	if idx, ok := colIdx[key]; ok && idx < len(record) {
		return strings.TrimSpace(record[idx])
	}
	return ""
}

func (s *ImportService) ImportTickets(ctx context.Context, r io.Reader) (*ImportResult, error) {
	reader := csv.NewReader(r)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("read header: %w", err)
	}

	colIdx := mapColumns(header)
	result := &ImportResult{}
	var tickets []domain.Ticket

	for lineNum := 2; ; lineNum++ {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: %v", lineNum, err))
			continue
		}

		t := domain.Ticket{
			ID:     uuid.New(),
			Status: "new",
		}

		// External ID
		if v := getCol(record, colIdx, "external_id"); v != "" {
			t.ExternalID = &v
		}

		// Body
		t.Body = getCol(record, colIdx, "body")

		// Subject — from column or generate from body
		t.Subject = getCol(record, colIdx, "subject")
		if t.Subject == "" && t.Body != "" {
			t.Subject = generateSubject(t.Body)
		}

		// Client segment
		if v := getCol(record, colIdx, "client_segment"); v != "" {
			t.ClientSegment = &v
		}

		// Client name
		if v := getCol(record, colIdx, "client_name"); v != "" {
			t.ClientName = &v
		}

		// Source channel
		if v := getCol(record, colIdx, "source_channel"); v != "" {
			t.SourceChannel = &v
		} else {
			ch := "email"
			t.SourceChannel = &ch
		}

		// Raw address — from column or compose from individual fields
		if v := getCol(record, colIdx, "raw_address"); v != "" {
			t.RawAddress = &v
		} else {
			addr := composeAddress(
				getCol(record, colIdx, "country"),
				getCol(record, colIdx, "region"),
				getCol(record, colIdx, "city"),
				getCol(record, colIdx, "street"),
				getCol(record, colIdx, "house"),
			)
			if addr != "" {
				t.RawAddress = &addr
			}
		}

		// Attachments
		if v := getCol(record, colIdx, "attachments"); v != "" {
			t.Attachments = &v
		}

		// Handle tickets with only attachments (no text body)
		if t.Subject == "" && t.Body == "" {
			if t.Attachments != nil && *t.Attachments != "" {
				t.Subject = "Вложение: " + *t.Attachments
				t.Body = "Клиент отправил вложение: " + *t.Attachments
			} else {
				result.Errors = append(result.Errors, fmt.Sprintf("line %d: missing subject and body", lineNum))
				result.Skipped++
				continue
			}
		}

		tickets = append(tickets, t)
	}

	result.Total = len(tickets) + result.Skipped

	if len(tickets) > 0 {
		ids, err := s.ticketRepo.BulkInsert(ctx, tickets)
		if err != nil {
			return nil, fmt.Errorf("bulk insert tickets: %w", err)
		}
		result.Imported = len(ids)
		result.ImportedIDs = ids
		result.Skipped += len(tickets) - len(ids)
	}

	return result, nil
}

func (s *ImportService) ImportManagers(ctx context.Context, r io.Reader) (*ImportResult, error) {
	reader := csv.NewReader(r)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("read header: %w", err)
	}

	colIdx := mapColumns(header)
	result := &ImportResult{}

	// Build office name → UUID map from existing business units in DB
	buMap, err := s.buildBusinessUnitMap(ctx)
	if err != nil {
		return nil, fmt.Errorf("load business units: %w", err)
	}

	var managers []domain.Manager

	for lineNum := 2; ; lineNum++ {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: %v", lineNum, err))
			continue
		}

		m := domain.Manager{
			ID:       uuid.New(),
			IsActive: true,
			MaxLoad:  50,
		}

		// Full name
		m.FullName = getCol(record, colIdx, "full_name")
		if m.FullName == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: missing full_name", lineNum))
			result.Skipped++
			continue
		}

		// Email — from CSV or auto-generate
		if v := getCol(record, colIdx, "email"); v != "" {
			m.Email = &v
		} else {
			email := fmt.Sprintf("manager%d@freedom.kz", lineNum-1)
			m.Email = &email
		}

		// Business unit — from UUID column or look up by office name
		if v := getCol(record, colIdx, "business_unit_id"); v != "" {
			buID, err := uuid.Parse(v)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("line %d: invalid business_unit_id", lineNum))
				result.Skipped++
				continue
			}
			m.BusinessUnitID = buID
		} else if officeName := getCol(record, colIdx, "name"); officeName != "" {
			// "Офис" column maps to "name" alias
			buID, ok := buMap[officeName]
			if !ok {
				result.Errors = append(result.Errors, fmt.Sprintf("line %d: office '%s' not found in DB", lineNum, officeName))
				result.Skipped++
				continue
			}
			m.BusinessUnitID = buID
		}

		// Position (Должность) → is_chief_spec
		if v := getCol(record, colIdx, "position"); v != "" {
			m.IsChiefSpec = strings.Contains(strings.ToLower(v), "главный")
		} else if v := getCol(record, colIdx, "is_chief_spec"); v != "" {
			m.IsChiefSpec = strings.ToLower(v) == "true"
		}

		// Skills (Навыки) → is_vip_skill + languages
		if v := getCol(record, colIdx, "skills"); v != "" {
			skills := strings.Split(v, ",")
			langs := []string{"RU"}
			for _, skill := range skills {
				skill = strings.TrimSpace(strings.ToUpper(skill))
				switch skill {
				case "VIP":
					m.IsVIPSkill = true
				case "ENG":
					langs = append(langs, "EN")
				case "KZ":
					langs = append(langs, "KZ")
				}
			}
			m.Languages = langs
		} else {
			if v := getCol(record, colIdx, "is_vip_skill"); v != "" {
				m.IsVIPSkill = strings.ToLower(v) == "true"
			}
			if v := getCol(record, colIdx, "languages"); v != "" {
				langs := strings.Split(v, ";")
				for i := range langs {
					langs[i] = strings.TrimSpace(langs[i])
				}
				m.Languages = langs
			} else {
				m.Languages = []string{"RU"}
			}
		}

		// Current load (Количество обращений в работе)
		if v := getCol(record, colIdx, "current_load"); v != "" {
			if load, err := strconv.Atoi(v); err == nil {
				m.CurrentLoad = load
			}
		}

		managers = append(managers, m)
	}

	result.Total = len(managers) + result.Skipped

	if len(managers) > 0 {
		inserted, err := s.managerRepo.BulkInsert(ctx, managers)
		if err != nil {
			return nil, fmt.Errorf("bulk insert managers: %w", err)
		}
		result.Imported = inserted
		result.Skipped += len(managers) - inserted
	}

	return result, nil
}

func (s *ImportService) ImportBusinessUnits(ctx context.Context, r io.Reader) (*ImportResult, error) {
	reader := csv.NewReader(r)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("read header: %w", err)
	}

	colIdx := mapColumns(header)
	result := &ImportResult{}
	var units []domain.BusinessUnit

	for lineNum := 2; ; lineNum++ {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: %v", lineNum, err))
			continue
		}

		bu := domain.BusinessUnit{ID: uuid.New()}

		// Name — from "name" key (maps from "Офис" alias)
		bu.Name = getCol(record, colIdx, "name")

		// City — from "city" key, or use office name (same for KZ offices)
		bu.City = getCol(record, colIdx, "city")
		if bu.City == "" {
			bu.City = bu.Name
		}

		// Address
		if v := getCol(record, colIdx, "address"); v != "" {
			bu.Address = &v
		}

		if bu.Name == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: missing name", lineNum))
			result.Skipped++
			continue
		}

		units = append(units, bu)
	}

	result.Total = len(units) + result.Skipped

	if len(units) > 0 {
		inserted, err := s.buRepo.BulkInsert(ctx, units)
		if err != nil {
			return nil, fmt.Errorf("bulk insert business units: %w", err)
		}
		result.Imported = inserted
		result.Skipped += len(units) - inserted
	}

	return result, nil
}

// buildBusinessUnitMap returns a map of office name/city → UUID for looking up
// business_unit_id when importing managers by office name.
func (s *ImportService) buildBusinessUnitMap(ctx context.Context) (map[string]uuid.UUID, error) {
	units, err := s.buRepo.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	m := make(map[string]uuid.UUID, len(units)*2)
	for _, u := range units {
		m[u.Name] = u.ID
		if u.City != u.Name {
			m[u.City] = u.ID
		}
	}
	return m, nil
}

// generateSubject creates a short subject line from the first meaningful line of the body.
func generateSubject(body string) string {
	lines := strings.Split(body, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		runes := []rune(line)
		if len(runes) > 100 {
			return string(runes[:97]) + "..."
		}
		return line
	}
	return "Обращение клиента"
}

// composeAddress joins non-empty address parts with commas.
func composeAddress(parts ...string) string {
	var nonEmpty []string
	for _, p := range parts {
		if p != "" {
			nonEmpty = append(nonEmpty, p)
		}
	}
	return strings.Join(nonEmpty, ", ")
}
