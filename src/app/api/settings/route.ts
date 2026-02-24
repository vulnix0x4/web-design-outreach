import { NextRequest, NextResponse } from 'next/server';

import { readConfig, updateConfig } from '@/lib/config';
import { getDashboardStats } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  try {
    const config = readConfig();
    const stats = getDashboardStats();

    return NextResponse.json({
      ok: true,
      config,
      stats
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      googlePlacesApiKey?: string;
      openRouterApiKey?: string;
    };

    const config = updateConfig({
      googlePlacesApiKey: body.googlePlacesApiKey ?? '',
      openRouterApiKey: body.openRouterApiKey ?? ''
    });

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
