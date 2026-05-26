const state = {
  locale: "zh-CN",
  dict: {},
  config: null,
  map: null,
  markers: [],
  sponsors: [],
  currentPosition: null,
  activeMarker: null,
  activeSponsor: null,
  activeFeedbackSummary: null,
  selectedFeedbackAction: null,
  filters: { risk: true, help: true, support: true },
  composerKind: null,
  submitCoordinates: null,
  layers: { risk: null, help: null, support: null, user: null },
  markerLayers: new Map(),
  canvasFingerprint: localStorage.getItem("firefly_canvas_fp") || createFingerprint(),
  sponsorDismissedToday: JSON.parse(localStorage.getItem("firefly_sponsor_dismissed_today") || "[]"),
  sponsorSessionID: localStorage.getItem("firefly_sponsor_session_id") || createSessionID(),
  isMobileSheet: false,
  sheet: {
    mode: "half",
    drag: null
  },
  me: {
    reputation: null,
    activity: null
  }
};

const categoryMap = {
  abuse: { group: "risk" },
  poison: { group: "risk" },
  trap: { group: "risk" },
  theft: { group: "risk" },
  missing_pet: { group: "risk" },
  suspicious_vehicle: { group: "risk" },
  station: { group: "help" },
  food_bank: { group: "help" },
  friendly_clinic: { group: "help" },
  helper: { group: "help" },
  trap_support: { group: "help" }
};

const consensusToneMap = {
  stable: "approved",
  confirmed: "approved",
  verified: "approved",
  emerging: "pending",
  pending: "pending",
  limited: "pending",
  contested: "rejected",
  disputed: "rejected",
  stale: "hidden",
  expired: "hidden"
};

localStorage.setItem("firefly_canvas_fp", state.canvasFingerprint);
localStorage.setItem("firefly_sponsor_session_id", state.sponsorSessionID);

document.addEventListener("DOMContentLoaded", async () => {
  await bootstrap();
});

async function bootstrap() {
  state.locale = resolvePreferredLocale();
  await loadLocale(state.locale);
  bindUI();
  await loadConfig();
  initMap();
  registerServiceWorker();
  await locateUser();
  await Promise.allSettled([loadMarkers(), loadCommunityState()]);
}

async function loadConfig() {
  const response = await fetch("/api/config");
  const payload = await response.json();
  state.config = payload.data;
}

function bindUI() {
  document.querySelectorAll(".lang-button").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadLocale(button.dataset.lang);
      renderCommunitySnapshot();
      if (state.activeMarker) {
        await openMarkerDetail(state.activeMarker.id);
      }
      await loadMarkers();
    });
  });

  document.getElementById("riskToggle").addEventListener("click", () => {
    state.filters.risk = !state.filters.risk;
    document.getElementById("riskToggle").classList.toggle("active", state.filters.risk);
    renderMarkers();
    renderLists();
  });

  document.getElementById("helpToggle").addEventListener("click", () => {
    state.filters.help = !state.filters.help;
    document.getElementById("helpToggle").classList.toggle("active", state.filters.help);
    renderMarkers();
    renderLists();
  });

  document.getElementById("supportToggle").addEventListener("click", () => {
    state.filters.support = !state.filters.support;
    document.getElementById("supportToggle").classList.toggle("active", state.filters.support);
    renderMarkers();
    renderLists();
  });

  document.getElementById("locateBtn").addEventListener("click", locateUser);
  document.getElementById("submitFab").addEventListener("click", openComposer);
  document.getElementById("closeModal").addEventListener("click", closeComposer);
  document.getElementById("closeDetail").addEventListener("click", closeDetail);
  document.getElementById("backToChooser").addEventListener("click", showComposerChooser);
  document.getElementById("useMapCenter").addEventListener("click", useMapCenterForSubmission);
  document.getElementById("submitForm").addEventListener("submit", submitMarker);
  document.getElementById("searchInput").addEventListener("keydown", handleSearch);
  document.getElementById("refreshFeedbackSummary").addEventListener("click", refreshActiveFeedbackSummary);
  document.getElementById("submitFeedbackButton").addEventListener("click", submitStructuredFeedback);
  document.getElementById("escalateButton").addEventListener("click", escalateActiveMarker);
  document.getElementById("contactButton").addEventListener("click", () => {
    if (!state.activeMarker) return;
    const text = state.activeMarker.contact_info || t("detail.contactFallback", "In-app contact only for now. Direct contact details are not public.");
    showBanner(text, "info");
  });
  document.getElementById("sponsorNavigateButton").addEventListener("click", () => handleSponsorAction("navigate"));
  document.getElementById("sponsorContactButton").addEventListener("click", () => handleSponsorAction("contact"));
  document.getElementById("sponsorDetailButton").addEventListener("click", () => handleSponsorAction("view_details"));
  document.getElementById("sponsorDismissButton").addEventListener("click", () => dismissActiveSponsor());

  document.querySelectorAll(".submission-option").forEach((button) => {
    button.addEventListener("click", () => showComposerForm(button.dataset.kind));
  });

  initBottomSheet();
}

function initMap() {
  state.map = L.map("map", {
    zoomControl: false,
    preferCanvas: true
  }).setView([state.config.default_latitude, state.config.default_longitude], 14);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 19
  }).addTo(state.map);

  L.control.zoom({ position: "bottomright" }).addTo(state.map);

  state.layers.risk = L.layerGroup().addTo(state.map);
  state.layers.help = L.layerGroup().addTo(state.map);
  state.layers.support = L.layerGroup().addTo(state.map);
  state.layers.user = L.layerGroup().addTo(state.map);

  state.map.on("click", (event) => {
    if (!document.getElementById("submitForm").classList.contains("hidden")) {
      state.submitCoordinates = event.latlng;
      updateLocationPreview();
      showBanner(t("submit.mapPicked", "Submission coordinates updated"), "info");
    }
  });
}

function initBottomSheet() {
  const sheet = document.getElementById("nearbySheet");
  const dragZone = document.getElementById("sheetDragZone");
  const header = sheet?.querySelector(".sheet-header");
  if (!sheet || !dragZone || !header) return;

  const startDrag = (event) => {
    if (!state.isMobileSheet) return;
    const pointY = getPointY(event);
    if (pointY === null) return;
    const heights = getSheetHeights();
    state.sheet.drag = {
      pointerId: event.pointerId ?? null,
      startY: pointY,
      startHeight: sheet.getBoundingClientRect().height,
      heights
    };
    sheet.classList.add("dragging");
    dragZone.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const moveDrag = (event) => {
    if (!state.sheet.drag || !state.isMobileSheet) return;
    const pointY = getPointY(event);
    if (pointY === null) return;
    const deltaY = state.sheet.drag.startY - pointY;
    const minHeight = state.sheet.drag.heights.peek;
    const maxHeight = state.sheet.drag.heights.full;
    const nextHeight = clamp(state.sheet.drag.startHeight + deltaY, minHeight, maxHeight);
    applySheetHeight(nextHeight, { temporary: true });
    event.preventDefault();
  };

  const endDrag = (event) => {
    if (!state.sheet.drag) return;
    const drag = state.sheet.drag;
    state.sheet.drag = null;
    sheet.classList.remove("dragging");
    dragZone.releasePointerCapture?.(event.pointerId);
    snapSheetToNearest(sheet.getBoundingClientRect().height, drag.heights);
  };

  [dragZone, header].forEach((el) => {
    el.addEventListener("pointerdown", startDrag);
  });
  window.addEventListener("pointermove", moveDrag, { passive: false });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", () => syncBottomSheet({ preserveMode: true }));

  syncBottomSheet({ preserveMode: true });
}

function getPointY(event) {
  if (typeof event.clientY === "number") return event.clientY;
  if (event.touches?.[0]) return event.touches[0].clientY;
  return null;
}

function getSheetHeights() {
  const viewportHeight = window.innerHeight;
  const safePeek = clamp(Math.round(viewportHeight * 0.14), 92, 132);
  const safeHalf = clamp(Math.round(viewportHeight * 0.38), 260, 420);
  const safeFull = clamp(Math.round(viewportHeight * 0.8), 420, viewportHeight - 84);
  return {
    peek: safePeek,
    half: Math.max(safeHalf, safePeek + 96),
    full: Math.max(safeFull, safeHalf + 96)
  };
}

function syncBottomSheet({ preserveMode = false } = {}) {
  state.isMobileSheet = window.innerWidth <= 640;
  const sheet = document.getElementById("nearbySheet");
  const app = document.getElementById("app");
  if (!sheet || !app) return;

  if (!state.isMobileSheet) {
    state.sheet.mode = "half";
    sheet.dataset.sheetState = "desktop";
    sheet.style.removeProperty("--sheet-height");
    app.style.removeProperty("--sheet-visible-height");
    app.style.removeProperty("--sheet-visible-offset");
    return;
  }

  const heights = getSheetHeights();
  const mode = preserveMode ? state.sheet.mode : "half";
  if (!heights[mode]) {
    state.sheet.mode = "half";
  }
  setSheetMode(state.sheet.mode, { animate: false });
}

function setSheetMode(mode, { animate = true } = {}) {
  const sheet = document.getElementById("nearbySheet");
  if (!sheet || !state.isMobileSheet) return;
  const heights = getSheetHeights();
  const targetMode = heights[mode] ? mode : "half";
  state.sheet.mode = targetMode;
  sheet.dataset.sheetState = targetMode;
  sheet.classList.toggle("is-animated", animate);
  applySheetHeight(heights[targetMode], { temporary: false });
  window.setTimeout(() => sheet.classList.remove("is-animated"), 220);
}

function applySheetHeight(height, { temporary = false } = {}) {
  const sheet = document.getElementById("nearbySheet");
  const app = document.getElementById("app");
  if (!sheet || !app) return;
  const roundedHeight = Math.round(height);
  sheet.style.setProperty("--sheet-height", `${roundedHeight}px`);
  app.style.setProperty("--sheet-visible-height", `${roundedHeight}px`);
  const offset = Math.max(roundedHeight - 18, 92);
  app.style.setProperty("--sheet-visible-offset", `${offset}px`);
  if (!temporary) {
    const sheetMode = nearestSheetMode(roundedHeight, getSheetHeights());
    sheet.dataset.sheetState = sheetMode;
    state.sheet.mode = sheetMode;
  }
}

function nearestSheetMode(height, heights) {
  return Object.entries(heights)
    .sort((a, b) => Math.abs(a[1] - height) - Math.abs(b[1] - height))[0][0];
}

function snapSheetToNearest(height, heights) {
  setSheetMode(nearestSheetMode(height, heights), { animate: true });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function locateUser() {
  if (!navigator.geolocation) {
    fallbackLocation();
    return;
  }

  showBanner(t("map.locating", "Locating your current position"), "info");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      state.currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      state.submitCoordinates = state.currentPosition;
      state.map.setView([state.currentPosition.lat, state.currentPosition.lng], 15);
      renderUserLocation();
      updateLocationSummary();
      updateLocationPreview();
      await Promise.allSettled([loadMarkers(), loadCommunityState()]);
    },
    () => {
      fallbackLocation();
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function fallbackLocation() {
  state.currentPosition = {
    lat: state.config.default_latitude,
    lng: state.config.default_longitude
  };
  state.submitCoordinates = state.currentPosition;
  state.map.setView([state.currentPosition.lat, state.currentPosition.lng], 14);
  renderUserLocation();
  updateLocationSummary();
  updateLocationPreview();
  loadMarkers();
  loadCommunityState();
}

function renderUserLocation() {
  state.layers.user.clearLayers();
  if (!state.currentPosition) return;
  const circle = L.circleMarker([state.currentPosition.lat, state.currentPosition.lng], {
    radius: 8,
    color: "#4C8BF5",
    weight: 2,
    fillColor: "#A8C6FF",
    fillOpacity: 0.85
  });
  circle.addTo(state.layers.user);
}

async function loadMarkers() {
  if (!state.currentPosition) return;
  const params = new URLSearchParams({
    lat: String(state.currentPosition.lat),
    lng: String(state.currentPosition.lng),
    radius: "5000",
    limit: "80",
    lang: state.locale
  });
  const response = await fetch(`/api/markers?${params.toString()}`);
  const payload = await response.json();
  state.markers = payload.data || [];
  await loadSponsors();
  renderMarkers();
  renderLists();
}

async function loadSponsors() {
  if (!state.currentPosition) return;
  const params = new URLSearchParams({
    lat: String(state.currentPosition.lat),
    lng: String(state.currentPosition.lng),
    radius: "5000",
    limit: "3",
    session_id: state.sponsorSessionID,
    lang: state.locale,
    scene: deriveSponsorScene()
  });
  const response = await fetch(`/api/sponsors/nearby?${params.toString()}`, {
    headers: {
      "X-Canvas-Fingerprint": state.canvasFingerprint
    }
  });
  const payload = await response.json().catch(() => ({}));
  const allSponsors = Array.isArray(payload.data) ? payload.data : [];
  const dismissed = normalizeDismissedSponsors();
  state.sponsors = allSponsors
    .filter((item) => !dismissed.includes(String(item.id)))
    .sort((a, b) => {
      const rankDiff = Number(a.rank_position || 99) - Number(b.rank_position || 99);
      if (rankDiff !== 0) return rankDiff;
      return Number(a.distance_m || 0) - Number(b.distance_m || 0);
    });
}

async function loadCommunityState() {
  const [reputationResult, activityResult] = await Promise.allSettled([
    fetch("/api/me/reputation", {
      headers: {
        "X-Canvas-Fingerprint": state.canvasFingerprint
      }
    }),
    fetch("/api/me/activity", {
      headers: {
        "X-Canvas-Fingerprint": state.canvasFingerprint
      }
    })
  ]);

  state.me.reputation = await parseSettledJSON(reputationResult);
  state.me.activity = await parseSettledJSON(activityResult);
  renderCommunitySnapshot();
}

function renderCommunitySnapshot() {
  const reputationData = state.me.reputation?.data || {};
  const activityData = state.me.activity?.data || {};

  document.getElementById("reputationScore").textContent = coalesceMetric(
    reputationData.score,
    reputationData.reputation_score,
    reputationData.level,
    "--"
  );

  document.getElementById("reputationMeta").textContent = buildInlineMeta([
    countMeta(t("community.confirmations", "Confirmations"), reputationData.confirmation_count),
    countMeta(t("community.disputes", "Disputes"), reputationData.dispute_count),
    countMeta(t("community.credits", "Helpful notes"), reputationData.helpful_note_count)
  ], t("community.reputationHint", "Build trust through confirmations and useful notes."));

  document.getElementById("activityScore").textContent = coalesceMetric(
    activityData.total_actions,
    activityData.recent_actions,
    Array.isArray(activityData.items) ? activityData.items.length : null,
    "--"
  );

  document.getElementById("activityMeta").textContent = buildInlineMeta([
    countMeta(t("community.last24h", "Last 24h"), activityData.last_24h_count),
    countMeta(t("community.last7d", "Last 7d"), activityData.last_7d_count),
    activityData.last_action_at ? `${t("community.lastAction", "Last action")} ${formatTimestamp(activityData.last_action_at)}` : ""
  ], t("community.activityHint", "Your local confirmations and disputes appear here."));
}

function renderMarkers() {
  state.layers.risk.clearLayers();
  state.layers.help.clearLayers();
  state.layers.support.clearLayers();
  state.markerLayers.clear();

  const visible = getVisibleMarkers();
  visible.forEach((marker) => {
    const meta = categoryMap[marker.category] || { group: "risk" };
    const layer = meta.group === "help" ? state.layers.help : state.layers.risk;
    const icon = L.divIcon({
      className: `custom-marker ${meta.group === "help" ? "help-marker" : "risk-marker"}`,
      iconSize: [18, 18],
      iconAnchor: [9, 18]
    });

    const mapMarker = L.marker([marker.latitude, marker.longitude], { icon });
    mapMarker.on("click", () => {
      state.map.flyTo([marker.latitude, marker.longitude], Math.max(state.map.getZoom(), 16), { duration: 0.45 });
      openMarkerDetail(marker.id);
    });
    mapMarker.bindPopup(createMarkerPopup(marker), {
      closeButton: false,
      offset: [0, -8],
      className: "marker-popup-shell"
    });
    mapMarker.bindTooltip(marker.title, {
      direction: "top",
      offset: [0, -12]
    });
    mapMarker.addTo(layer);
    state.markerLayers.set(String(marker.id), mapMarker);
  });

  if (!state.filters.support) return;
  state.sponsors.forEach((sponsor) => {
    const icon = L.divIcon({
      className: `custom-marker support-marker ${sponsor.sponsor_role === "primary" ? "primary-support-marker" : ""}`,
      iconSize: [18, 18],
      iconAnchor: [9, 18]
    });
    const mapMarker = L.marker([sponsor.latitude, sponsor.longitude], { icon, zIndexOffset: sponsor.sponsor_role === "primary" ? 120 : 80 });
    mapMarker.on("click", () => {
      state.map.flyTo([sponsor.latitude, sponsor.longitude], Math.max(state.map.getZoom(), 16), { duration: 0.45 });
      openSponsorDetail(sponsor.id);
    });
    mapMarker.bindPopup(createSponsorPopup(sponsor), {
      closeButton: false,
      offset: [0, -8],
      className: "marker-popup-shell"
    });
    mapMarker.bindTooltip(sponsor.name, {
      direction: "top",
      offset: [0, -12]
    });
    mapMarker.addTo(state.layers.support);
    state.markerLayers.set(`sponsor-${sponsor.id}`, mapMarker);
  });
}

function renderLists() {
  const visible = getVisibleMarkers();
  const riskItems = visible.filter((item) => categoryMap[item.category]?.group === "risk").slice(0, 4);
  const helpItems = visible.filter((item) => categoryMap[item.category]?.group === "help").slice(0, 4);
  const supportItems = state.filters.support ? state.sponsors.slice(0, 5) : [];

  renderMarkerList(document.getElementById("riskList"), riskItems, "risk");
  renderMarkerList(document.getElementById("helpList"), helpItems, "help");
  renderSponsorList(document.getElementById("supportList"), supportItems);
}

function renderMarkerList(container, items, type) {
  if (!items.length) {
    container.innerHTML = `<li class="marker-item"><strong>${t("common.empty", "No data yet")}</strong><span>${type === "risk" ? t("map.emptyRisk", "No public risk markers nearby") : t("map.emptyHelp", "No public care markers nearby")}</span></li>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <li class="marker-item" data-id="${item.id}">
      <div class="marker-item-top">
        <strong>${escapeHTML(item.title)}</strong>
        ${renderConsensusPill(item.consensus_status)}
      </div>
      <span>${escapeHTML(item.description)}</span>
      <div class="marker-meta">
        <span>${escapeHTML(t(`marker.category.${item.category}`, item.category))}</span>
        <span>${formatDistance(item.distance_m)}</span>
      </div>
      <div class="marker-scoreline">
        <span>${t("detail.confidenceShort", "Conf.")} ${formatScore(item.confidence_score)}</span>
        <span>${t("detail.freshnessShort", "Fresh.")} ${formatScore(item.freshness_score)}</span>
      </div>
    </li>
  `).join("");

  container.querySelectorAll(".marker-item").forEach((item) => {
    if (!item.dataset.id) return;
    item.addEventListener("click", () => openMarkerDetail(item.dataset.id));
  });
}

function renderSponsorList(container, items) {
  if (!items.length) {
    container.innerHTML = `<li class="marker-item support"><strong>${t("common.empty", "No data yet")}</strong><span>${t("map.emptySupport", "No sponsored support points nearby")}</span></li>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <li class="marker-item support" data-sponsor-id="${item.id}">
      <div class="marker-item-top">
        <strong>${escapeHTML(item.name)}</strong>
        <span class="status-pill support">${escapeHTML(t("sponsor.badge", "Sponsored"))}</span>
      </div>
      <span>${escapeHTML(item.description)}</span>
      <div class="marker-meta">
        <span>${escapeHTML(t(`sponsor.type.${item.business_type}`, item.business_type))}</span>
        <span>${formatDistance(item.distance_m)}</span>
      </div>
      <div class="marker-scoreline">
        <span>${escapeHTML(item.sponsor_role === "primary" ? t("sponsor.primary", "Primary support") : t("sponsor.secondary", "Support node"))}</span>
        <span>${escapeHTML(item.campaign_tier || "")}</span>
      </div>
    </li>
  `).join("");

  container.querySelectorAll("[data-sponsor-id]").forEach((item) => {
    item.addEventListener("click", () => openSponsorDetail(item.dataset.sponsorId));
  });
}

async function openMarkerDetail(markerID) {
  if (state.isMobileSheet) {
    setSheetMode("peek");
  }
  const detailResponse = await fetch(`/api/markers/${markerID}?lang=${state.locale}`);
  const detailPayload = await detailResponse.json();
  if (!detailPayload.data) return;

  const summaryResponse = await fetch(`/api/markers/${markerID}/feedback-summary?lang=${state.locale}`);
  const summaryPayload = await summaryResponse.json().catch(() => ({}));

  state.activeMarker = detailPayload.data;
  state.activeSponsor = null;
  state.activeFeedbackSummary = summaryPayload.data?.feedback_summary || summaryPayload.data || detailPayload.data.feedback_summary || null;
  state.selectedFeedbackAction = state.activeMarker.available_feedback_actions?.[0] || null;

  const marker = state.activeMarker;
  const listMarker = state.markers.find((item) => String(item.id) === String(markerID));
  const group = categoryMap[marker.category]?.group === "help" ? "help" : "risk";

  document.getElementById("detailCategory").textContent = t(`marker.category.${marker.category}`, marker.category);
  document.getElementById("detailCategory").style.background = group === "help" ? "rgba(255,107,87,0.12)" : "rgba(213,139,42,0.12)";
  document.getElementById("detailCategory").style.color = group === "help" ? "var(--help)" : "var(--risk-strong)";
  document.getElementById("detailTitle").textContent = marker.title;
  document.getElementById("detailMeta").textContent = `${formatDistance(marker.distance_m || listMarker?.distance_m || 0)} · ${marker.is_translated ? t("detail.translated", "Translated") : t("detail.original", "Original")}`;
  document.getElementById("detailKind").textContent = group === "help" ? "CARE" : "RISK";
  document.getElementById("detailAddress").textContent = marker.address;
  document.getElementById("detailDescription").textContent = marker.description;
  document.getElementById("detailContact").textContent = marker.contact_info || t("detail.contactFallback", "In-app contact only for now. Direct contact details are not public.");
  document.getElementById("detailPrivacyNote").textContent = group === "help"
    ? t("detail.approximate", "This care marker only shows an approximate area to protect the real-world location and people involved.")
    : t("detail.precise", "Risk markers aim to stay operationally useful. Use time and nearby context before acting.");
  document.getElementById("detailConsensusStatus").className = `status-pill consensus ${getConsensusTone(marker.consensus_status)}`;
  document.getElementById("detailConsensusStatus").textContent = formatConsensusStatus(marker.consensus_status);
  document.getElementById("detailFeedbackHeadline").textContent = buildInlineMeta([
    countMeta(t("detail.support", "Support"), marker.support_score),
    countMeta(t("detail.dispute", "Dispute"), marker.dispute_score),
    marker.last_confirmed_at ? `${t("detail.lastConfirmed", "Last confirmed")} ${formatTimestamp(marker.last_confirmed_at)}` : ""
  ], t("detail.feedbackHint", "Share what you can verify on the ground."));

  renderDetailMetrics(marker);
  renderFeedbackSummary(state.activeFeedbackSummary);
  renderFeedbackActions(marker.available_feedback_actions || []);
  document.getElementById("feedbackNote").value = "";
  document.getElementById("detailGovernancePanel").classList.remove("hidden");
  document.getElementById("detailFeedbackPanel").classList.remove("hidden");
  document.getElementById("markerActionGroup").classList.remove("hidden");
  document.getElementById("sponsorActionGroup").classList.add("hidden");

  const mediaWrap = document.getElementById("detailMediaWrap");
  const mediaImage = document.getElementById("detailMediaImage");
  const mediaURL = marker.media_url || marker.media_thumb_url;
  if (mediaURL) {
    mediaImage.src = mediaURL;
    mediaImage.alt = marker.title;
    mediaWrap.classList.remove("hidden");
  } else {
    mediaImage.removeAttribute("src");
    mediaWrap.classList.add("hidden");
  }

  const markerLayer = state.markerLayers.get(String(markerID));
  if (markerLayer) {
    markerLayer.openPopup();
  }

  document.getElementById("escalateButton").classList.toggle("hidden", !isEscalateFeasible(marker));
  document.getElementById("detailPanel").classList.remove("hidden");
}

async function openSponsorDetail(sponsorID) {
  const sponsor = state.sponsors.find((item) => String(item.id) === String(sponsorID));
  if (!sponsor) return;
  if (state.isMobileSheet) {
    setSheetMode("peek");
  }
  state.activeSponsor = sponsor;
  state.activeMarker = null;
  state.activeFeedbackSummary = null;
  state.selectedFeedbackAction = null;

  document.getElementById("detailCategory").textContent = t("sponsor.badge", "Sponsored");
  document.getElementById("detailCategory").style.background = "rgba(63, 185, 168, 0.14)";
  document.getElementById("detailCategory").style.color = "var(--support-strong)";
  document.getElementById("detailTitle").textContent = sponsor.name;
  document.getElementById("detailMeta").textContent = `${formatDistance(sponsor.distance_m || 0)} · ${t("sponsor.primaryTitle", "Nearby support node")}`;
  document.getElementById("detailKind").textContent = "SUPPORT";
  document.getElementById("detailAddress").textContent = sponsor.address;
  document.getElementById("detailDescription").textContent = sponsor.description;
  document.getElementById("detailContact").textContent = sponsor.contact_info || t("sponsor.contactFallback", "Open the sponsor card actions to navigate or request contact.");
  document.getElementById("detailPrivacyNote").textContent = t("sponsor.detailNote", "Sponsored support points are labeled clearly and never affect community consensus.");
  document.getElementById("detailConsensusStatus").className = "status-pill support";
  document.getElementById("detailConsensusStatus").textContent = sponsor.sponsor_role === "primary" ? t("sponsor.primary", "Primary support") : t("sponsor.secondary", "Support node");
  document.getElementById("detailFeedbackHeadline").textContent = buildInlineMeta([
    t(`sponsor.type.${sponsor.business_type}`, sponsor.business_type),
    sponsor.target_scene ? t(`sponsor.scene.${sponsor.target_scene}`, sponsor.target_scene) : "",
    sponsor.service_hours || ""
  ], t("sponsor.detailHint", "This node supports local rescue and response workflows."));
  document.getElementById("detailMetricGrid").innerHTML = [
    metricCard(t("sponsor.role", "Role"), sponsor.sponsor_role === "primary" ? t("sponsor.primary", "Primary support") : t("sponsor.secondary", "Support node"), t("sponsor.roleHint", "Primary support appears first in the current map session.")),
    metricCard(t("sponsor.typeLabel", "Service"), t(`sponsor.type.${sponsor.business_type}`, sponsor.business_type), t("sponsor.typeHint", "Tagged by the type of help this business can provide.")),
    metricCard(t("sponsor.distance", "Distance"), formatDistance(sponsor.distance_m), t("sponsor.distanceHint", "Estimated from your current map center.")),
    metricCard(t("sponsor.hours", "Hours"), sponsor.service_hours || t("sponsor.hoursUnknown", "Hours not published"), t("sponsor.hoursHint", "Use details and contact before heading over."))
  ].join("");
  document.getElementById("detailFeedbackSummary").innerHTML = sponsor.service_tags?.length
    ? sponsor.service_tags.map((tag) => `<li class="summary-item"><span>${escapeHTML(t(`sponsor.tag.${tag}`, formatSummaryLabel(tag)))}</span><strong>${escapeHTML(t("sponsor.available", "Available"))}</strong></li>`).join("")
    : `<li class="summary-item">${t("sponsor.noTags", "No support tags published yet.")}</li>`;
  document.getElementById("feedbackActionButtons").innerHTML = `<div class="detail-map-note">${t("sponsor.noFeedback", "Sponsored support nodes do not participate in community feedback scoring.")}</div>`;
  document.getElementById("feedbackNote").value = "";
  document.getElementById("detailGovernancePanel").classList.add("hidden");
  document.getElementById("detailFeedbackPanel").classList.add("hidden");
  document.getElementById("markerActionGroup").classList.add("hidden");
  document.getElementById("sponsorActionGroup").classList.remove("hidden");

  const mediaWrap = document.getElementById("detailMediaWrap");
  const mediaImage = document.getElementById("detailMediaImage");
  const mediaURL = sponsor.logo_url || sponsor.media_url;
  if (mediaURL) {
    mediaImage.src = mediaURL;
    mediaImage.alt = sponsor.name;
    mediaWrap.classList.remove("hidden");
  } else {
    mediaImage.removeAttribute("src");
    mediaWrap.classList.add("hidden");
  }

  const sponsorLayer = state.markerLayers.get(`sponsor-${sponsorID}`);
  if (sponsorLayer) {
    sponsorLayer.openPopup();
  }

  await logSponsorEvent(sponsor, "open", { entry: "map_pin" });
  document.getElementById("detailPanel").classList.remove("hidden");
}

function renderDetailMetrics(marker) {
  const metricGrid = document.getElementById("detailMetricGrid");
  const metrics = [
    metricCard(t("detail.confidence", "Confidence"), formatScore(marker.confidence_score), t("detail.confidenceHint", "Overall confidence from recent community signals.")),
    metricCard(t("detail.freshness", "Freshness"), formatScore(marker.freshness_score), marker.expires_at ? `${t("detail.expires", "Expires")} ${formatTimestamp(marker.expires_at)}` : t("detail.noExpiry", "No expiry window published.")),
    metricCard(t("detail.support", "Support"), formatScore(marker.support_score), t("detail.supportHint", "How strongly nearby feedback confirms this marker.")),
    metricCard(t("detail.dispute", "Dispute"), formatScore(marker.dispute_score), t("detail.disputeHint", "How strongly nearby feedback questions this marker."))
  ];
  metricGrid.innerHTML = metrics.join("");
}

function renderFeedbackSummary(summary) {
  const list = document.getElementById("detailFeedbackSummary");
  if (!summary) {
    list.innerHTML = `<li class="summary-item">${t("detail.noFeedbackSummary", "No community feedback summary yet.")}</li>`;
    return;
  }

  const entries = Array.isArray(summary.items)
    ? summary.items
    : Object.entries(summary).filter(([key, value]) => typeof value === "number" || typeof value === "string").map(([key, value]) => ({ label: key, value }));

  if (!entries.length) {
    list.innerHTML = `<li class="summary-item">${t("detail.noFeedbackSummary", "No community feedback summary yet.")}</li>`;
    return;
  }

  list.innerHTML = entries.slice(0, 6).map((entry) => `
    <li class="summary-item">
      <span>${escapeHTML(formatSummaryLabel(entry.label || entry.action || entry.name))}</span>
      <strong>${escapeHTML(String(entry.value ?? entry.count ?? "--"))}</strong>
    </li>
  `).join("");
}

function renderFeedbackActions(actions) {
  const container = document.getElementById("feedbackActionButtons");
  if (!actions.length) {
    state.selectedFeedbackAction = null;
    container.innerHTML = `<div class="detail-map-note">${t("detail.noFeedbackActions", "No structured feedback actions are available for this marker yet.")}</div>`;
    return;
  }

  if (!actions.includes(state.selectedFeedbackAction)) {
    state.selectedFeedbackAction = actions[0];
  }

  container.innerHTML = actions.map((action) => `
    <button class="feedback-action-button ${action === state.selectedFeedbackAction ? "active" : ""}" type="button" data-action="${escapeAttr(action)}">
      ${escapeHTML(t(`feedback.action.${action}`, formatSummaryLabel(action)))}
    </button>
  `).join("");

  container.querySelectorAll(".feedback-action-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFeedbackAction = button.dataset.action;
      renderFeedbackActions(actions);
    });
  });
}

async function refreshActiveFeedbackSummary() {
  if (!state.activeMarker) return;
  const response = await fetch(`/api/markers/${state.activeMarker.id}/feedback-summary?lang=${state.locale}`);
  const payload = await response.json();
  state.activeFeedbackSummary = payload.data?.feedback_summary || payload.data || null;
  renderFeedbackSummary(state.activeFeedbackSummary);
}

async function submitStructuredFeedback() {
  if (!state.activeMarker || !state.selectedFeedbackAction) {
    showBanner(t("detail.feedbackActionRequired", "Choose a feedback action first."), "error");
    return;
  }

  const note = document.getElementById("feedbackNote").value.trim();
  const body = {
    action: state.selectedFeedbackAction,
    note,
    actor_latitude: state.currentPosition?.lat ?? null,
    actor_longitude: state.currentPosition?.lng ?? null
  };

  const response = await fetch(`/api/markers/${state.activeMarker.id}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Canvas-Fingerprint": state.canvasFingerprint
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    showBanner(payload.error?.message || t("common.error", "Something went wrong"), "error");
    return;
  }

  showBanner(t("detail.feedbackSubmitted", "Feedback sent to the community record."), "success");
  await Promise.allSettled([
    refreshActiveFeedbackSummary(),
    openMarkerDetail(state.activeMarker.id),
    loadCommunityState(),
    loadMarkers()
  ]);
}

async function escalateActiveMarker() {
  if (!state.activeMarker) return;

  const response = await fetch(`/api/markers/${state.activeMarker.id}/escalate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Canvas-Fingerprint": state.canvasFingerprint
    },
    body: JSON.stringify({
      actor_latitude: state.currentPosition?.lat ?? null,
      actor_longitude: state.currentPosition?.lng ?? null
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    showBanner(payload.error?.message || t("common.error", "Something went wrong"), "error");
    return;
  }

  showBanner(t("detail.escalated", "Escalation submitted for additional review."), "success");
  await Promise.allSettled([openMarkerDetail(state.activeMarker.id), loadMarkers()]);
}

function isEscalateFeasible(marker) {
  return ["contested", "disputed", "stale", "expired"].includes(String(marker.consensus_status || "").toLowerCase());
}

function closeDetail() {
  state.activeMarker = null;
  state.activeSponsor = null;
  state.activeFeedbackSummary = null;
  state.selectedFeedbackAction = null;
  document.getElementById("detailPanel").classList.add("hidden");
  if (state.isMobileSheet) {
    setSheetMode("half");
  }
}

function openComposer() {
  document.getElementById("modalBackdrop").classList.remove("hidden");
  showComposerChooser();
}

function closeComposer() {
  document.getElementById("modalBackdrop").classList.add("hidden");
}

function showComposerChooser() {
  state.composerKind = null;
  document.getElementById("submitStepChooser").classList.remove("hidden");
  document.getElementById("submitForm").classList.add("hidden");
  document.getElementById("modalTitle").textContent = t("submit.chooseType", "Choose submission type");
}

function showComposerForm(kind) {
  state.composerKind = kind;
  document.getElementById("submitStepChooser").classList.add("hidden");
  document.getElementById("submitForm").classList.remove("hidden");
  document.getElementById("modalTitle").textContent = kind === "risk" ? t("submit.risk", "Submit a risk alert") : t("submit.help", "Join the care network");

  const categories = Object.keys(categoryMap).filter((category) => categoryMap[category].group === kind);
  const categoryField = document.getElementById("categoryField");
  categoryField.innerHTML = categories.map((category) => `<option value="${category}">${escapeHTML(t(`marker.category.${category}`, category))}</option>`).join("");

  const visibilityField = document.getElementById("visibilityField");
  visibilityField.value = kind === "help" ? "masked" : "public";
  document.getElementById("privacyNote").textContent = kind === "help"
    ? t("submit.helpPrivacy", "Help markers should usually stay masked and only show an approximate area.")
    : t("submit.riskPrivacy", "Risk reports stay anonymous by default and should avoid personal contact details.");
}

async function submitMarker(event) {
  event.preventDefault();
  if (!state.submitCoordinates) {
    showBanner(t("submit.noCoords", "Choose your current location or tap the map to set coordinates first"), "error");
    return;
  }

  const formData = new FormData(event.currentTarget);
  formData.set("latitude", String(state.submitCoordinates.lat));
  formData.set("longitude", String(state.submitCoordinates.lng));

  const response = await fetch("/api/markers/submit", {
    method: "POST",
    headers: {
      "X-Canvas-Fingerprint": state.canvasFingerprint
    },
    body: formData
  });

  const payload = await response.json();
  if (!response.ok) {
    showBanner(payload.error?.message || t("common.error", "Something went wrong"), "error");
    return;
  }

  showBanner(t("submit.success", "Submitted successfully and queued for community review"), "success");
  event.currentTarget.reset();
  closeComposer();
  await loadMarkers();
}

function useMapCenterForSubmission() {
  if (!state.map) return;
  const center = state.map.getCenter();
  state.submitCoordinates = { lat: center.lat, lng: center.lng };
  updateLocationPreview();
}

function updateLocationPreview() {
  const preview = document.getElementById("locationPreview");
  if (!state.submitCoordinates) {
    preview.textContent = "--";
    return;
  }
  preview.textContent = `${state.submitCoordinates.lat.toFixed(5)}, ${state.submitCoordinates.lng.toFixed(5)}`;
}

function updateLocationSummary() {
  if (!state.currentPosition) return;
  document.getElementById("locationSummary").textContent = `${t("map.positionReady", "Location ready")} · ${state.currentPosition.lat.toFixed(3)}, ${state.currentPosition.lng.toFixed(3)}`;
}

function getVisibleMarkers() {
  return state.markers.filter((marker) => {
    const group = categoryMap[marker.category]?.group || "risk";
    return (group === "risk" && state.filters.risk) || (group === "help" && state.filters.help);
  });
}

function deriveSponsorScene() {
  const visible = getVisibleMarkers();
  const riskCount = visible.filter((marker) => categoryMap[marker.category]?.group === "risk").length;
  const helpCount = visible.filter((marker) => categoryMap[marker.category]?.group === "help").length;
  if (riskCount === 0 && helpCount === 0) return "mixed";
  if (riskCount >= helpCount * 1.5) return "risk";
  if (helpCount >= riskCount * 1.5) return "care";
  return "mixed";
}

function handleSearch(event) {
  if (event.key !== "Enter") return;
  const value = event.currentTarget.value.trim().toLowerCase();
  if (!value) return;
  const match = state.markers.find((marker) => `${marker.title} ${marker.address} ${marker.description}`.toLowerCase().includes(value));
  if (!match) {
    showBanner(t("search.noMatch", "No matching result found"), "error");
    return;
  }
  state.map.flyTo([match.latitude, match.longitude], 16, { duration: 0.8 });
  openMarkerDetail(match.id);
}

async function loadLocale(locale) {
  const normalized = ["zh-CN", "en", "hi"].includes(locale) ? locale : "zh-CN";
  const response = await fetch(`/locales/${normalized}.json`);
  state.dict = await response.json();
  state.locale = normalized;
  document.documentElement.lang = normalized;
  localStorage.setItem("firefly_lang", normalized);

  document.querySelectorAll(".lang-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === normalized);
  });

  applyTranslations();
}

function applyTranslations() {
  document.title = `${t("app.title", "Firefly")} / Firefly`;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n, element.textContent);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder, element.placeholder);
  });
}

function t(key, fallback = "") {
  return state.dict[key] || fallback || key;
}

function resolvePreferredLocale() {
  const urlLocale = new URLSearchParams(window.location.search).get("lang");
  if (urlLocale && ["zh-CN", "en", "hi"].includes(urlLocale)) return urlLocale;
  const stored = localStorage.getItem("firefly_lang");
  if (stored && ["zh-CN", "en", "hi"].includes(stored)) return stored;
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith("en")) return "en";
  if (browser.startsWith("hi")) return "hi";
  return "zh-CN";
}

function formatDistance(distanceMeters = 0) {
  if (!distanceMeters || Number.isNaN(distanceMeters)) return t("detail.distanceUnknown", "Distance unavailable");
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function formatScore(value) {
  if (value === null || value === undefined || value === "") return "--";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return `${Math.round(numeric * 100) / 100}`;
}

function formatTimestamp(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(state.locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatConsensusStatus(status) {
  const key = String(status || "emerging").toLowerCase();
  return t(`consensus.${key}`, formatSummaryLabel(key));
}

function renderConsensusPill(status) {
  const tone = getConsensusTone(status);
  return `<span class="status-pill consensus ${tone}">${escapeHTML(formatConsensusStatus(status))}</span>`;
}

function getConsensusTone(status) {
  return consensusToneMap[String(status || "").toLowerCase()] || "pending";
}

function metricCard(label, value, note) {
  return `
    <article class="metric-card">
      <span class="detail-label">${escapeHTML(label)}</span>
      <strong>${escapeHTML(String(value))}</strong>
      <span class="detail-meta">${escapeHTML(note)}</span>
    </article>
  `;
}

function buildInlineMeta(items, fallback) {
  const visible = items.filter(Boolean);
  return visible.length ? visible.join(" · ") : fallback;
}

function countMeta(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `${label} ${value}`;
}

function coalesceMetric(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "") ?? "--";
}

function formatSummaryLabel(value = "") {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function parseSettledJSON(result) {
  if (result.status !== "fulfilled") return null;
  const response = result.value;
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

function showBanner(message, tone = "info") {
  const banner = document.getElementById("statusBanner");
  banner.textContent = message;
  banner.classList.remove("hidden");
  banner.style.borderColor = tone === "success" ? "rgba(76,183,130,0.6)" : tone === "error" ? "rgba(228,87,87,0.6)" : "rgba(76,139,245,0.6)";
  clearTimeout(showBanner.timer);
  showBanner.timer = window.setTimeout(() => banner.classList.add("hidden"), 2800);
}

function createMarkerPopup(marker) {
  const camp = categoryMap[marker.category]?.group === "help" ? "CARE" : "RISK";
  const campClass = categoryMap[marker.category]?.group === "help" ? "help" : "risk";
  return `
    <div class="marker-popup ${campClass}">
      <div class="marker-popup-head">
        <span class="legend-pill ${campClass}">${camp}</span>
        <strong>${escapeHTML(marker.title)}</strong>
      </div>
      <p>${escapeHTML(marker.description)}</p>
      <div class="marker-meta">
        <span>${escapeHTML(t(`marker.category.${marker.category}`, marker.category))}</span>
        <span>${formatDistance(marker.distance_m)}</span>
      </div>
      <div class="marker-scoreline">
        <span>${escapeHTML(formatConsensusStatus(marker.consensus_status))}</span>
        <span>${t("detail.confidenceShort", "Conf.")} ${formatScore(marker.confidence_score)}</span>
      </div>
    </div>
  `;
}

function createSponsorPopup(sponsor) {
  return `
    <div class="marker-popup support">
      <div class="marker-popup-head">
        <span class="legend-pill support">${escapeHTML(t("sponsor.badge", "Sponsored"))}</span>
        <strong>${escapeHTML(sponsor.name)}</strong>
      </div>
      <p>${escapeHTML(sponsor.description)}</p>
      <div class="marker-meta">
        <span>${escapeHTML(t(`sponsor.type.${sponsor.business_type}`, sponsor.business_type))}</span>
        <span>${formatDistance(sponsor.distance_m)}</span>
      </div>
      <div class="marker-scoreline">
        <span>${escapeHTML(sponsor.sponsor_role === "primary" ? t("sponsor.primary", "Primary support") : t("sponsor.secondary", "Support node"))}</span>
        <span>${escapeHTML(t(`sponsor.scene.${sponsor.target_scene}`, sponsor.target_scene || "both"))}</span>
      </div>
    </div>
  `;
}

async function logSponsorEvent(sponsor, eventType, metadata = {}) {
  if (!sponsor) return;
  await fetch("/api/sponsors/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Canvas-Fingerprint": state.canvasFingerprint
    },
    body: JSON.stringify({
      sponsor_id: sponsor.id,
      campaign_id: sponsor.campaign_id,
      session_id: state.sponsorSessionID,
      event_type: eventType,
      metadata
    })
  }).catch(() => {});
}

async function handleSponsorAction(action) {
  if (!state.activeSponsor) return;
  if (action === "navigate" && state.activeSponsor.landing_url) {
    window.open(state.activeSponsor.landing_url, "_blank", "noopener");
  } else if (action === "contact") {
    const text = state.activeSponsor.contact_info || t("sponsor.contactFallback", "Open the sponsor card actions to navigate or request contact.");
    showBanner(text, "info");
  } else if (action === "view_details") {
    const lines = [
      t(`sponsor.type.${state.activeSponsor.business_type}`, state.activeSponsor.business_type),
      state.activeSponsor.service_hours || t("sponsor.hoursUnknown", "Hours not published"),
      state.activeSponsor.address
    ].filter(Boolean);
    showBanner(lines.join(" · "), "info");
  }
  await logSponsorEvent(state.activeSponsor, action, { entry: "detail_panel" });
}

async function dismissActiveSponsor() {
  if (!state.activeSponsor) return;
  const dismissed = normalizeDismissedSponsors();
  const key = String(state.activeSponsor.id);
  if (!dismissed.includes(key)) {
    dismissed.push(key);
  }
  state.sponsorDismissedToday = dismissed;
  persistDismissedSponsors();
  await logSponsorEvent(state.activeSponsor, "dismiss", { entry: "detail_panel" });
  showBanner(t("sponsor.dismissed", "Support node hidden for today."), "info");
  closeDetail();
  await loadSponsors();
  renderMarkers();
  renderLists();
}

function normalizeDismissedSponsors() {
  const todayKey = currentDayKey();
  const storedDay = localStorage.getItem("firefly_sponsor_dismissed_day");
  if (storedDay !== todayKey) {
    state.sponsorDismissedToday = [];
    localStorage.setItem("firefly_sponsor_dismissed_day", todayKey);
    localStorage.setItem("firefly_sponsor_dismissed_today", "[]");
  }
  return Array.isArray(state.sponsorDismissedToday) ? state.sponsorDismissedToday : [];
}

function persistDismissedSponsors() {
  localStorage.setItem("firefly_sponsor_dismissed_day", currentDayKey());
  localStorage.setItem("firefly_sponsor_dismissed_today", JSON.stringify(state.sponsorDismissedToday));
}

function currentDayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function createSessionID() {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `map_${seed}`;
}

function createFingerprint() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#132030";
  ctx.fillRect(2, 2, 24, 24);
  ctx.fillStyle = "#FF6B57";
  ctx.font = "14px sans-serif";
  ctx.fillText("Firefly", 4, 16);
  return btoa(canvas.toDataURL()).slice(0, 32);
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

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}
