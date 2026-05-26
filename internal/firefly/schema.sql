PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    public_latitude REAL NOT NULL,
    public_longitude REAL NOT NULL,
    private_latitude REAL NOT NULL,
    private_longitude REAL NOT NULL,
    address TEXT NOT NULL,
    description TEXT NOT NULL,
    contact_info TEXT,
    media_url TEXT,
    media_thumb_url TEXT,
    source_locale TEXT NOT NULL DEFAULT 'zh-CN',
    fingerprint TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    review_status TEXT NOT NULL DEFAULT 'pending',
    consensus_status TEXT NOT NULL DEFAULT 'pending',
    confidence_score REAL NOT NULL DEFAULT 0,
    support_score REAL NOT NULL DEFAULT 0,
    dispute_score REAL NOT NULL DEFAULT 0,
    freshness_score REAL NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 1,
    first_seen_at DATETIME,
    last_confirmed_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (category IN (
        'abuse',
        'poison',
        'trap',
        'theft',
        'missing_pet',
        'suspicious_vehicle',
        'station',
        'food_bank',
        'friendly_clinic',
        'helper',
        'trap_support'
    )),
    CHECK (visibility IN ('public', 'masked', 'private')),
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'hidden')),
    CHECK (consensus_status IN ('pending', 'limited', 'verified', 'disputed', 'expired')),
    CHECK (status IN (0, 1)),
    CHECK (source_locale IN ('zh-CN', 'en', 'hi'))
);

CREATE INDEX IF NOT EXISTS idx_markers_category_status
ON markers (category, status, review_status);

CREATE INDEX IF NOT EXISTS idx_markers_consensus_status
ON markers (consensus_status, category, expires_at);

CREATE INDEX IF NOT EXISTS idx_markers_expires_at
ON markers (expires_at, consensus_status);

CREATE INDEX IF NOT EXISTS idx_markers_public_location
ON markers (public_latitude, public_longitude);

CREATE INDEX IF NOT EXISTS idx_markers_created_at
ON markers (created_at DESC);

CREATE TABLE IF NOT EXISTS marker_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    note TEXT,
    fingerprint TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES markers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_marker_reports_marker_id
ON marker_reports (marker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS marker_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'zh-CN',
    action TEXT NOT NULL,
    note TEXT,
    actor_latitude REAL,
    actor_longitude REAL,
    proximity_score REAL NOT NULL DEFAULT 0,
    trust_snapshot REAL NOT NULL DEFAULT 0,
    weight_score REAL NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (marker_id, fingerprint, action),
    FOREIGN KEY (marker_id) REFERENCES markers(id) ON DELETE CASCADE,
    CHECK (locale IN ('zh-CN', 'en', 'hi')),
    CHECK (action IN (
        'confirm_valid',
        'mark_doubtful',
        'mark_outdated',
        'seen_similar',
        'not_found_on_site',
        'contact_success',
        'service_completed',
        'contact_failed'
    ))
);

CREATE INDEX IF NOT EXISTS idx_marker_feedback_marker_id
ON marker_feedback (marker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marker_feedback_fingerprint
ON marker_feedback (fingerprint, created_at DESC);

CREATE TABLE IF NOT EXISTS marker_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    locale TEXT NOT NULL,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES markers(id) ON DELETE CASCADE,
    UNIQUE (marker_id, locale),
    CHECK (locale IN ('zh-CN', 'en', 'hi'))
);

CREATE INDEX IF NOT EXISTS idx_marker_translations_marker_locale
ON marker_translations (marker_id, locale);

CREATE TABLE IF NOT EXISTS review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    operator_id TEXT,
    note TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marker_id) REFERENCES markers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_logs_marker_id
ON review_logs (marker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reputation_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL UNIQUE,
    trust_score REAL NOT NULL DEFAULT 0,
    trust_level TEXT NOT NULL DEFAULT 'L0',
    successful_submissions INTEGER NOT NULL DEFAULT 0,
    failed_submissions INTEGER NOT NULL DEFAULT 0,
    successful_flags INTEGER NOT NULL DEFAULT 0,
    failed_flags INTEGER NOT NULL DEFAULT 0,
    activity_city TEXT,
    last_active_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (trust_level IN ('L0', 'L1', 'L2', 'L3'))
);

CREATE INDEX IF NOT EXISTS idx_reputation_profiles_trust_level
ON reputation_profiles (trust_level, trust_score DESC);

CREATE TABLE IF NOT EXISTS reputation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL,
    event_type TEXT NOT NULL,
    delta REAL NOT NULL,
    reason TEXT NOT NULL,
    related_marker_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_fingerprint
ON reputation_events (fingerprint, created_at DESC);

CREATE TABLE IF NOT EXISTS governance_escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_id INTEGER NOT NULL,
    escalation_type TEXT NOT NULL,
    trigger_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (marker_id) REFERENCES markers(id) ON DELETE CASCADE,
    CHECK (status IN ('open', 'resolved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_governance_escalations_marker_id
ON governance_escalations (marker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS submission_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT NOT NULL,
    action TEXT NOT NULL,
    window_start DATETIME NOT NULL,
    window_count INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fingerprint, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_submission_limits_fingerprint_action
ON submission_limits (fingerprint, action, window_start);

CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_key TEXT NOT NULL,
    name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    contact_info TEXT,
    media_url TEXT,
    logo_url TEXT,
    city_code TEXT NOT NULL,
    area_label TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT NOT NULL,
    service_hours TEXT,
    service_tags TEXT NOT NULL DEFAULT '[]',
    landing_url TEXT,
    sponsor_badge TEXT NOT NULL DEFAULT 'sponsored',
    is_verified INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (business_type IN ('food', 'clinic', 'supplies', 'transport', 'boarding')),
    CHECK (is_verified IN (0, 1)),
    CHECK (status IN ('active', 'paused', 'expired', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_sponsors_city_status
ON sponsors (city_code, status, business_type);

CREATE INDEX IF NOT EXISTS idx_sponsors_brand_key
ON sponsors (brand_key, status);

CREATE INDEX IF NOT EXISTS idx_sponsors_location
ON sponsors (latitude, longitude);

CREATE TABLE IF NOT EXISTS sponsor_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER NOT NULL,
    package_tier TEXT NOT NULL,
    target_scene TEXT NOT NULL,
    city_code TEXT NOT NULL,
    area_label TEXT NOT NULL,
    area_center_lat REAL NOT NULL,
    area_center_lng REAL NOT NULL,
    area_radius_meters INTEGER NOT NULL DEFAULT 5000,
    share_ratio REAL NOT NULL,
    priority_weight INTEGER NOT NULL,
    city_multiplier REAL NOT NULL DEFAULT 1.0,
    scene_multiplier REAL NOT NULL DEFAULT 1.0,
    monthly_price_cents INTEGER NOT NULL,
    daily_primary_cap_per_user INTEGER NOT NULL DEFAULT 2,
    daily_secondary_cap_per_user INTEGER NOT NULL DEFAULT 3,
    max_secondary_slots INTEGER NOT NULL DEFAULT 2,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
    CHECK (package_tier IN ('guard_30', 'resident_70', 'exclusive_100')),
    CHECK (target_scene IN ('risk', 'care', 'both')),
    CHECK (share_ratio IN (0.3, 0.7, 1.0)),
    CHECK (priority_weight IN (3, 7, 10)),
    CHECK (area_radius_meters > 0),
    CHECK (monthly_price_cents >= 0),
    CHECK (daily_primary_cap_per_user >= 0),
    CHECK (daily_secondary_cap_per_user >= 0),
    CHECK (max_secondary_slots BETWEEN 0 AND 4),
    CHECK (status IN ('active', 'paused', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_lookup
ON sponsor_campaigns (city_code, target_scene, status, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_sponsor
ON sponsor_campaigns (sponsor_id, status, end_at);

CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_geo
ON sponsor_campaigns (area_center_lat, area_center_lng, area_radius_meters);

CREATE TABLE IF NOT EXISTS sponsor_impressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER NOT NULL,
    campaign_id INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    session_id TEXT NOT NULL,
    exposure_role TEXT NOT NULL,
    scene_context TEXT NOT NULL,
    viewport_lat REAL,
    viewport_lng REAL,
    viewport_radius_meters INTEGER,
    rank_position INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
    UNIQUE (campaign_id, sponsor_id, fingerprint, session_id, exposure_role),
    CHECK (exposure_role IN ('primary', 'secondary')),
    CHECK (scene_context IN ('risk', 'care', 'mixed')),
    CHECK (rank_position BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_impressions_session
ON sponsor_impressions (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sponsor_impressions_fingerprint
ON sponsor_impressions (fingerprint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sponsor_impressions_campaign
ON sponsor_impressions (campaign_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sponsor_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sponsor_id INTEGER NOT NULL,
    campaign_id INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
    CHECK (event_type IN ('open', 'view_details', 'navigate', 'contact', 'dismiss'))
);

CREATE INDEX IF NOT EXISTS idx_sponsor_events_session
ON sponsor_events (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sponsor_events_campaign
ON sponsor_events (campaign_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sponsor_events_fingerprint
ON sponsor_events (fingerprint, created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_markers_updated_at
AFTER UPDATE ON markers
FOR EACH ROW
BEGIN
    UPDATE markers
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_submission_limits_updated_at
AFTER UPDATE ON submission_limits
FOR EACH ROW
BEGIN
    UPDATE submission_limits
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_marker_translations_updated_at
AFTER UPDATE ON marker_translations
FOR EACH ROW
BEGIN
    UPDATE marker_translations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_reputation_profiles_updated_at
AFTER UPDATE ON reputation_profiles
FOR EACH ROW
BEGIN
    UPDATE reputation_profiles
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sponsors_updated_at
AFTER UPDATE ON sponsors
FOR EACH ROW
BEGIN
    UPDATE sponsors
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sponsor_campaigns_updated_at
AFTER UPDATE ON sponsor_campaigns
FOR EACH ROW
BEGIN
    UPDATE sponsor_campaigns
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;
