import { NextRequest, NextResponse } from 'next/server';

import { createDemoSite, updateLead } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      business_id?: number | string;
      lead_id?: number | string;
    };

    const businessId = Number(body.business_id);
    const leadId = Number(body.lead_id);

    if (!Number.isFinite(businessId) || businessId <= 0) {
      return NextResponse.json({ error: 'Valid business_id is required.' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const previewUrl = `${baseUrl}/previews/business-${businessId}`;

    createDemoSite({
      business_id: businessId,
      template: 'general',
      generated_content: JSON.stringify({
        message: 'Placeholder demo content. Implement AI template generation next.'
      }),
      preview_url: previewUrl,
      status: 'draft'
    });

    if (Number.isFinite(leadId) && leadId > 0) {
      updateLead(leadId, {
        demo_url: previewUrl
      });
    }

    return NextResponse.json({
      ok: true,
      previewUrl,
      message: 'Demo placeholder generated. Full generator integration can be added in the next iteration.'
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
