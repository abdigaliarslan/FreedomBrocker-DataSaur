package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/arslan/fire-challenge/internal/config"
	"github.com/arslan/fire-challenge/internal/db"
	"github.com/arslan/fire-challenge/internal/handler"
	mw "github.com/arslan/fire-challenge/internal/middleware"
	"github.com/arslan/fire-challenge/internal/repository"
	"github.com/arslan/fire-challenge/internal/routing"
	"github.com/arslan/fire-challenge/internal/service"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	ctx := context.Background()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()

	log.Info().Msg("running migrations...")
	if err := db.RunMigrations(ctx, pool, cfg.MigrationsDir); err != nil {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}
	log.Info().Msg("migrations completed")

	// Repositories
	ticketRepo := repository.NewTicketRepo(pool)
	managerRepo := repository.NewManagerRepo(pool)
	buRepo := repository.NewBusinessUnitRepo(pool)
	assignmentRepo := repository.NewAssignmentRepo(pool)
	auditRepo := repository.NewAuditRepo(pool)
	rrRepo := repository.NewRRPointerRepo(pool)

	// Routing engine
	geoFilter := routing.NewGeoFilter(buRepo)
	skillFilter := routing.NewSkillFilter()
	loadBalancer := routing.NewLoadBalancer()
	roundRobin := routing.NewRoundRobin(rrRepo, assignmentRepo, managerRepo, auditRepo)

	// Services
	importSvc := service.NewImportService(ticketRepo, managerRepo, buRepo)
	routingSvc := service.NewRoutingService(pool, geoFilter, skillFilter, loadBalancer, roundRobin, managerRepo, auditRepo, ticketRepo)
	ticketSvc := service.NewTicketService(ticketRepo, assignmentRepo, auditRepo, managerRepo, buRepo)
	managerSvc := service.NewManagerService(managerRepo, buRepo)
	dashboardSvc := service.NewDashboardService(pool)
	starSvc := service.NewStarService(pool)
	aiSvc := service.NewAIService(cfg.OpenAIKey, cfg.OpenAIModel, ticketRepo, routingSvc)

	// Handlers
	importH := handler.NewImportHandler(importSvc, aiSvc)
	callbackH := handler.NewCallbackHandler(ticketRepo, assignmentRepo, routingSvc)
	ticketH := handler.NewTicketHandler(ticketSvc, aiSvc)
	managerH := handler.NewManagerHandler(managerSvc)
	dashboardH := handler.NewDashboardHandler(dashboardSvc)
	starH := handler.NewStarHandler(starSvc)

	// Router
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(120 * time.Second))
	r.Use(mw.CORSHandler(cfg.CORSOrigins))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		handler.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Import (universal auto-detect + specific endpoints)
		r.Post("/import", importH.Import)
		r.Post("/import/tickets", importH.ImportTickets)
		r.Post("/import/managers", importH.ImportManagers)
		r.Post("/import/business-units", importH.ImportBusinessUnits)

		// Internal callbacks (kept for backward compatibility)
		r.Route("/internal/callback", func(r chi.Router) {
			r.Post("/enrich", callbackH.HandleEnrichment)
			r.Post("/star-query", callbackH.HandleStarQuery)
		})

		// Tickets
		r.Get("/tickets", ticketH.List)
		r.Get("/tickets/{id}", ticketH.Get)
		r.Patch("/tickets/{id}/status", ticketH.UpdateStatus)
		r.Post("/tickets/{id}/enrich", ticketH.Enrich)
		r.Post("/tickets/enrich-all", ticketH.EnrichAll)

		// Managers
		r.Get("/managers", managerH.List)
		r.Get("/managers/{id}", managerH.Get)

		// Offices
		r.Get("/offices", managerH.ListOffices)
		r.Get("/offices/{id}", managerH.GetOffice)

		// Dashboard
		r.Get("/dashboard/stats", dashboardH.Stats)
		r.Get("/dashboard/sentiment", dashboardH.Sentiment)
		r.Get("/dashboard/categories", dashboardH.Categories)
		r.Get("/dashboard/manager-load", dashboardH.ManagerLoad)
		r.Get("/dashboard/timeline", dashboardH.Timeline)

		// Star Task
		r.Post("/star/query", starH.Query)

		// Real-time SSE events stream
		r.Get("/events", handler.ServeWS)
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{Addr: addr, Handler: r}

	go func() {
		log.Info().Str("addr", addr).Msg("server started")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)
}
