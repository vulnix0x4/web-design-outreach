import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

import { calculateCompositeScore } from '@/lib/scoring';
import { readConfig } from '@/lib/config';
import { createEvaluation, getBusinessById, getEvaluationById } from '@/lib/db';
import { ensureUrlProtocol } from '@/lib/utils';

const SCREENSHOT_DIR = path.join(process.cwd(), 'data', 'screenshots');

function ensureScreenshotDir(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

function sanitizeFilePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

export interface EvaluationRunResult {
  evaluationId: number;
  compositeScore: number;
  hasSsl: boolean;
  loadTimeMs: number;
  mobileFriendly: boolean;
  desktopScreenshotPath: string;
  mobileScreenshotPath: string;
}

export async function evaluateBusinessWebsite(businessId: number): Promise<EvaluationRunResult> {
  const business = getBusinessById(businessId) as
    | {
        id: number;
        name: string;
        website_url: string | null;
      }
    | undefined;

  if (!business) {
    throw new Error('Business not found.');
  }

  if (!business.website_url) {
    throw new Error('Business has no website to evaluate.');
  }

  const targetUrl = ensureUrlProtocol(business.website_url);
  if (!targetUrl) {
    throw new Error('Invalid website URL.');
  }

  ensureScreenshotDir();

  const browser = await chromium.launch({ headless: true });

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = sanitizeFilePart(business.name);
    const desktopFile = `business-${business.id}-${safeName}-${timestamp}-desktop.png`;
    const mobileFile = `business-${business.id}-${safeName}-${timestamp}-mobile.png`;
    const desktopScreenshotPath = path.join(SCREENSHOT_DIR, desktopFile);
    const mobileScreenshotPath = path.join(SCREENSHOT_DIR, mobileFile);

    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const desktopPage = await desktopContext.newPage();

    const startTime = Date.now();
    await desktopPage.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    const loadTimeMs = Date.now() - startTime;
    const finalUrl = desktopPage.url();
    const hasSsl = finalUrl.startsWith('https://');

    const mobileMetaCount = await desktopPage.locator('meta[name="viewport"]').count();
    const mobileFriendly = mobileMetaCount > 0;

    await desktopPage.screenshot({
      path: desktopScreenshotPath,
      fullPage: true
    });
    await desktopContext.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(finalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await mobilePage.screenshot({
      path: mobileScreenshotPath,
      fullPage: true
    });
    await mobileContext.close();

    let technicalScore = calculateCompositeScore({
      hasSsl,
      loadTimeMs,
      mobileFriendly
    });

    // AI design scoring via OpenRouter + Kimi K2.5
    let aiVerdict = `Technical evaluation: SSL: ${hasSsl ? 'yes' : 'no'}, Mobile viewport: ${
      mobileFriendly ? 'present' : 'missing'
    }, Load time: ${loadTimeMs}ms.`;
    let designScore = technicalScore;

    const config = readConfig();
    if (config.openRouterApiKey) {
      try {
        const screenshotBase64 = fs.readFileSync(desktopScreenshotPath).toString('base64');
        const aiResult = await getAiDesignScore(config.openRouterApiKey, screenshotBase64, business.name);
        if (aiResult) {
          designScore = aiResult.score;
          aiVerdict = aiResult.verdict;
          // Blend: 40% technical + 60% AI design score
          technicalScore = Math.round(technicalScore * 0.4 + designScore * 0.6);
        }
      } catch (err) {
        aiVerdict += ` AI scoring failed: ${(err as Error).message}`;
      }
    }

    const compositeScore = technicalScore;

    const evaluationId = createEvaluation({
      business_id: business.id,
      mobile_friendly: mobileFriendly,
      has_ssl: hasSsl,
      load_time_ms: loadTimeMs,
      design_score: designScore,
      ai_verdict: aiVerdict,
      composite_score: compositeScore,
      desktop_screenshot_path: desktopFile,
      mobile_screenshot_path: mobileFile
    });

    const saved = getEvaluationById(evaluationId);
    return {
      evaluationId,
      compositeScore,
      hasSsl,
      loadTimeMs,
      mobileFriendly,
      desktopScreenshotPath: saved?.desktop_screenshot_path ?? desktopFile,
      mobileScreenshotPath: saved?.mobile_screenshot_path ?? mobileFile
    };
  } finally {
    await browser.close();
  }
}

async function getAiDesignScore(
  apiKey: string,
  screenshotBase64: string,
  businessName: string
): Promise<{ score: number; verdict: string } | null> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3050',
      'X-Title': 'Local Web Design Prospecting Tool'
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.5',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a web design expert evaluating the website of a local business called "${businessName}". Rate the website design quality on a scale of 0-100 based on this screenshot.

Consider:
- Modern vs outdated visual design (gradients from 2010, Flash-era layouts = low score)
- Clear call-to-action present?
- Contact info easily visible?
- Professional typography and color scheme?
- Overall impression a customer would have
- Does it look like a cheap template or a professional site?

Respond in EXACTLY this JSON format, nothing else:
{"score": <number 0-100>, "verdict": "<2-3 sentence explanation>"}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${screenshotBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as { score: number; verdict: string };
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      verdict: parsed.verdict
    };
  } catch {
    return null;
  }
}
