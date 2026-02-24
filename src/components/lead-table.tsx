'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ScoreBadge } from '@/components/score-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatPhone } from '@/lib/utils';
import { LeadWithBusiness } from '@/types';

interface LeadTableProps {
  leads: LeadWithBusiness[];
  page: number;
  totalPages: number;
}

export function LeadTable({ leads, page, totalPages }: LeadTableProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [evaluatingBusinessId, setEvaluatingBusinessId] = useState<number | null>(null);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);

  function buildPageHref(nextPage: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    return `${pathname}?${params.toString()}`;
  }

  async function evaluateBusiness(businessId: number): Promise<void> {
    setEvaluateError(null);
    setEvaluatingBusinessId(businessId);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ business_id: businessId })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'Failed to evaluate website.');
      }

      router.refresh();
    } catch (error) {
      setEvaluateError((error as Error).message);
    } finally {
      setEvaluatingBusinessId(null);
    }
  }

  if (!leads.length) {
    return (
      <div className='rounded-xl border bg-card/70 p-10 text-center text-sm text-muted-foreground'>
        No leads found. Run a scrape from Settings to populate businesses.
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {evaluateError ? <p className='text-sm text-red-300'>{evaluateError}</p> : null}

      <div className='rounded-xl border bg-card/70'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Quality Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const isExpanded = expandedLeadId === lead.id;
              return (
                <Fragment key={lead.id}>
                  <TableRow
                    onClick={() => setExpandedLeadId((current) => (current === lead.id ? null : lead.id))}
                    className='cursor-pointer'
                  >
                    <TableCell>
                      <div className='font-medium'>{lead.business_name}</div>
                    </TableCell>
                    <TableCell>{lead.business_category ?? 'Unknown'}</TableCell>
                    <TableCell>{formatPhone(lead.business_phone)}</TableCell>
                    <TableCell>
                      {lead.business_website_url ? (
                        <a
                          href={lead.business_website_url}
                          target='_blank'
                          rel='noreferrer'
                          className='text-primary underline-offset-4 hover:underline'
                          onClick={(event) => event.stopPropagation()}
                        >
                          Visit
                        </a>
                      ) : (
                        'None'
                      )}
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={lead.score} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Link href={`/leads/${lead.id}`} onClick={(event) => event.stopPropagation()}>
                          <Button size='sm' variant='outline'>
                            Open
                          </Button>
                        </Link>
                        <Button
                          size='sm'
                          variant='secondary'
                          disabled={!lead.business_website_url || evaluatingBusinessId === lead.business_id}
                          onClick={(event) => {
                            event.stopPropagation();
                            evaluateBusiness(lead.business_id);
                          }}
                        >
                          {evaluatingBusinessId === lead.business_id ? 'Evaluating...' : 'Evaluate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className='grid gap-2 text-sm md:grid-cols-2'>
                          <p>
                            <span className='text-muted-foreground'>Address:</span> {lead.business_address ?? 'N/A'}
                          </p>
                          <p>
                            <span className='text-muted-foreground'>Google Rating:</span>{' '}
                            {lead.business_google_rating ? `${lead.business_google_rating} (${lead.business_review_count ?? 0} reviews)` : 'N/A'}
                          </p>
                          <p>
                            <span className='text-muted-foreground'>Latest Website Score:</span>{' '}
                            {lead.latest_composite_score ?? 'Not evaluated'}
                          </p>
                          <p>
                            <span className='text-muted-foreground'>Notes:</span> {lead.notes?.trim() ? lead.notes : 'None'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between rounded-xl border bg-card/70 p-3 text-sm'>
        <p className='text-muted-foreground'>
          Page {page} of {Math.max(totalPages, 1)}
        </p>
        <div className='flex gap-2'>
          <Link href={buildPageHref(Math.max(1, page - 1))}>
            <Button variant='outline' size='sm' disabled={page <= 1}>
              Previous
            </Button>
          </Link>
          <Link href={buildPageHref(Math.min(totalPages, page + 1))}>
            <Button variant='outline' size='sm' disabled={page >= totalPages}>
              Next
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
