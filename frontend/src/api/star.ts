import api from './client'
import type { APIResponse, StarQueryResponse } from '@/types/common'

export async function sendStarQuery(question: string, sql?: string) {
  const { data } = await api.post<APIResponse<StarQueryResponse>>('/star/query', {
    question,
    sql,
  })
  return data.data
}
