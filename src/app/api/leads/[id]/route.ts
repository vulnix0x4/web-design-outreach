import { NextRequest, NextResponse } from 'next/server';

import { deleteLead, getLeadById, updateLead } from '@/lib/db';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params;
    const leadId = Number(id);
    if (!Number.isFinite(leadId) || leadId <= 0) {
      return NextResponse.json({ error: 'Invalid lead id.' }, { status: 400 });
    }

    const lead = getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params;
    const leadId = Number(id);
    if (!Number.isFinite(leadId) || leadId <= 0) {
      return NextResponse.json({ error: 'Invalid lead id.' }, { status: 400 });
    }

    const body = (await request.json()) as {
      score?: number;
      status?: 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'closed' | 'passed';
      notes?: string | null;
      demo_url?: string | null;
      outreach_type?: string | null;
      contacted_at?: string | null;
    };

    updateLead(leadId, {
      score: body.score,
      status: body.status,
      notes: body.notes,
      demo_url: body.demo_url,
      outreach_type: body.outreach_type,
      contacted_at: body.contacted_at
    });

    const lead = getLeadById(leadId);
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params;
    const leadId = Number(id);
    if (!Number.isFinite(leadId) || leadId <= 0) {
      return NextResponse.json({ error: 'Invalid lead id.' }, { status: 400 });
    }

    deleteLead(leadId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
