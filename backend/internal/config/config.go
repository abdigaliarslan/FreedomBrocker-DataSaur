package config

import "github.com/kelseyhightower/envconfig"

type Config struct {
	Port          string `envconfig:"APP_PORT" default:"8080"`
	DatabaseURL   string `envconfig:"DATABASE_URL" required:"true"`
	OpenAIKey     string `envconfig:"OPENAI_API_KEY" default:""`
	OpenAIModel   string `envconfig:"OPENAI_MODEL" default:"gpt-4.1-mini"`
	CORSOrigins   string `envconfig:"CORS_ORIGINS" default:"http://localhost:5173"`
	MigrationsDir string `envconfig:"MIGRATIONS_DIR" default:"migrations"`
	ImagesDir     string `envconfig:"IMAGES_DIR" default:"images"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
