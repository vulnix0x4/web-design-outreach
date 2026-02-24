import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

import { DashboardFilters, DemoSite, Evaluation, Lead, LeadStatus, LeadWithBusiness, SettingsConfig } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'webdesign.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_place_id TEXT UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      category TEXT,
      google_rating REAL,
      review_count INTEGER,
      website_url TEXT,
      has_website BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER REFERENCES businesses(id),
      lighthouse_performance INTEGER,
      lighthouse_accessibility INTEGER,
      lighthouse_seo INTEGER,
      lighthouse_best_practices INTEGER,
      mobile_friendly BOOLEAN,
      has_ssl BOOLEAN,
      load_time_ms INTEGER,
      design_score INTEGER,
      ai_verdict TEXT,
      composite_score INTEGER,
      desktop_screenshot_path TEXT,
      mobile_screenshot_path TEXT,
      evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER REFERENCES businesses(id),
      score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'new',
      notes TEXT,
      demo_url TEXT,
      outreach_type TEXT,
      contacted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS demo_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER REFERENCES businesses(id),
      template TEXT,
      generated_content TEXT,
      preview_url TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS businesses_updated_at_trigger
    AFTER UPDATE ON businesses
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE businesses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS leads_updated_at_trigger
    AFTER UPDATE ON leads
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
}

initSchema();

function toBooleanInt(value?: boolean | null): number {
  return value ? 1 : 0;
}

function calculateDefaultLeadScore(hasWebsite: boolean): number {
  return hasWebsite ? 60 : 100;
}

export interface BusinessInput {
  google_place_id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  category?: string | null;
  google_rating?: number | null;
  review_count?: number | null;
  website_url?: string | null;
  has_website?: boolean;
}

export interface BusinessUpdateInput {
  name?: string;
  address?: string | null;
  phone?: string | null;
  category?: string | null;
  google_rating?: number | null;
  review_count?: number | null;
  website_url?: string | null;
  has_website?: boolean;
}

export interface EvaluationInput {
  business_id: number;
  lighthouse_performance?: number | null;
  lighthouse_accessibility?: number | null;
  lighthouse_seo?: number | null;
  lighthouse_best_practices?: number | null;
  mobile_friendly?: boolean | null;
  has_ssl?: boolean | null;
  load_time_ms?: number | null;
  design_score?: number | null;
  ai_verdict?: string | null;
  composite_score?: number | null;
  desktop_screenshot_path?: string | null;
  mobile_screenshot_path?: string | null;
}

export interface LeadInput {
  business_id: number;
  score?: number;
  status?: LeadStatus;
  notes?: string | null;
  demo_url?: string | null;
  outreach_type?: string | null;
  contacted_at?: string | null;
}

export interface LeadUpdateInput {
  score?: number;
  status?: LeadStatus;
  notes?: string | null;
  demo_url?: string | null;
  outreach_type?: string | null;
  contacted_at?: string | null;
}

export interface DemoSiteInput {
  business_id: number;
  template?: string | null;
  generated_content?: string | null;
  preview_url?: string | null;
  status?: 'draft' | 'deployed' | 'archived';
}

export function getDbPath(): string {
  return DB_PATH;
}

export function upsertBusiness(input: BusinessInput): number {
  const hasWebsite = input.has_website ?? Boolean(input.website_url);
  const existing = db
    .prepare('SELECT id FROM businesses WHERE google_place_id = ?')
    .get(input.google_place_id) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `
      UPDATE businesses
      SET name = ?, address = ?, phone = ?, category = ?, google_rating = ?, review_count = ?, website_url = ?, has_website = ?
      WHERE id = ?
      `
    ).run(
      input.name,
      input.address ?? null,
      input.phone ?? null,
      input.category ?? null,
      input.google_rating ?? null,
      input.review_count ?? null,
      input.website_url ?? null,
      toBooleanInt(hasWebsite),
      existing.id
    );

    ensureLeadForBusiness(existing.id, calculateDefaultLeadScore(hasWebsite));
    return existing.id;
  }

  const result = db.prepare(
    `
    INSERT INTO businesses (google_place_id, name, address, phone, category, google_rating, review_count, website_url, has_website)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.google_place_id,
    input.name,
    input.address ?? null,
    input.phone ?? null,
    input.category ?? null,
    input.google_rating ?? null,
    input.review_count ?? null,
    input.website_url ?? null,
    toBooleanInt(hasWebsite)
  );

  const businessId = Number(result.lastInsertRowid);
  createLead({
    business_id: businessId,
    score: calculateDefaultLeadScore(hasWebsite),
    status: 'new'
  });

  return businessId;
}

export function createBusiness(input: BusinessInput): number {
  return upsertBusiness(input);
}

export function getBusinessById(id: number): Record<string, unknown> | undefined {
  return db.prepare('SELECT * FROM businesses WHERE id = ?').get(id) as Record<string, unknown> | undefined;
}

export function getBusinessByPlaceId(googlePlaceId: string): Record<string, unknown> | undefined {
  return db
    .prepare('SELECT * FROM businesses WHERE google_place_id = ?')
    .get(googlePlaceId) as Record<string, unknown> | undefined;
}

export function listBusinesses(options?: {
  category?: string;
  hasWebsite?: 'all' | 'yes' | 'no';
  search?: string;
  page?: number;
  pageSize?: number;
}): { rows: Record<string, unknown>[]; total: number } {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.category && options.category !== 'all') {
    conditions.push('category = ?');
    params.push(options.category);
  }

  if (options?.hasWebsite && options.hasWebsite !== 'all') {
    conditions.push('has_website = ?');
    params.push(options.hasWebsite === 'yes' ? 1 : 0);
  }

  if (options?.search) {
    conditions.push('name LIKE ?');
    params.push(`%${options.search}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM businesses ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset) as Record<string, unknown>[];
  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM businesses ${whereClause}`)
    .get(...params) as { count: number };

  return { rows, total: countRow.count };
}

export function updateBusiness(id: number, input: BusinessUpdateInput): void {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name);
  }
  if (input.address !== undefined) {
    fields.push('address = ?');
    params.push(input.address);
  }
  if (input.phone !== undefined) {
    fields.push('phone = ?');
    params.push(input.phone);
  }
  if (input.category !== undefined) {
    fields.push('category = ?');
    params.push(input.category);
  }
  if (input.google_rating !== undefined) {
    fields.push('google_rating = ?');
    params.push(input.google_rating);
  }
  if (input.review_count !== undefined) {
    fields.push('review_count = ?');
    params.push(input.review_count);
  }
  if (input.website_url !== undefined) {
    fields.push('website_url = ?');
    params.push(input.website_url);
  }
  if (input.has_website !== undefined) {
    fields.push('has_website = ?');
    params.push(toBooleanInt(input.has_website));
  }

  if (!fields.length) return;
  db.prepare(`UPDATE businesses SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
}

export function deleteBusiness(id: number): void {
  db.prepare('DELETE FROM businesses WHERE id = ?').run(id);
}

export function createEvaluation(input: EvaluationInput): number {
  const result = db.prepare(
    `
    INSERT INTO evaluations (
      business_id,
      lighthouse_performance,
      lighthouse_accessibility,
      lighthouse_seo,
      lighthouse_best_practices,
      mobile_friendly,
      has_ssl,
      load_time_ms,
      design_score,
      ai_verdict,
      composite_score,
      desktop_screenshot_path,
      mobile_screenshot_path
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.business_id,
    input.lighthouse_performance ?? null,
    input.lighthouse_accessibility ?? null,
    input.lighthouse_seo ?? null,
    input.lighthouse_best_practices ?? null,
    input.mobile_friendly === null ? null : toBooleanInt(input.mobile_friendly),
    input.has_ssl === null ? null : toBooleanInt(input.has_ssl),
    input.load_time_ms ?? null,
    input.design_score ?? null,
    input.ai_verdict ?? null,
    input.composite_score ?? null,
    input.desktop_screenshot_path ?? null,
    input.mobile_screenshot_path ?? null
  );

  if (input.composite_score !== null && input.composite_score !== undefined) {
    updateLeadScoreForBusiness(input.business_id, Math.max(0, 100 - input.composite_score));
  }

  return Number(result.lastInsertRowid);
}

export function getEvaluationById(id: number): Evaluation | undefined {
  return db.prepare('SELECT * FROM evaluations WHERE id = ?').get(id) as Evaluation | undefined;
}

export function getLatestEvaluationByBusinessId(businessId: number): Evaluation | undefined {
  return db
    .prepare('SELECT * FROM evaluations WHERE business_id = ? ORDER BY evaluated_at DESC, id DESC LIMIT 1')
    .get(businessId) as Evaluation | undefined;
}

export function listEvaluations(businessId?: number): Evaluation[] {
  if (businessId) {
    return db
      .prepare('SELECT * FROM evaluations WHERE business_id = ? ORDER BY evaluated_at DESC, id DESC')
      .all(businessId) as Evaluation[];
  }
  return db.prepare('SELECT * FROM evaluations ORDER BY evaluated_at DESC, id DESC').all() as Evaluation[];
}

export function deleteEvaluation(id: number): void {
  db.prepare('DELETE FROM evaluations WHERE id = ?').run(id);
}

export function createLead(input: LeadInput): number {
  const result = db.prepare(
    `
    INSERT INTO leads (business_id, score, status, notes, demo_url, outreach_type, contacted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.business_id,
    input.score ?? 0,
    input.status ?? 'new',
    input.notes ?? null,
    input.demo_url ?? null,
    input.outreach_type ?? null,
    input.contacted_at ?? null
  );
  return Number(result.lastInsertRowid);
}

export function ensureLeadForBusiness(businessId: number, defaultScore = 0): number {
  const existing = db.prepare('SELECT id FROM leads WHERE business_id = ?').get(businessId) as { id: number } | undefined;
  if (existing) return existing.id;

  return createLead({
    business_id: businessId,
    score: defaultScore,
    status: 'new'
  });
}

export function getLeadById(id: number): LeadWithBusiness | undefined {
  return db
    .prepare(
      `
      SELECT
        l.*,
        b.name as business_name,
        b.address as business_address,
        b.phone as business_phone,
        b.category as business_category,
        b.google_rating as business_google_rating,
        b.review_count as business_review_count,
        b.website_url as business_website_url,
        b.has_website as business_has_website,
        e.composite_score as latest_composite_score,
        e.desktop_screenshot_path,
        e.mobile_screenshot_path
      FROM leads l
      JOIN businesses b ON b.id = l.business_id
      LEFT JOIN evaluations e ON e.id = (
        SELECT id FROM evaluations ee WHERE ee.business_id = b.id ORDER BY ee.evaluated_at DESC, ee.id DESC LIMIT 1
      )
      WHERE l.id = ?
      `
    )
    .get(id) as LeadWithBusiness | undefined;
}

function buildLeadFilterWhereClause(filters?: DashboardFilters): { whereClause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.search) {
    conditions.push('b.name LIKE ?');
    params.push(`%${filters.search}%`);
  }

  if (filters?.category && filters.category !== 'all') {
    conditions.push('b.category = ?');
    params.push(filters.category);
  }

  if (filters?.status && filters.status !== 'all') {
    conditions.push('l.status = ?');
    params.push(filters.status);
  }

  if (filters?.hasWebsite && filters.hasWebsite !== 'all') {
    conditions.push('b.has_website = ?');
    params.push(filters.hasWebsite === 'yes' ? 1 : 0);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

export function listLeads(filters?: DashboardFilters): { rows: LeadWithBusiness[]; total: number } {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;
  const { whereClause, params } = buildLeadFilterWhereClause(filters);

  const rows = db
    .prepare(
      `
      SELECT
        l.*,
        b.name as business_name,
        b.address as business_address,
        b.phone as business_phone,
        b.category as business_category,
        b.google_rating as business_google_rating,
        b.review_count as business_review_count,
        b.website_url as business_website_url,
        b.has_website as business_has_website,
        e.composite_score as latest_composite_score,
        e.desktop_screenshot_path,
        e.mobile_screenshot_path
      FROM leads l
      JOIN businesses b ON b.id = l.business_id
      LEFT JOIN evaluations e ON e.id = (
        SELECT id FROM evaluations ee WHERE ee.business_id = b.id ORDER BY ee.evaluated_at DESC, ee.id DESC LIMIT 1
      )
      ${whereClause}
      ORDER BY l.score DESC, l.updated_at DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(...params, pageSize, offset) as LeadWithBusiness[];

  const countRow = db
    .prepare(
      `
      SELECT COUNT(*) as count
      FROM leads l
      JOIN businesses b ON b.id = l.business_id
      ${whereClause}
      `
    )
    .get(...params) as { count: number };

  return { rows, total: countRow.count };
}

export function updateLead(id: number, input: LeadUpdateInput): void {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.score !== undefined) {
    fields.push('score = ?');
    params.push(input.score);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    params.push(input.status);
  }
  if (input.notes !== undefined) {
    fields.push('notes = ?');
    params.push(input.notes);
  }
  if (input.demo_url !== undefined) {
    fields.push('demo_url = ?');
    params.push(input.demo_url);
  }
  if (input.outreach_type !== undefined) {
    fields.push('outreach_type = ?');
    params.push(input.outreach_type);
  }
  if (input.contacted_at !== undefined) {
    fields.push('contacted_at = ?');
    params.push(input.contacted_at);
  }

  if (!fields.length) return;
  db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
}

export function deleteLead(id: number): void {
  db.prepare('DELETE FROM leads WHERE id = ?').run(id);
}

export function updateLeadScoreForBusiness(businessId: number, score: number): void {
  ensureLeadForBusiness(businessId);
  db.prepare('UPDATE leads SET score = ? WHERE business_id = ?').run(score, businessId);
}

export function createDemoSite(input: DemoSiteInput): number {
  const result = db.prepare(
    `
    INSERT INTO demo_sites (business_id, template, generated_content, preview_url, status)
    VALUES (?, ?, ?, ?, ?)
    `
  ).run(
    input.business_id,
    input.template ?? null,
    input.generated_content ?? null,
    input.preview_url ?? null,
    input.status ?? 'draft'
  );
  return Number(result.lastInsertRowid);
}

export function getDemoSiteById(id: number): DemoSite | undefined {
  return db.prepare('SELECT * FROM demo_sites WHERE id = ?').get(id) as DemoSite | undefined;
}

export function getDemoSiteByBusinessId(businessId: number): DemoSite | undefined {
  return db
    .prepare('SELECT * FROM demo_sites WHERE business_id = ? ORDER BY created_at DESC, id DESC LIMIT 1')
    .get(businessId) as DemoSite | undefined;
}

export function listDemoSites(businessId?: number): DemoSite[] {
  if (businessId) {
    return db
      .prepare('SELECT * FROM demo_sites WHERE business_id = ? ORDER BY created_at DESC, id DESC')
      .all(businessId) as DemoSite[];
  }
  return db.prepare('SELECT * FROM demo_sites ORDER BY created_at DESC, id DESC').all() as DemoSite[];
}

export function updateDemoSite(id: number, input: Partial<DemoSiteInput>): void {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.template !== undefined) {
    fields.push('template = ?');
    params.push(input.template);
  }
  if (input.generated_content !== undefined) {
    fields.push('generated_content = ?');
    params.push(input.generated_content);
  }
  if (input.preview_url !== undefined) {
    fields.push('preview_url = ?');
    params.push(input.preview_url);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    params.push(input.status);
  }

  if (!fields.length) return;
  db.prepare(`UPDATE demo_sites SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
}

export function deleteDemoSite(id: number): void {
  db.prepare('DELETE FROM demo_sites WHERE id = ?').run(id);
}

export function getDashboardStats(): {
  totalBusinesses: number;
  businessesWithoutWebsites: number;
  evaluatedCount: number;
} {
  const totalBusinesses = (db.prepare('SELECT COUNT(*) as count FROM businesses').get() as { count: number }).count;
  const businessesWithoutWebsites = (
    db.prepare('SELECT COUNT(*) as count FROM businesses WHERE has_website = 0').get() as { count: number }
  ).count;
  const evaluatedCount = (
    db.prepare('SELECT COUNT(DISTINCT business_id) as count FROM evaluations').get() as { count: number }
  ).count;

  return {
    totalBusinesses,
    businessesWithoutWebsites,
    evaluatedCount
  };
}

export function getUniqueCategories(): string[] {
  const rows = db
    .prepare("SELECT DISTINCT category FROM businesses WHERE category IS NOT NULL AND category != '' ORDER BY category ASC")
    .all() as Array<{ category: string }>;
  return rows.map((row) => row.category);
}

export function getSettingsMetaFromDb(): Pick<SettingsConfig, 'lastScrapeAt'> {
  const row = db
    .prepare(
      `
      SELECT MAX(created_at) as lastScrapeAt
      FROM businesses
      `
    )
    .get() as { lastScrapeAt: string | null };

  return {
    lastScrapeAt: row.lastScrapeAt ?? null
  };
}
