PRAGMA foreign_keys = ON;

-- Firefly sponsor feature bootstrap schema
-- Scope:
-- 1. sponsor master data
-- 2. delivery campaigns
-- 3. impression logs
-- 4. event logs

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
