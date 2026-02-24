export type LeadStatus = 'new' | 'contacted' | 'interested' | 'proposal_sent' | 'closed' | 'passed';

export interface Business {
  id: number;
  google_place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  category: string | null;
  google_rating: number | null;
  review_count: number | null;
  website_url: string | null;
  has_website: number;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: number;
  business_id: number;
  lighthouse_performance: number | null;
  lighthouse_accessibility: number | null;
  lighthouse_seo: number | null;
  lighthouse_best_practices: number | null;
  mobile_friendly: number | null;
  has_ssl: number | null;
  load_time_ms: number | null;
  design_score: number | null;
  ai_verdict: string | null;
  composite_score: number | null;
  desktop_screenshot_path: string | null;
  mobile_screenshot_path: string | null;
  evaluated_at: string;
}

export interface Lead {
  id: number;
  business_id: number;
  score: number;
  status: LeadStatus;
  notes: string | null;
  demo_url: string | null;
  outreach_type: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoSite {
  id: number;
  business_id: number;
  template: string | null;
  generated_content: string | null;
  preview_url: string | null;
  status: 'draft' | 'deployed' | 'archived';
  created_at: string;
}

export interface LeadWithBusiness extends Lead {
  business_name: string;
  business_address: string | null;
  business_phone: string | null;
  business_category: string | null;
  business_google_rating: number | null;
  business_review_count: number | null;
  business_website_url: string | null;
  business_has_website: number;
  latest_composite_score: number | null;
  desktop_screenshot_path: string | null;
  mobile_screenshot_path: string | null;
}

export interface DashboardFilters {
  search?: string;
  category?: string;
  status?: LeadStatus | 'all';
  hasWebsite?: 'all' | 'yes' | 'no';
  page?: number;
  pageSize?: number;
}

export interface SettingsConfig {
  googlePlacesApiKey: string;
  openRouterApiKey: string;
  lastScrapeAt: string | null;
}
