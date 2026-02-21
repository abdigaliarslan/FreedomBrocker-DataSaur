# FreedomBrocker-DataSaur — Design System Rules

> F.I.R.E. Challenge Platform — Ticket routing & AI enrichment dashboard

---

## 1. Project Structure

```
FreedomBrocker-DataSaur/
├── backend/                    # Go backend (net/http + PostgreSQL)
│   ├── cmd/server/main.go      # Entry point
│   ├── internal/
│   │   ├── config/             # App configuration
│   │   ├── db/                 # Database connection & migrations
│   │   ├── domain/             # Domain models (Go structs)
│   │   ├── handler/            # HTTP handlers
│   │   ├── middleware/         # CORS middleware
│   │   ├── repository/         # Data access layer
│   │   ├── routing/            # Ticket routing logic
│   │   └── service/            # Business logic
│   └── migrations/             # SQL migration files
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── api/                # Axios API client modules
│   │   ├── components/layout/  # Layout components (AppLayout, Sidebar)
│   │   ├── lib/                # Utility functions (cn helper)
│   │   ├── pages/              # Page-level components (one per route)
│   │   ├── types/              # TypeScript type definitions
│   │   ├── index.css           # Global styles & design tokens
│   │   ├── main.tsx            # App entry point
│   │   └── App.tsx             # Route definitions
│   ├── public/                 # Static assets
│   ├── vite.config.ts          # Vite + Tailwind config
│   └── package.json
├── docker-compose.yml          # PostgreSQL + backend services
└── Makefile
```

### Key patterns
- **Page-per-route**: Each route maps to a single file in `src/pages/`
- **Flat pages**: No subdirectories per page — each page is a self-contained `.tsx` file
- **Inline sub-components**: Small helper components (Card, Badge, KPICard, ConfBar) are defined in the same file as the page that uses them
- **No shared UI component library yet**: Components like Badge, Card, etc. are duplicated inline within pages

---

## 2. Frameworks & Libraries

| Category        | Technology                                    |
|----------------|-----------------------------------------------|
| UI Framework   | **React 19** with TypeScript                  |
| Routing        | **react-router-dom v7** (BrowserRouter)       |
| Styling        | **Tailwind CSS v4** (via `@tailwindcss/vite`) |
| CSS Utility    | **clsx** + **tailwind-merge** (via `cn()`)    |
| HTTP Client    | **Axios** (centralized in `src/api/client.ts`)|
| Charts         | **Recharts v3** (BarChart, PieChart)           |
| Data Tables    | **@tanstack/react-table v8** (available, not yet used extensively) |
| Icons          | **lucide-react**                              |
| Build Tool     | **Vite 7** with `@vitejs/plugin-react`        |
| TypeScript     | **v5.9**, strict mode, `react-jsx` transform  |

### Path aliases
```ts
// vite.config.ts & tsconfig.app.json
"@/*" → "./src/*"
```
All imports use `@/` prefix:
```ts
import { cn } from '@/lib/utils'
import type { Ticket } from '@/types/ticket'
import { fetchTickets } from '@/api/tickets'
```

---

## 3. Token Definitions (Design Tokens)

Tokens are defined as **HSL CSS custom properties** in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;          /* Blue — main brand color */
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
  --sidebar-bg: 220 14% 96%;
}
```

### Token usage pattern
Tokens store **raw HSL values** (no `hsl()` wrapper). They are consumed via `hsl(var(--token))`:

```tsx
// Correct usage in Tailwind classes:
className="bg-[hsl(var(--primary))]"
className="text-[hsl(var(--muted-foreground))]"
className="border-[hsl(var(--border))]"

// In Recharts fill props:
fill="hsl(221.2, 83.2%, 53.3%)"   // hardcoded HSL matching --primary
```

### Token naming convention (shadcn/ui-inspired)
- `--background` / `--foreground` — base page colors
- `--card` / `--card-foreground` — card surfaces
- `--primary` / `--primary-foreground` — main CTA / brand
- `--secondary` / `--secondary-foreground` — secondary actions
- `--muted` / `--muted-foreground` — subtle backgrounds / helper text
- `--accent` / `--accent-foreground` — hover / interactive states
- `--destructive` / `--destructive-foreground` — error / danger
- `--border` — all border colors
- `--input` — form input borders
- `--ring` — focus rings
- `--radius` — standard border radius

**No dark mode** is configured. Only `:root` tokens exist.

---

## 4. Styling Approach

### Methodology: Tailwind CSS v4 utility classes
- **No CSS Modules, no Styled Components, no separate `.css` files per component**
- All styling is inline via Tailwind utility classes in JSX
- The only CSS file is `src/index.css` (global tokens + reset)

### The `cn()` utility
```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
Use `cn()` for conditional/merged class names:
```tsx
className={cn(
  'px-2 py-0.5 rounded-full text-xs font-medium',
  isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
)}
```

### Common UI patterns

**Cards:**
```tsx
<div className="bg-white rounded-xl border border-[hsl(var(--border))] p-4">
  {/* content */}
</div>
```

**Page headings:**
```tsx
<h2 className="text-2xl font-bold mb-4">Page Title</h2>
```

**Tables:**
```tsx
<div className="bg-white rounded-xl border border-[hsl(var(--border))] overflow-hidden">
  <table className="w-full text-sm">
    <thead className="bg-[hsl(var(--muted))]">
      <tr>
        <th className="text-left p-3 font-medium">Column</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
        <td className="p-3">Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Badges / pills:**
```tsx
<span className={cn(
  'px-2 py-0.5 rounded-full text-xs font-medium',
  'bg-green-100 text-green-800'  // status-specific color
)}>
  Label
</span>
```

**Buttons (primary):**
```tsx
<button className="bg-[hsl(var(--primary))] text-white px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50">
  Label
</button>
```

**Tab/toggle buttons:**
```tsx
<button className={cn(
  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
  isSelected
    ? 'bg-[hsl(var(--primary))] text-white'
    : 'bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))]'
)}>
```

**Progress bars:**
```tsx
<div className="h-2 w-24 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
  <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
</div>
```

### Status color mapping

| Semantic                   | Tailwind Classes                      |
|---------------------------|---------------------------------------|
| Success / Positive / Routed | `bg-green-100 text-green-800`        |
| Info / Neutral / New       | `bg-blue-100 text-blue-800`          |
| Warning / VIP / Pending    | `bg-amber-100 text-amber-800`        |
| Danger / Negative          | `bg-red-100 text-red-800`            |
| Special / Chief            | `bg-purple-100 text-purple-800`      |
| Default / Unknown          | `bg-gray-100 text-gray-800`          |

### Chart colors (hardcoded)

```ts
// Sentiment colors (DashboardPage)
const SENTIMENT_COLORS = {
  positive: '#22c55e',  // green-500
  neutral: '#3b82f6',   // blue-500
  negative: '#ef4444',  // red-500
  unknown: '#9ca3af',   // gray-400
}

// General chart palette (StarAssistantPage)
const CHART_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
```

### Responsive design
- **Grid-based layouts**: `grid grid-cols-2 gap-4`, `grid grid-cols-4 gap-4`
- No explicit breakpoints currently used (no `sm:`, `md:`, `lg:` prefixes)
- Sidebar is fixed 256px (`w-64`), main content is `flex-1`

---

## 5. Icon System

**Library:** `lucide-react`

### Usage pattern
```tsx
import { LayoutDashboard, Ticket, Users, Building2, Sparkles, Upload } from 'lucide-react'

// Standard sizing
<IconName className="w-4 h-4" />   // inline / nav icons
<IconName className="w-5 h-5" />   // section headers
<IconName className="w-8 h-8" />   // empty state / hero
<IconName className="w-10 h-10" /> // large decorative
<IconName className="w-3 h-3" />   // tiny / metadata
```

### Icons currently used
| Icon              | Context                          |
|-------------------|----------------------------------|
| `LayoutDashboard` | Dashboard nav item               |
| `Ticket`          | Tickets nav item                 |
| `Users`           | Managers nav item                |
| `Building2`       | Offices nav item / office cards  |
| `Sparkles`        | Star Assistant nav / header      |
| `Upload`          | Import nav / drop zone           |
| `ArrowLeft`       | Back navigation                  |
| `Bot`             | AI enrichment section            |
| `MapPin`          | Geo/address info                 |
| `Route`           | Routing explanation              |
| `User`            | Ticket info / assignment         |
| `Send`            | Chat send button                 |
| `CheckCircle`     | Import success                   |
| `AlertCircle`     | Import error                     |

### Naming convention
- Import by exact PascalCase name from `lucide-react`
- Size via Tailwind `w-*` / `h-*` classes (never `size` prop)
- Color inherited from parent text color or set via `text-*` class

---

## 6. Component Architecture

### Layout
```
AppLayout (flex row)
├── Sidebar (w-64, fixed left)
│   ├── Brand header ("F.I.R.E.")
│   └── NavLink list (icon + label)
└── Main content (flex-1, p-6)
    └── <Outlet /> (renders active page)
```

### Page components
Each page is a **default-exported function component** using hooks:
```tsx
export default function PageName() {
  const [data, setData] = useState<Type | null>(null)

  useEffect(() => {
    fetchData().then(setData).catch(console.error)
  }, [])

  return <div>...</div>
}
```

### Inline helper components
Pages define small, non-reusable components in the same file:
```tsx
// Bottom of TicketDetailPage.tsx
function Card({ title, icon, children, className }: Props) { ... }
function Badge({ children, color }: Props) { ... }
function ConfBar({ value }: { value: number }) { ... }

// Bottom of DashboardPage.tsx
function KPICard({ title, value, color }: Props) { ... }
```

### No shared component library
If extracting shared components, place them in:
- `src/components/ui/` — reusable primitives (Button, Badge, Card, Input, Table)
- `src/components/layout/` — layout wrappers (already exists: AppLayout, Sidebar)
- `src/components/charts/` — chart wrappers if needed

---

## 7. API Layer

### Client setup
```ts
// src/api/client.ts
const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})
```

### API module pattern
One file per domain in `src/api/`:
```ts
// src/api/tickets.ts
import api from './client'
import type { PaginatedResponse, APIResponse } from '@/types/common'
import type { Ticket } from '@/types/ticket'

export async function fetchTickets(params) {
  const { data } = await api.get<PaginatedResponse<Ticket>>('/tickets', { params })
  return data
}
```

### Response wrappers
```ts
interface APIResponse<T> { data: T; error?: string }
interface PaginatedResponse<T> { data: T[]; pagination: Pagination }
```

### Proxy config
Vite dev server proxies `/api` to `http://localhost:8080` (Go backend).

---

## 8. Type System

Types are organized in `src/types/`:
- `ticket.ts` — Ticket, TicketAI, TicketAssignment, AuditLog, Manager, ManagerWithOffice, TicketWithDetails
- `dashboard.ts` — DashboardStats, SentimentData, CategoryData, ManagerLoadData, TimelineData
- `common.ts` — APIResponse, PaginatedResponse, Pagination, BusinessUnit, ImportResult, StarQueryResponse

### Naming conventions
- Interfaces use **PascalCase**
- Properties use **snake_case** (matching Go/DB column names)
- Nullable fields use `Type | null`

---

## 9. Asset Management

- **Static assets**: `frontend/public/` (only `vite.svg` favicon)
- **Source assets**: `frontend/src/assets/` (only `react.svg`)
- No CDN configuration
- No image optimization pipeline
- Assets referenced via standard Vite import or `public/` paths

---

## 10. Rules for Figma-to-Code Integration

### When implementing designs:

1. **Use Tailwind utility classes exclusively** — never add CSS files or styled-components
2. **Reference design tokens** via `hsl(var(--token))` in Tailwind arbitrary values: `bg-[hsl(var(--primary))]`
3. **Use the `cn()` helper** from `@/lib/utils` for conditional/merged classes
4. **Use `lucide-react` icons** — search for matching icon names; size with `w-*`/`h-*`
5. **Follow the card pattern** for any elevated surface: `bg-white rounded-xl border border-[hsl(var(--border))] p-4`
6. **Follow the badge pattern** for status indicators: `px-2 py-0.5 rounded-full text-xs font-medium` + color pair
7. **Use Recharts** for any data visualizations (BarChart, PieChart, ResponsiveContainer)
8. **Place new pages** in `src/pages/` as default-exported function components
9. **Add API functions** in `src/api/` following the existing pattern (one file per domain)
10. **Add types** in `src/types/` using snake_case properties matching the backend
11. **Keep small helpers inline** in the page file unless they'll be reused across 2+ pages
12. **Map Figma colors to tokens**: primary blue → `--primary`, grays → `--muted`/`--border`, etc.
13. **Font family** is system UI stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
14. **Default radius** is `rounded-xl` (0.75rem) for cards, `rounded-lg` (0.5rem) for buttons/inputs, `rounded-full` for badges
15. **No dark mode** — all designs assume light theme
