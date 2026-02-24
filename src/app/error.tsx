'use client';

import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps): React.JSX.Element {
  return (
    <div className='space-y-4 rounded-xl border bg-card/70 p-6'>
      <h2 className='text-lg font-semibold'>Something went wrong</h2>
      <p className='text-sm text-muted-foreground'>{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
