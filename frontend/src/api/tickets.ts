import api from './client'
import type { PaginatedResponse, APIResponse } from '@/types/common'
import type { Ticket, TicketWithDetails } from '@/types/ticket'

export async function fetchTickets(params: Record<string, string | number>) {
  const { data } = await api.get<PaginatedResponse<Ticket>>('/tickets', { params })
  return { ...data, data: data.data ?? [] }
}

export async function fetchTicket(id: string) {
  const { data } = await api.get<APIResponse<TicketWithDetails>>(`/tickets/${id}`)
  return data.data
}

export async function updateTicketStatus(id: string, status: string) {
  const { data } = await api.patch(`/tickets/${id}/status`, { status })
  return data
}
