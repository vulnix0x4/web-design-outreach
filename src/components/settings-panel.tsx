'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import { SettingsConfig } from '@/types';

interface SettingsPanelProps {
  initialConfig: SettingsConfig;
  stats: {
    totalBusinesses: number;
    businessesWithoutWebsites: number;
    evaluatedCount: number;
  };
}

export function SettingsPanel({ initialConfig, stats }: SettingsPanelProps): React.JSX.Element {
  const [googlePlacesApiKey, setGooglePlacesApiKey] = useState(initialConfig.googlePlacesApiKey);
  const [openRouterApiKey, setOpenRouterApiKey] = useState(initialConfig.openRouterApiKey);
  const [lastScrapeAt, setLastScrapeAt] = useState<string | null>(initialConfig.lastScrapeAt);
  const [isSaving, setIsSaving] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveSettings(): Promise<void> {
    setMessage(null);
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ googlePlacesApiKey, openRouterApiKey })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'Failed to save settings.');
      }

      setMessage('Settings saved.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function triggerScrape(): Promise<void> {
    setMessage(null);
    setError(null);
    setIsScraping(true);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location: 'St. George, UT' })
      });

      const payload = (await response.json()) as { error?: string; result?: { totalProcessed?: number }; scrapedAt?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Scrape failed.');
      }

      if (payload.scrapedAt) {
        setLastScrapeAt(payload.scrapedAt);
      }
      setMessage(`Scrape complete. Processed ${payload.result?.totalProcessed ?? 0} records.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsScraping(false);
    }
  }

  return (
    <div className='space-y-6'>
      {message ? <p className='text-sm text-emerald-300'>{message}</p> : null}
      {error ? <p className='text-sm text-red-300'>{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='google-key'>Google Places API Key <span className='text-xs text-muted-foreground'>(optional)</span></Label>
            <Input
              id='google-key'
              type='password'
              value={googlePlacesApiKey}
              onChange={(event) => setGooglePlacesApiKey(event.target.value)}
              placeholder='Not required — scraper uses browser automation'
            />
            <p className='text-xs text-muted-foreground'>Scraping uses Playwright to browse Google Maps directly. No API key needed.</p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='openrouter-key'>OpenRouter API Key</Label>
            <Input
              id='openrouter-key'
              type='password'
              value={openRouterApiKey}
              onChange={(event) => setOpenRouterApiKey(event.target.value)}
              placeholder='sk-or-...'
            />
            <p className='text-xs text-muted-foreground'>Used with Kimi K2.5 for website evaluation scoring</p>
          </div>

          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Keys'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scraper Controls</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>Last scrape: {formatDate(lastScrapeAt)}</p>
          <Button onClick={triggerScrape} disabled={isScraping}>
            {isScraping ? 'Scraping...' : 'Trigger New Scrape'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Stats</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-3'>
          <div>
            <p className='text-sm text-muted-foreground'>Total businesses</p>
            <p className='text-2xl font-semibold'>{stats.totalBusinesses}</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground'>Without websites</p>
            <p className='text-2xl font-semibold text-red-300'>{stats.businessesWithoutWebsites}</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground'>Evaluated</p>
            <p className='text-2xl font-semibold text-emerald-300'>{stats.evaluatedCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
