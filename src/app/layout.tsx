import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';

import './globals.css';
import { AppNav } from '@/components/app-nav';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Local Web Design Prospecting Tool',
  description: 'Local web design lead scraping and outreach dashboard.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang='en' className='dark'>
      <body className={spaceGrotesk.className}>
        <div className='min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950'>
          <AppNav />
          <main className='mx-auto w-full max-w-7xl px-4 py-6'>{children}</main>
        </div>
      </body>
    </html>
  );
}
