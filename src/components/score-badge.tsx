import { Badge } from '@/components/ui/badge';
import { leadScoreBadgeVariant } from '@/lib/scoring';

interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps): React.JSX.Element {
  const variant = leadScoreBadgeVariant(score);

  if (variant === 'hot') {
    return <Badge className='border-red-500/30 bg-red-500/20 text-red-200'>Hot ({score})</Badge>;
  }

  if (variant === 'warm') {
    return <Badge className='border-orange-500/30 bg-orange-500/20 text-orange-200'>Warm ({score})</Badge>;
  }

  return <Badge className='border-emerald-500/30 bg-emerald-500/20 text-emerald-200'>Good ({score})</Badge>;
}
