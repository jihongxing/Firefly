import path from "node:path";
import { pathToFileURL } from "node:url";

const baseURL = process.env.FIREFLY_BASE_URL || "http://127.0.0.1:8080";
const adminToken = process.env.FIREFLY_ADMIN_TOKEN || "firefly-dev-admin";
const edgeExecutable = process.env.PLAYWRIGHT_EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
const playwrightEntry = process.env.PLAYWRIGHT_CORE_ENTRY
  || path.resolve(process.cwd(), ".tmp-playwright", "node_modules", "playwright-core", "index.mjs");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForStatus(page, text, timeout = 30000) {
  await page.waitForFunction((expected) => {
    return document.getElementById("adminStatus")?.textContent?.includes(expected);
  }, text, { timeout });
}

async function waitForHeading(page, id, text, timeout = 30000) {
  await page.waitForFunction(({ id, text }) => {
    return document.getElementById(id)?.textContent?.includes(text);
  }, { id, text }, { timeout });
}

async function ensureVisible(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

async function clickRecordByText(page, containerSelector, text) {
  const cards = page.locator(`${containerSelector} [data-record-type]`);
  const count = await cards.count();
  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    const content = (await card.textContent()) || "";
    if (content.includes(text)) {
      await card.click();
      return true;
    }
  }
  return false;
}

async function main() {
  const { chromium } = await import(pathToFileURL(playwrightEntry).href);
  const browser = await chromium.launch({
    executablePath: edgeExecutable,
    headless
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 2200 }
  });

  const debug = [];
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  const nonce = Date.now().toString().slice(-6);
  const sponsorName = `E2E赞助商${nonce}`;
  const sponsorBrandKey = `e2e-sponsor-${nonce}`;
  const sponsorTitle = `E2E补给点${nonce}`;

  try {
    await page.goto(`${baseURL}/admin.html?token=${encodeURIComponent(adminToken)}`, { waitUntil: "networkidle" });
    await waitForStatus(page, "赞助运营台已就绪。");
    debug.push("loaded");

    await page.fill("#sponsorBrandKeyField", sponsorBrandKey);
    await page.fill("#sponsorNameField", sponsorName);
    await page.selectOption("#sponsorBusinessTypeField", "supplies");
    await page.selectOption("#sponsorStatusField", "active");
    await page.fill("#sponsorTitleField", sponsorTitle);
    await page.fill("#sponsorBadgeField", "community_support");
    await page.fill("#sponsorCityCodeField", "CN-SZ");
    await page.fill("#sponsorAreaLabelField", `测试片区${nonce}`);
    await page.fill("#sponsorLatitudeField", "22.5511");
    await page.fill("#sponsorLongitudeField", "114.0666");
    await page.fill("#sponsorAddressField", `深圳市测试片区 ${nonce}`);
    await page.fill("#sponsorDescriptionField", "端到端写入测试赞助商。");
    await page.fill("#sponsorContactInfoField", "站内消息");
    await page.fill("#sponsorServiceHoursField", "09:00-21:00");
    await page.fill("#sponsorServiceTagsField", "e2e, supplies, test");
    await page.fill("#sponsorLandingUrlField", `https://example.org/e2e/sponsor/${nonce}`);
    await page.fill("#sponsorMediaUrlField", `https://example.org/e2e/sponsor/${nonce}.jpg`);
    await page.fill("#sponsorLogoUrlField", `https://example.org/e2e/sponsor/${nonce}.png`);
    await page.check("#sponsorVerifiedField");
    await page.click("#saveSponsorButton");
    await waitForStatus(page, "赞助商已创建。");
    debug.push("sponsor-created");

    await page.fill("#sponsorKeywordFilter", sponsorName);
    await page.click("#sponsorFiltersForm .primary-button");
    await page.waitForTimeout(1000);
    assert(await clickRecordByText(page, "#sponsorList", sponsorName), "failed to select created sponsor");
    await waitForHeading(page, "sponsorFormHeading", "编辑赞助商");
    const sponsorID = await page.inputValue("#sponsorIdField");
    debug.push(`sponsor-selected:${sponsorID}`);

    await page.fill("#sponsorTitleField", `${sponsorTitle}-已更新`);
    await page.fill("#sponsorDescriptionField", "端到端写入测试赞助商，已更新。");
    await page.click("#saveSponsorButton");
    await waitForStatus(page, "赞助商已更新。");
    debug.push("sponsor-updated");

    await page.fill("#campaignSponsorIdField", sponsorID);
    await page.selectOption("#campaignStatusField", "active");
    await page.selectOption("#campaignPackageTierField", "guard_30");
    await page.selectOption("#campaignTargetSceneField", "care");
    await page.fill("#campaignCityCodeField", "CN-SZ");
    await page.fill("#campaignAreaLabelField", `测试投放片区${nonce}`);
    await page.fill("#campaignAreaCenterLatField", "22.5511");
    await page.fill("#campaignAreaCenterLngField", "114.0666");
    await page.fill("#campaignAreaRadiusField", "3200");
    await page.fill("#campaignShareRatioField", "0.3");
    await page.fill("#campaignPriorityWeightField", "3");
    await page.fill("#campaignCityMultiplierField", "1.0");
    await page.fill("#campaignSceneMultiplierField", "1.0");
    await page.fill("#campaignMonthlyPriceField", "39900");
    await page.fill("#campaignDailyPrimaryCapField", "2");
    await page.fill("#campaignDailySecondaryCapField", "3");
    await page.fill("#campaignMaxSecondarySlotsField", "2");
    await page.evaluate(() => {
      document.getElementById("campaignStartAtField").value = "2026-05-27T09:00";
      document.getElementById("campaignEndAtField").value = "2026-06-27T09:00";
    });
    await page.click("#saveCampaignButton");
    await waitForStatus(page, "投放计划已创建。");
    debug.push("campaign-created");

    await page.fill("#campaignSponsorIdFilter", sponsorID);
    await page.click("#campaignFiltersForm .primary-button");
    await page.waitForTimeout(1000);
    assert(await clickRecordByText(page, "#campaignList", sponsorName), "failed to select created campaign");
    await waitForHeading(page, "campaignFormHeading", "编辑投放计划");
    const campaignID = await page.inputValue("#campaignIdField");
    debug.push(`campaign-selected:${campaignID}`);

    await page.fill("#campaignShareRatioField", "0.7");
    await page.fill("#campaignMonthlyPriceField", "59900");
    await page.click("#saveCampaignButton");
    await waitForStatus(page, "投放计划已更新。");
    debug.push("campaign-updated");

    await ensureVisible(page, "#archiveCampaignButton");
    await page.click("#archiveCampaignButton");
    await waitForStatus(page, "投放计划已归档。");
    await page.waitForTimeout(800);
    debug.push("campaign-archived");

    await ensureVisible(page, "#deleteCampaignButton");
    await page.click("#deleteCampaignButton");
    await waitForStatus(page, "投放计划已永久删除。");
    await page.waitForTimeout(800);
    debug.push("campaign-deleted");

    await ensureVisible(page, "#archiveSponsorButton");
    await page.click("#archiveSponsorButton");
    await waitForStatus(page, "赞助商已归档，关联投放已结束。");
    await page.waitForTimeout(800);
    debug.push("sponsor-archived");

    await ensureVisible(page, "#deleteSponsorButton");
    await page.click("#deleteSponsorButton");
    await waitForStatus(page, "赞助商及关联投放已永久删除。");
    await page.waitForTimeout(800);
    debug.push("sponsor-deleted");

    const apiCheck = await page.evaluate(async ({ adminToken, sponsorName }) => {
      const headers = { "X-Admin-Token": adminToken };
      const response = await fetch(`/api/admin/sponsors?keyword=${encodeURIComponent(sponsorName)}`, { headers });
      const payload = await response.json();
      return payload.data || [];
    }, { adminToken, sponsorName });

    assert(Array.isArray(apiCheck) && apiCheck.length === 0, "deleted sponsor should not appear in admin list");

    console.log(JSON.stringify({
      ok: true,
      sponsorName,
      sponsorBrandKey,
      baseURL,
      debug
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error.message
  }, null, 2));
  process.exitCode = 1;
});
