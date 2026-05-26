package firefly

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"hash/fnv"
	"math"
	"sort"
	"strings"
	"time"
)

type sponsorCandidate struct {
	sponsor            Sponsor
	campaign           SponsorCampaign
	distanceMeters     float64
	sceneMatchScore    int
	isOpenNow          bool
	dismissCountToday  int
	primarySeenToday   int
	secondarySeenToday int
}

type SponsorAdminFilters struct {
	CityCode     string
	Status       string
	BusinessType string
	Keyword      string
}

type SponsorCampaignFilters struct {
	SponsorID int64
	Status    string
	CityCode  string
}

var (
	errSponsorNotFound          = errors.New("sponsor not found")
	errSponsorArchiveRequired   = errors.New("archive sponsor before deleting")
	errCampaignNotFound         = errors.New("campaign not found")
	errCampaignArchiveRequired  = errors.New("archive campaign before deleting")
)

func (s *Store) seedSponsorsIfEmpty(ctx context.Context) error {
	exists, err := s.tableExists(ctx, "sponsors")
	if err != nil {
		return err
	}
	if !exists {
		return nil
	}

	var count int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sponsors`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	now := time.Now().UTC()
	startAt := now.Add(-24 * time.Hour)
	endAt := now.Add(180 * 24 * time.Hour)

	seeds := []struct {
		sponsor  Sponsor
		campaign SponsorCampaign
	}{
		{
			sponsor: Sponsor{
				BrandKey:     "night-clinic-nanshan",
				Name:         "南山夜间友好医院",
				BusinessType: "clinic",
				Title:        "附近补给合作点",
				Description:  "支持夜间急诊评估、基础伤口处理和流浪动物转诊建议。",
				CityCode:     "CN-SZ",
				AreaLabel:    "南山中心片区",
				Latitude:     22.5445,
				Longitude:    114.0574,
				Address:      "深圳市南山区中心片区",
				ServiceTags:  []string{"night_care", "clinic", "risk_support"},
				SponsorBadge: "sponsored",
				IsVerified:   true,
				Status:       "active",
			},
			campaign: SponsorCampaign{
				PackageTier:              "resident_70",
				TargetScene:              "risk",
				CityCode:                 "CN-SZ",
				AreaLabel:                "南山中心片区",
				AreaCenterLat:            22.5431,
				AreaCenterLng:            114.0579,
				AreaRadiusMeters:         5000,
				ShareRatio:               0.7,
				PriorityWeight:           7,
				CityMultiplier:           1.2,
				SceneMultiplier:          1.1,
				MonthlyPriceCents:        79900,
				DailyPrimaryCapPerUser:   2,
				DailySecondaryCapPerUser: 3,
				MaxSecondarySlots:        2,
				StartAt:                  startAt,
				EndAt:                    endAt,
				Status:                   "active",
			},
		},
		{
			sponsor: Sponsor{
				BrandKey:     "cat-food-station",
				Name:         "喵喵补给支持站",
				BusinessType: "food",
				Title:        "附近补给合作点",
				Description:  "提供流浪猫粮补给、简易喂养工具和爱心折扣。",
				CityCode:     "CN-SZ",
				AreaLabel:    "福田北门片区",
				Latitude:     22.5423,
				Longitude:    114.0606,
				Address:      "深圳市福田区北门片区",
				ServiceTags:  []string{"cat_food", "care_support", "discount"},
				SponsorBadge: "sponsored",
				IsVerified:   true,
				Status:       "active",
			},
			campaign: SponsorCampaign{
				PackageTier:              "guard_30",
				TargetScene:              "care",
				CityCode:                 "CN-SZ",
				AreaLabel:                "福田北门片区",
				AreaCenterLat:            22.5431,
				AreaCenterLng:            114.0579,
				AreaRadiusMeters:         5000,
				ShareRatio:               0.3,
				PriorityWeight:           3,
				CityMultiplier:           1.2,
				SceneMultiplier:          1.0,
				MonthlyPriceCents:        39900,
				DailyPrimaryCapPerUser:   2,
				DailySecondaryCapPerUser: 3,
				MaxSecondarySlots:        2,
				StartAt:                  startAt,
				EndAt:                    endAt,
				Status:                   "active",
			},
		},
		{
			sponsor: Sponsor{
				BrandKey:     "rescue-transport-link",
				Name:         "流浪动物运输协作点",
				BusinessType: "transport",
				Title:        "附近补给合作点",
				Description:  "支持临时中转运输协调，帮助连接医院、站点与志愿者。",
				CityCode:     "CN-SZ",
				AreaLabel:    "福田南线片区",
				Latitude:     22.5476,
				Longitude:    114.0548,
				Address:      "深圳市福田区南线片区",
				ServiceTags:  []string{"transport", "care_support", "risk_support"},
				SponsorBadge: "sponsored",
				IsVerified:   true,
				Status:       "active",
			},
			campaign: SponsorCampaign{
				PackageTier:              "guard_30",
				TargetScene:              "both",
				CityCode:                 "CN-SZ",
				AreaLabel:                "福田南线片区",
				AreaCenterLat:            22.5431,
				AreaCenterLng:            114.0579,
				AreaRadiusMeters:         5000,
				ShareRatio:               0.3,
				PriorityWeight:           3,
				CityMultiplier:           1.2,
				SceneMultiplier:          1.3,
				MonthlyPriceCents:        45900,
				DailyPrimaryCapPerUser:   2,
				DailySecondaryCapPerUser: 3,
				MaxSecondarySlots:        2,
				StartAt:                  startAt,
				EndAt:                    endAt,
				Status:                   "active",
			},
		},
	}

	for _, seed := range seeds {
		sponsorID, err := s.CreateSponsor(ctx, seed.sponsor)
		if err != nil {
			return err
		}
		seed.campaign.SponsorID = sponsorID
		if _, err := s.CreateSponsorCampaign(ctx, seed.campaign); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) ListNearbySponsors(ctx context.Context, query SponsorQuery) ([]Sponsor, error) {
	limit := query.Limit
	if limit <= 0 || limit > 5 {
		limit = 3
	}
	if query.RadiusMeters <= 0 {
		query.RadiusMeters = 5000
	}
	scene := normalizeScene(query.Scene)
	fingerprint := strings.TrimSpace(query.Fingerprint)
	sessionID := strings.TrimSpace(query.SessionID)

	if sessionID != "" && fingerprint != "" {
		existing, err := s.loadSessionSponsors(ctx, fingerprint, sessionID, normalizeLocale(query.Locale))
		if err != nil {
			return nil, err
		}
		if len(existing) > 0 {
			for i := range existing {
				existing[i].DistanceMeters = distanceMeters(query.Lat, query.Lng, existing[i].Latitude, existing[i].Longitude)
			}
			if len(existing) > limit {
				existing = existing[:limit]
			}
			return existing, nil
		}
	}

	candidates, err := s.loadSponsorCandidates(ctx, query, scene, fingerprint)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return []Sponsor{}, nil
	}

	primary := pickPrimarySponsor(candidates, fingerprint, sessionID, scene)
	if primary == nil {
		return []Sponsor{}, nil
	}

	maxSecondary := primary.campaign.MaxSecondarySlots
	if maxSecondary > 4 {
		maxSecondary = 4
	}
	secondaryLimit := minInt(limit-1, maxSecondary)
	secondaries := pickSecondarySponsors(candidates, *primary, secondaryLimit)

	results := make([]Sponsor, 0, 1+len(secondaries))
	results = append(results, buildDeliveredSponsor(*primary, "primary", 1))
	for index, candidate := range secondaries {
		results = append(results, buildDeliveredSponsor(candidate, "secondary", index+2))
	}

	if sessionID != "" && fingerprint != "" {
		if err := s.logSponsorImpressions(ctx, results, fingerprint, sessionID, scene, query.Lat, query.Lng, int(query.RadiusMeters)); err != nil {
			return nil, err
		}
	}

	return results, nil
}

func (s *Store) loadSessionSponsors(ctx context.Context, fingerprint, sessionID, locale string) ([]Sponsor, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT
			s.id, s.brand_key, s.name, s.business_type, s.title, s.description, s.contact_info,
			s.media_url, s.logo_url, s.city_code, s.area_label, s.latitude, s.longitude, s.address,
			s.service_hours, s.service_tags, s.landing_url, s.sponsor_badge, s.is_verified, s.status,
			si.exposure_role, si.campaign_id, sc.package_tier, sc.target_scene, si.rank_position,
			s.created_at, s.updated_at
		FROM sponsor_impressions si
		JOIN sponsors s ON s.id = si.sponsor_id
		JOIN sponsor_campaigns sc ON sc.id = si.campaign_id
		WHERE si.fingerprint = ? AND si.session_id = ?
		  AND s.status = 'active'
		  AND sc.status = 'active'
		  AND CURRENT_TIMESTAMP BETWEEN sc.start_at AND sc.end_at
		ORDER BY si.rank_position ASC, si.created_at ASC
	`, fingerprint, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Sponsor, 0)
	for rows.Next() {
		sponsor, err := scanSponsorDelivery(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sponsor)
	}
	return out, rows.Err()
}

func (s *Store) loadSponsorCandidates(ctx context.Context, query SponsorQuery, scene, fingerprint string) ([]sponsorCandidate, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT
			s.id, s.brand_key, s.name, s.business_type, s.title, s.description, s.contact_info,
			s.media_url, s.logo_url, s.city_code, s.area_label, s.latitude, s.longitude, s.address,
			s.service_hours, s.service_tags, s.landing_url, s.sponsor_badge, s.is_verified, s.status,
			s.created_at, s.updated_at,
			sc.id, sc.sponsor_id, sc.package_tier, sc.target_scene, sc.city_code, sc.area_label,
			sc.area_center_lat, sc.area_center_lng, sc.area_radius_meters, sc.share_ratio,
			sc.priority_weight, sc.city_multiplier, sc.scene_multiplier, sc.monthly_price_cents,
			sc.daily_primary_cap_per_user, sc.daily_secondary_cap_per_user, sc.max_secondary_slots,
			sc.start_at, sc.end_at, sc.status, sc.created_at, sc.updated_at
		FROM sponsors s
		JOIN sponsor_campaigns sc ON sc.sponsor_id = s.id
		WHERE s.status = 'active'
		  AND sc.status = 'active'
		  AND CURRENT_TIMESTAMP BETWEEN sc.start_at AND sc.end_at
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]sponsorCandidate, 0)
	for rows.Next() {
		sponsor, campaign, err := scanSponsorCandidate(rows)
		if err != nil {
			return nil, err
		}

		if !sceneMatches(scene, campaign.TargetScene) {
			continue
		}

		centerDistance := distanceMeters(query.Lat, query.Lng, campaign.AreaCenterLat, campaign.AreaCenterLng)
		if centerDistance > float64(campaign.AreaRadiusMeters) {
			continue
		}

		distanceToSponsor := distanceMeters(query.Lat, query.Lng, sponsor.Latitude, sponsor.Longitude)
		if query.RadiusMeters > 0 && distanceToSponsor > query.RadiusMeters*1.5 {
			continue
		}

		candidate := sponsorCandidate{
			sponsor:         sponsor,
			campaign:        campaign,
			distanceMeters:  distanceToSponsor,
			sceneMatchScore: sponsorSceneMatchScore(scene, campaign.TargetScene),
			isOpenNow:       sponsorIsOpenNow(sponsor),
		}
		if fingerprint != "" {
			primarySeen, err := s.countSponsorImpressionsToday(ctx, campaign.ID, sponsor.ID, fingerprint, "primary")
			if err != nil {
				return nil, err
			}
			secondarySeen, err := s.countSponsorImpressionsToday(ctx, campaign.ID, sponsor.ID, fingerprint, "secondary")
			if err != nil {
				return nil, err
			}
			dismissCount, err := s.countSponsorEventsToday(ctx, campaign.ID, sponsor.ID, fingerprint, "dismiss")
			if err != nil {
				return nil, err
			}
			candidate.primarySeenToday = primarySeen
			candidate.secondarySeenToday = secondarySeen
			candidate.dismissCountToday = dismissCount
		}
		out = append(out, candidate)
	}

	return out, rows.Err()
}

func pickPrimarySponsor(candidates []sponsorCandidate, fingerprint, sessionID, scene string) *sponsorCandidate {
	exclusives := make([]sponsorCandidate, 0)
	eligible := make([]sponsorCandidate, 0)
	for _, candidate := range candidates {
		if candidate.primarySeenToday >= candidate.campaign.DailyPrimaryCapPerUser {
			continue
		}
		if candidate.campaign.PackageTier == "exclusive_100" {
			exclusives = append(exclusives, candidate)
		}
		eligible = append(eligible, candidate)
	}

	if len(exclusives) > 0 {
		sort.Slice(exclusives, func(i, j int) bool {
			if exclusives[i].distanceMeters != exclusives[j].distanceMeters {
				return exclusives[i].distanceMeters < exclusives[j].distanceMeters
			}
			return exclusives[i].campaign.ID < exclusives[j].campaign.ID
		})
		chosen := exclusives[0]
		return &chosen
	}

	if len(eligible) == 0 {
		eligible = append(eligible, candidates...)
	}

	deduped := dedupeCandidatesByBrand(eligible, scene)
	if len(deduped) == 0 {
		return nil
	}

	totalWeight := 0
	for _, candidate := range deduped {
		totalWeight += sponsorPrimaryWeight(candidate, scene)
	}
	if totalWeight <= 0 {
		chosen := deduped[0]
		return &chosen
	}

	seed := stableSponsorSeed(fingerprint, sessionID, scene)
	pick := seed % uint64(totalWeight)
	running := 0
	for _, candidate := range deduped {
		running += sponsorPrimaryWeight(candidate, scene)
		if int(pick) < running {
			chosen := candidate
			return &chosen
		}
	}

	chosen := deduped[0]
	return &chosen
}

func pickSecondarySponsors(candidates []sponsorCandidate, primary sponsorCandidate, limit int) []sponsorCandidate {
	if limit <= 0 {
		return nil
	}
	brandBlock := map[string]bool{
		primary.sponsor.BrandKey: true,
	}
	pool := make([]sponsorCandidate, 0)
	for _, candidate := range candidates {
		if candidate.sponsor.ID == primary.sponsor.ID {
			continue
		}
		if brandBlock[candidate.sponsor.BrandKey] {
			continue
		}
		if candidate.secondarySeenToday >= candidate.campaign.DailySecondaryCapPerUser {
			continue
		}
		pool = append(pool, candidate)
	}

	sort.Slice(pool, func(i, j int) bool {
		leftScore := sponsorSecondaryScore(pool[i])
		rightScore := sponsorSecondaryScore(pool[j])
		if leftScore != rightScore {
			return leftScore > rightScore
		}
		return pool[i].distanceMeters < pool[j].distanceMeters
	})

	out := make([]sponsorCandidate, 0, limit)
	for _, candidate := range pool {
		if len(out) >= limit {
			break
		}
		if brandBlock[candidate.sponsor.BrandKey] {
			continue
		}
		brandBlock[candidate.sponsor.BrandKey] = true
		out = append(out, candidate)
	}
	return out
}

func buildDeliveredSponsor(candidate sponsorCandidate, role string, rank int) Sponsor {
	sponsor := candidate.sponsor
	sponsor.Type = "sponsor"
	sponsor.SponsorRole = role
	sponsor.CampaignID = candidate.campaign.ID
	sponsor.CampaignTier = candidate.campaign.PackageTier
	sponsor.TargetScene = candidate.campaign.TargetScene
	sponsor.DistanceMeters = candidate.distanceMeters
	sponsor.RankPosition = rank
	return sponsor
}

func (s *Store) logSponsorImpressions(ctx context.Context, sponsors []Sponsor, fingerprint, sessionID, scene string, lat, lng float64, radiusMeters int) error {
	for _, sponsor := range sponsors {
		if _, err := s.db.ExecContext(ctx, `
			INSERT OR IGNORE INTO sponsor_impressions (
				sponsor_id, campaign_id, fingerprint, session_id, exposure_role,
				scene_context, viewport_lat, viewport_lng, viewport_radius_meters, rank_position
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, sponsor.ID, sponsor.CampaignID, fingerprint, sessionID, sponsor.SponsorRole, scene, lat, lng, radiusMeters, sponsor.RankPosition); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) RecordSponsorEvent(ctx context.Context, input SponsorEventInput) error {
	metadataJSON := "{}"
	if len(input.Metadata) > 0 {
		payload, err := json.Marshal(input.Metadata)
		if err != nil {
			return err
		}
		metadataJSON = string(payload)
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO sponsor_events (
			sponsor_id, campaign_id, fingerprint, session_id, event_type, metadata_json
		) VALUES (?, ?, ?, ?, ?, ?)
	`, input.SponsorID, input.CampaignID, input.Fingerprint, input.SessionID, input.EventType, metadataJSON)
	return err
}

func (s *Store) ListSponsors(ctx context.Context, filters SponsorAdminFilters) ([]Sponsor, error) {
	query := `
		SELECT id, brand_key, name, business_type, title, description, contact_info, media_url,
		       logo_url, city_code, area_label, latitude, longitude, address, service_hours,
		       service_tags, landing_url, sponsor_badge, is_verified, status, created_at, updated_at
		FROM sponsors
		WHERE 1 = 1
	`
	args := make([]any, 0)
	if filters.CityCode != "" {
		query += " AND city_code = ?"
		args = append(args, filters.CityCode)
	}
	if filters.Status != "" {
		query += " AND status = ?"
		args = append(args, filters.Status)
	}
	if filters.BusinessType != "" {
		query += " AND business_type = ?"
		args = append(args, filters.BusinessType)
	}
	if filters.Keyword != "" {
		query += " AND (name LIKE ? OR title LIKE ? OR description LIKE ?)"
		needle := "%" + filters.Keyword + "%"
		args = append(args, needle, needle, needle)
	}
	query += " ORDER BY updated_at DESC, id DESC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Sponsor, 0)
	for rows.Next() {
		sponsor, err := scanSponsor(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sponsor)
	}
	return out, rows.Err()
}

func (s *Store) CreateSponsor(ctx context.Context, input Sponsor) (int64, error) {
	tags, err := encodeServiceTags(input.ServiceTags)
	if err != nil {
		return 0, err
	}
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO sponsors (
			brand_key, name, business_type, title, description, contact_info, media_url, logo_url,
			city_code, area_label, latitude, longitude, address, service_hours, service_tags,
			landing_url, sponsor_badge, is_verified, status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		input.BrandKey,
		input.Name,
		input.BusinessType,
		input.Title,
		input.Description,
		nullString(input.ContactInfo),
		nullString(input.MediaURL),
		nullString(input.LogoURL),
		input.CityCode,
		input.AreaLabel,
		input.Latitude,
		input.Longitude,
		input.Address,
		nullString(input.ServiceHours),
		tags,
		nullString(input.LandingURL),
		defaultSponsorBadge(input.SponsorBadge),
		boolToInt(input.IsVerified),
		defaultSponsorStatus(input.Status),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateSponsor(ctx context.Context, sponsorID int64, input Sponsor) error {
	tags, err := encodeServiceTags(input.ServiceTags)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		UPDATE sponsors
		SET brand_key = ?, name = ?, business_type = ?, title = ?, description = ?, contact_info = ?,
		    media_url = ?, logo_url = ?, city_code = ?, area_label = ?, latitude = ?, longitude = ?,
		    address = ?, service_hours = ?, service_tags = ?, landing_url = ?, sponsor_badge = ?,
		    is_verified = ?, status = ?
		WHERE id = ?
	`,
		input.BrandKey,
		input.Name,
		input.BusinessType,
		input.Title,
		input.Description,
		nullString(input.ContactInfo),
		nullString(input.MediaURL),
		nullString(input.LogoURL),
		input.CityCode,
		input.AreaLabel,
		input.Latitude,
		input.Longitude,
		input.Address,
		nullString(input.ServiceHours),
		tags,
		nullString(input.LandingURL),
		defaultSponsorBadge(input.SponsorBadge),
		boolToInt(input.IsVerified),
		defaultSponsorStatus(input.Status),
		sponsorID,
	)
	return err
}

func (s *Store) ArchiveSponsor(ctx context.Context, sponsorID int64) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		UPDATE sponsors
		SET status = 'blocked', updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, sponsorID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errSponsorNotFound
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE sponsor_campaigns
		SET status = 'expired', updated_at = CURRENT_TIMESTAMP
		WHERE sponsor_id = ?
		  AND status != 'expired'
	`, sponsorID); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) DeleteSponsor(ctx context.Context, sponsorID int64) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var status string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM sponsors WHERE id = ?`, sponsorID).Scan(&status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errSponsorNotFound
		}
		return err
	}
	if strings.ToLower(strings.TrimSpace(status)) != "blocked" {
		return errSponsorArchiveRequired
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM sponsors WHERE id = ?`, sponsorID); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Store) ListSponsorCampaigns(ctx context.Context, filters SponsorCampaignFilters) ([]SponsorCampaign, error) {
	query := `
		SELECT id, sponsor_id, package_tier, target_scene, city_code, area_label, area_center_lat,
		       area_center_lng, area_radius_meters, share_ratio, priority_weight, city_multiplier,
		       scene_multiplier, monthly_price_cents, daily_primary_cap_per_user,
		       daily_secondary_cap_per_user, max_secondary_slots, start_at, end_at, status,
		       created_at, updated_at
		FROM sponsor_campaigns
		WHERE 1 = 1
	`
	args := make([]any, 0)
	if filters.SponsorID > 0 {
		query += " AND sponsor_id = ?"
		args = append(args, filters.SponsorID)
	}
	if filters.Status != "" {
		query += " AND status = ?"
		args = append(args, filters.Status)
	}
	if filters.CityCode != "" {
		query += " AND city_code = ?"
		args = append(args, filters.CityCode)
	}
	query += " ORDER BY updated_at DESC, id DESC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]SponsorCampaign, 0)
	for rows.Next() {
		campaign, err := scanSponsorCampaign(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, campaign)
	}
	return out, rows.Err()
}

func (s *Store) CreateSponsorCampaign(ctx context.Context, input SponsorCampaign) (int64, error) {
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO sponsor_campaigns (
			sponsor_id, package_tier, target_scene, city_code, area_label, area_center_lat,
			area_center_lng, area_radius_meters, share_ratio, priority_weight, city_multiplier,
			scene_multiplier, monthly_price_cents, daily_primary_cap_per_user,
			daily_secondary_cap_per_user, max_secondary_slots, start_at, end_at, status
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		input.SponsorID,
		input.PackageTier,
		input.TargetScene,
		input.CityCode,
		input.AreaLabel,
		input.AreaCenterLat,
		input.AreaCenterLng,
		input.AreaRadiusMeters,
		input.ShareRatio,
		input.PriorityWeight,
		input.CityMultiplier,
		input.SceneMultiplier,
		input.MonthlyPriceCents,
		input.DailyPrimaryCapPerUser,
		input.DailySecondaryCapPerUser,
		input.MaxSecondarySlots,
		input.StartAt,
		input.EndAt,
		defaultSponsorCampaignStatus(input.Status),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateSponsorCampaign(ctx context.Context, campaignID int64, input SponsorCampaign) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE sponsor_campaigns
		SET sponsor_id = ?, package_tier = ?, target_scene = ?, city_code = ?, area_label = ?,
		    area_center_lat = ?, area_center_lng = ?, area_radius_meters = ?, share_ratio = ?,
		    priority_weight = ?, city_multiplier = ?, scene_multiplier = ?, monthly_price_cents = ?,
		    daily_primary_cap_per_user = ?, daily_secondary_cap_per_user = ?, max_secondary_slots = ?,
		    start_at = ?, end_at = ?, status = ?
		WHERE id = ?
	`,
		input.SponsorID,
		input.PackageTier,
		input.TargetScene,
		input.CityCode,
		input.AreaLabel,
		input.AreaCenterLat,
		input.AreaCenterLng,
		input.AreaRadiusMeters,
		input.ShareRatio,
		input.PriorityWeight,
		input.CityMultiplier,
		input.SceneMultiplier,
		input.MonthlyPriceCents,
		input.DailyPrimaryCapPerUser,
		input.DailySecondaryCapPerUser,
		input.MaxSecondarySlots,
		input.StartAt,
		input.EndAt,
		defaultSponsorCampaignStatus(input.Status),
		campaignID,
	)
	return err
}

func (s *Store) ArchiveSponsorCampaign(ctx context.Context, campaignID int64) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE sponsor_campaigns
		SET status = 'expired', updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, campaignID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errCampaignNotFound
	}
	return nil
}

func (s *Store) DeleteSponsorCampaign(ctx context.Context, campaignID int64) error {
	var status string
	if err := s.db.QueryRowContext(ctx, `SELECT status FROM sponsor_campaigns WHERE id = ?`, campaignID).Scan(&status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errCampaignNotFound
		}
		return err
	}
	if strings.ToLower(strings.TrimSpace(status)) != "expired" {
		return errCampaignArchiveRequired
	}
	_, err := s.db.ExecContext(ctx, `DELETE FROM sponsor_campaigns WHERE id = ?`, campaignID)
	return err
}

func (s *Store) GetSponsorReport(ctx context.Context, sponsorID, campaignID int64, dateFrom, dateTo *time.Time) (map[string]any, error) {
	args := []any{}
	impressionWhere := []string{"1 = 1"}
	eventWhere := []string{"1 = 1"}
	if sponsorID > 0 {
		impressionWhere = append(impressionWhere, "sponsor_id = ?")
		eventWhere = append(eventWhere, "sponsor_id = ?")
		args = append(args, sponsorID)
	}
	if campaignID > 0 {
		impressionWhere = append(impressionWhere, "campaign_id = ?")
		eventWhere = append(eventWhere, "campaign_id = ?")
		args = append(args, campaignID)
	}
	if dateFrom != nil {
		impressionWhere = append(impressionWhere, "created_at >= ?")
		eventWhere = append(eventWhere, "created_at >= ?")
		args = append(args, *dateFrom)
	}
	if dateTo != nil {
		impressionWhere = append(impressionWhere, "created_at <= ?")
		eventWhere = append(eventWhere, "created_at <= ?")
		args = append(args, *dateTo)
	}

	impQuery := `
		SELECT
			SUM(CASE WHEN exposure_role = 'primary' THEN 1 ELSE 0 END),
			SUM(CASE WHEN exposure_role = 'secondary' THEN 1 ELSE 0 END)
		FROM sponsor_impressions
		WHERE ` + strings.Join(impressionWhere, " AND ")

	var primary sql.NullInt64
	var secondary sql.NullInt64
	if err := s.db.QueryRowContext(ctx, impQuery, args...).Scan(&primary, &secondary); err != nil {
		return nil, err
	}

	eventQuery := `
		SELECT
			SUM(CASE WHEN event_type = 'open' THEN 1 ELSE 0 END),
			SUM(CASE WHEN event_type = 'view_details' THEN 1 ELSE 0 END),
			SUM(CASE WHEN event_type = 'navigate' THEN 1 ELSE 0 END),
			SUM(CASE WHEN event_type = 'contact' THEN 1 ELSE 0 END),
			SUM(CASE WHEN event_type = 'dismiss' THEN 1 ELSE 0 END)
		FROM sponsor_events
		WHERE ` + strings.Join(eventWhere, " AND ")

	var open, detail, navigate, contact, dismiss sql.NullInt64
	if err := s.db.QueryRowContext(ctx, eventQuery, args...).Scan(&open, &detail, &navigate, &contact, &dismiss); err != nil {
		return nil, err
	}

	return map[string]any{
		"primary_impressions":   safeInt(primary),
		"secondary_impressions": safeInt(secondary),
		"open_count":            safeInt(open),
		"detail_count":          safeInt(detail),
		"navigate_count":        safeInt(navigate),
		"contact_count":         safeInt(contact),
		"dismiss_count":         safeInt(dismiss),
	}, nil
}

func (s *Store) countSponsorImpressionsToday(ctx context.Context, campaignID, sponsorID int64, fingerprint, role string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM sponsor_impressions
		WHERE campaign_id = ?
		  AND sponsor_id = ?
		  AND fingerprint = ?
		  AND exposure_role = ?
		  AND datetime(created_at) >= datetime('now', 'start of day')
	`, campaignID, sponsorID, fingerprint, role).Scan(&count)
	return count, err
}

func (s *Store) countSponsorEventsToday(ctx context.Context, campaignID, sponsorID int64, fingerprint, eventType string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM sponsor_events
		WHERE campaign_id = ?
		  AND sponsor_id = ?
		  AND fingerprint = ?
		  AND event_type = ?
		  AND datetime(created_at) >= datetime('now', 'start of day')
	`, campaignID, sponsorID, fingerprint, eventType).Scan(&count)
	return count, err
}

func scanSponsor(scanner interface{ Scan(dest ...any) error }) (Sponsor, error) {
	var sponsor Sponsor
	var contact, media, logo, serviceHours, landingURL sql.NullString
	var serviceTags string
	var isVerified int
	if err := scanner.Scan(
		&sponsor.ID,
		&sponsor.BrandKey,
		&sponsor.Name,
		&sponsor.BusinessType,
		&sponsor.Title,
		&sponsor.Description,
		&contact,
		&media,
		&logo,
		&sponsor.CityCode,
		&sponsor.AreaLabel,
		&sponsor.Latitude,
		&sponsor.Longitude,
		&sponsor.Address,
		&serviceHours,
		&serviceTags,
		&landingURL,
		&sponsor.SponsorBadge,
		&isVerified,
		&sponsor.Status,
		&sponsor.CreatedAt,
		&sponsor.UpdatedAt,
	); err != nil {
		return Sponsor{}, err
	}
	sponsor.Type = "sponsor"
	sponsor.IsVerified = isVerified == 1
	sponsor.ContactInfo = nullStringPtr(contact)
	sponsor.MediaURL = nullStringPtr(media)
	sponsor.LogoURL = nullStringPtr(logo)
	sponsor.ServiceHours = nullStringPtr(serviceHours)
	sponsor.LandingURL = nullStringPtr(landingURL)
	sponsor.ServiceTags = decodeServiceTags(serviceTags)
	return sponsor, nil
}

func scanSponsorCampaign(scanner interface{ Scan(dest ...any) error }) (SponsorCampaign, error) {
	var campaign SponsorCampaign
	if err := scanner.Scan(
		&campaign.ID,
		&campaign.SponsorID,
		&campaign.PackageTier,
		&campaign.TargetScene,
		&campaign.CityCode,
		&campaign.AreaLabel,
		&campaign.AreaCenterLat,
		&campaign.AreaCenterLng,
		&campaign.AreaRadiusMeters,
		&campaign.ShareRatio,
		&campaign.PriorityWeight,
		&campaign.CityMultiplier,
		&campaign.SceneMultiplier,
		&campaign.MonthlyPriceCents,
		&campaign.DailyPrimaryCapPerUser,
		&campaign.DailySecondaryCapPerUser,
		&campaign.MaxSecondarySlots,
		&campaign.StartAt,
		&campaign.EndAt,
		&campaign.Status,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	); err != nil {
		return SponsorCampaign{}, err
	}
	return campaign, nil
}

func scanSponsorCandidate(scanner interface{ Scan(dest ...any) error }) (Sponsor, SponsorCampaign, error) {
	var sponsor Sponsor
	var campaign SponsorCampaign
	var contact, media, logo, serviceHours, landingURL sql.NullString
	var serviceTags string
	var isVerified int
	if err := scanner.Scan(
		&sponsor.ID,
		&sponsor.BrandKey,
		&sponsor.Name,
		&sponsor.BusinessType,
		&sponsor.Title,
		&sponsor.Description,
		&contact,
		&media,
		&logo,
		&sponsor.CityCode,
		&sponsor.AreaLabel,
		&sponsor.Latitude,
		&sponsor.Longitude,
		&sponsor.Address,
		&serviceHours,
		&serviceTags,
		&landingURL,
		&sponsor.SponsorBadge,
		&isVerified,
		&sponsor.Status,
		&sponsor.CreatedAt,
		&sponsor.UpdatedAt,
		&campaign.ID,
		&campaign.SponsorID,
		&campaign.PackageTier,
		&campaign.TargetScene,
		&campaign.CityCode,
		&campaign.AreaLabel,
		&campaign.AreaCenterLat,
		&campaign.AreaCenterLng,
		&campaign.AreaRadiusMeters,
		&campaign.ShareRatio,
		&campaign.PriorityWeight,
		&campaign.CityMultiplier,
		&campaign.SceneMultiplier,
		&campaign.MonthlyPriceCents,
		&campaign.DailyPrimaryCapPerUser,
		&campaign.DailySecondaryCapPerUser,
		&campaign.MaxSecondarySlots,
		&campaign.StartAt,
		&campaign.EndAt,
		&campaign.Status,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	); err != nil {
		return Sponsor{}, SponsorCampaign{}, err
	}
	sponsor.Type = "sponsor"
	sponsor.IsVerified = isVerified == 1
	sponsor.ContactInfo = nullStringPtr(contact)
	sponsor.MediaURL = nullStringPtr(media)
	sponsor.LogoURL = nullStringPtr(logo)
	sponsor.ServiceHours = nullStringPtr(serviceHours)
	sponsor.LandingURL = nullStringPtr(landingURL)
	sponsor.ServiceTags = decodeServiceTags(serviceTags)
	return sponsor, campaign, nil
}

func scanSponsorDelivery(scanner interface{ Scan(dest ...any) error }) (Sponsor, error) {
	var sponsor Sponsor
	var contact, media, logo, serviceHours, landingURL sql.NullString
	var serviceTags string
	var isVerified int
	if err := scanner.Scan(
		&sponsor.ID,
		&sponsor.BrandKey,
		&sponsor.Name,
		&sponsor.BusinessType,
		&sponsor.Title,
		&sponsor.Description,
		&contact,
		&media,
		&logo,
		&sponsor.CityCode,
		&sponsor.AreaLabel,
		&sponsor.Latitude,
		&sponsor.Longitude,
		&sponsor.Address,
		&serviceHours,
		&serviceTags,
		&landingURL,
		&sponsor.SponsorBadge,
		&isVerified,
		&sponsor.Status,
		&sponsor.SponsorRole,
		&sponsor.CampaignID,
		&sponsor.CampaignTier,
		&sponsor.TargetScene,
		&sponsor.RankPosition,
		&sponsor.CreatedAt,
		&sponsor.UpdatedAt,
	); err != nil {
		return Sponsor{}, err
	}
	sponsor.Type = "sponsor"
	sponsor.IsVerified = isVerified == 1
	sponsor.ContactInfo = nullStringPtr(contact)
	sponsor.MediaURL = nullStringPtr(media)
	sponsor.LogoURL = nullStringPtr(logo)
	sponsor.ServiceHours = nullStringPtr(serviceHours)
	sponsor.LandingURL = nullStringPtr(landingURL)
	sponsor.ServiceTags = decodeServiceTags(serviceTags)
	return sponsor, nil
}

func sponsorPrimaryWeight(candidate sponsorCandidate, scene string) int {
	weight := candidate.campaign.PriorityWeight
	if candidate.sceneMatchScore >= 3 {
		weight += 2
	} else if candidate.sceneMatchScore == 2 {
		weight++
	}
	switch {
	case candidate.distanceMeters <= 1000:
		weight += 2
	case candidate.distanceMeters <= 3000:
		weight++
	}
	if candidate.isOpenNow {
		weight++
	}
	weight -= candidate.dismissCountToday
	if weight < 1 {
		weight = 1
	}
	return weight
}

func sponsorSecondaryScore(candidate sponsorCandidate) int {
	score := candidate.campaign.PriorityWeight + candidate.sceneMatchScore
	switch {
	case candidate.distanceMeters <= 1000:
		score += 3
	case candidate.distanceMeters <= 3000:
		score += 2
	default:
		score++
	}
	if candidate.isOpenNow {
		score++
	}
	score -= candidate.dismissCountToday
	return score
}

func dedupeCandidatesByBrand(candidates []sponsorCandidate, scene string) []sponsorCandidate {
	best := map[string]sponsorCandidate{}
	for _, candidate := range candidates {
		existing, ok := best[candidate.sponsor.BrandKey]
		if !ok || sponsorPrimaryWeight(candidate, scene) > sponsorPrimaryWeight(existing, scene) {
			best[candidate.sponsor.BrandKey] = candidate
		}
	}
	out := make([]sponsorCandidate, 0, len(best))
	for _, candidate := range best {
		out = append(out, candidate)
	}
	sort.Slice(out, func(i, j int) bool {
		leftWeight := sponsorPrimaryWeight(out[i], scene)
		rightWeight := sponsorPrimaryWeight(out[j], scene)
		if leftWeight != rightWeight {
			return leftWeight > rightWeight
		}
		return out[i].distanceMeters < out[j].distanceMeters
	})
	return out
}

func sponsorSceneMatchScore(scene, target string) int {
	target = normalizeSceneTarget(target)
	switch {
	case target == "both":
		return 2
	case scene == target:
		return 3
	default:
		return 1
	}
}

func sceneMatches(scene, target string) bool {
	target = normalizeSceneTarget(target)
	switch scene {
	case "risk":
		return target == "risk" || target == "both"
	case "care":
		return target == "care" || target == "both"
	default:
		return target == "risk" || target == "care" || target == "both"
	}
}

func normalizeScene(scene string) string {
	switch strings.ToLower(strings.TrimSpace(scene)) {
	case "risk":
		return "risk"
	case "care":
		return "care"
	default:
		return "mixed"
	}
}

func normalizeSceneTarget(scene string) string {
	switch strings.ToLower(strings.TrimSpace(scene)) {
	case "risk":
		return "risk"
	case "care":
		return "care"
	default:
		return "both"
	}
}

func sponsorIsOpenNow(sponsor Sponsor) bool {
	if sponsor.ServiceHours == nil || strings.TrimSpace(*sponsor.ServiceHours) == "" {
		return true
	}
	value := strings.TrimSpace(*sponsor.ServiceHours)
	if strings.Contains(strings.ToLower(value), "24") {
		return true
	}
	now := time.Now()
	parts := strings.Split(value, "-")
	if len(parts) != 2 {
		return true
	}
	start, err := time.Parse("15:04", strings.TrimSpace(parts[0]))
	if err != nil {
		return true
	}
	end, err := time.Parse("15:04", strings.TrimSpace(parts[1]))
	if err != nil {
		return true
	}
	currentMinutes := now.Hour()*60 + now.Minute()
	startMinutes := start.Hour()*60 + start.Minute()
	endMinutes := end.Hour()*60 + end.Minute()
	if endMinutes < startMinutes {
		return currentMinutes >= startMinutes || currentMinutes <= endMinutes
	}
	return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

func stableSponsorSeed(parts ...string) uint64 {
	h := fnv.New64a()
	for _, part := range parts {
		_, _ = h.Write([]byte(part))
		_, _ = h.Write([]byte{'|'})
	}
	return h.Sum64()
}

func encodeServiceTags(tags []string) (string, error) {
	if len(tags) == 0 {
		return "[]", nil
	}
	payload, err := json.Marshal(tags)
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func decodeServiceTags(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	var tags []string
	if err := json.Unmarshal([]byte(raw), &tags); err == nil {
		return tags
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func safeInt(value sql.NullInt64) int {
	if !value.Valid {
		return 0
	}
	return int(value.Int64)
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func defaultSponsorStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "paused":
		return "paused"
	case "expired":
		return "expired"
	case "blocked":
		return "blocked"
	default:
		return "active"
	}
}

func defaultSponsorCampaignStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "paused":
		return "paused"
	case "expired":
		return "expired"
	default:
		return "active"
	}
}

func defaultSponsorBadge(value string) string {
	if strings.TrimSpace(value) == "" {
		return "sponsored"
	}
	return value
}

func nullString(value *string) any {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil
	}
	return *value
}

func nullStringPtr(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	copy := value.String
	return &copy
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (s *Store) sponsorSummary(ctx context.Context) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sponsors WHERE status = 'active'`).Scan(&count)
	return count, err
}

func (s *Store) buildSponsorSceneHint(ctx context.Context, lat, lng float64, radiusMeters float64) (string, error) {
	markers, err := s.ListMarkers(ctx, MarkerQuery{
		Lat:          lat,
		Lng:          lng,
		RadiusMeters: radiusMeters,
		Limit:        50,
		Locale:       "zh-CN",
	})
	if err != nil {
		return "", err
	}

	riskCount := 0
	helpCount := 0
	for _, marker := range markers {
		if isHelpCategory(marker.Category) {
			helpCount++
		} else {
			riskCount++
		}
	}

	if riskCount == 0 && helpCount == 0 {
		return "mixed", nil
	}
	if float64(riskCount) >= float64(helpCount)*1.5 {
		return "risk", nil
	}
	if float64(helpCount) >= float64(riskCount)*1.5 {
		return "care", nil
	}
	return "mixed", nil
}

func sponsorDistanceScore(distance float64) float64 {
	switch {
	case distance <= 1000:
		return 1
	case distance <= 3000:
		return 0.7
	default:
		return math.Max(0.25, 1-(distance/10000))
	}
}
