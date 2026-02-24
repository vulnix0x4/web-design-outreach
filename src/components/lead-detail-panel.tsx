'use client';

import { useMemo, useState } from 'react';

import { EvaluationCard } from '@/components/evaluation-card';
import { ScoreBadge } from '@/components/score-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { LEAD_STATUS_OPTIONS } from '@/lib/constants';
import { inferIssuesForOutreach } from '@/lib/scoring';
import { formatDate } from '@/lib/utils';
import { Evaluation, LeadWithBusiness } from '@/types';

interface LeadDetailPanelProps {
  lead: LeadWithBusiness;
  evaluation: Evaluation | null;
}

export function LeadDetailPanel({ lead, evaluation }: LeadDetailPanelProps): React.JSX.Element {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [demoUrl, setDemoUrl] = useState(lead.demo_url ?? `http://localhost:3000/previews/${lead.business_id}`);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outreachIssues = useMemo(
    () => inferIssuesForOutreach(Boolean(lead.business_has_website), evaluation?.composite_score),
    [lead.business_has_website, evaluation?.composite_score]
  );

  const outreachTemplate = useMemo(() => {
    const issueBullets = outreachIssues.map((issue) => `- ${issue}`).join('\n');
    if (!lead.business_has_website) {
      return `Subject: Quick website concept for ${lead.business_name}\n\nHi ${lead.business_name} team,\n\nI was researching local businesses and noticed you don't have a dedicated website listed yet.\n\nWhat I found:\n${issueBullets}\n\nI mocked up a preview concept here:\n${demoUrl}\n\nIf useful, I can turn this into a complete launch-ready site quickly.\n\n- Luke`;
    }

    return `Subject: Website refresh idea for ${lead.business_name}\n\nHi ${lead.business_name} team,\n\nI reviewed your site and found a few improvements that could boost local conversions.\n\nWhat I found:\n${issueBullets}\n\nI created a preview of what a refreshed version could look like:\n${demoUrl}\n\nHappy to share specifics if you're interested.\n\n- Luke`;
  }, [demoUrl, lead.business_has_website, lead.business_name, outreachIssues]);

  async function patchLead(payload: Record<string, unknown>): Promise<void> {
    const response = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error ?? 'Failed to update lead');
    }
  }

  async function saveStatus(): Promise<void> {
    setError(null);
    setMessage(null);
    setIsSavingStatus(true);

    try {
      await patchLead({ status, contacted_at: status === 'contacted' ? new Date().toISOString() : null });
      setMessage('Status updated.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function saveNotes(): Promise<void> {
    setError(null);
    setMessage(null);
    setIsSavingNotes(true);

    try {
      await patchLead({ notes });
      setMessage('Notes saved.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function generateDemo(): Promise<void> {
    setError(null);
    setMessage(null);
    setIsGeneratingDemo(true);

    try {
      const response = await fetch('/api/generate-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lead_id: lead.id, business_id: lead.business_id })
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to generate demo.');
      }

      const payload = (await response.json()) as { previewUrl?: string; message?: string };
      if (payload.previewUrl) {
        setDemoUrl(payload.previewUrl);
        await patchLead({ demo_url: payload.previewUrl });
      }

      setMessage(payload.message ?? 'Demo placeholder generated.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGeneratingDemo(false);
    }
  }

  async function copyOutreachTemplate(): Promise<void> {
    await navigator.clipboard.writeText(outreachTemplate);
    setMessage('Outreach template copied.');
  }

  return (
    <div className='space-y-6'>
      {error ? <p className='text-sm text-red-300'>{error}</p> : null}
      {message ? <p className='text-sm text-emerald-300'>{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-3 text-sm md:grid-cols-2'>
          <div>
            <p className='text-muted-foreground'>Name</p>
            <p className='font-medium'>{lead.business_name}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Category</p>
            <p className='font-medium'>{lead.business_category ?? 'Unknown'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Address</p>
            <p className='font-medium'>{lead.business_address ?? 'N/A'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Phone</p>
            <p className='font-medium'>{lead.business_phone ?? 'N/A'}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Google Rating</p>
            <p className='font-medium'>
              {lead.business_google_rating ? `${lead.business_google_rating} (${lead.business_review_count ?? 0} reviews)` : 'N/A'}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Website</p>
            <p className='font-medium'>
              {lead.business_website_url ? (
                <a href={lead.business_website_url} target='_blank' rel='noreferrer' className='text-primary hover:underline'>
                  {lead.business_website_url}
                </a>
              ) : (
                'None'
              )}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Lead Score</p>
            <ScoreBadge score={lead.score} />
          </div>
          <div>
            <p className='text-muted-foreground'>Current Status</p>
            <StatusBadge status={lead.status} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead Workflow</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-[250px_1fr]'>
          <div className='space-y-2'>
            <Label htmlFor='status'>Status</Label>
            <Select
              id='status'
              value={status}
              onChange={(event) => setStatus(event.target.value as LeadWithBusiness['status'])}
              options={LEAD_STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => ({
                label: option.label,
                value: option.value
              }))}
            />
            <Button onClick={saveStatus} disabled={isSavingStatus} className='w-full'>
              {isSavingStatus ? 'Saving...' : 'Update Status'}
            </Button>
            <p className='text-xs text-muted-foreground'>Created: {formatDate(lead.created_at)}</p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='notes'>Notes</Label>
            <Textarea
              id='notes'
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder='Add context before outreach...'
              className='min-h-[130px]'
            />
            <Button variant='secondary' onClick={saveNotes} disabled={isSavingNotes}>
              {isSavingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Website Evaluation</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {evaluation ? (
            <>
              <div className='grid gap-4 md:grid-cols-4'>
                <EvaluationCard title='Composite Score' value={evaluation.composite_score} subtitle='Basic checks only' />
                <EvaluationCard title='Load Time (ms)' value={evaluation.load_time_ms} />
                <EvaluationCard title='SSL' value={evaluation.has_ssl ? 100 : 0} subtitle={evaluation.has_ssl ? 'HTTPS enabled' : 'HTTPS missing'} />
                <EvaluationCard
                  title='Mobile Meta Tag'
                  value={evaluation.mobile_friendly ? 100 : 0}
                  subtitle={evaluation.mobile_friendly ? 'Viewport tag present' : 'Viewport tag missing'}
                />
              </div>

              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>{evaluation.ai_verdict ?? 'No additional verdict.'}</p>
                <p className='text-xs text-muted-foreground'>Evaluated at: {formatDate(evaluation.evaluated_at)}</p>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Desktop Screenshot</p>
                  {evaluation.desktop_screenshot_path ? (
                    <img
                      src={`/api/screenshots/${encodeURIComponent(evaluation.desktop_screenshot_path)}`}
                      alt='Desktop screenshot'
                      className='w-full rounded-lg border border-border object-cover'
                    />
                  ) : (
                    <p className='text-sm text-muted-foreground'>Not available.</p>
                  )}
                </div>

                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Mobile Screenshot</p>
                  {evaluation.mobile_screenshot_path ? (
                    <img
                      src={`/api/screenshots/${encodeURIComponent(evaluation.mobile_screenshot_path)}`}
                      alt='Mobile screenshot'
                      className='w-full rounded-lg border border-border object-cover'
                    />
                  ) : (
                    <p className='text-sm text-muted-foreground'>Not available.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className='text-sm text-muted-foreground'>No evaluation yet. Trigger evaluation from dashboard or API.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outreach</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-3 md:grid-cols-[1fr_auto]'>
            <div className='space-y-2'>
              <Label htmlFor='demo-url'>Preview URL</Label>
              <Input id='demo-url' value={demoUrl} onChange={(event) => setDemoUrl(event.target.value)} />
            </div>
            <div className='flex items-end gap-2'>
              <Button onClick={generateDemo} disabled={isGeneratingDemo}>
                {isGeneratingDemo ? 'Generating...' : 'Generate Demo'}
              </Button>
            </div>
          </div>

          <Separator />

          <div className='space-y-2'>
            <p className='text-sm font-medium'>Pre-filled Email</p>
            <Textarea value={outreachTemplate} readOnly className='min-h-[240px] font-mono text-xs leading-relaxed' />
            <Button variant='outline' onClick={copyOutreachTemplate}>
              Copy Email Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
