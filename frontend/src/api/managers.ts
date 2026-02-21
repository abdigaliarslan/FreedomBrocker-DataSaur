import api from './client'
import type { APIResponse, BusinessUnit } from '@/types/common'
import type { ManagerWithOffice, Manager } from '@/types/ticket'

export async function fetchManagers() {
  const { data } = await api.get<APIResponse<ManagerWithOffice[]>>('/managers')
  return data.data ?? []
}

export async function fetchManager(id: string) {
  const { data } = await api.get<APIResponse<Manager>>(`/managers/${id}`)
  return data.data
}

export async function fetchOffices() {
  const { data } = await api.get<APIResponse<BusinessUnit[]>>('/offices')
  return data.data ?? []
}

export async function fetchOffice(id: string) {
  const { data } = await api.get<APIResponse<BusinessUnit>>(`/offices/${id}`)
  return data.data
}
