import api from './client';
import type { DashboardStats, SentimentData, TimelineData } from '@/types/dashboard';

export async function fetchStats() {
    const { data } = await api.get<DashboardStats>('/dashboard/stats');
    return data;
}

export async function fetchSentiment() {
    const { data } = await api.get<SentimentData[]>('/dashboard/sentiment');
    return data;
}

export async function fetchTimeline() {
    const { data } = await api.get<TimelineData[]>('/dashboard/timeline');
    return data;
}
