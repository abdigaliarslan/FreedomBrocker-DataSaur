import { useEffect, useRef } from 'react';

export interface SSETicketEvent {
    type: string;
    ticket_id: string;
    status: string;
    manager?: string;
}

export function useSSE(onEvent: (event: SSETicketEvent) => void) {
    const cbRef = useRef(onEvent);
    cbRef.current = onEvent;

    useEffect(() => {
        const es = new EventSource('/api/v1/events');

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data) as SSETicketEvent;
                if (data.type === 'ticket_update') {
                    cbRef.current(data);
                }
            } catch {
                // ignore parse errors
            }
        };

        es.onerror = () => {
            // auto-reconnects by browser
        };

        return () => es.close();
    }, []);
}
