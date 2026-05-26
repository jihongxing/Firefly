package firefly

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func (s *Server) handleSponsorsNearby(w http.ResponseWriter, r *http.Request) {
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
	scene := normalizeScene(r.URL.Query().Get("scene"))
	if r.URL.Query().Get("scene") == "" {
		derivedScene, err := s.store.buildSponsorSceneHint(r.Context(), lat, lng, radius)
		if err == nil {
			scene = derivedScene
		}
	}
	sessionID := strings.TrimSpace(r.URL.Query().Get("session_id"))
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "INVALID_SESSION_ID", "session_id is required")
		return
	}

	sponsors, err := s.store.ListNearbySponsors(r.Context(), SponsorQuery{
		Lat:          lat,
		Lng:          lng,
		RadiusMeters: radius,
		Scene:        scene,
		Limit:        limit,
		Locale:       resolveLocale(r),
		SessionID:    sessionID,
		Fingerprint:  fingerprintFromRequest(r),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": sponsors})
}

func (s *Server) handleSponsorEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	var input struct {
		SponsorID  int64          `json:"sponsor_id"`
		CampaignID int64          `json:"campaign_id"`
		SessionID  string         `json:"session_id"`
		EventType  string         `json:"event_type"`
		Metadata   map[string]any `json:"metadata"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
		return
	}
	if input.SponsorID <= 0 || input.CampaignID <= 0 {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "sponsor_id and campaign_id are required")
		return
	}
	if strings.TrimSpace(input.SessionID) == "" {
		writeError(w, http.StatusBadRequest, "INVALID_SESSION_ID", "session_id is required")
		return
	}
	if !isValidSponsorEventType(input.EventType) {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid sponsor event type")
		return
	}

	if err := s.store.RecordSponsorEvent(r.Context(), SponsorEventInput{
		SponsorID:   input.SponsorID,
		CampaignID:  input.CampaignID,
		SessionID:   input.SessionID,
		EventType:   input.EventType,
		Metadata:    input.Metadata,
		Fingerprint: fingerprintFromRequest(r),
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "SPONSOR_EVENT_REJECTED", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
}

func (s *Server) handleAdminSponsors(w http.ResponseWriter, r *http.Request) {
	if !s.authorizedAdmin(r) {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid admin token")
		return
	}

	switch r.Method {
	case http.MethodGet:
		sponsors, err := s.store.ListSponsors(r.Context(), SponsorAdminFilters{
			CityCode:     strings.TrimSpace(r.URL.Query().Get("city_code")),
			Status:       strings.TrimSpace(r.URL.Query().Get("status")),
			BusinessType: strings.TrimSpace(r.URL.Query().Get("business_type")),
			Keyword:      strings.TrimSpace(r.URL.Query().Get("keyword")),
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": sponsors})
	case http.MethodPost:
		var input Sponsor
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
			return
		}
		id, err := s.store.CreateSponsor(r.Context(), input)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"id": id}})
	default:
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
	}
}

func (s *Server) handleAdminSponsorByID(w http.ResponseWriter, r *http.Request) {
	if !s.authorizedAdmin(r) {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid admin token")
		return
	}
	id, err := parseID(strings.TrimPrefix(r.URL.Path, "/api/admin/sponsors/"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid sponsor id")
		return
	}
	switch r.Method {
	case http.MethodPatch:
		var input Sponsor
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
			return
		}
		if err := s.store.UpdateSponsor(r.Context(), id, input); err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
	case http.MethodDelete:
		mode := strings.TrimSpace(r.URL.Query().Get("mode"))
		switch mode {
		case "archive":
			if err := s.store.ArchiveSponsor(r.Context(), id); err != nil {
				writeSponsorLifecycleError(w, err)
				return
			}
		case "delete":
			if err := s.store.DeleteSponsor(r.Context(), id); err != nil {
				writeSponsorLifecycleError(w, err)
				return
			}
		default:
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "mode must be archive or delete")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
	default:
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
}

func (s *Server) handleAdminSponsorCampaigns(w http.ResponseWriter, r *http.Request) {
	if !s.authorizedAdmin(r) {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid admin token")
		return
	}
	switch r.Method {
	case http.MethodGet:
		sponsorID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("sponsor_id")), 10, 64)
		campaigns, err := s.store.ListSponsorCampaigns(r.Context(), SponsorCampaignFilters{
			SponsorID: sponsorID,
			Status:    strings.TrimSpace(r.URL.Query().Get("status")),
			CityCode:  strings.TrimSpace(r.URL.Query().Get("city_code")),
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": campaigns})
	case http.MethodPost:
		var input SponsorCampaign
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
			return
		}
		id, err := s.store.CreateSponsorCampaign(r.Context(), input)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"id": id}})
	default:
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
	}
}

func (s *Server) handleAdminSponsorCampaignByID(w http.ResponseWriter, r *http.Request) {
	if !s.authorizedAdmin(r) {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid admin token")
		return
	}
	id, err := parseID(strings.TrimPrefix(r.URL.Path, "/api/admin/sponsor-campaigns/"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid campaign id")
		return
	}
	switch r.Method {
	case http.MethodPatch:
		var input SponsorCampaign
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "invalid json body")
			return
		}
		if err := s.store.UpdateSponsorCampaign(r.Context(), id, input); err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
	case http.MethodDelete:
		mode := strings.TrimSpace(r.URL.Query().Get("mode"))
		switch mode {
		case "archive":
			if err := s.store.ArchiveSponsorCampaign(r.Context(), id); err != nil {
				writeCampaignLifecycleError(w, err)
				return
			}
		case "delete":
			if err := s.store.DeleteSponsorCampaign(r.Context(), id); err != nil {
				writeCampaignLifecycleError(w, err)
				return
			}
		default:
			writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "mode must be archive or delete")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
	default:
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
}

func (s *Server) handleAdminSponsorReports(w http.ResponseWriter, r *http.Request) {
	if !s.authorizedAdmin(r) {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid admin token")
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	sponsorID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("sponsor_id")), 10, 64)
	campaignID, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("campaign_id")), 10, 64)
	dateFrom, err := parseOptionalDate(r.URL.Query().Get("date_from"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "date_from must be RFC3339 or YYYY-MM-DD")
		return
	}
	dateTo, err := parseOptionalDate(r.URL.Query().Get("date_to"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_PARAMS", "date_to must be RFC3339 or YYYY-MM-DD")
		return
	}

	report, err := s.store.GetSponsorReport(r.Context(), sponsorID, campaignID, dateFrom, dateTo)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": report})
}

func isValidSponsorEventType(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "open", "view_details", "navigate", "contact", "dismiss":
		return true
	default:
		return false
	}
}

func parseOptionalDate(raw string) (*time.Time, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02"} {
		value, err := time.Parse(layout, raw)
		if err == nil {
			return &value, nil
		}
	}
	return nil, strconv.ErrSyntax
}

func writeSponsorLifecycleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errSponsorNotFound):
		writeError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, errSponsorArchiveRequired):
		writeError(w, http.StatusConflict, "ARCHIVE_REQUIRED", err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
	}
}

func writeCampaignLifecycleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errCampaignNotFound):
		writeError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, errCampaignArchiveRequired):
		writeError(w, http.StatusConflict, "ARCHIVE_REQUIRED", err.Error())
	default:
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
	}
}
