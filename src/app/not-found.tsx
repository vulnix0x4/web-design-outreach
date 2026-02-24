import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound(): React.JSX.Element {
  return (
    <div className='space-y-4 rounded-xl border bg-card/70 p-8'>
      <h2 className='text-xl font-semibold'>Not Found</h2>
      <p className='text-sm text-muted-foreground'>The requested record could not be found.</p>
      <Link href='/'>
        <Button variant='outline'>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
