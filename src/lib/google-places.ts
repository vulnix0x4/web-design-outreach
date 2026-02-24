import { chromium, Page } from 'playwright';

import { DEFAULT_BUSINESS_CATEGORIES, DEFAULT_LOCATION } from '@/lib/constants';
import { getBusinessByPlaceId, upsertBusiness } from '@/lib/db';

export interface ScrapeGooglePlacesInput {
  location?: string;
  categories?: string[];
}

export interface ScrapeGooglePlacesResult {
  location: string;
  categoriesSearched: number;
  totalProcessed: number;
  inserted: number;
  updated: number;
  failures: string[];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrollAndCollectResults(page: Page, maxScrolls: number = 8): Promise<void> {
  const feed = page.locator('div[role="feed"]');
  const feedExists = await feed.count();
  if (!feedExists) return;

  for (let i = 0; i < maxScrolls; i++) {
    await feed.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await wait(2000);

    // Check if "end of list" text appeared
    const endOfList = await page.getByText("You've reached the end of the list.").count();
    if (endOfList > 0) break;
  }
}

async function clickBusinessAndGetDetails(page: Page, index: number): Promise<{
  name: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  placeId: string;
} | null> {
  try {
    const feedLinks = page.locator('div[role="feed"] a[href*="/maps/place"]');
    const count = await feedLinks.count();
    if (index >= count) return null;

    const link = feedLinks.nth(index);
    const ariaLabel = await link.getAttribute('aria-label');
    const href = await link.getAttribute('href') ?? '';

    if (!ariaLabel) return null;

    // Extract a unique ID from the URL
    const placeIdMatch = href.match(/!1s([^!]+)/) || href.match(/place\/([^/]+)/);
    const placeId = placeIdMatch ? placeIdMatch[1] : `url-${Buffer.from(href.slice(0, 200)).toString('base64').slice(0, 40)}`;

    // Click into the business
    await link.click();
    await wait(3000);

    let address: string | null = null;
    let phone: string | null = null;
    let website: string | null = null;
    let rating: number | null = null;
    let reviewCount: number | null = null;

    // Get address
    try {
      const addrBtn = page.locator('button[data-item-id="address"]');
      if (await addrBtn.count() > 0) {
        const label = await addrBtn.getAttribute('aria-label');
        if (label) address = label.replace(/^Address:\s*/i, '');
      }
    } catch {}

    // Get phone
    try {
      const phoneBtn = page.locator('button[data-item-id*="phone"]');
      if (await phoneBtn.count() > 0) {
        const label = await phoneBtn.getAttribute('aria-label');
        if (label) phone = label.replace(/^Phone:\s*/i, '');
      }
    } catch {}

    // Get website
    try {
      const webLink = page.locator('a[data-item-id="authority"]');
      if (await webLink.count() > 0) {
        const webHref = await webLink.getAttribute('href');
        if (webHref) website = webHref;
      }
    } catch {}

    // Get rating
    try {
      const ratingEl = page.locator('div.F7nice span[aria-hidden="true"]').first();
      if (await ratingEl.count() > 0) {
        const text = await ratingEl.textContent();
        if (text) {
          const parsed = parseFloat(text);
          if (!isNaN(parsed)) rating = parsed;
        }
      }
    } catch {}

    // Get review count
    try {
      const reviewEl = page.locator('div.F7nice span[aria-label*="review"]').first();
      if (await reviewEl.count() > 0) {
        const label = await reviewEl.getAttribute('aria-label');
        if (label) {
          const match = label.match(/([\d,]+)/);
          if (match) reviewCount = parseInt(match[1].replace(/,/g, ''), 10);
        }
      }
    } catch {}

    return {
      name: ariaLabel,
      address,
      phone,
      rating,
      reviewCount,
      website,
      placeId
    };
  } catch {
    return null;
  }
}

export async function scrapeGooglePlaces(input: ScrapeGooglePlacesInput): Promise<ScrapeGooglePlacesResult> {
  const location = input.location ?? DEFAULT_LOCATION;
  const categories = input.categories?.length ? input.categories : [...DEFAULT_BUSINESS_CATEGORIES];

  let totalProcessed = 0;
  let inserted = 0;
  let updated = 0;
  const failures: string[] = [];
  const seenPlaceIds = new Set<string>();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'en-US'
    });

    const page = await context.newPage();

    for (const category of categories) {
      try {
        const query = encodeURIComponent(`${category} in ${location}`);
        const url = `https://www.google.com/maps/search/${query}`;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await wait(4000);

        // Handle consent dialog if present
        try {
          const consentButton = page.locator('button:has-text("Accept all")');
          if (await consentButton.count() > 0) {
            await consentButton.click();
            await wait(3000);
          }
        } catch {}

        // Check if feed exists
        const feedExists = await page.locator('div[role="feed"]').count();
        if (!feedExists) {
          failures.push(`${category}: No results feed found`);
          continue;
        }

        // Scroll to load more results
        await scrollAndCollectResults(page, 8);

        // Count available results
        const resultCount = await page.locator('div[role="feed"] a[href*="/maps/place"]').count();

        for (let i = 0; i < resultCount; i++) {
          // Re-navigate to the search page before each click since clicking into a
          // business detail changes the view
          if (i > 0) {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await wait(4000);
            await scrollAndCollectResults(page, 8);
          }

          const biz = await clickBusinessAndGetDetails(page, i);
          if (!biz) continue;
          if (seenPlaceIds.has(biz.placeId)) continue;

          seenPlaceIds.add(biz.placeId);
          totalProcessed += 1;

          try {
            const existing = getBusinessByPlaceId(biz.placeId);

            upsertBusiness({
              google_place_id: biz.placeId,
              name: biz.name,
              address: biz.address,
              phone: biz.phone,
              category,
              google_rating: biz.rating,
              review_count: biz.reviewCount,
              website_url: biz.website,
              has_website: Boolean(biz.website)
            });

            if (existing) {
              updated += 1;
            } else {
              inserted += 1;
            }
          } catch (error) {
            failures.push(`${category}/${biz.name}: ${(error as Error).message}`);
          }
        }

        // Delay between categories
        await wait(2000);
      } catch (error) {
        failures.push(`${category}: ${(error as Error).message}`);
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  return {
    location,
    categoriesSearched: categories.length,
    totalProcessed,
    inserted,
    updated,
    failures
  };
}
