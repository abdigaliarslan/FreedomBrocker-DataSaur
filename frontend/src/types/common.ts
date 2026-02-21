export interface APIResponse<T> {
  data: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface BusinessUnit {
  id: string
  name: string
  city: string
  address: string | null
  lat: number | null
  lon: number | null
  created_at: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export interface StarQueryResponse {
  question: string
  sql: string
  columns: string[]
  rows: unknown[][]
  chart_suggestion: string
  answer_text: string
  error?: string
}
