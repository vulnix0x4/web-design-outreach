import { NextRequest, NextResponse } from 'next/server';

import { evaluateBusinessWebsite } from '@/lib/evaluator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { business_id?: number | string };
    const businessId = Number(body.business_id);

    if (!Number.isFinite(businessId) || businessId <= 0) {
      return NextResponse.json({ error: 'Valid business_id is required.' }, { status: 400 });
    }

    const result = await evaluateBusinessWebsite(businessId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
