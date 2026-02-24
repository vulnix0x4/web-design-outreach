import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LeadDetailPanel } from '@/components/lead-detail-panel';
import { Button } from '@/components/ui/button';
import { getLatestEvaluationByBusinessId, getLeadById } from '@/lib/db';

interface LeadDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) {
    notFound();
  }

  const lead = getLeadById(leadId);
  if (!lead) {
    notFound();
  }

  const evaluation = getLatestEvaluationByBusinessId(lead.business_id) ?? null;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>Lead Detail</p>
          <h2 className='text-2xl font-semibold'>{lead.business_name}</h2>
        </div>
        <Link href='/'>
          <Button variant='outline'>Back to Dashboard</Button>
        </Link>
      </div>

      <LeadDetailPanel lead={lead} evaluation={evaluation} />
    </div>
  );
}
