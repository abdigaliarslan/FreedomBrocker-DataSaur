package routing

import (
	"context"
	"fmt"
	"math"

	"github.com/google/uuid"

	"github.com/arslan/fire-challenge/internal/domain"
	"github.com/arslan/fire-challenge/internal/repository"
)

// Office coordinates.
var (
	AstanaLat = 51.1694
	AstanaLon = 71.4491
	AlmatyLat = 43.2220
	AlmatyLon = 76.8512
)

type GeoFilter struct {
	buRepo *repository.BusinessUnitRepo
}

func NewGeoFilter(buRepo *repository.BusinessUnitRepo) *GeoFilter {
	return &GeoFilter{buRepo: buRepo}
}

type GeoResult struct {
	BusinessUnitID uuid.UUID
	City           string
	Decision       string
	Method         string // "nearest" or "fallback_50_50"
}

func (g *GeoFilter) Resolve(ctx context.Context, ticketID uuid.UUID, lat, lon *float64, geoStatus string) (*GeoResult, error) {
	offices, err := g.buRepo.GetAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("get offices: %w", err)
	}

	if len(offices) == 0 {
		return nil, fmt.Errorf("no offices found")
	}

	// If geo is unknown or foreign — 50/50 fallback
	if geoStatus == "unknown" || geoStatus == "foreign" || lat == nil || lon == nil {
		idx := ticketID[0] % byte(len(offices))
		selected := offices[idx]
		return &GeoResult{
			BusinessUnitID: selected.ID,
			City:           selected.City,
			Decision:       fmt.Sprintf("Geo status '%s' — fallback 50/50 distribution, assigned to %s", geoStatus, selected.City),
			Method:         "fallback_50_50",
		}, nil
	}

	// Find nearest office by Haversine distance
	var nearest domain.BusinessUnit
	minDist := math.MaxFloat64
	found := false

	for _, office := range offices {
		if office.Lat == nil || office.Lon == nil {
			continue
		}
		dist := haversine(*lat, *lon, *office.Lat, *office.Lon)
		if dist < minDist {
			minDist = dist
			nearest = office
			found = true
		}
	}

	// If no office has coordinates, fallback to first office
	if !found {
		nearest = offices[0]
		return &GeoResult{
			BusinessUnitID: nearest.ID,
			City:           nearest.City,
			Decision:       fmt.Sprintf("No office coordinates — fallback to %s", nearest.City),
			Method:         "fallback_no_coords",
		}, nil
	}

	return &GeoResult{
		BusinessUnitID: nearest.ID,
		City:           nearest.City,
		Decision:       fmt.Sprintf("Geo resolved — nearest office: %s (distance: %.1f km)", nearest.City, minDist),
		Method:         "nearest",
	}, nil
}

// haversine returns distance in km between two coordinates.
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0 // Earth radius in km

	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}
