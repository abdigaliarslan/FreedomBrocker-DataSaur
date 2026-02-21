import api from './client';
import type { DashboardStats, SentimentData, TimelineData } from '@/types/dashboard';

export async function fetchStats() {
    const { data } = await api.get<{ data: DashboardStats }>('/dashboard/stats');
    return data.data;
}

export async function fetchSentiment() {
    const { data } = await api.get<{ data: SentimentData[] }>('/dashboard/sentiment');
    return data.data ?? [];
}

export async function fetchTimeline() {
    const { data } = await api.get<{ data: TimelineData[] }>('/dashboard/timeline');
    return data.data ?? [];
}
