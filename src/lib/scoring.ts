export interface BasicWebsiteChecks {
  hasSsl: boolean;
  loadTimeMs: number;
  mobileFriendly: boolean;
}

export function calculateCompositeScore(checks: BasicWebsiteChecks): number {
  const sslScore = checks.hasSsl ? 30 : 0;
  const mobileScore = checks.mobileFriendly ? 35 : 0;

  // 35 points at <=1s, tapering to 0 points at >=8s.
  const normalized = Math.max(0, Math.min(1, (8000 - checks.loadTimeMs) / 7000));
  const speedScore = Math.round(normalized * 35);

  return Math.max(0, Math.min(100, sslScore + mobileScore + speedScore));
}

export function leadScoreBadgeVariant(score: number): 'hot' | 'warm' | 'good' {
  if (score >= 80) return 'hot';
  if (score >= 50) return 'warm';
  return 'good';
}

export function inferIssuesForOutreach(hasWebsite: boolean, compositeScore?: number | null): string[] {
  if (!hasWebsite) {
    return [
      'No website found in Google Business profile',
      'Missing online credibility touchpoint for new customers',
      'No dedicated page to convert local search traffic'
    ];
  }

  const issues = ['Site speed and mobile experience could be improved'];

  if (compositeScore !== null && compositeScore !== undefined) {
    if (compositeScore < 40) {
      issues.unshift('Website quality appears significantly below modern standards');
    } else if (compositeScore < 60) {
      issues.unshift('Website quality appears average and likely underperforming');
    }
  }

  issues.push('Opportunity to improve conversion-focused design and messaging');
  return issues;
}
