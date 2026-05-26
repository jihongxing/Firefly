const sponsorAdminState = {
  token: "",
  sponsors: [],
  campaigns: [],
  report: null,
  selectedSponsorID: null,
  selectedCampaignID: null,
  mobilePanelViews: {
    sponsors: "list",
    campaigns: "list"
  }
};

let sponsorAdminBootstrapped = false;

async function initializeSponsorAdmin() {
  if (sponsorAdminBootstrapped) {
    return;
  }
  sponsorAdminBootstrapped = true;
  sponsorAdminState.token = resolveAdminToken();
  wireAdminEvents();
  hydrateTokenField();
  await bootstrapSponsorConsole();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeSponsorAdmin().catch((error) => {
      showAdminStatus(error.message || "初始化赞助运营台失败。", "error");
    });
  });
} else {
  initializeSponsorAdmin().catch((error) => {
    showAdminStatus(error.message || "初始化赞助运营台失败。", "error");
  });
}

function wireAdminEvents() {
  document.getElementById("tokenForm").addEventListener("submit", handleTokenSubmit);
  document.getElementById("sponsorFiltersForm").addEventListener("submit", handleSponsorFilterSubmit);
  document.getElementById("campaignFiltersForm").addEventListener("submit", handleCampaignFilterSubmit);
  document.getElementById("reportFiltersForm").addEventListener("submit", handleReportFilterSubmit);
  document.getElementById("sponsorForm").addEventListener("submit", handleSponsorSubmit);
  document.getElementById("campaignForm").addEventListener("submit", handleCampaignSubmit);
  document.getElementById("resetSponsorFormButton").addEventListener("click", resetSponsorForm);
  document.getElementById("resetCampaignFormButton").addEventListener("click", resetCampaignForm);
  document.getElementById("refreshSponsorsButton").addEventListener("click", loadSponsors);
  document.getElementById("refreshCampaignsButton").addEventListener("click", loadCampaigns);
  document.getElementById("refreshReportsButton").addEventListener("click", loadReports);
  document.getElementById("archiveSponsorButton").addEventListener("click", handleArchiveSponsor);
  document.getElementById("deleteSponsorButton").addEventListener("click", handleDeleteSponsor);
  document.getElementById("archiveCampaignButton").addEventListener("click", handleArchiveCampaign);
  document.getElementById("deleteCampaignButton").addEventListener("click", handleDeleteCampaign);
  document.querySelectorAll("[data-mobile-panel][data-mobile-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setMobilePanelView(button.dataset.mobilePanel, button.dataset.mobileView);
    });
  });
  syncMobilePanelViews();
  syncSponsorActionButtons();
  syncCampaignActionButtons();
}

async function bootstrapSponsorConsole() {
  try {
    await Promise.all([loadSponsors(), loadCampaigns()]);
    await loadReports();
    showAdminStatus("赞助运营台已就绪。", "success");
  } catch (error) {
    showAdminStatus(error.message || "加载赞助运营台失败。", "error");
  }
}

async function loadSponsors() {
  const params = new URLSearchParams();
  setQueryParam(params, "city_code", document.getElementById("sponsorCityFilter").value);
  setQueryParam(params, "status", document.getElementById("sponsorStatusFilter").value);
  setQueryParam(params, "business_type", document.getElementById("sponsorBusinessTypeFilter").value);
  setQueryParam(params, "keyword", document.getElementById("sponsorKeywordFilter").value);

  const payload = await apiFetchJSON(`/api/admin/sponsors?${params.toString()}`);
  sponsorAdminState.sponsors = Array.isArray(payload.data) ? payload.data : [];
  renderSponsors();
  syncSponsorDerivedControls();
  syncSponsorActionButtons();
  renderAdminStats();
}

async function loadCampaigns() {
  const params = new URLSearchParams();
  setQueryParam(params, "sponsor_id", document.getElementById("campaignSponsorIdFilter").value);
  setQueryParam(params, "city_code", document.getElementById("campaignCityFilter").value);
  setQueryParam(params, "status", document.getElementById("campaignStatusFilter").value);

  const payload = await apiFetchJSON(`/api/admin/sponsor-campaigns?${params.toString()}`);
  sponsorAdminState.campaigns = Array.isArray(payload.data) ? payload.data : [];
  renderCampaigns();
  syncCampaignDerivedControls();
  syncCampaignActionButtons();
  renderAdminStats();
}

async function loadReports() {
  const params = new URLSearchParams();
  setQueryParam(params, "sponsor_id", document.getElementById("reportSponsorIdFilter").value);
  setQueryParam(params, "campaign_id", document.getElementById("reportCampaignIdFilter").value);
  setQueryParam(params, "date_from", document.getElementById("reportDateFromFilter").value);
  setQueryParam(params, "date_to", document.getElementById("reportDateToFilter").value);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const payload = await apiFetchJSON(`/api/admin/sponsor-reports${suffix}`);
  sponsorAdminState.report = payload.data || {};
  renderReportCards();
  renderAdminStats();
}

async function handleTokenSubmit(event) {
  event.preventDefault();
  const token = document.getElementById("adminTokenField").value.trim();
  if (!token) {
    showAdminStatus("请输入 admin token。", "error");
    return;
  }

  sponsorAdminState.token = token;
  localStorage.setItem("firefly_admin_token", token);
  const url = new URL(window.location.href);
  url.searchParams.set("token", token);
  window.history.replaceState({}, "", url.toString());
  ensureAdminScriptToken();

  try {
    await bootstrapSponsorConsole();
  } catch (error) {
    showAdminStatus(error.message || "token 校验失败。", "error");
  }
}

async function handleSponsorFilterSubmit(event) {
  event.preventDefault();
  await loadSponsors();
}

async function handleCampaignFilterSubmit(event) {
  event.preventDefault();
  await loadCampaigns();
}

async function handleReportFilterSubmit(event) {
  event.preventDefault();
  await loadReports();
}

async function handleSponsorSubmit(event) {
  event.preventDefault();
  const sponsorID = document.getElementById("sponsorIdField").value.trim();
  const payload = collectSponsorPayload();
  const path = sponsorID ? `/api/admin/sponsors/${encodeURIComponent(sponsorID)}` : "/api/admin/sponsors";
  const method = sponsorID ? "PATCH" : "POST";

  try {
    await apiFetchJSON(path, {
      method,
      body: JSON.stringify(payload)
    });
    await loadSponsors();
    await loadReports();
    showAdminStatus(sponsorID ? "赞助商已更新。" : "赞助商已创建。", "success");
    if (!sponsorID) {
      resetSponsorForm();
    }
  } catch (error) {
    showAdminStatus(error.message || "保存赞助商失败。", "error");
  }
}

async function handleCampaignSubmit(event) {
  event.preventDefault();
  const campaignID = document.getElementById("campaignIdField").value.trim();
  const payload = collectCampaignPayload();
  const path = campaignID ? `/api/admin/sponsor-campaigns/${encodeURIComponent(campaignID)}` : "/api/admin/sponsor-campaigns";
  const method = campaignID ? "PATCH" : "POST";

  try {
    await apiFetchJSON(path, {
      method,
      body: JSON.stringify(payload)
    });
    await loadCampaigns();
    await loadReports();
    showAdminStatus(campaignID ? "投放计划已更新。" : "投放计划已创建。", "success");
    if (!campaignID) {
      resetCampaignForm();
    }
  } catch (error) {
    showAdminStatus(error.message || "保存投放计划失败。", "error");
  }
}

async function handleArchiveSponsor() {
  const sponsor = getSelectedSponsor();
  if (!sponsor) {
    showAdminStatus("请先选择要归档的赞助商。", "error");
    return;
  }
  if (!window.confirm(`确认归档赞助商「${sponsor.name || sponsor.title}」？这会同步结束其关联投放。`)) {
    return;
  }
  try {
    await apiFetchJSON(`/api/admin/sponsors/${encodeURIComponent(sponsor.id)}?mode=archive`, {
      method: "DELETE"
    });
    await Promise.all([loadSponsors(), loadCampaigns(), loadReports()]);
    showAdminStatus("赞助商已归档，关联投放已结束。", "success");
  } catch (error) {
    showAdminStatus(error.message || "归档赞助商失败。", "error");
  }
}

async function handleDeleteSponsor() {
  const sponsor = getSelectedSponsor();
  if (!sponsor) {
    showAdminStatus("请先选择要删除的赞助商。", "error");
    return;
  }
  if (!window.confirm(`确认永久删除赞助商「${sponsor.name || sponsor.title}」？这会同时删除其投放和履约数据。`)) {
    return;
  }
  try {
    await apiFetchJSON(`/api/admin/sponsors/${encodeURIComponent(sponsor.id)}?mode=delete`, {
      method: "DELETE"
    });
    resetSponsorForm();
    resetCampaignForm();
    document.getElementById("reportSponsorIdFilter").value = "";
    document.getElementById("reportCampaignIdFilter").value = "";
    await Promise.all([loadSponsors(), loadCampaigns(), loadReports()]);
    showAdminStatus("赞助商及关联投放已永久删除。", "success");
  } catch (error) {
    showAdminStatus(error.message || "删除赞助商失败。", "error");
  }
}

async function handleArchiveCampaign() {
  const campaign = getSelectedCampaign();
  if (!campaign) {
    showAdminStatus("请先选择要归档的投放计划。", "error");
    return;
  }
  if (!window.confirm(`确认归档投放计划 #${campaign.id}？归档后将不再继续投放。`)) {
    return;
  }
  try {
    await apiFetchJSON(`/api/admin/sponsor-campaigns/${encodeURIComponent(campaign.id)}?mode=archive`, {
      method: "DELETE"
    });
    await Promise.all([loadCampaigns(), loadReports()]);
    showAdminStatus("投放计划已归档。", "success");
  } catch (error) {
    showAdminStatus(error.message || "归档投放计划失败。", "error");
  }
}

async function handleDeleteCampaign() {
  const campaign = getSelectedCampaign();
  if (!campaign) {
    showAdminStatus("请先选择要删除的投放计划。", "error");
    return;
  }
  if (!window.confirm(`确认永久删除投放计划 #${campaign.id}？履约数据也会一并删除。`)) {
    return;
  }
  try {
    await apiFetchJSON(`/api/admin/sponsor-campaigns/${encodeURIComponent(campaign.id)}?mode=delete`, {
      method: "DELETE"
    });
    resetCampaignForm();
    document.getElementById("reportCampaignIdFilter").value = "";
    await Promise.all([loadCampaigns(), loadReports()]);
    showAdminStatus("投放计划已永久删除。", "success");
  } catch (error) {
    showAdminStatus(error.message || "删除投放计划失败。", "error");
  }
}

function collectSponsorPayload() {
  return {
    brand_key: document.getElementById("sponsorBrandKeyField").value.trim(),
    name: document.getElementById("sponsorNameField").value.trim(),
    business_type: document.getElementById("sponsorBusinessTypeField").value,
    title: document.getElementById("sponsorTitleField").value.trim(),
    description: document.getElementById("sponsorDescriptionField").value.trim(),
    contact_info: emptyToNull(document.getElementById("sponsorContactInfoField").value),
    media_url: emptyToNull(document.getElementById("sponsorMediaUrlField").value),
    logo_url: emptyToNull(document.getElementById("sponsorLogoUrlField").value),
    city_code: document.getElementById("sponsorCityCodeField").value.trim(),
    area_label: document.getElementById("sponsorAreaLabelField").value.trim(),
    latitude: readNumberField("sponsorLatitudeField"),
    longitude: readNumberField("sponsorLongitudeField"),
    address: document.getElementById("sponsorAddressField").value.trim(),
    service_hours: emptyToNull(document.getElementById("sponsorServiceHoursField").value),
    service_tags: parseTags(document.getElementById("sponsorServiceTagsField").value),
    landing_url: emptyToNull(document.getElementById("sponsorLandingUrlField").value),
    sponsor_badge: emptyToNull(document.getElementById("sponsorBadgeField").value),
    is_verified: document.getElementById("sponsorVerifiedField").checked,
    status: document.getElementById("sponsorStatusField").value
  };
}

function collectCampaignPayload() {
  return {
    sponsor_id: readIntegerField("campaignSponsorIdField"),
    package_tier: document.getElementById("campaignPackageTierField").value,
    target_scene: document.getElementById("campaignTargetSceneField").value,
    city_code: document.getElementById("campaignCityCodeField").value.trim(),
    area_label: document.getElementById("campaignAreaLabelField").value.trim(),
    area_center_lat: readNumberField("campaignAreaCenterLatField"),
    area_center_lng: readNumberField("campaignAreaCenterLngField"),
    area_radius_meters: readIntegerField("campaignAreaRadiusField"),
    share_ratio: readNumberField("campaignShareRatioField"),
    priority_weight: readIntegerField("campaignPriorityWeightField"),
    city_multiplier: readNumberField("campaignCityMultiplierField"),
    scene_multiplier: readNumberField("campaignSceneMultiplierField"),
    monthly_price_cents: readIntegerField("campaignMonthlyPriceField"),
    daily_primary_cap_per_user: readIntegerField("campaignDailyPrimaryCapField"),
    daily_secondary_cap_per_user: readIntegerField("campaignDailySecondaryCapField"),
    max_secondary_slots: readIntegerField("campaignMaxSecondarySlotsField"),
    start_at: readDateTimeField("campaignStartAtField"),
    end_at: readDateTimeField("campaignEndAtField"),
    status: document.getElementById("campaignStatusField").value
  };
}

function renderSponsors() {
  const list = document.getElementById("sponsorList");
  if (!sponsorAdminState.sponsors.length) {
    list.innerHTML = `<article class="admin-card sponsor-record-card"><p>暂无赞助商记录。</p></article>`;
    return;
  }

  list.innerHTML = sponsorAdminState.sponsors.map((sponsor) => {
    const isSelected = String(sponsor.id) === String(sponsorAdminState.selectedSponsorID);
    const tags = Array.isArray(sponsor.service_tags) ? sponsor.service_tags.slice(0, 4) : [];
    return `
      <button class="sponsor-record-card ${isSelected ? "is-selected" : ""}" type="button" data-record-type="sponsor" data-record-id="${escapeAttr(sponsor.id)}">
        <div class="admin-card-top sponsor-record-head">
          <div>
            <span class="status-pill ${escapeAttr(getSponsorStatusTone(sponsor.status))}">${escapeHTML(sponsor.status || "active")}</span>
            <h3>${escapeHTML(sponsor.name || sponsor.title || `Sponsor ${sponsor.id}`)}</h3>
            <p class="admin-subtext">${escapeHTML(sponsor.city_code || "--")} · ${escapeHTML(sponsor.business_type || "--")}</p>
          </div>
          <div class="marker-meta sponsor-record-meta">
            <span>#${escapeHTML(String(sponsor.id))}</span>
            <span>${sponsor.is_verified ? "verified" : "unverified"}</span>
          </div>
        </div>
        <p class="sponsor-record-copy">${escapeHTML(sponsor.title || "")}</p>
        <p class="detail-meta">${escapeHTML(sponsor.address || "")}</p>
        <div class="admin-meta-grid sponsor-mini-grid">
          <div class="detail-map-note">
            <span class="detail-label">片区</span>
            <p>${escapeHTML(sponsor.area_label || "--")}</p>
          </div>
          <div class="detail-map-note">
            <span class="detail-label">标签</span>
            <p>${escapeHTML(tags.join(", ") || "--")}</p>
          </div>
        </div>
      </button>
    `;
  }).join("");

  list.querySelectorAll('[data-record-type="sponsor"]').forEach((button) => {
    button.addEventListener("click", () => selectSponsor(button.dataset.recordId));
  });
}

function renderCampaigns() {
  const list = document.getElementById("campaignList");
  if (!sponsorAdminState.campaigns.length) {
    list.innerHTML = `<article class="admin-card sponsor-record-card"><p>暂无投放计划。</p></article>`;
    return;
  }

  list.innerHTML = sponsorAdminState.campaigns.map((campaign) => {
    const isSelected = String(campaign.id) === String(sponsorAdminState.selectedCampaignID);
    return `
      <button class="sponsor-record-card ${isSelected ? "is-selected" : ""}" type="button" data-record-type="campaign" data-record-id="${escapeAttr(campaign.id)}">
        <div class="admin-card-top sponsor-record-head">
          <div>
            <span class="status-pill ${escapeAttr(getCampaignStatusTone(campaign.status))}">${escapeHTML(campaign.status || "active")}</span>
            <h3>${escapeHTML(formatCampaignLabel(campaign))}</h3>
            <p class="admin-subtext">${escapeHTML(formatCampaignWindow(campaign.start_at, campaign.end_at))}</p>
          </div>
          <div class="marker-meta sponsor-record-meta">
            <span>#${escapeHTML(String(campaign.id))}</span>
            <span>${escapeHTML(campaign.package_tier || "--")}</span>
          </div>
        </div>
        <div class="admin-meta-grid sponsor-mini-grid">
          <div class="detail-map-note">
            <span class="detail-label">份额 / 权重</span>
            <p>${escapeHTML(formatMetric(campaign.share_ratio))} / ${escapeHTML(String(campaign.priority_weight ?? "--"))}</p>
          </div>
          <div class="detail-map-note">
            <span class="detail-label">月价</span>
            <p>${escapeHTML(formatCurrencyFromCents(campaign.monthly_price_cents))}</p>
          </div>
          <div class="detail-map-note">
            <span class="detail-label">片区</span>
            <p>${escapeHTML(campaign.area_label || "--")}</p>
          </div>
          <div class="detail-map-note">
            <span class="detail-label">频控</span>
            <p>P${escapeHTML(String(campaign.daily_primary_cap_per_user ?? "--"))} / S${escapeHTML(String(campaign.daily_secondary_cap_per_user ?? "--"))}</p>
          </div>
        </div>
      </button>
    `;
  }).join("");

  list.querySelectorAll('[data-record-type="campaign"]').forEach((button) => {
    button.addEventListener("click", () => selectCampaign(button.dataset.recordId));
  });
}

function renderReportCards() {
  const report = sponsorAdminState.report || {};
  const cards = [
    { label: "Primary", value: report.primary_impressions ?? 0 },
    { label: "Secondary", value: report.secondary_impressions ?? 0 },
    { label: "Open", value: report.open_count ?? 0 },
    { label: "Details", value: report.detail_count ?? 0 },
    { label: "Navigate", value: report.navigate_count ?? 0 },
    { label: "Contact", value: report.contact_count ?? 0 },
    { label: "Dismiss", value: report.dismiss_count ?? 0 }
  ];

  document.getElementById("reportCards").innerHTML = cards.map((item) => `
    <article class="stat-card sponsor-report-card">
      <span class="modal-eyebrow">${escapeHTML(item.label)}</span>
      <strong>${escapeHTML(String(item.value))}</strong>
    </article>
  `).join("");
}

function renderAdminStats() {
  const sponsors = sponsorAdminState.sponsors;
  const campaigns = sponsorAdminState.campaigns;
  const report = sponsorAdminState.report || {};
  const totalImpressions = Number(report.primary_impressions || 0) + Number(report.secondary_impressions || 0);
  const totalActions = Number(report.open_count || 0)
    + Number(report.detail_count || 0)
    + Number(report.navigate_count || 0)
    + Number(report.contact_count || 0);

  const stats = [
    { label: "Sponsors", value: sponsors.length },
    { label: "Active Sponsors", value: sponsors.filter((item) => item.status === "active").length },
    { label: "Campaigns", value: campaigns.length },
    { label: "Active Campaigns", value: campaigns.filter((item) => item.status === "active").length },
    { label: "Impressions", value: totalImpressions },
    { label: "Tracked Actions", value: totalActions }
  ];

  document.getElementById("adminStats").innerHTML = stats.map((item) => `
    <article class="stat-card">
      <span class="modal-eyebrow">${escapeHTML(item.label)}</span>
      <strong>${escapeHTML(String(item.value))}</strong>
    </article>
  `).join("");
}

function selectSponsor(sponsorID) {
  const sponsor = sponsorAdminState.sponsors.find((item) => String(item.id) === String(sponsorID));
  if (!sponsor) return;

  sponsorAdminState.selectedSponsorID = sponsor.id;
  document.getElementById("sponsorIdField").value = sponsor.id;
  document.getElementById("sponsorBrandKeyField").value = sponsor.brand_key || "";
  document.getElementById("sponsorNameField").value = sponsor.name || "";
  document.getElementById("sponsorBusinessTypeField").value = sponsor.business_type || "food";
  document.getElementById("sponsorTitleField").value = sponsor.title || "";
  document.getElementById("sponsorDescriptionField").value = sponsor.description || "";
  document.getElementById("sponsorContactInfoField").value = sponsor.contact_info || "";
  document.getElementById("sponsorMediaUrlField").value = sponsor.media_url || "";
  document.getElementById("sponsorLogoUrlField").value = sponsor.logo_url || "";
  document.getElementById("sponsorCityCodeField").value = sponsor.city_code || "";
  document.getElementById("sponsorAreaLabelField").value = sponsor.area_label || "";
  document.getElementById("sponsorLatitudeField").value = sponsor.latitude ?? "";
  document.getElementById("sponsorLongitudeField").value = sponsor.longitude ?? "";
  document.getElementById("sponsorAddressField").value = sponsor.address || "";
  document.getElementById("sponsorServiceHoursField").value = sponsor.service_hours || "";
  document.getElementById("sponsorServiceTagsField").value = Array.isArray(sponsor.service_tags) ? sponsor.service_tags.join(", ") : "";
  document.getElementById("sponsorLandingUrlField").value = sponsor.landing_url || "";
  document.getElementById("sponsorBadgeField").value = sponsor.sponsor_badge || "sponsored";
  document.getElementById("sponsorVerifiedField").checked = Boolean(sponsor.is_verified);
  document.getElementById("sponsorStatusField").value = sponsor.status || "active";
  document.getElementById("sponsorFormHeading").textContent = `编辑赞助商 #${sponsor.id}`;
  document.getElementById("reportSponsorIdFilter").value = sponsor.id;
  setMobilePanelView("sponsors", "editor");
  renderSponsors();
  syncSponsorActionButtons();
  loadReports().catch((error) => showAdminStatus(error.message || "刷新报表失败。", "error"));
}

function selectCampaign(campaignID) {
  const campaign = sponsorAdminState.campaigns.find((item) => String(item.id) === String(campaignID));
  if (!campaign) return;

  sponsorAdminState.selectedCampaignID = campaign.id;
  document.getElementById("campaignIdField").value = campaign.id;
  document.getElementById("campaignSponsorIdField").value = campaign.sponsor_id ?? "";
  document.getElementById("campaignPackageTierField").value = campaign.package_tier || "guard_30";
  document.getElementById("campaignTargetSceneField").value = campaign.target_scene || "both";
  document.getElementById("campaignCityCodeField").value = campaign.city_code || "";
  document.getElementById("campaignAreaLabelField").value = campaign.area_label || "";
  document.getElementById("campaignAreaCenterLatField").value = campaign.area_center_lat ?? "";
  document.getElementById("campaignAreaCenterLngField").value = campaign.area_center_lng ?? "";
  document.getElementById("campaignAreaRadiusField").value = campaign.area_radius_meters ?? "";
  document.getElementById("campaignShareRatioField").value = campaign.share_ratio ?? "";
  document.getElementById("campaignPriorityWeightField").value = campaign.priority_weight ?? "";
  document.getElementById("campaignCityMultiplierField").value = campaign.city_multiplier ?? "";
  document.getElementById("campaignSceneMultiplierField").value = campaign.scene_multiplier ?? "";
  document.getElementById("campaignMonthlyPriceField").value = campaign.monthly_price_cents ?? "";
  document.getElementById("campaignDailyPrimaryCapField").value = campaign.daily_primary_cap_per_user ?? "";
  document.getElementById("campaignDailySecondaryCapField").value = campaign.daily_secondary_cap_per_user ?? "";
  document.getElementById("campaignMaxSecondarySlotsField").value = campaign.max_secondary_slots ?? "";
  document.getElementById("campaignStartAtField").value = toDatetimeLocalValue(campaign.start_at);
  document.getElementById("campaignEndAtField").value = toDatetimeLocalValue(campaign.end_at);
  document.getElementById("campaignStatusField").value = campaign.status || "active";
  document.getElementById("campaignFormHeading").textContent = `编辑投放计划 #${campaign.id}`;
  document.getElementById("reportCampaignIdFilter").value = campaign.id;
  setMobilePanelView("campaigns", "editor");
  renderCampaigns();
  syncCampaignActionButtons();
  loadReports().catch((error) => showAdminStatus(error.message || "刷新报表失败。", "error"));
}

function resetSponsorForm() {
  sponsorAdminState.selectedSponsorID = null;
  document.getElementById("sponsorForm").reset();
  document.getElementById("sponsorIdField").value = "";
  document.getElementById("sponsorStatusField").value = "active";
  document.getElementById("sponsorBusinessTypeField").value = "food";
  document.getElementById("sponsorFormHeading").textContent = "新建赞助商";
  renderSponsors();
  syncSponsorActionButtons();
}

function resetCampaignForm() {
  sponsorAdminState.selectedCampaignID = null;
  document.getElementById("campaignForm").reset();
  document.getElementById("campaignIdField").value = "";
  document.getElementById("campaignStatusField").value = "active";
  document.getElementById("campaignPackageTierField").value = "guard_30";
  document.getElementById("campaignTargetSceneField").value = "risk";
  document.getElementById("campaignFormHeading").textContent = "新建投放计划";
  renderCampaigns();
  syncCampaignActionButtons();
}

function syncSponsorDerivedControls() {
  if (sponsorAdminState.selectedSponsorID && !sponsorAdminState.sponsors.some((item) => String(item.id) === String(sponsorAdminState.selectedSponsorID))) {
    resetSponsorForm();
  }
}

function syncCampaignDerivedControls() {
  if (sponsorAdminState.selectedCampaignID && !sponsorAdminState.campaigns.some((item) => String(item.id) === String(sponsorAdminState.selectedCampaignID))) {
    resetCampaignForm();
  }
}

function getSelectedSponsor() {
  return sponsorAdminState.sponsors.find((item) => String(item.id) === String(sponsorAdminState.selectedSponsorID)) || null;
}

function getSelectedCampaign() {
  return sponsorAdminState.campaigns.find((item) => String(item.id) === String(sponsorAdminState.selectedCampaignID)) || null;
}

function syncSponsorActionButtons() {
  const sponsor = getSelectedSponsor();
  const archiveButton = document.getElementById("archiveSponsorButton");
  const deleteButton = document.getElementById("deleteSponsorButton");
  const hasSelection = Boolean(sponsor);
  const isArchived = sponsor && String(sponsor.status || "").toLowerCase() === "blocked";

  archiveButton.classList.toggle("hidden", !hasSelection);
  deleteButton.classList.toggle("hidden", !hasSelection);
  archiveButton.disabled = !hasSelection || isArchived;
  deleteButton.disabled = !hasSelection || !isArchived;
  archiveButton.textContent = isArchived ? "已归档" : "归档赞助商";
}

function syncCampaignActionButtons() {
  const campaign = getSelectedCampaign();
  const archiveButton = document.getElementById("archiveCampaignButton");
  const deleteButton = document.getElementById("deleteCampaignButton");
  const hasSelection = Boolean(campaign);
  const isArchived = campaign && String(campaign.status || "").toLowerCase() === "expired";

  archiveButton.classList.toggle("hidden", !hasSelection);
  deleteButton.classList.toggle("hidden", !hasSelection);
  archiveButton.disabled = !hasSelection || isArchived;
  deleteButton.disabled = !hasSelection || !isArchived;
  archiveButton.textContent = isArchived ? "已归档" : "归档投放";
}

async function apiFetchJSON(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (sponsorAdminState.token) {
    headers.set("X-Admin-Token", sponsorAdminState.token);
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `请求失败（${response.status}）`;
    throw new Error(message);
  }
  return payload;
}

function resolveAdminToken() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token") || localStorage.getItem("firefly_admin_token") || "";
  if (token) {
    localStorage.setItem("firefly_admin_token", token);
  }
  ensureAdminScriptToken(token);
  return token;
}

function ensureAdminScriptToken(token = sponsorAdminState.token) {
  const script = document.querySelector('script[src^="/admin.js"]');
  if (!script || !token) return;
  const current = new URL(script.src, window.location.origin);
  if (current.searchParams.get("token") === token) return;
  current.searchParams.set("token", token);
  script.src = current.pathname + current.search;
}

function hydrateTokenField() {
  document.getElementById("adminTokenField").value = sponsorAdminState.token;
}

function showAdminStatus(message, tone) {
  const box = document.getElementById("adminStatus");
  box.textContent = message;
  box.classList.remove("hidden");
  box.style.borderColor = tone === "success"
    ? "rgba(76,183,130,0.6)"
    : tone === "error"
      ? "rgba(228,87,87,0.6)"
      : "rgba(76,139,245,0.6)";
}

function setMobilePanelView(group, view) {
  if (!group || !view) return;
  sponsorAdminState.mobilePanelViews[group] = view;
  syncMobilePanelViews();
}

function syncMobilePanelViews() {
  document.querySelectorAll("[data-mobile-stack]").forEach((section) => {
    const group = section.dataset.mobileStack;
    const view = sponsorAdminState.mobilePanelViews[group] || "list";
    section.dataset.mobileView = view;
  });

  document.querySelectorAll("[data-mobile-panel][data-mobile-view]").forEach((button) => {
    const isActive = sponsorAdminState.mobilePanelViews[button.dataset.mobilePanel] === button.dataset.mobileView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function setQueryParam(params, key, value) {
  const normalized = String(value || "").trim();
  if (normalized) {
    params.set(key, normalized);
  }
}

function parseTags(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readNumberField(id) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? value : 0;
}

function readIntegerField(id) {
  const value = Number.parseInt(document.getElementById(id).value, 10);
  return Number.isFinite(value) ? value : 0;
}

function readDateTimeField(id) {
  const raw = document.getElementById(id).value;
  return raw ? new Date(raw).toISOString() : "";
}

function emptyToNull(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function formatCampaignLabel(campaign) {
  const sponsor = sponsorAdminState.sponsors.find((item) => String(item.id) === String(campaign.sponsor_id));
  const sponsorLabel = sponsor?.name || `Sponsor ${campaign.sponsor_id || "--"}`;
  return `${sponsorLabel} · ${campaign.target_scene || "both"}`;
}

function formatCampaignWindow(startAt, endAt) {
  return `${formatTime(startAt)} - ${formatTime(endAt)}`;
}

function formatCurrencyFromCents(value) {
  const numeric = Number(value || 0) / 100;
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2
  }).format(numeric);
}

function formatMetric(value) {
  if (value === null || value === undefined || value === "") return "--";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return String(Math.round(numeric * 100) / 100);
}

function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getSponsorStatusTone(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "approved";
    case "paused":
      return "pending";
    default:
      return "rejected";
  }
}

function getCampaignStatusTone(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "support";
    case "paused":
      return "pending";
    default:
      return "hidden";
  }
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value = "") {
  return String(value).replaceAll('"', "&quot;");
}
