'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/outreach', label: 'Outreach' },
  { href: '/settings', label: 'Settings' }
] as const;

export function AppNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <header className='border-b border-border/70 bg-card/70 backdrop-blur'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3'>
        <div>
          <p className='text-xs uppercase tracking-[0.22em] text-muted-foreground'>St. George Prospecting</p>
          <h1 className='text-base font-semibold text-foreground'>Local Web Design CRM</h1>
        </div>
        <nav className='flex items-center gap-2'>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
