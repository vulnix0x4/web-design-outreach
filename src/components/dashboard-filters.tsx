'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LEAD_STATUS_OPTIONS } from '@/lib/constants';

interface DashboardFiltersProps {
  categories: string[];
  initialSearch: string;
  initialCategory: string;
  initialStatus: string;
  initialHasWebsite: string;
}

export function DashboardFilters({
  categories,
  initialSearch,
  initialCategory,
  initialStatus,
  initialHasWebsite
}: DashboardFiltersProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory || 'all');
  const [status, setStatus] = useState(initialStatus || 'all');
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(initialHasWebsite === 'no');

  function applyFilters(): void {
    const params = new URLSearchParams(searchParams.toString());

    if (search.trim()) params.set('search', search.trim());
    else params.delete('search');

    if (category && category !== 'all') params.set('category', category);
    else params.delete('category');

    if (status && status !== 'all') params.set('status', status);
    else params.delete('status');

    if (onlyNoWebsite) params.set('hasWebsite', 'no');
    else params.delete('hasWebsite');

    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters(): void {
    setSearch('');
    setCategory('all');
    setStatus('all');
    setOnlyNoWebsite(false);
    router.push(pathname);
  }

  return (
    <div className='rounded-xl border bg-card/70 p-4'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
        <div className='space-y-2 xl:col-span-2'>
          <Label htmlFor='search'>Search business</Label>
          <Input
            id='search'
            value={search}
            placeholder='Search by business name'
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyFilters();
            }}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='category'>Category</Label>
          <Select
            id='category'
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            options={[
              { label: 'All categories', value: 'all' },
              ...categories.map((item) => ({ label: item, value: item }))
            ]}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='status'>Status</Label>
          <Select
            id='status'
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={LEAD_STATUS_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value
            }))}
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='no-website-toggle'>No website only</Label>
          <div className='flex h-9 items-center gap-3 rounded-md border border-input px-3'>
            <Switch id='no-website-toggle' checked={onlyNoWebsite} onCheckedChange={setOnlyNoWebsite} />
            <span className='text-xs text-muted-foreground'>{onlyNoWebsite ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>

      <div className='mt-4 flex flex-wrap gap-2'>
        <Button onClick={applyFilters}>Apply Filters</Button>
        <Button variant='outline' onClick={clearFilters}>
          Clear
        </Button>
      </div>
    </div>
  );
}
