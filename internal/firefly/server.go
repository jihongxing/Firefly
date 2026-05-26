package firefly

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Server struct {
	cfg      Config
	store    *Store
	publicFS fs.FS
	localeFS fs.FS
}

func NewServer(cfg Config, store *Store, publicFS fs.FS, localeFS fs.FS) *Server {
	return &Server{
		cfg:      cfg,
		store:    store,
		publicFS: publicFS,
		localeFS: localeFS,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/config", s.handleConfig)
	mux.HandleFunc("/api/markers", s.handleMarkers)
	mux.HandleFunc("/api/markers/submit", s.handleSubmitMarker)
	mux.HandleFunc("/api/markers/", s.handleMarkerByID)
	mux.HandleFunc("/api/sponsors/nearby", s.handleSponsorsNearby)
	mux.HandleFunc("/api/sponsors/events", s.handleSponsorEvents)
	mux.HandleFunc("/api/me/reputation", s.handleMeReputation)
	mux.HandleFunc("/api/me/activity", s.handleMeActivity)
	mux.HandleFunc("/api/admin/markers", s.handleAdminMarkers)
	mux.HandleFunc("/api/admin/markers/", s.handleAdminMarkerByID)
	mux.HandleFunc("/api/admin/sponsors", s.handleAdminSponsors)
	mux.HandleFunc("/api/admin/sponsors/", s.handleAdminSponsorByID)
	mux.HandleFunc("/api/admin/sponsor-campaigns", s.handleAdminSponsorCampaigns)
	mux.HandleFunc("/api/admin/sponsor-campaigns/", s.handleAdminSponsorCampaignByID)
	mux.HandleFunc("/api/admin/sponsor-reports", s.handleAdminSponsorReports)

	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(s.cfg.UploadDir))))
	mux.Handle("/locales/", http.StripPrefix("/locales/", http.FileServer(http.FS(s.localeFS))))
	mux.Handle("/", s.staticHandler())

	return withCORS(logging(mux))
}

func (s *Server) staticHandler() http.Handler {
	fileServer := http.FileServer(http.FS(s.publicFS))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if (path == "admin.html" || path == "admin.js") && !s.authorizedAdmin(r) {
			http.NotFound(w, r)
			return
		}
		if _, err := fs.Stat(s.publicFS, path); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}
		r.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"app_name":               s.cfg.AppName,
			"default_latitude":       s.cfg.DefaultLat,
			"default_longitude":      s.cfg.DefaultLng,
			"supported_locales":      []string{"zh-CN", "en", "hi"},
			"risk_categories":        []string{"abuse", "poison", "trap", "theft", "missing_pet", "suspicious_vehicle"},
			"help_categories":        []string{"station", "food_bank", "friendly_clinic", "helper", "trap_support"},
			"sponsor_business_types": []string{"food", "clinic", "supplies", "transport", "boarding"},
			"consensus_statuses":     []string{"pending", "limited", "verified", "disputed", "expired"},
			"admin_console_enabled":  s.authorizedAdmin(r),
			"sponsor_enabled":        true,
			"feedback_actions": map[string][]string{
				"risk": {"confirm_valid", "mark_doubtful", "mark_outdated", "seen_similar", "not_found_on_site"},
				"help": {"contact_success", "service_completed", "contact_failed", "confirm_valid", "mark_outdated", "seen_similar"},
			},
		},
	})
}

func (s *Server) handleMarkers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	lat, err := parseFloatQuery(r, "lat", s.cfg.DefaultLat)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "lat must be a number")
		return
	}
	lng, err := parseFloatQuery(r, "lng", s.cfg.DefaultLng)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "lng must be a number")
		return
	}
	radius, err := parseFloatQuery(r, "radius", 5000)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "radius must be a number")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	markers, err := s.store.ListMarkers(r.Context(), MarkerQuery{
		Lat:          lat,
		Lng:          lng,
		RadiusMeters: radius,
		Types:        splitCSV(r.URL.Query().Get("types")),
		Limit:        limit,
		Locale:       resolveLocale(r),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	for i := range markers {
		if isHelpCategory(markers[i].Category) && markers[i].Visibility != "public" {
			markers[i].Latitude, markers[i].Longitude = roundedMask(markers[i].Latitude, markers[i].Longitude, markers[i].ID)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": markers, "next_cursor": nil})
}

func (s *Server) handleSubmitMarker(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid multipart form")
		return
	}

	category := strings.TrimSpace(r.FormValue("category"))
	title := strings.TrimSpace(r.FormValue("title"))
	address := strings.TrimSpace(r.FormValue("address"))
	description := strings.TrimSpace(r.FormValue("description"))
	contactInfo := strings.TrimSpace(r.FormValue("contact_info"))
	visibility := strings.TrimSpace(r.FormValue("visibility"))
	sourceLocale := strings.TrimSpace(r.FormValue("source_locale"))

	lat, err := strconv.ParseFloat(r.FormValue("latitude"), 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "latitude is required")
		return
	}
	lng, err := strconv.ParseFloat(r.FormValue("longitude"), 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "longitude is required")
		return
	}
	if category == "" || title == "" || address == "" || description == "" {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "category, title, address and description are required")
		return
	}

	if limited, err := s.isRateLimited(r.Context(), fingerprintFromRequest(r), "submit"); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	} else if limited {
		writeError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "too many submissions, try again later")
		return
	}

	mediaURL, mediaThumbURL, err := s.saveUpload(r, "media")
	if err != nil {
		writeError(w, http.StatusBadRequest, "UPLOAD_FAILED", err.Error())
		return
	}

	publicLat, publicLng := lat, lng
	if isHelpCategory(category) && visibility != "public" {
		publicLat, publicLng = roundedMask(lat, lng, time.Now().Unix())
	}

	id, err := s.store.CreateMarker(r.Context(), MarkerInput{
		Category:         category,
		Title:            title,
		Address:          address,
		Description:      description,
		ContactInfo:      contactInfo,
		Visibility:       visibility,
		SourceLocale:     sourceLocale,
		PublicLatitude:   publicLat,
		PublicLongitude:  publicLng,
		PrivateLatitude:  lat,
		PrivateLongitude: lng,
		Fingerprint:      fingerprintFromRequest(r),
		MediaURL:         mediaURL,
		MediaThumbURL:    mediaThumbURL,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"id":               id,
			"review_status":    "pending",
			"consensus_status": "pending",
			"visibility_scope": "community_validation",
			"message":          "submitted to community validation",
			"status":           1,
		},
	})
}

func (s *Server) handleMarkerByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/markers/")
	if path == "" {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "not found")
		return
	}
	if strings.HasSuffix(path, "/feedback-summary") {
		id, err := parseID(strings.TrimSuffix(path, "/feedback-summary"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid marker id")
			return
		}
		s.handleMarkerFeedbackSummary(w, r, id)
		return
	}
	if strings.HasSuffix(path, "/feedback") {
		id, err := parseID(strings.TrimSuffix(path, "/feedback"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid marker id")
			return
		}
		s.handleFeedbackMarker(w, r, id)
		return
	}
	if strings.HasSuffix(path, "/escalate") {
		id, err := parseID(strings.TrimSuffix(path, "/escalate"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid marker id")
			return
		}
		s.handleEscalateMarker(w, r, id)
		return
	}
	if strings.HasSuffix(path, "/report") {
		id, err := parseID(strings.TrimSuffix(path, "/report"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid marker id")
			return
		}
		s.handleReportMarker(w, r, id)
		return
	}

	id, err := parseID(path)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid marker id")
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	marker, err := s.store.GetMarker(r.Context(), id, resolveLocale(r), false)
	if err != nil {
		if err == ErrNotFound {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "marker not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if isHelpCategory(marker.Category) && marker.Visibility != "public" {
		marker.Latitude, marker.Longitude = roundedMask(marker.Latitude, marker.Longitude, marker.ID)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": marker})
}

func (s *Server) handleReportMarker(w http.ResponseWriter, r *http.Request, markerID int64) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	if limited, err := s.isRateLimited(r.Context(), fingerprintFromRequest(r), "report"); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	} else if limited {
		writeError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "too many reports, try again later")
		return
	}

	var input struct {
		Reason string `json:"reason"`
		Note   string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
		return
	}
	if strings.TrimSpace(input.Reason) == "" {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "reason is required")
		return
	}

	reportID, err := s.store.CreateReport(r.Context(), markerID, input.Reason, input.Note, fingerprintFromRequest(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	feedbackResult, err := s.store.RecordFeedback(r.Context(), MarkerFeedbackInput{
		MarkerID:    markerID,
		Fingerprint: fingerprintFromRequest(r),
		Locale:      resolveLocale(r),
		Action:      legacyReportAction(input.Reason),
		Note:        input.Note,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"report_id":        reportID,
			"consensus_status": feedbackResult.ConsensusStatus,
			"confidence_score": feedbackResult.ConfidenceScore,
		},
	})
}

func (s *Server) handleFeedbackMarker(w http.ResponseWriter, r *http.Request, markerID int64) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	if limited, err := s.isRateLimited(r.Context(), fingerprintFromRequest(r), "feedback"); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	} else if limited {
		writeError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "too many feedback submissions, try again later")
		return
	}

	var input struct {
		Action         string   `json:"action"`
		Note           string   `json:"note"`
		ActorLatitude  *float64 `json:"actor_latitude"`
		ActorLongitude *float64 `json:"actor_longitude"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
		return
	}
	if !isValidFeedbackAction(input.Action) {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid feedback action")
		return
	}

	result, err := s.store.RecordFeedback(r.Context(), MarkerFeedbackInput{
		MarkerID:       markerID,
		Fingerprint:    fingerprintFromRequest(r),
		Locale:         resolveLocale(r),
		Action:         input.Action,
		Note:           input.Note,
		ActorLatitude:  input.ActorLatitude,
		ActorLongitude: input.ActorLongitude,
	})
	if err != nil {
		if err == ErrNotFound {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "marker not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": result})
}

func (s *Server) handleMarkerFeedbackSummary(w http.ResponseWriter, r *http.Request, markerID int64) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	marker, err := s.store.GetMarker(r.Context(), markerID, resolveLocale(r), false)
	if err != nil {
		if err == ErrNotFound {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "marker not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"consensus_status": marker.ConsensusStatus,
			"confidence_score": marker.ConfidenceScore,
			"support_score":    marker.SupportScore,
			"dispute_score":    marker.DisputeScore,
			"freshness_score":  marker.FreshnessScore,
			"feedback_summary": marker.FeedbackSummary,
		},
	})
}

func (s *Server) handleEscalateMarker(w http.ResponseWriter, r *http.Request, markerID int64) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var input struct {
		EscalationType string `json:"escalation_type"`
		TriggerReason  string `json:"trigger_reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
		return
	}
	if strings.TrimSpace(input.EscalationType) == "" {
		input.EscalationType = "community_review"
	}
	if strings.TrimSpace(input.TriggerReason) == "" {
		input.TriggerReason = "community requested an additional review pass"
	}
	id, err := s.store.CreateGovernanceEscalation(r.Context(), markerID, input.EscalationType, input.TriggerReason)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"id": id, "marker_id": markerID}})
}

func (s *Server) handleMeReputation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	profile, err := s.store.GetReputationProfile(r.Context(), fingerprintFromRequest(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	helpfulNotes := profile.SuccessfulSubmissions + profile.SuccessfulFlags
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"trust_score":            profile.TrustScore,
			"score":                  profile.TrustScore,
			"reputation_score":       profile.TrustScore,
			"trust_level":            profile.TrustLevel,
			"level":                  profile.TrustLevel,
			"successful_submissions": profile.SuccessfulSubmissions,
			"failed_submissions":     profile.FailedSubmissions,
			"successful_flags":       profile.SuccessfulFlags,
			"failed_flags":           profile.FailedFlags,
			"confirmation_count":     profile.SuccessfulFlags,
			"dispute_count":          profile.FailedFlags,
			"helpful_note_count":     helpfulNotes,
			"last_active_at":         profile.LastActiveAt,
			"activity_city":          profile.ActivityCity,
			"created_at":             profile.CreatedAt,
			"updated_at":             profile.UpdatedAt,
		},
	})
}

func (s *Server) handleMeActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	fingerprint := fingerprintFromRequest(r)
	submissions, err := s.store.ListSubmittedMarkers(r.Context(), fingerprint, resolveLocale(r), 20)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	feedback, err := s.store.ListMarkerActivity(r.Context(), fingerprint, 20)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	reputationEvents, err := s.store.ListReputationEvents(r.Context(), fingerprint, 20)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	items := make([]map[string]any, 0, len(feedback)+len(submissions)+len(reputationEvents))
	for _, item := range feedback {
		items = append(items, map[string]any{
			"type":       "feedback",
			"action":     item.FeedbackAction,
			"marker_id":  item.ID,
			"note":       item.FeedbackNote,
			"timestamp":  item.CreatedAt,
			"created_at": item.CreatedAt,
		})
	}
	for _, item := range submissions {
		items = append(items, map[string]any{
			"type":         "submission",
			"marker_id":    item.ID,
			"marker_title": item.Title,
			"title":        item.Title,
			"consensus":    item.ConsensusStatus,
			"created_at":   item.CreatedAt,
			"occurred_at":  item.CreatedAt,
		})
	}
	for _, item := range reputationEvents {
		items = append(items, map[string]any{
			"type":       item.EventType,
			"action":     item.EventType,
			"marker_id":  item.RelatedMarkerID,
			"created_at": item.CreatedAt,
			"timestamp":  item.CreatedAt,
		})
	}
	sort.Slice(items, func(i, j int) bool {
		left, _ := items[i]["created_at"].(time.Time)
		right, _ := items[j]["created_at"].(time.Time)
		return left.After(right)
	})
	last24h := 0
	last7d := 0
	var lastActionAt any
	now := time.Now().UTC()
	for idx, item := range items {
		createdAt, _ := item["created_at"].(time.Time)
		age := now.Sub(createdAt)
		if age <= 24*time.Hour {
			last24h++
		}
		if age <= 7*24*time.Hour {
			last7d++
		}
		if idx == 0 {
			lastActionAt = createdAt
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"submissions":    submissions,
			"feedback":       feedback,
			"events":         reputationEvents,
			"items":          items,
			"total_actions":  len(items),
			"recent_actions": len(items),
			"last_24h_count": last24h,
			"last_7d_count":  last7d,
			"last_action_at": lastActionAt,
		},
	})
}

func (s *Server) handleAdminMarkers(w http.ResponseWriter, r *http.Request) {
	if !s.authorizedAdmin(r) {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid admin token")
		return
	}
	w.Header().Set("Deprecation", "true")
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	reviewStatus := r.URL.Query().Get("review_status")
	markers, err := s.store.ListMarkers(r.Context(), MarkerQuery{
		Lat:          s.cfg.DefaultLat,
		Lng:          s.cfg.DefaultLng,
		RadiusMeters: 0,
		Limit:        limit,
		Locale:       resolveLocale(r),
		AdminView:    true,
		ReviewStatus: reviewStatus,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": markers})
}

func (s *Server) handleAdminMarkerByID(w http.ResponseWriter, r *http.Request) {
	if !s.authorizedAdmin(r) {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid admin token")
		return
	}
	w.Header().Set("Deprecation", "true")

	path := strings.TrimPrefix(r.URL.Path, "/api/admin/markers/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "not found")
		return
	}
	id, err := parseID(parts[0])
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid marker id")
		return
	}
	action := parts[1]

	switch action {
	case "review":
		s.handleReviewAction(w, r, id)
	case "hide":
		s.handleSimpleAction(w, r, id, "hide")
	case "restore":
		s.handleSimpleAction(w, r, id, "restore")
	case "translations":
		s.handleTranslationUpsert(w, r, id)
	default:
		writeError(w, http.StatusNotFound, "NOT_FOUND", "not found")
	}
}

func (s *Server) handleReviewAction(w http.ResponseWriter, r *http.Request, markerID int64) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var input struct {
		Action string `json:"action"`
		Note   string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
		return
	}
	if input.Action != "approve" && input.Action != "reject" {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "action must be approve or reject")
		return
	}
	if err := s.store.UpdateReviewStatus(r.Context(), markerID, input.Action, input.Note, "admin"); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleSimpleAction(w http.ResponseWriter, r *http.Request, markerID int64, action string) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var input struct {
		Note string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil && err != io.EOF {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
		return
	}
	if err := s.store.UpdateReviewStatus(r.Context(), markerID, action, input.Note, "admin"); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleTranslationUpsert(w http.ResponseWriter, r *http.Request, markerID int64) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	var input struct {
		Locale      string `json:"locale"`
		Title       string `json:"title"`
		Address     string `json:"address"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
		return
	}
	if strings.TrimSpace(input.Title) == "" || strings.TrimSpace(input.Address) == "" || strings.TrimSpace(input.Description) == "" {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "title, address and description are required")
		return
	}
	if err := s.store.UpsertTranslation(r.Context(), markerID, MarkerTranslation{
		Locale:      input.Locale,
		Title:       input.Title,
		Address:     input.Address,
		Description: input.Description,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) saveUpload(r *http.Request, field string) (string, string, error) {
	file, header, err := r.FormFile(field)
	if err != nil {
		if err == http.ErrMissingFile {
			return "", "", nil
		}
		return "", "", err
	}
	defer file.Close()

	sniff := make([]byte, 512)
	n, err := file.Read(sniff)
	if err != nil && err != io.EOF {
		return "", "", err
	}
	contentType := http.DetectContentType(sniff[:n])
	if !strings.HasPrefix(contentType, "image/") && !strings.HasPrefix(contentType, "video/") {
		return "", "", fmt.Errorf("only image or video uploads are allowed")
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", "", err
	}

	saved, err := saveProcessedMedia(s.cfg.UploadDir, header.Filename, contentType, file)
	if err != nil {
		return "", "", err
	}
	return saved.URL, saved.ThumbURL, nil
}

func (s *Server) isRateLimited(ctx context.Context, fingerprint, action string) (bool, error) {
	window := time.Now().UTC().Truncate(time.Hour)
	tx, err := s.store.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var count int
	err = tx.QueryRowContext(ctx, `
		SELECT window_count
		FROM submission_limits
		WHERE fingerprint = ? AND action = ? AND window_start = ?
	`, fingerprint, action, window.Format(time.RFC3339)).Scan(&count)
	if err != nil && err != sql.ErrNoRows {
		return false, err
	}

	if count >= 2 {
		return true, nil
	}

	if err == sql.ErrNoRows {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO submission_limits (fingerprint, action, window_start, window_count)
			VALUES (?, ?, ?, 1)
		`, fingerprint, action, window.Format(time.RFC3339)); err != nil {
			return false, err
		}
	} else {
		if _, err := tx.ExecContext(ctx, `
			UPDATE submission_limits
			SET window_count = window_count + 1
			WHERE fingerprint = ? AND action = ? AND window_start = ?
		`, fingerprint, action, window.Format(time.RFC3339)); err != nil {
			return false, err
		}
	}

	if err := tx.Commit(); err != nil {
		return false, err
	}
	return false, nil
}

func (s *Server) authorizedAdmin(r *http.Request) bool {
	token := r.Header.Get("X-Admin-Token")
	if token == "" {
		token = r.URL.Query().Get("token")
	}
	return token == s.cfg.AdminToken
}

func parseID(value string) (int64, error) {
	return strconv.ParseInt(strings.Trim(value, "/"), 10, 64)
}

func parseFloatQuery(r *http.Request, key string, fallback float64) (float64, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return fallback, nil
	}
	return strconv.ParseFloat(raw, 64)
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func resolveLocale(r *http.Request) string {
	if lang := r.URL.Query().Get("lang"); lang != "" {
		return normalizeLocale(lang)
	}
	header := strings.Split(r.Header.Get("Accept-Language"), ",")
	if len(header) > 0 {
		return normalizeLocale(header[0])
	}
	return "zh-CN"
}

func fingerprintFromRequest(r *http.Request) string {
	remoteHost := r.RemoteAddr
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		remoteHost = host
	}
	forwarded := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0])
	parts := []string{
		r.UserAgent(),
		forwarded,
		remoteHost,
		r.Header.Get("X-Canvas-Fingerprint"),
	}
	return strings.Join(parts, "|")
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token, X-Canvas-Fingerprint")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		fmt.Printf("%s %s %s\n", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}

func isValidFeedbackAction(action string) bool {
	switch action {
	case "confirm_valid", "mark_doubtful", "mark_outdated", "seen_similar", "not_found_on_site", "contact_success", "service_completed", "contact_failed":
		return true
	default:
		return false
	}
}

func legacyReportAction(reason string) string {
	value := strings.ToLower(strings.TrimSpace(reason))
	switch {
	case strings.Contains(value, "过期"), strings.Contains(value, "outdated"), strings.Contains(value, "expired"):
		return "mark_outdated"
	case strings.Contains(value, "找不到"), strings.Contains(value, "not found"), strings.Contains(value, "无此事"), strings.Contains(value, "wrong"):
		return "not_found_on_site"
	default:
		return "mark_doubtful"
	}
}
