import api from './client'
import type { APIResponse, ImportResult } from '@/types/common'

export async function importTickets(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<APIResponse<ImportResult>>('/import/tickets', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function importManagers(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<APIResponse<ImportResult>>('/import/managers', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

export async function importBusinessUnits(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<APIResponse<ImportResult>>('/import/business-units', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}
