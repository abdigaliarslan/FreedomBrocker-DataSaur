package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strings"

	"github.com/google/uuid"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
)

type ImportService struct {
	ticketRepo *repository.TicketRepo
	managerRepo *repository.ManagerRepo
	buRepo     *repository.BusinessUnitRepo
}

func NewImportService(tr *repository.TicketRepo, mr *repository.ManagerRepo, br *repository.BusinessUnitRepo) *ImportService {
	return &ImportService{ticketRepo: tr, managerRepo: mr, buRepo: br}
}

type ImportResult struct {
	Imported int      `json:"imported"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors"`
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

		if idx, ok := colIdx["external_id"]; ok && idx < len(record) {
			v := strings.TrimSpace(record[idx])
			t.ExternalID = &v
		}
		if idx, ok := colIdx["subject"]; ok && idx < len(record) {
			t.Subject = strings.TrimSpace(record[idx])
		}
		if idx, ok := colIdx["body"]; ok && idx < len(record) {
			t.Body = strings.TrimSpace(record[idx])
		}
		if idx, ok := colIdx["client_name"]; ok && idx < len(record) {
			v := strings.TrimSpace(record[idx])
			t.ClientName = &v
		}
		if idx, ok := colIdx["client_segment"]; ok && idx < len(record) {
			v := strings.TrimSpace(record[idx])
			t.ClientSegment = &v
		}
		if idx, ok := colIdx["source_channel"]; ok && idx < len(record) {
			v := strings.TrimSpace(record[idx])
			t.SourceChannel = &v
		}
		if idx, ok := colIdx["raw_address"]; ok && idx < len(record) {
			v := strings.TrimSpace(record[idx])
			t.RawAddress = &v
		}

		if t.Subject == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: missing subject", lineNum))
			result.Skipped++
			continue
		}

		tickets = append(tickets, t)
	}

	if len(tickets) > 0 {
		inserted, err := s.ticketRepo.BulkInsert(ctx, tickets)
		if err != nil {
			return nil, fmt.Errorf("bulk insert tickets: %w", err)
		}
		result.Imported = inserted
		result.Skipped += len(tickets) - inserted
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

		if idx, ok := colIdx["full_name"]; ok && idx < len(record) {
			m.FullName = strings.TrimSpace(record[idx])
		}
		if idx, ok := colIdx["email"]; ok && idx < len(record) {
			v := strings.TrimSpace(record[idx])
			m.Email = &v
		}
		if idx, ok := colIdx["business_unit_id"]; ok && idx < len(record) {
			buID, err := uuid.Parse(strings.TrimSpace(record[idx]))
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("line %d: invalid business_unit_id", lineNum))
				result.Skipped++
				continue
			}
			m.BusinessUnitID = buID
		}
		if idx, ok := colIdx["is_vip_skill"]; ok && idx < len(record) {
			m.IsVIPSkill = strings.TrimSpace(strings.ToLower(record[idx])) == "true"
		}
		if idx, ok := colIdx["is_chief_spec"]; ok && idx < len(record) {
			m.IsChiefSpec = strings.TrimSpace(strings.ToLower(record[idx])) == "true"
		}
		if idx, ok := colIdx["languages"]; ok && idx < len(record) {
			langs := strings.Split(record[idx], ";")
			for i := range langs {
				langs[i] = strings.TrimSpace(langs[i])
			}
			m.Languages = langs
		} else {
			m.Languages = []string{"RU"}
		}

		if m.FullName == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: missing full_name", lineNum))
			result.Skipped++
			continue
		}

		managers = append(managers, m)
	}

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

		if idx, ok := colIdx["name"]; ok && idx < len(record) {
			bu.Name = strings.TrimSpace(record[idx])
		}
		if idx, ok := colIdx["city"]; ok && idx < len(record) {
			bu.City = strings.TrimSpace(record[idx])
		}
		if idx, ok := colIdx["address"]; ok && idx < len(record) {
			v := strings.TrimSpace(record[idx])
			bu.Address = &v
		}

		if bu.Name == "" || bu.City == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("line %d: missing name or city", lineNum))
			result.Skipped++
			continue
		}

		units = append(units, bu)
	}

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

func mapColumns(header []string) map[string]int {
	m := make(map[string]int)
	for i, col := range header {
		m[strings.TrimSpace(strings.ToLower(col))] = i
	}
	return m
}
