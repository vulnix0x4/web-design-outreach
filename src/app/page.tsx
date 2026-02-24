import { DashboardFilters } from '@/components/dashboard-filters';
import { LeadTable } from '@/components/lead-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats, getUniqueCategories, listLeads } from '@/lib/db';

interface DashboardPageProps {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

function firstValue(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] ?? '' : value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps): Promise<React.JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const search = firstValue(resolvedSearchParams.search);
  const category = firstValue(resolvedSearchParams.category);
  const status = firstValue(resolvedSearchParams.status) || 'all';
  const hasWebsite = firstValue(resolvedSearchParams.hasWebsite) || 'all';
  const pageParam = Number(firstValue(resolvedSearchParams.page));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = 20;

  const [categories, leadResult, stats] = [
    getUniqueCategories(),
    listLeads({
      search,
      category: category || undefined,
      status: status as 'all' | 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'closed' | 'passed',
      hasWebsite: hasWebsite as 'all' | 'yes' | 'no',
      page,
      pageSize
    }),
    getDashboardStats()
  ];

  const totalPages = Math.ceil(leadResult.total / pageSize) || 1;

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Total Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-semibold'>{stats.totalBusinesses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Without Website</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-semibold text-red-300'>{stats.businessesWithoutWebsites}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Evaluated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-semibold text-emerald-300'>{stats.evaluatedCount}</p>
          </CardContent>
        </Card>
      </section>

      <DashboardFilters
        categories={categories}
        initialSearch={search}
        initialCategory={category || 'all'}
        initialStatus={status}
        initialHasWebsite={hasWebsite}
      />

      <LeadTable leads={leadResult.rows} page={page} totalPages={totalPages} />
    </div>
  );
}
