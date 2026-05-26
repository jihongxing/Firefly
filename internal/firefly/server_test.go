package firefly

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"testing/fstest"
)

func TestCommunityGovernanceEndpoints(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	store, err := NewStore(filepath.Join(tempDir, "firefly.db"))
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	defer store.Close()

	if err := store.Init(); err != nil {
		t.Fatalf("init store: %v", err)
	}

	publicFS := fstest.MapFS{
		"index.html": {Data: []byte("ok")},
	}
	localeFS := fstest.MapFS{
		"zh-CN.json": {Data: []byte(`{}`)},
		"en.json":    {Data: []byte(`{}`)},
		"hi.json":    {Data: []byte(`{}`)},
	}

	server := NewServer(Config{
		Port:         "0",
		DatabasePath: filepath.Join(tempDir, "firefly.db"),
		UploadDir:    filepath.Join(tempDir, "uploads"),
		AdminToken:   "test-admin",
		AppName:      "Firefly",
		DefaultLat:   22.5431,
		DefaultLng:   114.0579,
	}, store, publicFS, localeFS)

	if err := os.MkdirAll(filepath.Join(tempDir, "uploads"), 0o755); err != nil {
		t.Fatalf("mkdir uploads: %v", err)
	}

	ts := httptest.NewServer(server.Routes())
	defer ts.Close()

	client := ts.Client()

	markerResp := getJSON(t, client, ts.URL+"/api/markers?lat=22.5431&lng=114.0579&radius=5000&limit=10&lang=zh-CN", nil)
	markers := markerResp["data"].([]any)
	if len(markers) == 0 {
		t.Fatal("expected seeded markers")
	}
	first := markers[0].(map[string]any)
	markerID := int(first["id"].(float64))

	headers := map[string]string{
		"Content-Type":         "application/json",
		"X-Canvas-Fingerprint": "test-device-1",
	}

	feedbackBody := `{"action":"confirm_valid","note":"field check","actor_latitude":22.5431,"actor_longitude":114.0579}`
	feedbackResp := postJSON(t, client, ts.URL+"/api/markers/"+itoa(markerID)+"/feedback", headers, feedbackBody)
	feedbackData := feedbackResp["data"].(map[string]any)
	if feedbackData["consensus_status"] == "" {
		t.Fatal("expected consensus_status in feedback response")
	}

	summaryResp := getJSON(t, client, ts.URL+"/api/markers/"+itoa(markerID)+"/feedback-summary", headers)
	summaryData := summaryResp["data"].(map[string]any)
	feedbackSummary := summaryData["feedback_summary"].(map[string]any)
	if int(feedbackSummary["confirm_valid"].(float64)) != 1 {
		t.Fatalf("expected confirm_valid count 1, got %#v", feedbackSummary["confirm_valid"])
	}

	reputationResp := getJSON(t, client, ts.URL+"/api/me/reputation", headers)
	reputationData := reputationResp["data"].(map[string]any)
	if reputationData["score"] == nil {
		t.Fatal("expected aliased reputation score")
	}

	activityResp := getJSON(t, client, ts.URL+"/api/me/activity", headers)
	activityData := activityResp["data"].(map[string]any)
	items := activityData["items"].([]any)
	if len(items) == 0 {
		t.Fatal("expected activity items after feedback")
	}

	escalateResp := postJSON(t, client, ts.URL+"/api/markers/"+itoa(markerID)+"/escalate", headers, `{}`)
	escalateData := escalateResp["data"].(map[string]any)
	if escalateData["id"] == nil {
		t.Fatal("expected escalation id")
	}
}

func TestSponsorEndpoints(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	store, err := NewStore(filepath.Join(tempDir, "firefly.db"))
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	defer store.Close()

	if err := store.Init(); err != nil {
		t.Fatalf("init store: %v", err)
	}

	publicFS := fstest.MapFS{
		"index.html": {Data: []byte("ok")},
	}
	localeFS := fstest.MapFS{
		"zh-CN.json": {Data: []byte(`{}`)},
		"en.json":    {Data: []byte(`{}`)},
		"hi.json":    {Data: []byte(`{}`)},
	}

	server := NewServer(Config{
		Port:         "0",
		DatabasePath: filepath.Join(tempDir, "firefly.db"),
		UploadDir:    filepath.Join(tempDir, "uploads"),
		AdminToken:   "test-admin",
		AppName:      "Firefly",
		DefaultLat:   22.5431,
		DefaultLng:   114.0579,
	}, store, publicFS, localeFS)

	if err := os.MkdirAll(filepath.Join(tempDir, "uploads"), 0o755); err != nil {
		t.Fatalf("mkdir uploads: %v", err)
	}

	ts := httptest.NewServer(server.Routes())
	defer ts.Close()

	client := ts.Client()
	headers := map[string]string{
		"X-Canvas-Fingerprint": "test-sponsor-device",
	}

	sponsorResp := getJSON(t, client, ts.URL+"/api/sponsors/nearby?lat=22.5431&lng=114.0579&radius=5000&limit=3&scene=care&session_id=session-1&lang=zh-CN", headers)
	sponsors := sponsorResp["data"].([]any)
	if len(sponsors) == 0 {
		t.Fatal("expected seeded sponsors")
	}
	first := sponsors[0].(map[string]any)
	if first["type"] != "sponsor" {
		t.Fatalf("expected sponsor type, got %#v", first["type"])
	}
	if first["sponsor_role"] == "" {
		t.Fatal("expected sponsor role")
	}

	eventBody := `{"sponsor_id":` + itoa(int(first["id"].(float64))) + `,"campaign_id":` + itoa(int(first["campaign_id"].(float64))) + `,"session_id":"session-1","event_type":"open","metadata":{"entry":"map_pin"}}`
	eventResp := postJSON(t, client, ts.URL+"/api/sponsors/events", map[string]string{
		"Content-Type":         "application/json",
		"X-Canvas-Fingerprint": "test-sponsor-device",
	}, eventBody)
	if data := eventResp["data"].(map[string]any); data["ok"] != true {
		t.Fatal("expected sponsor event ok")
	}

	adminHeaders := map[string]string{
		"X-Admin-Token": "test-admin",
	}
	adminSponsorResp := getJSON(t, client, ts.URL+"/api/admin/sponsors", adminHeaders)
	if len(adminSponsorResp["data"].([]any)) == 0 {
		t.Fatal("expected admin sponsors list")
	}
	adminSponsor := adminSponsorResp["data"].([]any)[0].(map[string]any)
	if strings.TrimSpace(asString(adminSponsor["brand_key"])) == "" {
		t.Fatal("expected admin sponsor brand_key")
	}

	adminCampaignResp := getJSON(t, client, ts.URL+"/api/admin/sponsor-campaigns", adminHeaders)
	if len(adminCampaignResp["data"].([]any)) == 0 {
		t.Fatal("expected admin campaigns list")
	}

	reportResp := getJSON(t, client, ts.URL+"/api/admin/sponsor-reports", adminHeaders)
	reportData := reportResp["data"].(map[string]any)
	if reportData["primary_impressions"] == nil {
		t.Fatal("expected sponsor report counters")
	}

	createdSponsor := postJSON(t, client, ts.URL+"/api/admin/sponsors", map[string]string{
		"Content-Type":  "application/json",
		"X-Admin-Token": "test-admin",
	}, `{
		"brand_key":"archive-flow",
		"name":"Archive Flow Sponsor",
		"business_type":"food",
		"title":"Archive Flow",
		"description":"archive me",
		"city_code":"CN-SZ",
		"area_label":"Test Area",
		"latitude":22.55,
		"longitude":114.06,
		"address":"Test Address",
		"status":"active"
	}`)
	createdSponsorID := int64(createdSponsor["data"].(map[string]any)["id"].(float64))

	createdCampaign := postJSON(t, client, ts.URL+"/api/admin/sponsor-campaigns", map[string]string{
		"Content-Type":  "application/json",
		"X-Admin-Token": "test-admin",
	}, `{
		"sponsor_id":`+itoa(int(createdSponsorID))+`,
		"package_tier":"guard_30",
		"target_scene":"care",
		"city_code":"CN-SZ",
		"area_label":"Test Area",
		"area_center_lat":22.55,
		"area_center_lng":114.06,
		"area_radius_meters":3000,
		"share_ratio":0.3,
		"priority_weight":3,
		"city_multiplier":1.0,
		"scene_multiplier":1.0,
		"monthly_price_cents":39900,
		"daily_primary_cap_per_user":2,
		"daily_secondary_cap_per_user":3,
		"max_secondary_slots":2,
		"start_at":"2026-05-27T00:00:00Z",
		"end_at":"2026-06-27T00:00:00Z",
		"status":"active"
	}`)
	createdCampaignID := int64(createdCampaign["data"].(map[string]any)["id"].(float64))

	deleteExpectStatus(t, client, ts.URL+"/api/admin/sponsor-campaigns/"+itoa(int(createdCampaignID))+"?mode=delete", adminHeaders, http.StatusConflict)
	deleteExpectStatus(t, client, ts.URL+"/api/admin/sponsor-campaigns/"+itoa(int(createdCampaignID))+"?mode=archive", adminHeaders, http.StatusOK)
	campaignAfterArchive := getJSON(t, client, ts.URL+"/api/admin/sponsor-campaigns?sponsor_id="+itoa(int(createdSponsorID)), adminHeaders)
	campaignRecord := campaignAfterArchive["data"].([]any)[0].(map[string]any)
	if campaignRecord["status"] != "expired" {
		t.Fatalf("expected archived campaign status expired, got %#v", campaignRecord["status"])
	}
	deleteExpectStatus(t, client, ts.URL+"/api/admin/sponsor-campaigns/"+itoa(int(createdCampaignID))+"?mode=delete", adminHeaders, http.StatusOK)

	deleteExpectStatus(t, client, ts.URL+"/api/admin/sponsors/"+itoa(int(createdSponsorID))+"?mode=delete", adminHeaders, http.StatusConflict)
	deleteExpectStatus(t, client, ts.URL+"/api/admin/sponsors/"+itoa(int(createdSponsorID))+"?mode=archive", adminHeaders, http.StatusOK)
	sponsorAfterArchive := getJSON(t, client, ts.URL+"/api/admin/sponsors?keyword=Archive%20Flow", adminHeaders)
	sponsorRecord := sponsorAfterArchive["data"].([]any)[0].(map[string]any)
	if sponsorRecord["status"] != "blocked" {
		t.Fatalf("expected archived sponsor status blocked, got %#v", sponsorRecord["status"])
	}
	deleteExpectStatus(t, client, ts.URL+"/api/admin/sponsors/"+itoa(int(createdSponsorID))+"?mode=delete", adminHeaders, http.StatusOK)
}

func asString(value any) string {
	if value == nil {
		return ""
	}
	text, _ := value.(string)
	return text
}

func getJSON(t *testing.T, client *http.Client, url string, headers map[string]string) map[string]any {
	t.Helper()

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("unexpected status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return decodeJSON(t, resp.Body)
}

func postJSON(t *testing.T, client *http.Client, url string, headers map[string]string, body string) map[string]any {
	t.Helper()

	req, err := http.NewRequest(http.MethodPost, url, strings.NewReader(body))
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(resp.Body)
		t.Fatalf("unexpected status %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	return decodeJSON(t, resp.Body)
}

func deleteExpectStatus(t *testing.T, client *http.Client, url string, headers map[string]string, status int) {
	t.Helper()

	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != status {
		raw, _ := io.ReadAll(resp.Body)
		t.Fatalf("unexpected status %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
}

func decodeJSON(t *testing.T, body io.Reader) map[string]any {
	t.Helper()

	var payload map[string]any
	if err := json.NewDecoder(body).Decode(&payload); err != nil {
		t.Fatalf("decode json: %v", err)
	}
	return payload
}

func itoa(value int) string {
	return strconv.Itoa(value)
}
