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
    source_locale TEXT NOT NULL DEFAULT 'zh-CN',
    fingerprint TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    review_status TEXT NOT NULL DEFAULT 'pending',
    status INTEGER NOT NULL DEFAULT 1,
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
    CHECK (status IN (0, 1)),
    CHECK (source_locale IN ('zh-CN', 'en', 'hi'))
);

CREATE INDEX IF NOT EXISTS idx_markers_category_status
ON markers (category, status, review_status);

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
