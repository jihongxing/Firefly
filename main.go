package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"firefly/internal/firefly"
)

//go:embed public/* public/assets/* locales/*
var embeddedFiles embed.FS

func main() {
	cfg := firefly.LoadConfig()

	if err := os.MkdirAll(filepath.Dir(cfg.DatabasePath), 0o755); err != nil {
		log.Fatalf("create data dir: %v", err)
	}
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		log.Fatalf("create upload dir: %v", err)
	}

	store, err := firefly.NewStore(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer store.Close()

	if err := store.Init(); err != nil {
		log.Fatalf("init database: %v", err)
	}

	publicFS, err := fs.Sub(embeddedFiles, "public")
	if err != nil {
		log.Fatalf("public fs: %v", err)
	}
	localeFS, err := fs.Sub(embeddedFiles, "locales")
	if err != nil {
		log.Fatalf("locale fs: %v", err)
	}

	server := firefly.NewServer(cfg, store, publicFS, localeFS)

	log.Printf("Firefly listening on http://127.0.0.1:%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, server.Routes()); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
