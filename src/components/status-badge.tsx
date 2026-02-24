import { Badge } from '@/components/ui/badge';
import { LeadStatus } from '@/types';

interface StatusBadgeProps {
  status: LeadStatus;
}

const LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  proposal_sent: 'Proposal Sent',
  closed: 'Closed',
  passed: 'Passed'
};

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  const colorClass =
    status === 'new'
      ? 'border-slate-500/30 bg-slate-500/20 text-slate-100'
      : status === 'contacted'
        ? 'border-blue-500/30 bg-blue-500/20 text-blue-200'
        : status === 'interested'
          ? 'border-yellow-500/30 bg-yellow-500/20 text-yellow-100'
          : status === 'proposal_sent'
            ? 'border-indigo-500/30 bg-indigo-500/20 text-indigo-200'
            : status === 'closed'
              ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200'
              : 'border-red-500/30 bg-red-500/20 text-red-200';

  return <Badge className={colorClass}>{LABELS[status]}</Badge>;
}
