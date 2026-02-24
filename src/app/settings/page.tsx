import { SettingsPanel } from '@/components/settings-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { readConfig } from '@/lib/config';
import { getDashboardStats } from '@/lib/db';

export default function SettingsPage(): React.JSX.Element {
  const config = readConfig();
  const stats = getDashboardStats();

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>Manage API credentials, run scrapes, and monitor local data volume.</p>
        </CardContent>
      </Card>

      <SettingsPanel initialConfig={config} stats={stats} />
    </div>
  );
}
