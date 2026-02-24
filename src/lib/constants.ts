import { LeadStatus } from '@/types';

export const DEFAULT_LOCATION = 'St. George, UT';

export const DEFAULT_BUSINESS_CATEGORIES = [
  'restaurant',
  'cafe',
  'bakery',
  'barber shop',
  'hair salon',
  'nail salon',
  'spa',
  'dentist',
  'chiropractor',
  'veterinarian',
  'gym',
  'yoga studio',
  'plumber',
  'electrician',
  'hvac contractor',
  'roofing contractor',
  'landscaping service',
  'cleaning service',
  'auto repair shop',
  'car wash',
  'tire shop',
  'real estate agency',
  'insurance agency',
  'law firm',
  'accountant',
  'photographer',
  'event planner',
  'child care center',
  'moving company',
  'pest control service',
  'pool service',
  'window tinting service',
  'martial arts school',
  'pet groomer'
] as const;

export const LEAD_STATUS_OPTIONS: Array<{ label: string; value: LeadStatus | 'all' }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Interested', value: 'interested' },
  { label: 'Proposal Sent', value: 'proposal_sent' },
  { label: 'Closed', value: 'closed' },
  { label: 'Passed', value: 'passed' }
];

export const WEBSITE_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Has Website', value: 'yes' },
  { label: 'No Website', value: 'no' }
] as const;
