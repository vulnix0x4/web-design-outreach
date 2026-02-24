import { OutreachTemplate } from '@/components/outreach-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listLeads } from '@/lib/db';

export default function OutreachPage(): React.JSX.Element {
  const { rows } = listLeads({ page: 1, pageSize: 100 });
  const businessOptions = rows.map((lead) => ({
    id: lead.business_id,
    name: lead.business_name,
    hasWebsite: Boolean(lead.business_has_website),
    website: lead.business_website_url,
    compositeScore: lead.latest_composite_score
  }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Outreach Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            Use the no-website and outdated-website variants, auto-filled with lead data and preview links.
          </p>
        </CardContent>
      </Card>

      <OutreachTemplate businessOptions={businessOptions} defaultPreviewUrl={`${baseUrl}/previews/sample-business`} />
    </div>
  );
}
