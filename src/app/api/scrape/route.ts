import { NextRequest, NextResponse } from 'next/server';

import { updateLastScrapeAt } from '@/lib/config';
import { scrapeGooglePlaces } from '@/lib/google-places';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes — scraping takes a while

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      location?: string;
      categories?: string[];
    };

    const result = await scrapeGooglePlaces({
      location: body.location,
      categories: Array.isArray(body.categories) ? body.categories : undefined
    });

    const scrapedAt = new Date().toISOString();
    updateLastScrapeAt(scrapedAt);

    return NextResponse.json({
      ok: true,
      scrapedAt,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
