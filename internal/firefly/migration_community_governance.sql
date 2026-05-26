BEGIN TRANSACTION;

PRAGMA foreign_keys = OFF;

CREATE TEMP TABLE _marker_migration_snapshot AS
SELECT
    id,
    created_at AS original_created_at,
    updated_at AS original_updated_at
FROM markers;

ALTER TABLE markers ADD COLUMN consensus_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE markers ADD COLUMN confidence_score REAL NOT NULL DEFAULT 0;
ALTER TABLE markers ADD COLUMN support_score REAL NOT NULL DEFAULT 0;
ALTER TABLE markers ADD COLUMN dispute_score REAL NOT NULL DEFAULT 0;
ALTER TABLE markers ADD COLUMN freshness_score REAL NOT NULL DEFAULT 1;
ALTER TABLE markers ADD COLUMN first_seen_at DATETIME;
ALTER TABLE markers ADD COLUMN last_confirmed_at DATETIME;
ALTER TABLE markers ADD COLUMN expires_at DATETIME;

UPDATE markers
SET first_seen_at = COALESCE(
    first_seen_at,
    (SELECT s.original_created_at FROM _marker_migration_snapshot s WHERE s.id = markers.id)
);

UPDATE markers
SET consensus_status = CASE
    WHEN category IN ('station', 'food_bank', 'friendly_clinic', 'helper', 'trap_support') AND review_status = 'pending' THEN 'limited'
    WHEN review_status = 'approved' THEN 'verified'
    WHEN review_status IN ('rejected', 'hidden') THEN 'disputed'
    ELSE 'pending'
END;

UPDATE markers
SET support_score = CASE
    WHEN consensus_status = 'verified' THEN 8
    WHEN consensus_status = 'limited' THEN 3
    ELSE 0
END,
dispute_score = CASE
    WHEN consensus_status = 'disputed' THEN 4
    ELSE 0
END,
confidence_score = CASE
    WHEN consensus_status = 'verified' THEN 8
    WHEN consensus_status = 'limited' THEN 3
    WHEN consensus_status = 'disputed' THEN 1
    ELSE 0
END,
freshness_score = 1,
last_confirmed_at = CASE
    WHEN consensus_status IN ('limited', 'verified') THEN COALESCE(
        last_confirmed_at,
        (SELECT s.original_updated_at FROM _marker_migration_snapshot s WHERE s.id = markers.id),
        (SELECT s.original_created_at FROM _marker_migration_snapshot s WHERE s.id = markers.id)
    )
    ELSE last_confirmed_at
END;

UPDATE markers
SET expires_at = CASE
    WHEN category IN ('abuse', 'poison', 'trap', 'theft', 'missing_pet', 'suspicious_vehicle')
        THEN datetime(COALESCE(
            last_confirmed_at,
            (SELECT s.original_created_at FROM _marker_migration_snapshot s WHERE s.id = markers.id)
        ), '+14 days')
    WHEN category IN ('station', 'food_bank', 'friendly_clinic', 'helper', 'trap_support')
        THEN datetime(COALESCE(
            last_confirmed_at,
            (SELECT s.original_created_at FROM _marker_migration_snapshot s WHERE s.id = markers.id)
        ), '+120 days')
    ELSE datetime(COALESCE(
        last_confirmed_at,
        (SELECT s.original_created_at FROM _marker_migration_snapshot s WHERE s.id = markers.id)
    ), '+30 days')
END;

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

INSERT INTO reputation_profiles (
    fingerprint,
    trust_score,
    trust_level,
    successful_submissions,
    failed_submissions,
    last_active_at
)
SELECT
    fingerprint,
    CASE
        WHEN consensus_status = 'verified' THEN 5
        WHEN consensus_status = 'limited' THEN 2
        WHEN consensus_status = 'disputed' THEN -2
        ELSE 0
    END AS trust_score,
    CASE
        WHEN consensus_status = 'verified' THEN 'L1'
        ELSE 'L0'
    END AS trust_level,
    CASE
        WHEN consensus_status = 'verified' THEN 1
        ELSE 0
    END AS successful_submissions,
    CASE
        WHEN consensus_status = 'disputed' THEN 1
        ELSE 0
    END AS failed_submissions,
    (SELECT s.original_updated_at FROM _marker_migration_snapshot s WHERE s.id = markers.id)
FROM markers
WHERE fingerprint IS NOT NULL
ON CONFLICT(fingerprint) DO NOTHING;

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

INSERT INTO reputation_events (
    fingerprint,
    event_type,
    delta,
    reason,
    related_marker_id,
    created_at
)
SELECT
    fingerprint,
    'submission_backfill',
    CASE
        WHEN consensus_status = 'verified' THEN 5
        WHEN consensus_status = 'limited' THEN 2
        WHEN consensus_status = 'disputed' THEN -2
        ELSE 0
    END,
    'backfilled from pre-community-governance review state',
    id,
    (SELECT s.original_updated_at FROM _marker_migration_snapshot s WHERE s.id = markers.id)
FROM markers
WHERE fingerprint IS NOT NULL;

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

CREATE INDEX IF NOT EXISTS idx_markers_consensus_status
ON markers (consensus_status, category, expires_at);

CREATE INDEX IF NOT EXISTS idx_markers_expires_at
ON markers (expires_at, consensus_status);

DROP TABLE _marker_migration_snapshot;

PRAGMA foreign_keys = ON;

COMMIT;
