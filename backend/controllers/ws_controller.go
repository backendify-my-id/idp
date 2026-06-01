package controllers

import (
	"encoding/json"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
)

// TelemetryPayload represents the metrics broadcasted to clients
type TelemetryPayload struct {
	Requests int `json:"requests"`
	Sessions int `json:"sessions"`
}

// Client represents a connected websocket client
type Client struct {
	Conn *websocket.Conn
}

// WsHub coordinates all websocket clients and telemetries
type WsHub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
}

var Hub = &WsHub{
	clients:    make(map[*Client]bool),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func init() {
	go Hub.Run()
}

// Run starts the websocket hub management loop
func (h *WsHub) Run() {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	// Seed random generator
	rand.Seed(time.Now().UnixNano())

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			sessionsCount := len(h.clients)
			h.mu.Unlock()
			log.Printf("WebSocket client connected. Active sessions: %d", sessionsCount)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				_ = client.Conn.Close()
			}
			sessionsCount := len(h.clients)
			h.mu.Unlock()
			log.Printf("WebSocket client disconnected. Active sessions: %d", sessionsCount)

		case <-ticker.C:
			h.mu.Lock()
			sessionsCount := len(h.clients)
			if sessionsCount > 0 {
				// Generate random telemetry requests load
				requests := rand.Intn(25) + 5
				payload := TelemetryPayload{
					Requests: requests,
					Sessions: sessionsCount,
				}
				bytes, err := json.Marshal(payload)
				if err == nil {
					for client := range h.clients {
						err := client.Conn.WriteMessage(websocket.TextMessage, bytes)
						if err != nil {
							log.Printf("WebSocket write error: %v", err)
							go func(c *Client) {
								h.unregister <- c
							}(client)
						}
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

// HandleWebSocket upgrades connections and registers them to WsHub
func HandleWebSocket(c *websocket.Conn) {
	client := &Client{Conn: c}
	Hub.register <- client

	defer func() {
		Hub.unregister <- client
	}()

	// Keep connection alive, listen for client disconnects
	for {
		_, _, err := c.ReadMessage()
		if err != nil {
			break
		}
	}
}
