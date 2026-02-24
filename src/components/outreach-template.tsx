'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { inferIssuesForOutreach } from '@/lib/scoring';

interface OutreachTemplateProps {
  businessOptions: Array<{
    id: number;
    name: string;
    hasWebsite: boolean;
    website: string | null;
    compositeScore: number | null;
  }>;
  defaultPreviewUrl: string;
}

type TemplateVariant = 'no_website' | 'outdated_website';

export function OutreachTemplate({ businessOptions, defaultPreviewUrl }: OutreachTemplateProps): React.JSX.Element {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businessOptions[0]?.id ? String(businessOptions[0].id) : '');
  const [variant, setVariant] = useState<TemplateVariant>('no_website');
  const [previewUrl, setPreviewUrl] = useState(defaultPreviewUrl);
  const [copied, setCopied] = useState(false);

  const selectedBusiness = useMemo(
    () => businessOptions.find((item) => String(item.id) === selectedBusinessId) ?? null,
    [businessOptions, selectedBusinessId]
  );

  const issues = useMemo(() => {
    if (!selectedBusiness) return [];
    const hasWebsite = variant === 'outdated_website';
    return inferIssuesForOutreach(hasWebsite, selectedBusiness.compositeScore);
  }, [selectedBusiness, variant]);

  const emailTemplate = useMemo(() => {
    const businessName = selectedBusiness?.name ?? 'Your business';
    const issueBullets = issues.map((issue) => `- ${issue}`).join('\n');

    if (variant === 'no_website') {
      return `Subject: Quick website idea for ${businessName}\n\nHi ${businessName} team,\n\nI looked up your business and noticed there is no dedicated website linked yet. That usually means missed leads from local search and less trust from first-time customers.\n\nWhat I found:\n${issueBullets}\n\nI put together a quick preview concept for you here:\n${previewUrl}\n\nIf you want, I can tailor this into a full launch-ready site with your branding and offers.\n\n- Luke`;
    }

    return `Subject: Website refresh idea for ${businessName}\n\nHi ${businessName} team,\n\nI reviewed your current site and found a few improvement opportunities that can help increase calls and bookings.\n\nWhat I found:\n${issueBullets}\n\nI drafted a modern preview concept here:\n${previewUrl}\n\nIf you're open to it, I can walk you through exactly what to update and how fast we can launch.\n\n- Luke`;
  }, [issues, previewUrl, selectedBusiness?.name, variant]);

  const callScript = useMemo(() => {
    const businessName = selectedBusiness?.name ?? 'your business';
    return `Hi, this is Luke. I help local businesses in St. George improve their online presence. I took a quick look at ${businessName} and noticed a few easy web improvements that could increase inbound calls. I already prepared a preview and can send it over. Who's the best person to share that with?`;
  }, [selectedBusiness?.name]);

  async function copyTemplate(): Promise<void> {
    await navigator.clipboard.writeText(emailTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className='grid gap-6 lg:grid-cols-[360px_1fr]'>
      <Card>
        <CardHeader>
          <CardTitle>Template Controls</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='business'>Business</Label>
            <Select
              id='business'
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
              options={[
                { label: 'Select a business', value: '' },
                ...businessOptions.map((item) => ({
                  label: item.name,
                  value: String(item.id)
                }))
              ]}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='variant'>Variant</Label>
            <Select
              id='variant'
              value={variant}
              onChange={(event) => setVariant(event.target.value as TemplateVariant)}
              options={[
                { label: 'No Website', value: 'no_website' },
                { label: 'Outdated Website', value: 'outdated_website' }
              ]}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='preview'>Preview URL</Label>
            <Input id='preview' value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} />
          </div>

          <Button onClick={copyTemplate} className='w-full'>
            {copied ? 'Copied' : 'Copy Email to Clipboard'}
          </Button>
        </CardContent>
      </Card>

      <div className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={emailTemplate} readOnly className='min-h-[280px] font-mono text-xs leading-relaxed' />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Script</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={callScript} readOnly className='min-h-[140px] text-sm leading-relaxed' />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
