package routing

import (
	"fmt"
	"sort"

	"github.com/arslan/fire-challenge/internal/domain"
)

type LoadBalancer struct{}

func NewLoadBalancer() *LoadBalancer {
	return &LoadBalancer{}
}

type LoadResult struct {
	Finalists []domain.Manager
	Decision  string
}

func (lb *LoadBalancer) PickTwo(candidates []domain.Manager) *LoadResult {
	if len(candidates) == 0 {
		return &LoadResult{
			Decision: "No candidates available",
		}
	}

	// Sort by current_load ascending
	sorted := make([]domain.Manager, len(candidates))
	copy(sorted, candidates)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].CurrentLoad < sorted[j].CurrentLoad
	})

	count := 2
	if len(sorted) < count {
		count = len(sorted)
	}

	finalists := sorted[:count]

	decision := fmt.Sprintf("Selected %d from %d candidates by lowest load:", count, len(candidates))
	for i, m := range finalists {
		if i > 0 {
			decision += ","
		}
		decision += fmt.Sprintf(" %s (load: %d)", m.FullName, m.CurrentLoad)
	}

	return &LoadResult{
		Finalists: finalists,
		Decision:  decision,
	}
}
