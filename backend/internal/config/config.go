package config

import "github.com/kelseyhightower/envconfig"

type Config struct {
	Port          string `envconfig:"APP_PORT" default:"8080"`
	DatabaseURL   string `envconfig:"DATABASE_URL" required:"true"`
	N8NWebhookURL string `envconfig:"N8N_WEBHOOK_URL" default:"http://localhost:5678/webhook"`
	CORSOrigins   string `envconfig:"CORS_ORIGINS" default:"http://localhost:5173"`
	MigrationsDir string `envconfig:"MIGRATIONS_DIR" default:"migrations"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
