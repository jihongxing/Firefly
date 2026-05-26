package firefly

import "time"

type Marker struct {
	ID                       int64           `json:"id"`
	Category                 string          `json:"category"`
	Title                    string          `json:"title"`
	Address                  string          `json:"address"`
	Description              string          `json:"description"`
	ContactInfo              *string         `json:"contact_info,omitempty"`
	MediaURL                 *string         `json:"media_url,omitempty"`
	MediaThumbURL            *string         `json:"media_thumb_url,omitempty"`
	Visibility               string          `json:"visibility"`
	ReviewStatus             string          `json:"review_status"`
	ConsensusStatus          string          `json:"consensus_status"`
	ConfidenceScore          float64         `json:"confidence_score"`
	SupportScore             float64         `json:"support_score"`
	DisputeScore             float64         `json:"dispute_score"`
	FreshnessScore           float64         `json:"freshness_score"`
	Status                   int             `json:"status"`
	SourceLocale             string          `json:"source_locale"`
	Locale                   string          `json:"locale"`
	IsTranslated             bool            `json:"is_translated"`
	Latitude                 float64         `json:"latitude"`
	Longitude                float64         `json:"longitude"`
	PrivateLatitude          float64         `json:"-"`
	PrivateLongitude         float64         `json:"-"`
	DistanceMeters           float64         `json:"distance_m,omitempty"`
	FirstSeenAt              *time.Time      `json:"first_seen_at,omitempty"`
	LastConfirmedAt          *time.Time      `json:"last_confirmed_at,omitempty"`
	ExpiresAt                *time.Time      `json:"expires_at,omitempty"`
	FeedbackSummary          FeedbackSummary `json:"feedback_summary"`
	AvailableFeedbackActions []string        `json:"available_feedback_actions,omitempty"`
	CreatedAt                time.Time       `json:"created_at"`
	UpdatedAt                time.Time       `json:"updated_at"`
}

type FeedbackSummary struct {
	ConfirmValid     int `json:"confirm_valid"`
	MarkDoubtful     int `json:"mark_doubtful"`
	MarkOutdated     int `json:"mark_outdated"`
	SeenSimilar      int `json:"seen_similar"`
	NotFoundOnSite   int `json:"not_found_on_site"`
	ContactSuccess   int `json:"contact_success"`
	ServiceCompleted int `json:"service_completed"`
	ContactFailed    int `json:"contact_failed"`
}

type MarkerTranslation struct {
	ID          int64     `json:"id"`
	MarkerID    int64     `json:"marker_id"`
	Locale      string    `json:"locale"`
	Title       string    `json:"title"`
	Address     string    `json:"address"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Report struct {
	ID          int64     `json:"id"`
	MarkerID    int64     `json:"marker_id"`
	Reason      string    `json:"reason"`
	Note        string    `json:"note,omitempty"`
	Fingerprint string    `json:"-"`
	CreatedAt   time.Time `json:"created_at"`
}

type MarkerInput struct {
	Category         string
	Title            string
	Address          string
	Description      string
	ContactInfo      string
	Visibility       string
	SourceLocale     string
	PublicLatitude   float64
	PublicLongitude  float64
	PrivateLatitude  float64
	PrivateLongitude float64
	Fingerprint      string
	MediaURL         string
	MediaThumbURL    string
}

type MarkerQuery struct {
	Lat          float64
	Lng          float64
	RadiusMeters float64
	Types        []string
	Limit        int
	Locale       string
	AdminView    bool
	ReviewStatus string
}

type MarkerFeedbackInput struct {
	MarkerID       int64
	Fingerprint    string
	Locale         string
	Action         string
	Note           string
	ActorLatitude  *float64
	ActorLongitude *float64
}

type MarkerFeedbackResult struct {
	MarkerID        int64           `json:"marker_id"`
	Action          string          `json:"action"`
	WeightScore     float64         `json:"weight_score"`
	ConsensusStatus string          `json:"consensus_status"`
	ConfidenceScore float64         `json:"confidence_score"`
	FeedbackSummary FeedbackSummary `json:"feedback_summary"`
}

type ReputationProfile struct {
	ID                    int64      `json:"-"`
	Fingerprint           string     `json:"-"`
	TrustScore            float64    `json:"trust_score"`
	TrustLevel            string     `json:"trust_level"`
	SuccessfulSubmissions int        `json:"successful_submissions"`
	FailedSubmissions     int        `json:"failed_submissions"`
	SuccessfulFlags       int        `json:"successful_flags"`
	FailedFlags           int        `json:"failed_flags"`
	ActivityCity          *string    `json:"activity_city,omitempty"`
	LastActiveAt          *time.Time `json:"last_active_at,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

type ReputationEvent struct {
	ID              int64     `json:"id"`
	EventType       string    `json:"event_type"`
	Delta           float64   `json:"delta"`
	Reason          string    `json:"reason"`
	RelatedMarkerID *int64    `json:"related_marker_id,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type MarkerActivity struct {
	ID              int64            `json:"id"`
	Category        string           `json:"category,omitempty"`
	Title           string           `json:"title,omitempty"`
	ConsensusStatus string           `json:"consensus_status,omitempty"`
	CreatedAt       time.Time        `json:"created_at"`
	FeedbackAction  string           `json:"feedback_action,omitempty"`
	FeedbackNote    string           `json:"feedback_note,omitempty"`
	WeightScore     float64          `json:"weight_score,omitempty"`
	FeedbackSummary *FeedbackSummary `json:"feedback_summary,omitempty"`
}

type GovernanceEscalation struct {
	ID             int64      `json:"id"`
	MarkerID       int64      `json:"marker_id"`
	EscalationType string     `json:"escalation_type"`
	TriggerReason  string     `json:"trigger_reason"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	ResolvedAt     *time.Time `json:"resolved_at,omitempty"`
}

type Sponsor struct {
	ID             int64     `json:"id"`
	Type           string    `json:"type,omitempty"`
	BrandKey       string    `json:"brand_key"`
	Name           string    `json:"name"`
	BusinessType   string    `json:"business_type"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	ContactInfo    *string   `json:"contact_info,omitempty"`
	MediaURL       *string   `json:"media_url,omitempty"`
	LogoURL        *string   `json:"logo_url,omitempty"`
	CityCode       string    `json:"city_code,omitempty"`
	AreaLabel      string    `json:"area_label,omitempty"`
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	Address        string    `json:"address"`
	ServiceHours   *string   `json:"service_hours,omitempty"`
	ServiceTags    []string  `json:"service_tags"`
	LandingURL     *string   `json:"landing_url,omitempty"`
	SponsorBadge   string    `json:"sponsor_badge"`
	IsVerified     bool      `json:"is_verified"`
	Status         string    `json:"status,omitempty"`
	SponsorRole    string    `json:"sponsor_role,omitempty"`
	CampaignID     int64     `json:"campaign_id,omitempty"`
	CampaignTier   string    `json:"campaign_tier,omitempty"`
	TargetScene    string    `json:"target_scene,omitempty"`
	DistanceMeters float64   `json:"distance_m,omitempty"`
	RankPosition   int       `json:"rank_position,omitempty"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
}

type SponsorCampaign struct {
	ID                       int64     `json:"id"`
	SponsorID                int64     `json:"sponsor_id"`
	PackageTier              string    `json:"package_tier"`
	TargetScene              string    `json:"target_scene"`
	CityCode                 string    `json:"city_code"`
	AreaLabel                string    `json:"area_label"`
	AreaCenterLat            float64   `json:"area_center_lat"`
	AreaCenterLng            float64   `json:"area_center_lng"`
	AreaRadiusMeters         int       `json:"area_radius_meters"`
	ShareRatio               float64   `json:"share_ratio"`
	PriorityWeight           int       `json:"priority_weight"`
	CityMultiplier           float64   `json:"city_multiplier"`
	SceneMultiplier          float64   `json:"scene_multiplier"`
	MonthlyPriceCents        int       `json:"monthly_price_cents"`
	DailyPrimaryCapPerUser   int       `json:"daily_primary_cap_per_user"`
	DailySecondaryCapPerUser int       `json:"daily_secondary_cap_per_user"`
	MaxSecondarySlots        int       `json:"max_secondary_slots"`
	StartAt                  time.Time `json:"start_at"`
	EndAt                    time.Time `json:"end_at"`
	Status                   string    `json:"status"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}

type SponsorQuery struct {
	Lat          float64
	Lng          float64
	RadiusMeters float64
	Scene        string
	Limit        int
	Locale       string
	SessionID    string
	Fingerprint  string
}

type SponsorEventInput struct {
	SponsorID   int64
	CampaignID  int64
	SessionID   string
	EventType   string
	Metadata    map[string]any
	Fingerprint string
}
