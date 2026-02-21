package handler

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/rs/zerolog/log"
)

// WSEvent is the message broadcast to all WebSocket clients.
type WSEvent struct {
	Type     string `json:"type"` // "ticket_update"
	TicketID string `json:"ticket_id"`
	Status   string `json:"status"`
	Manager  string `json:"manager,omitempty"`
}

// Hub manages all active WebSocket connections.
type Hub struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

var GlobalHub = &Hub{
	clients: make(map[chan []byte]struct{}),
}

func (h *Hub) subscribe() chan []byte {
	ch := make(chan []byte, 32)
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *Hub) unsubscribe(ch chan []byte) {
	h.mu.Lock()
	delete(h.clients, ch)
	h.mu.Unlock()
	close(ch)
}

// Broadcast sends an event to all connected clients.
func (h *Hub) Broadcast(event WSEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clients {
		select {
		case ch <- data:
		default:
			// client too slow, skip
		}
	}
}

// ServeWS handles the WebSocket upgrade using Server-Sent Events (SSE)
// — no external library needed, works through nginx proxy.
func ServeWS(w http.ResponseWriter, r *http.Request) {
	// Use SSE instead of WebSocket — works through nginx without extra config
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("X-Accel-Buffering", "no") // disable nginx buffering

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	ch := GlobalHub.subscribe()
	defer GlobalHub.unsubscribe(ch)

	log.Info().Str("remote", r.RemoteAddr).Msg("SSE client connected")

	// Send initial ping
	_, _ = w.Write([]byte("data: {\"type\":\"connected\"}\n\n"))
	flusher.Flush()

	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			_, err := w.Write([]byte("data: " + string(msg) + "\n\n"))
			if err != nil {
				return
			}
			flusher.Flush()
		case <-r.Context().Done():
			log.Info().Str("remote", r.RemoteAddr).Msg("SSE client disconnected")
			return
		}
	}
}
