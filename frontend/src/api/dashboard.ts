import api from './client'
import type { APIResponse } from '@/types/common'
import type { DashboardStats, SentimentData, CategoryData, ManagerLoadData, TimelineData } from '@/types/dashboard'

export async function fetchStats() {
  const { data } = await api.get<APIResponse<DashboardStats>>('/dashboard/stats')
  return data.data ?? { total_tickets: 0, routed_tickets: 0, pending_tickets: 0, avg_priority: 0, avg_confidence: 0, vip_count: 0, unknown_geo_count: 0 }
}

export async function fetchSentiment() {
  const { data } = await api.get<APIResponse<SentimentData[]>>('/dashboard/sentiment')
  return data.data ?? []
}

export async function fetchCategories() {
  const { data } = await api.get<APIResponse<CategoryData[]>>('/dashboard/categories')
  return data.data ?? []
}

export async function fetchManagerLoad() {
  const { data } = await api.get<APIResponse<ManagerLoadData[]>>('/dashboard/manager-load')
  return data.data ?? []
}

export async function fetchTimeline() {
  const { data } = await api.get<APIResponse<TimelineData[]>>('/dashboard/timeline')
  return data.data ?? []
}
