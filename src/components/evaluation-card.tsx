import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface EvaluationCardProps {
  title: string;
  value: number | null;
  subtitle?: string;
}

export function EvaluationCard({ title, value, subtitle }: EvaluationCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='text-3xl font-bold'>{value ?? 'N/A'}</div>
        {typeof value === 'number' ? <Progress value={value} /> : null}
        {subtitle ? <p className='text-xs text-muted-foreground'>{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}
