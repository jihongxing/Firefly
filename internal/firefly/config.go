package firefly

import "os"

type Config struct {
	Port         string
	DatabasePath string
	UploadDir    string
	AdminToken   string
	AppName      string
	DefaultLat   float64
	DefaultLng   float64
}

func LoadConfig() Config {
	return Config{
		Port:         envOrDefault("FIREFLY_PORT", "8080"),
		DatabasePath: envOrDefault("FIREFLY_DB_PATH", "data/firefly.db"),
		UploadDir:    envOrDefault("FIREFLY_UPLOAD_DIR", "uploads"),
		AdminToken:   envOrDefault("FIREFLY_ADMIN_TOKEN", "firefly-dev-admin"),
		AppName:      "Firefly",
		DefaultLat:   22.5431,
		DefaultLng:   114.0579,
	}
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
