import { NextRequest, NextResponse } from 'next/server';

import { createLead, listLeads } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const status = (searchParams.get('status') ?? 'all') as
      | 'all'
      | 'new'
      | 'contacted'
      | 'interested'
      | 'proposal_sent'
      | 'closed'
      | 'passed';
    const hasWebsite = (searchParams.get('hasWebsite') ?? 'all') as 'all' | 'yes' | 'no';
    const page = Number(searchParams.get('page') ?? 1);
    const pageSize = Number(searchParams.get('pageSize') ?? 20);

    const result = listLeads({
      search,
      category,
      status,
      hasWebsite,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20
    });

    return NextResponse.json({
      ok: true,
      ...result
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
      business_id?: number;
      score?: number;
      status?: 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'closed' | 'passed';
      notes?: string;
    };

    if (!body.business_id) {
      return NextResponse.json({ error: 'business_id is required.' }, { status: 400 });
    }

    const leadId = createLead({
      business_id: body.business_id,
      score: body.score,
      status: body.status,
      notes: body.notes
    });

    return NextResponse.json({ ok: true, leadId });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
