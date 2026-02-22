import api from './client';

export async function queryStar(question: string) {
    const { data } = await api.post('/star/query', { question });
    return data.data || data;
}
