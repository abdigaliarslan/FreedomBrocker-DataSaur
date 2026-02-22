package routing

import (
	"fmt"

	"github.com/arslan/fire-challenge/internal/domain"
)

type SkillFilter struct{}

func NewSkillFilter() *SkillFilter {
	return &SkillFilter{}
}

type SkillResult struct {
	Candidates []domain.Manager
	SkillGroup string
	Decision   string
}

func (sf *SkillFilter) Filter(managers []domain.Manager, segment, ticketType, lang string) *SkillResult {
	candidates := make([]domain.Manager, len(managers))
	copy(candidates, managers)
	skillGroup := "general"
	var decisions []string

	// Rule 1: VIP/Priority segment → only VIP-skill managers
	if segment == "VIP" || segment == "Priority" {
		var filtered []domain.Manager
		for _, m := range candidates {
			if m.IsVIPSkill {
				filtered = append(filtered, m)
			}
		}
		if len(filtered) > 0 {
			candidates = filtered
			skillGroup = "vip"
			decisions = append(decisions, fmt.Sprintf("Segment '%s' → filtered to %d VIP-skill managers", segment, len(filtered)))
		} else {
			decisions = append(decisions, fmt.Sprintf("Segment '%s' → no VIP managers found, keeping all %d", segment, len(candidates)))
		}
	}

	// Rule 2: Type "Change Data" / "Смена данных" → only Chief Specialist
	if ticketType == "Change Data" || ticketType == "Смена данных" {
		var filtered []domain.Manager
		for _, m := range candidates {
			if m.IsChiefSpec {
				filtered = append(filtered, m)
			}
		}
		if len(filtered) > 0 {
			candidates = filtered
			skillGroup = "chief_spec"
			decisions = append(decisions, fmt.Sprintf("Type '%s' → filtered to %d Chief Specialists", ticketType, len(filtered)))
		} else {
			decisions = append(decisions, fmt.Sprintf("Type '%s' → no Chief Spec found, keeping current %d candidates", ticketType, len(candidates)))
		}
	}

	// Rule 3: Language KZ or ENG → only managers with that language
	if lang == "KZ" || lang == "ENG" {
		var filtered []domain.Manager
		for _, m := range candidates {
			for _, l := range m.Languages {
				if l == lang {
					filtered = append(filtered, m)
					break
				}
			}
		}
		if len(filtered) > 0 {
			candidates = filtered
			skillGroup = fmt.Sprintf("lang_%s", lang)
			decisions = append(decisions, fmt.Sprintf("Language '%s' → filtered to %d managers with that skill", lang, len(filtered)))
		} else {
			decisions = append(decisions, fmt.Sprintf("Language '%s' → no matching managers, keeping current %d candidates", lang, len(candidates)))
		}
	}

	decision := fmt.Sprintf("Pool: %d managers (no skill filters applied)", len(candidates))
	if len(decisions) > 0 {
		decision = ""
		for i, d := range decisions {
			if i > 0 {
				decision += "; "
			}
			decision += d
		}
	}

	return &SkillResult{
		Candidates: candidates,
		SkillGroup: skillGroup,
		Decision:   decision,
	}
}
