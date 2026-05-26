package firefly

import (
	"context"
	"database/sql"
	_ "embed"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schemaSQL string

//go:embed migration_community_governance.sql
var communityGovernanceMigrationSQL string

type Store struct {
	db *sql.DB
}

func NewStore(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(4)
	db.SetConnMaxLifetime(0)

	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) Init() error {
	ctx := context.Background()
	exists, err := s.tableExists(ctx, "markers")
	if err != nil {
		return err
	}
	if !exists {
		if _, err := s.db.Exec(schemaSQL); err != nil {
			return err
		}
		if err := s.seedIfEmpty(ctx); err != nil {
			return err
		}
		return s.seedSponsorsIfEmpty(ctx)
	}
	if err := s.ensureSchemaUpgrades(ctx); err != nil {
		return err
	}
	if err := s.ensureCommunityGovernance(ctx); err != nil {
		return err
	}
	if _, err := s.db.Exec(schemaSQL); err != nil {
		return err
	}
	if err := s.seedIfEmpty(ctx); err != nil {
		return err
	}
	return s.seedSponsorsIfEmpty(ctx)
}

func (s *Store) tableExists(ctx context.Context, table string) (bool, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM sqlite_master
		WHERE type = 'table' AND name = ?
	`, table).Scan(&count)
	return count > 0, err
}

func (s *Store) ensureSchemaUpgrades(ctx context.Context) error {
	rows, err := s.db.QueryContext(ctx, `PRAGMA table_info(markers)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	columns := map[string]bool{}
	for rows.Next() {
		var cid int
		var name, dataType string
		var notNull, pk int
		var defaultValue sql.NullString
		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk); err != nil {
			return err
		}
		columns[name] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if !columns["media_thumb_url"] {
		if _, err := s.db.ExecContext(ctx, `ALTER TABLE markers ADD COLUMN media_thumb_url TEXT`); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) ensureCommunityGovernance(ctx context.Context) error {
	rows, err := s.db.QueryContext(ctx, `PRAGMA table_info(markers)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	hasConsensus := false
	for rows.Next() {
		var cid int
		var name, dataType string
		var notNull, pk int
		var defaultValue sql.NullString
		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk); err != nil {
			return err
		}
		if name == "consensus_status" {
			hasConsensus = true
			break
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if hasConsensus {
		return nil
	}
	if _, err := s.db.ExecContext(ctx, communityGovernanceMigrationSQL); err != nil {
		return err
	}
	return nil
}

func (s *Store) seedIfEmpty(ctx context.Context) error {
	var count int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM markers`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	seeds := []MarkerInput{
		{
			Category:         "poison",
			Title:            "毒猫粮多发区",
			Address:          "深圳市福田区某公园北门附近",
			Description:      "近期多名喂养人反馈草丛中发现不明肉块，请路过时提高警惕。",
			Visibility:       "public",
			SourceLocale:     "zh-CN",
			PublicLatitude:   22.5438,
			PublicLongitude:  114.0582,
			PrivateLatitude:  22.5438,
			PrivateLongitude: 114.0582,
			Fingerprint:      "seed-risk-1",
		},
		{
			Category:         "theft",
			Title:            "可疑面包车出没",
			Address:          "深圳市南山区 XX 路口",
			Description:      "晚间多次有无牌面包车停留，附近宠物主请留意牵引与看护。",
			Visibility:       "public",
			SourceLocale:     "zh-CN",
			PublicLatitude:   22.5485,
			PublicLongitude:  114.0554,
			PrivateLatitude:  22.5485,
			PrivateLongitude: 114.0554,
			Fingerprint:      "seed-risk-2",
		},
		{
			Category:         "station",
			Title:            "阿明的小动物救助站",
			Address:          "深圳市南山区某社区周边",
			Description:      "可接收流浪猫临时中转，当前急需猫粮与绝育术后护理帮助。",
			ContactInfo:      "站内联系优先",
			Visibility:       "masked",
			SourceLocale:     "zh-CN",
			PublicLatitude:   22.5492,
			PublicLongitude:  114.0546,
			PrivateLatitude:  22.5489,
			PrivateLongitude: 114.0550,
			Fingerprint:      "seed-help-1",
		},
		{
			Category:         "friendly_clinic",
			Title:            "友好宠物医院",
			Address:          "深圳市福田区某街区",
			Description:      "支持流浪动物基础检查和紧急伤口处理，可先电话说明情况。",
			ContactInfo:      "站内联系后可见",
			Visibility:       "masked",
			SourceLocale:     "zh-CN",
			PublicLatitude:   22.5418,
			PublicLongitude:  114.0617,
			PrivateLatitude:  22.5414,
			PrivateLongitude: 114.0611,
			Fingerprint:      "seed-help-2",
		},
	}

	for _, seed := range seeds {
		id, err := s.CreateMarker(ctx, seed)
		if err != nil {
			return err
		}
		if err := s.setSeedConsensus(ctx, id, seed.Category); err != nil {
			return err
		}
		if seed.Category == "station" {
			if err := s.UpsertTranslation(ctx, id, MarkerTranslation{
				Locale:      "en",
				Title:       "Amin Rescue Station",
				Address:     "Near a residential block, Nanshan District, Shenzhen",
				Description: "Temporary shelter for stray cats, urgently needs cat food and post-op care support.",
			}); err != nil {
				return err
			}
			if err := s.UpsertTranslation(ctx, id, MarkerTranslation{
				Locale:      "hi",
				Title:       "अमिन रेस्क्यू स्टेशन",
				Address:     "शेन्ज़ेन के नानशान ज़िले के एक आवासीय क्षेत्र के पास",
				Description: "आवारा बिल्लियों के लिए अस्थायी आश्रय, बिल्ली के खाने और ऑपरेशन के बाद देखभाल की ज़रूरत है।",
			}); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Store) setSeedConsensus(ctx context.Context, markerID int64, category string) error {
	now := time.Now().UTC()
	expires := now.Add(14 * 24 * time.Hour)
	if isHelpCategory(category) {
		expires = now.Add(120 * 24 * time.Hour)
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE markers
		SET review_status = 'approved',
		    consensus_status = 'verified',
		    confidence_score = 8,
		    support_score = 8,
		    dispute_score = 0,
		    freshness_score = 1,
		    first_seen_at = COALESCE(first_seen_at, created_at),
		    last_confirmed_at = COALESCE(last_confirmed_at, created_at),
		    expires_at = ?
		WHERE id = ?
	`, expires, markerID)
	return err
}

func (s *Store) CreateMarker(ctx context.Context, input MarkerInput) (int64, error) {
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO markers (
			category, title, public_latitude, public_longitude,
			private_latitude, private_longitude, address, description,
			contact_info, media_url, media_thumb_url, source_locale, fingerprint, visibility, review_status, consensus_status,
			confidence_score, support_score, dispute_score, freshness_score, first_seen_at, last_confirmed_at, expires_at, status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', 0, 0, 0, 1, CURRENT_TIMESTAMP, NULL, NULL, 1)
	`,
		input.Category,
		input.Title,
		input.PublicLatitude,
		input.PublicLongitude,
		input.PrivateLatitude,
		input.PrivateLongitude,
		input.Address,
		input.Description,
		nullIfEmpty(input.ContactInfo),
		nullIfEmpty(input.MediaURL),
		nullIfEmpty(input.MediaThumbURL),
		defaultLocale(input.SourceLocale),
		input.Fingerprint,
		defaultVisibility(input.Visibility),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) ListMarkers(ctx context.Context, query MarkerQuery) ([]Marker, error) {
	base := `
		SELECT id, category, title, public_latitude, public_longitude, private_latitude, private_longitude,
		       address, description, contact_info, media_url, media_thumb_url, source_locale, visibility,
		       review_status, consensus_status, confidence_score, support_score, dispute_score, freshness_score,
		       first_seen_at, last_confirmed_at, expires_at, status, created_at, updated_at
		FROM markers
		WHERE status = 1
	`
	args := []any{}
	if query.AdminView && query.ReviewStatus != "" {
		base += " AND review_status = ?"
		args = append(args, query.ReviewStatus)
	}
	if len(query.Types) > 0 {
		placeholders := make([]string, 0, len(query.Types))
		for _, t := range query.Types {
			placeholders = append(placeholders, "?")
			args = append(args, t)
		}
		base += " AND category IN (" + strings.Join(placeholders, ",") + ")"
	}
	base += " ORDER BY created_at DESC LIMIT ?"
	limit := query.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	args = append(args, limit*5)

	rows, err := s.db.QueryContext(ctx, base, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	markers := make([]Marker, 0)
	for rows.Next() {
		marker, err := scanMarkerRow(rows)
		if err != nil {
			return nil, err
		}
		marker.Locale = marker.SourceLocale
		if !query.AdminView {
			if isHelpCategory(marker.Category) && marker.Visibility != "public" {
				marker.ContactInfo = nil
			} else if !isHelpCategory(marker.Category) {
				marker.ContactInfo = nil
			}
		}
		marker.DistanceMeters = distanceMeters(query.Lat, query.Lng, marker.PrivateLatitude, marker.PrivateLongitude)
		if query.RadiusMeters > 0 && marker.DistanceMeters > query.RadiusMeters {
			continue
		}
		if translated, ok, err := s.lookupTranslation(ctx, marker.ID, normalizeLocale(query.Locale)); err != nil {
			return nil, err
		} else if ok {
			marker.Title = translated.Title
			marker.Address = translated.Address
			marker.Description = translated.Description
			marker.Locale = translated.Locale
			marker.IsTranslated = translated.Locale != marker.SourceLocale
		}
		markers = append(markers, marker)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if err := s.attachFeedbackSummaries(ctx, markers); err != nil {
		return nil, err
	}

	sort.Slice(markers, func(i, j int) bool {
		return markers[i].DistanceMeters < markers[j].DistanceMeters
	})

	if len(markers) > limit {
		markers = markers[:limit]
	}
	return markers, nil
}

func (s *Store) GetMarker(ctx context.Context, id int64, locale string, adminView bool) (*Marker, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, category, title, public_latitude, public_longitude, private_latitude, private_longitude,
		       address, description, contact_info, media_url, media_thumb_url, source_locale, visibility,
		       review_status, consensus_status, confidence_score, support_score, dispute_score, freshness_score,
		       first_seen_at, last_confirmed_at, expires_at, status, created_at, updated_at
		FROM markers
		WHERE id = ?
	`, id)

	marker, err := scanMarkerRow(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	marker.Locale = marker.SourceLocale
	if !adminView && isHelpCategory(marker.Category) && marker.Visibility != "public" {
		marker.ContactInfo = nil
	}
	if !adminView && !isHelpCategory(marker.Category) {
		marker.ContactInfo = nil
	}
	if translated, ok, err := s.lookupTranslation(ctx, marker.ID, normalizeLocale(locale)); err != nil {
		return nil, err
	} else if ok {
		marker.Title = translated.Title
		marker.Address = translated.Address
		marker.Description = translated.Description
		marker.Locale = translated.Locale
		marker.IsTranslated = translated.Locale != marker.SourceLocale
	}
	if summary, err := s.GetFeedbackSummary(ctx, marker.ID); err != nil {
		return nil, err
	} else {
		marker.FeedbackSummary = summary
	}
	marker.AvailableFeedbackActions = availableFeedbackActions(marker.Category)
	if marker.DistanceMeters == 0 {
		marker.DistanceMeters = 0
	}
	return &marker, nil
}

func scanMarkerRow(scanner interface {
	Scan(dest ...any) error
}) (Marker, error) {
	var marker Marker
	var contact sql.NullString
	var media sql.NullString
	var mediaThumb sql.NullString
	var firstSeen sql.NullTime
	var lastConfirmed sql.NullTime
	var expiresAt sql.NullTime
	if err := scanner.Scan(
		&marker.ID,
		&marker.Category,
		&marker.Title,
		&marker.Latitude,
		&marker.Longitude,
		&marker.PrivateLatitude,
		&marker.PrivateLongitude,
		&marker.Address,
		&marker.Description,
		&contact,
		&media,
		&mediaThumb,
		&marker.SourceLocale,
		&marker.Visibility,
		&marker.ReviewStatus,
		&marker.ConsensusStatus,
		&marker.ConfidenceScore,
		&marker.SupportScore,
		&marker.DisputeScore,
		&marker.FreshnessScore,
		&firstSeen,
		&lastConfirmed,
		&expiresAt,
		&marker.Status,
		&marker.CreatedAt,
		&marker.UpdatedAt,
	); err != nil {
		return Marker{}, err
	}
	if contact.Valid {
		marker.ContactInfo = &contact.String
	}
	if media.Valid {
		marker.MediaURL = &media.String
	}
	if mediaThumb.Valid {
		marker.MediaThumbURL = &mediaThumb.String
	}
	if firstSeen.Valid {
		marker.FirstSeenAt = &firstSeen.Time
	}
	if lastConfirmed.Valid {
		marker.LastConfirmedAt = &lastConfirmed.Time
	}
	if expiresAt.Valid {
		marker.ExpiresAt = &expiresAt.Time
	}
	return marker, nil
}

func (s *Store) attachFeedbackSummaries(ctx context.Context, markers []Marker) error {
	if len(markers) == 0 {
		return nil
	}
	ids := make([]int64, 0, len(markers))
	for _, marker := range markers {
		ids = append(ids, marker.ID)
	}
	summaries, err := s.loadFeedbackSummaries(ctx, ids)
	if err != nil {
		return err
	}
	for i := range markers {
		if summary, ok := summaries[markers[i].ID]; ok {
			markers[i].FeedbackSummary = summary
		}
	}
	return nil
}

func (s *Store) loadFeedbackSummaries(ctx context.Context, ids []int64) (map[int64]FeedbackSummary, error) {
	out := map[int64]FeedbackSummary{}
	if len(ids) == 0 {
		return out, nil
	}
	placeholders := make([]string, 0, len(ids))
	args := make([]any, 0, len(ids))
	for _, id := range ids {
		placeholders = append(placeholders, "?")
		args = append(args, id)
	}
	query := fmt.Sprintf(`
		SELECT marker_id,
		       SUM(CASE WHEN action = 'confirm_valid' THEN 1 ELSE 0 END),
		       SUM(CASE WHEN action = 'mark_doubtful' THEN 1 ELSE 0 END),
		       SUM(CASE WHEN action = 'mark_outdated' THEN 1 ELSE 0 END),
		       SUM(CASE WHEN action = 'seen_similar' THEN 1 ELSE 0 END),
		       SUM(CASE WHEN action = 'not_found_on_site' THEN 1 ELSE 0 END),
		       SUM(CASE WHEN action = 'contact_success' THEN 1 ELSE 0 END),
		       SUM(CASE WHEN action = 'service_completed' THEN 1 ELSE 0 END),
		       SUM(CASE WHEN action = 'contact_failed' THEN 1 ELSE 0 END)
		FROM marker_feedback
		WHERE marker_id IN (%s)
		GROUP BY marker_id
	`, strings.Join(placeholders, ","))
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var markerID int64
		var summary FeedbackSummary
		var confirm, doubtful, outdated, seen, notFound, contactSuccess, serviceCompleted, contactFailed sql.NullInt64
		if err := rows.Scan(&markerID, &confirm, &doubtful, &outdated, &seen, &notFound, &contactSuccess, &serviceCompleted, &contactFailed); err != nil {
			return nil, err
		}
		summary.ConfirmValid = int(confirm.Int64)
		if confirm.Valid == false {
			summary.ConfirmValid = 0
		}
		summary.MarkDoubtful = int(doubtful.Int64)
		summary.MarkOutdated = int(outdated.Int64)
		summary.SeenSimilar = int(seen.Int64)
		summary.NotFoundOnSite = int(notFound.Int64)
		summary.ContactSuccess = int(contactSuccess.Int64)
		summary.ServiceCompleted = int(serviceCompleted.Int64)
		summary.ContactFailed = int(contactFailed.Int64)
		out[markerID] = summary
	}
	return out, rows.Err()
}

func (s *Store) GetFeedbackSummary(ctx context.Context, markerID int64) (FeedbackSummary, error) {
	summaries, err := s.loadFeedbackSummaries(ctx, []int64{markerID})
	if err != nil {
		return FeedbackSummary{}, err
	}
	if summary, ok := summaries[markerID]; ok {
		return summary, nil
	}
	return FeedbackSummary{}, nil
}

func (s *Store) RecordFeedback(ctx context.Context, input MarkerFeedbackInput) (MarkerFeedbackResult, error) {
	marker, err := s.GetMarker(ctx, input.MarkerID, input.Locale, true)
	if err != nil {
		return MarkerFeedbackResult{}, err
	}

	profile, err := s.ensureReputationProfile(ctx, input.Fingerprint)
	if err != nil {
		return MarkerFeedbackResult{}, err
	}

	proximityScore := 0.25
	if input.ActorLatitude != nil && input.ActorLongitude != nil {
		dist := distanceMeters(*input.ActorLatitude, *input.ActorLongitude, marker.PrivateLatitude, marker.PrivateLongitude)
		proximityScore = math.Max(0.1, 1-(dist/5000))
	}
	actionFactor := actionFactor(input.Action)
	trustSnapshot := profile.TrustScore
	trustMultiplier := 1 + (trustSnapshot / 10)
	weightScore := trustMultiplier * proximityScore * actionFactor

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return MarkerFeedbackResult{}, err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO marker_feedback (
			marker_id, fingerprint, locale, action, note, actor_latitude, actor_longitude,
			proximity_score, trust_snapshot, weight_score
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(marker_id, fingerprint, action) DO UPDATE SET
			locale = excluded.locale,
			note = excluded.note,
			actor_latitude = excluded.actor_latitude,
			actor_longitude = excluded.actor_longitude,
			proximity_score = excluded.proximity_score,
			trust_snapshot = excluded.trust_snapshot,
			weight_score = excluded.weight_score,
			created_at = CURRENT_TIMESTAMP
	`, input.MarkerID, input.Fingerprint, normalizeLocale(input.Locale), input.Action, nullIfEmpty(input.Note), input.ActorLatitude, input.ActorLongitude, proximityScore, trustSnapshot, weightScore)
	if err != nil {
		return MarkerFeedbackResult{}, err
	}

	if err := s.recomputeMarkerConsensusTx(ctx, tx, input.MarkerID); err != nil {
		return MarkerFeedbackResult{}, err
	}
	if err := s.adjustReputationTx(ctx, tx, input.Fingerprint, input.Action, weightScore, input.MarkerID); err != nil {
		return MarkerFeedbackResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return MarkerFeedbackResult{}, err
	}

	summary, err := s.GetFeedbackSummary(ctx, input.MarkerID)
	if err != nil {
		return MarkerFeedbackResult{}, err
	}
	refreshed, err := s.GetMarker(ctx, input.MarkerID, input.Locale, true)
	if err != nil {
		return MarkerFeedbackResult{}, err
	}
	return MarkerFeedbackResult{
		MarkerID:        input.MarkerID,
		Action:          input.Action,
		WeightScore:     weightScore,
		ConsensusStatus: refreshed.ConsensusStatus,
		ConfidenceScore: refreshed.ConfidenceScore,
		FeedbackSummary: summary,
	}, nil
}

func (s *Store) recomputeMarkerConsensusTx(ctx context.Context, tx *sql.Tx, markerID int64) error {
	var marker Marker
	var contact sql.NullString
	var media sql.NullString
	var mediaThumb sql.NullString
	var firstSeen sql.NullTime
	var lastConfirmed sql.NullTime
	var expiresAt sql.NullTime
	row := tx.QueryRowContext(ctx, `
		SELECT id, category, title, public_latitude, public_longitude, private_latitude, private_longitude,
		       address, description, contact_info, media_url, media_thumb_url, source_locale, visibility,
		       review_status, consensus_status, confidence_score, support_score, dispute_score, freshness_score,
		       first_seen_at, last_confirmed_at, expires_at, status, created_at, updated_at
		FROM markers
		WHERE id = ?
	`, markerID)
	if err := row.Scan(
		&marker.ID,
		&marker.Category,
		&marker.Title,
		&marker.Latitude,
		&marker.Longitude,
		&marker.PrivateLatitude,
		&marker.PrivateLongitude,
		&marker.Address,
		&marker.Description,
		&contact,
		&media,
		&mediaThumb,
		&marker.SourceLocale,
		&marker.Visibility,
		&marker.ReviewStatus,
		&marker.ConsensusStatus,
		&marker.ConfidenceScore,
		&marker.SupportScore,
		&marker.DisputeScore,
		&marker.FreshnessScore,
		&firstSeen,
		&lastConfirmed,
		&expiresAt,
		&marker.Status,
		&marker.CreatedAt,
		&marker.UpdatedAt,
	); err != nil {
		return err
	}
	if contact.Valid {
		marker.ContactInfo = &contact.String
	}
	if media.Valid {
		marker.MediaURL = &media.String
	}
	if mediaThumb.Valid {
		marker.MediaThumbURL = &mediaThumb.String
	}
	if firstSeen.Valid {
		marker.FirstSeenAt = &firstSeen.Time
	}
	if lastConfirmed.Valid {
		marker.LastConfirmedAt = &lastConfirmed.Time
	}
	if expiresAt.Valid {
		marker.ExpiresAt = &expiresAt.Time
	}

	summary, err := s.GetFeedbackSummary(ctx, markerID)
	if err != nil {
		return err
	}

	support := float64(summary.ConfirmValid)*1.2 + float64(summary.SeenSimilar)*0.7 + float64(summary.ContactSuccess)*1.0 + float64(summary.ServiceCompleted)*1.4
	dispute := float64(summary.MarkDoubtful)*1.1 + float64(summary.MarkOutdated)*1.0 + float64(summary.NotFoundOnSite)*0.9 + float64(summary.ContactFailed)*0.8
	confidence := math.Max(0, support-dispute)

	now := time.Now().UTC()
	newStatus := marker.ConsensusStatus
	if marker.ExpiresAt != nil && now.After(*marker.ExpiresAt) && confidence < 2 {
		newStatus = "expired"
	} else if confidence >= 6 {
		newStatus = "verified"
	} else if confidence >= 2 {
		newStatus = "limited"
	} else if dispute > support && dispute >= 1 {
		newStatus = "disputed"
	} else if marker.ConsensusStatus == "" {
		newStatus = "pending"
	}

	freshness := 1.0
	baseTime := marker.CreatedAt
	if marker.LastConfirmedAt != nil {
		baseTime = *marker.LastConfirmedAt
	}
	ageHours := now.Sub(baseTime).Hours()
	switch {
	case ageHours <= 24:
		freshness = 1
	case ageHours <= 72:
		freshness = 0.8
	case ageHours <= 168:
		freshness = 0.5
	default:
		freshness = 0.2
	}

	lastConfirmedAt := marker.LastConfirmedAt
	if support > dispute {
		lastConfirmedAt = &now
	}
	expiresAtTime := computeExpiry(marker.Category, baseTime)
	if lastConfirmedAt != nil {
		expiresAtTime = computeExpiry(marker.Category, *lastConfirmedAt)
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE markers
		SET consensus_status = ?,
		    confidence_score = ?,
		    support_score = ?,
		    dispute_score = ?,
		    freshness_score = ?,
		    first_seen_at = COALESCE(first_seen_at, ?),
		    last_confirmed_at = ?,
		    expires_at = ?
		WHERE id = ?
	`, newStatus, confidence, support, dispute, freshness, marker.CreatedAt, lastConfirmedAt, expiresAtTime, markerID)
	return err
}

func computeExpiry(category string, base time.Time) time.Time {
	if isHelpCategory(category) {
		return base.Add(120 * 24 * time.Hour)
	}
	return base.Add(14 * 24 * time.Hour)
}

func (s *Store) adjustReputationTx(ctx context.Context, tx *sql.Tx, fingerprint, action string, weightScore float64, markerID int64) error {
	profile, err := s.ensureReputationProfileTx(ctx, tx, fingerprint)
	if err != nil {
		return err
	}

	delta := weightScore
	if action == "mark_doubtful" || action == "mark_outdated" || action == "not_found_on_site" || action == "contact_failed" {
		delta = -math.Abs(weightScore)
	}
	if action == "contact_success" || action == "service_completed" {
		delta = math.Abs(weightScore) * 1.2
	}
	newTrust := profile.TrustScore + delta
	if newTrust < 0 {
		newTrust = 0
	}
	level := trustLevelForScore(newTrust)

	successfulFlags := profile.SuccessfulFlags
	failedFlags := profile.FailedFlags
	if delta >= 0 {
		successfulFlags++
	} else {
		failedFlags++
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE reputation_profiles
		SET trust_score = ?,
		    trust_level = ?,
		    successful_flags = ?,
		    failed_flags = ?,
		    last_active_at = CURRENT_TIMESTAMP
		WHERE fingerprint = ?
	`, newTrust, level, successfulFlags, failedFlags, fingerprint)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO reputation_events (fingerprint, event_type, delta, reason, related_marker_id)
		VALUES (?, ?, ?, ?, ?)
	`, fingerprint, "feedback:"+action, delta, "community feedback applied", markerID)
	return err
}

func (s *Store) ensureReputationProfile(ctx context.Context, fingerprint string) (ReputationProfile, error) {
	return s.ensureReputationProfileTx(ctx, nil, fingerprint)
}

func (s *Store) ensureReputationProfileTx(ctx context.Context, tx *sql.Tx, fingerprint string) (ReputationProfile, error) {
	var profile ReputationProfile
	var activityCity sql.NullString
	var lastActive sql.NullTime
	scanProfile := func(row *sql.Row) error {
		return row.Scan(
			&profile.ID,
			&profile.Fingerprint,
			&profile.TrustScore,
			&profile.TrustLevel,
			&profile.SuccessfulSubmissions,
			&profile.FailedSubmissions,
			&profile.SuccessfulFlags,
			&profile.FailedFlags,
			&activityCity,
			&lastActive,
			&profile.CreatedAt,
			&profile.UpdatedAt,
		)
	}

	var err error
	if tx != nil {
		err = scanProfile(tx.QueryRowContext(ctx, `
			SELECT id, fingerprint, trust_score, trust_level, successful_submissions, failed_submissions,
			       successful_flags, failed_flags, activity_city, last_active_at, created_at, updated_at
			FROM reputation_profiles
			WHERE fingerprint = ?
		`, fingerprint))
	} else {
		err = scanProfile(s.db.QueryRowContext(ctx, `
			SELECT id, fingerprint, trust_score, trust_level, successful_submissions, failed_submissions,
			       successful_flags, failed_flags, activity_city, last_active_at, created_at, updated_at
			FROM reputation_profiles
			WHERE fingerprint = ?
		`, fingerprint))
	}
	if err == nil {
		if activityCity.Valid {
			profile.ActivityCity = &activityCity.String
		}
		if lastActive.Valid {
			profile.LastActiveAt = &lastActive.Time
		}
		return profile, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return ReputationProfile{}, err
	}

	if tx != nil {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO reputation_profiles (fingerprint, trust_score, trust_level)
			VALUES (?, 1, 'L0')
		`, fingerprint)
	} else {
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO reputation_profiles (fingerprint, trust_score, trust_level)
			VALUES (?, 1, 'L0')
		`, fingerprint)
	}
	if err != nil {
		return ReputationProfile{}, err
	}
	return s.ensureReputationProfileTx(ctx, tx, fingerprint)
}

func trustLevelForScore(score float64) string {
	switch {
	case score >= 30:
		return "L3"
	case score >= 15:
		return "L2"
	case score >= 5:
		return "L1"
	default:
		return "L0"
	}
}

func actionFactor(action string) float64 {
	switch action {
	case "confirm_valid", "contact_success":
		return 1.0
	case "seen_similar":
		return 0.7
	case "service_completed":
		return 1.4
	case "mark_doubtful":
		return -1.1
	case "mark_outdated":
		return -1.0
	case "not_found_on_site":
		return -0.9
	case "contact_failed":
		return -0.8
	default:
		return 0.5
	}
}

func (s *Store) GetReputationProfile(ctx context.Context, fingerprint string) (ReputationProfile, error) {
	profile, err := s.ensureReputationProfile(ctx, fingerprint)
	if err != nil {
		return ReputationProfile{}, err
	}
	return profile, nil
}

func (s *Store) ListReputationEvents(ctx context.Context, fingerprint string, limit int) ([]ReputationEvent, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, event_type, delta, reason, related_marker_id, created_at
		FROM reputation_events
		WHERE fingerprint = ?
		ORDER BY created_at DESC
		LIMIT ?
	`, fingerprint, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ReputationEvent, 0)
	for rows.Next() {
		var event ReputationEvent
		var related sql.NullInt64
		if err := rows.Scan(&event.ID, &event.EventType, &event.Delta, &event.Reason, &related, &event.CreatedAt); err != nil {
			return nil, err
		}
		if related.Valid {
			event.RelatedMarkerID = &related.Int64
		}
		out = append(out, event)
	}
	return out, rows.Err()
}

func (s *Store) ListMarkerActivity(ctx context.Context, fingerprint string, limit int) ([]MarkerActivity, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT marker_id, action, note, weight_score, created_at
		FROM marker_feedback
		WHERE fingerprint = ?
		ORDER BY created_at DESC
		LIMIT ?
	`, fingerprint, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]MarkerActivity, 0)
	for rows.Next() {
		var activity MarkerActivity
		if err := rows.Scan(&activity.ID, &activity.FeedbackAction, &activity.FeedbackNote, &activity.WeightScore, &activity.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, activity)
	}
	return out, rows.Err()
}

func (s *Store) ListSubmittedMarkers(ctx context.Context, fingerprint, locale string, limit int) ([]Marker, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, category, title, public_latitude, public_longitude, private_latitude, private_longitude,
		       address, description, contact_info, media_url, media_thumb_url, source_locale, visibility,
		       review_status, consensus_status, confidence_score, support_score, dispute_score, freshness_score,
		       first_seen_at, last_confirmed_at, expires_at, status, created_at, updated_at
		FROM markers
		WHERE fingerprint = ?
		ORDER BY created_at DESC
		LIMIT ?
	`, fingerprint, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Marker, 0)
	for rows.Next() {
		marker, err := scanMarkerRow(rows)
		if err != nil {
			return nil, err
		}
		marker.Locale = marker.SourceLocale
		if translated, ok, err := s.lookupTranslation(ctx, marker.ID, normalizeLocale(locale)); err != nil {
			return nil, err
		} else if ok {
			marker.Title = translated.Title
			marker.Address = translated.Address
			marker.Description = translated.Description
			marker.Locale = translated.Locale
			marker.IsTranslated = translated.Locale != marker.SourceLocale
		}
		out = append(out, marker)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := s.attachFeedbackSummaries(ctx, out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *Store) CreateGovernanceEscalation(ctx context.Context, markerID int64, escalationType, triggerReason string) (int64, error) {
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO governance_escalations (marker_id, escalation_type, trigger_reason)
		VALUES (?, ?, ?)
	`, markerID, escalationType, triggerReason)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) CreateReport(ctx context.Context, markerID int64, reason, note, fingerprint string) (int64, error) {
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO marker_reports (marker_id, reason, note, fingerprint)
		VALUES (?, ?, ?, ?)
	`, markerID, reason, nullIfEmpty(note), fingerprint)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateReviewStatus(ctx context.Context, markerID int64, action, note, operator string) error {
	status := ""
	consensus := ""
	switch action {
	case "approve":
		status = "approved"
		consensus = "verified"
	case "reject":
		status = "rejected"
		consensus = "disputed"
	case "hide":
		status = "hidden"
		consensus = "disputed"
	case "restore":
		status = "approved"
		consensus = "verified"
	default:
		return fmt.Errorf("unknown action: %s", action)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `UPDATE markers SET review_status = ?, consensus_status = ? WHERE id = ?`, status, consensus, markerID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO review_logs (marker_id, action, operator_id, note) VALUES (?, ?, ?, ?)`, markerID, action, operator, nullIfEmpty(note)); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) UpsertTranslation(ctx context.Context, markerID int64, input MarkerTranslation) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO marker_translations (marker_id, locale, title, address, description)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(marker_id, locale)
		DO UPDATE SET title = excluded.title, address = excluded.address, description = excluded.description
	`, markerID, normalizeLocale(input.Locale), input.Title, input.Address, input.Description)
	return err
}

func (s *Store) lookupTranslation(ctx context.Context, markerID int64, locale string) (MarkerTranslation, bool, error) {
	if locale == "" || locale == "zh-CN" {
		return MarkerTranslation{}, false, nil
	}
	row := s.db.QueryRowContext(ctx, `
		SELECT id, marker_id, locale, title, address, description, created_at, updated_at
		FROM marker_translations
		WHERE marker_id = ? AND locale = ?
	`, markerID, locale)
	var t MarkerTranslation
	if err := row.Scan(&t.ID, &t.MarkerID, &t.Locale, &t.Title, &t.Address, &t.Description, &t.CreatedAt, &t.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return MarkerTranslation{}, false, nil
		}
		return MarkerTranslation{}, false, err
	}
	return t, true, nil
}

var ErrNotFound = errors.New("not found")

func nullIfEmpty(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func normalizeLocale(locale string) string {
	switch strings.ToLower(strings.TrimSpace(locale)) {
	case "en", "en-us", "en-gb":
		return "en"
	case "hi", "hi-in":
		return "hi"
	default:
		return "zh-CN"
	}
}

func defaultVisibility(value string) string {
	switch value {
	case "public", "masked", "private":
		return value
	default:
		return "public"
	}
}

func defaultLocale(value string) string {
	return normalizeLocale(value)
}

func isHelpCategory(category string) bool {
	switch category {
	case "station", "food_bank", "friendly_clinic", "helper", "trap_support":
		return true
	default:
		return false
	}
}

func availableFeedbackActions(category string) []string {
	if isHelpCategory(category) {
		return []string{"contact_success", "service_completed", "contact_failed", "confirm_valid", "mark_outdated", "seen_similar"}
	}
	return []string{"confirm_valid", "mark_doubtful", "mark_outdated", "seen_similar", "not_found_on_site"}
}

func distanceMeters(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371000.0
	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadius * c
}

func roundedMask(lat, lng float64, markerID int64) (float64, float64) {
	offset := float64((markerID%5)+1) * 0.00018
	return lat + offset, lng - offset
}
