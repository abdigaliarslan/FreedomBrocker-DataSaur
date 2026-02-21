package middleware

import (
	"net/http"
	"strings"

	"github.com/go-chi/cors"
)

func CORSHandler(origins string) func(next http.Handler) http.Handler {
	allowedOrigins := strings.Split(origins, ",")
	return cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
