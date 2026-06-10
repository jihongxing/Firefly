-- CreateTable
CREATE TABLE "markers" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "public_latitude" DOUBLE PRECISION NOT NULL,
    "public_longitude" DOUBLE PRECISION NOT NULL,
    "private_latitude" DOUBLE PRECISION NOT NULL,
    "private_longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contact_info" TEXT,
    "media_url" TEXT,
    "media_thumb_url" TEXT,
    "source_locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "fingerprint" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "consensus_status" TEXT NOT NULL DEFAULT 'pending',
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "support_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispute_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshness_score" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMP(3),
    "last_confirmed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" SERIAL NOT NULL,
    "marker_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "feedback_type" TEXT NOT NULL,
    "comment" TEXT,
    "confidence_level" INTEGER NOT NULL DEFAULT 3,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "marker_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "report_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "ip_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" SERIAL NOT NULL,
    "marker_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "reputation_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contribution_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "website_url" TEXT,
    "contact_email" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'basic',
    "status" INTEGER NOT NULL DEFAULT 1,
    "total_budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent_budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_campaigns" (
    "id" SERIAL NOT NULL,
    "sponsor_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_category" TEXT,
    "target_region" TEXT,
    "budget" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impression_goal" INTEGER NOT NULL,
    "impression_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsor_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_impressions" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "sponsor_id" INTEGER NOT NULL,
    "marker_id" INTEGER,
    "user_id" INTEGER,
    "impression_type" TEXT NOT NULL,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "marker_id" INTEGER,
    "user_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "event_data" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_votes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "vote_type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "window_start" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_marker_id_idx" ON "feedback"("marker_id");

-- CreateIndex
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");

-- CreateIndex
CREATE INDEX "reports_marker_id_idx" ON "reports"("marker_id");

-- CreateIndex
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "translations_marker_id_locale_key" ON "translations"("marker_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "reputation_history_user_id_idx" ON "reputation_history"("user_id");

-- CreateIndex
CREATE INDEX "sponsor_campaigns_sponsor_id_idx" ON "sponsor_campaigns"("sponsor_id");

-- CreateIndex
CREATE INDEX "sponsor_impressions_campaign_id_idx" ON "sponsor_impressions"("campaign_id");

-- CreateIndex
CREATE INDEX "sponsor_impressions_sponsor_id_idx" ON "sponsor_impressions"("sponsor_id");

-- CreateIndex
CREATE INDEX "sponsor_impressions_marker_id_idx" ON "sponsor_impressions"("marker_id");

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "events_marker_id_idx" ON "events"("marker_id");

-- CreateIndex
CREATE INDEX "governance_votes_proposal_id_idx" ON "governance_votes"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "governance_votes_user_id_proposal_id_key" ON "governance_votes"("user_id", "proposal_id");

-- CreateIndex
CREATE INDEX "rate_limits_identifier_action_type_idx" ON "rate_limits"("identifier", "action_type");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_identifier_action_type_window_start_key" ON "rate_limits"("identifier", "action_type", "window_start");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_marker_id_fkey" FOREIGN KEY ("marker_id") REFERENCES "markers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_marker_id_fkey" FOREIGN KEY ("marker_id") REFERENCES "markers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_marker_id_fkey" FOREIGN KEY ("marker_id") REFERENCES "markers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_history" ADD CONSTRAINT "reputation_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_campaigns" ADD CONSTRAINT "sponsor_campaigns_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_impressions" ADD CONSTRAINT "sponsor_impressions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "sponsor_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_impressions" ADD CONSTRAINT "sponsor_impressions_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_impressions" ADD CONSTRAINT "sponsor_impressions_marker_id_fkey" FOREIGN KEY ("marker_id") REFERENCES "markers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_marker_id_fkey" FOREIGN KEY ("marker_id") REFERENCES "markers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_votes" ADD CONSTRAINT "governance_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
