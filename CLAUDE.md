# Local Web Design Business — Prospecting Tool

## Project Overview
An automated local business prospecting and web design tool for St. George, Utah.
Finds businesses without websites (or with bad ones), evaluates their current web presence,
generates demo preview sites, and provides outreach tools.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** SQLite via better-sqlite3 (or Drizzle ORM)
- **Scraping:** Google Places API (official)
- **Browser Automation:** Playwright (for website evaluation)
- **AI:** Claude API / OpenAI API for content generation + website scoring
- **Deployment:** Self-hosted (runs on local server at /opt/docker/local-webdesign)

## Architecture

### Core Features (MVP)

#### 1. Lead Scraper (`/api/scrape`)
- Uses Google Places API to find businesses in St. George, UT
- Searches across 30+ business categories (restaurants, salons, plumbers, etc.)
- For each business, stores: name, address, phone, category, Google rating, review count, website URL (or null)
- Businesses with no website = hot leads (auto-scored 100)
- Runs as a background job, stores results in SQLite

#### 2. Website Evaluator (`/api/evaluate`)
- For businesses WITH a website, uses Playwright to:
  - Visit the site and take desktop + mobile screenshots
  - Run a Lighthouse audit (performance, accessibility, SEO, best practices)
  - Check: SSL, load time, mobile responsive, broken links, copyright year
  - Send screenshot to AI vision model for design quality rating (0-100)
- Calculates composite "website quality score" 0-100
- Score < 50 = prospect worth pitching a redesign

#### 3. Dashboard (`/app/page.tsx` — main dashboard)
- Lead list with columns: business name, category, phone, website, quality score, status, actions
- Filters: by category, by status (no website / bad website / good website / contacted / closed)
- Search by business name
- Click a lead to see full details: evaluation scores, screenshots, Google info
- Status tracking: new → contacted → interested → proposal sent → closed → passed
- Notes field per lead

#### 4. Demo Site Generator (`/api/generate-demo`)
- For qualified leads, auto-generates a preview landing page
- Pulls business info from Google (name, category, photos, hours, reviews)
- Selects industry-appropriate template
- AI generates copy (hero, about, services, CTA)
- Outputs static HTML that can be deployed as preview

#### 5. Outreach Tools (`/app/outreach/`)
- Pre-filled email templates (no website vs outdated website variants)
- Call script with talking points
- Customized per business using their data
- One-click copy to clipboard

### Database Schema

```sql
CREATE TABLE businesses (
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

CREATE TABLE evaluations (
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

CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES businesses(id),
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',  -- new, contacted, interested, proposal_sent, closed, passed
  notes TEXT,
  demo_url TEXT,
  outreach_type TEXT,  -- email, phone, walk_in
  contacted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE demo_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES businesses(id),
  template TEXT,
  generated_content TEXT,
  preview_url TEXT,
  status TEXT DEFAULT 'draft',  -- draft, deployed, archived
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Project Structure
```
/opt/docker/local-webdesign/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Main dashboard
│   │   ├── leads/
│   │   │   └── [id]/page.tsx     # Lead detail view
│   │   ├── outreach/
│   │   │   └── page.tsx          # Outreach templates
│   │   ├── settings/
│   │   │   └── page.tsx          # API keys, config
│   │   └── api/
│   │       ├── scrape/route.ts   # Google Places scraper
│   │       ├── evaluate/route.ts # Website evaluator
│   │       ├── leads/route.ts    # CRUD for leads
│   │       └── generate-demo/route.ts
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── lead-table.tsx
│   │   ├── lead-detail.tsx
│   │   ├── score-badge.tsx
│   │   ├── evaluation-card.tsx
│   │   └── outreach-template.tsx
│   ├── lib/
│   │   ├── db.ts                 # SQLite connection + queries
│   │   ├── google-places.ts      # Google Places API client
│   │   ├── evaluator.ts          # Playwright + Lighthouse logic
│   │   ├── demo-generator.ts     # AI content + template builder
│   │   └── scoring.ts            # Lead scoring logic
│   └── types/
│       └── index.ts              # TypeScript types
├── data/
│   ├── webdesign.db              # SQLite database
│   └── screenshots/              # Stored screenshots
├── templates/
│   ├── restaurant.html
│   ├── salon.html
│   ├── trades.html
│   └── general.html
├── public/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── CLAUDE.md
```

## Design Guidelines
- Dark theme preferred (dark bg, light text)
- Clean, minimal UI — shadcn/ui components
- Dashboard should feel like a CRM
- Color coding for lead quality: red (hot/no website), orange (bad website), green (good website)
- Status badges with distinct colors

## Environment Variables (will be set later)
```
GOOGLE_PLACES_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Important Notes
- This runs on a local server, not deployed publicly
- Only one user (Luke), no auth needed beyond basic password
- SQLite is fine for the data volume (~2000 businesses)
- Screenshots stored locally in /data/screenshots/
- Start with the dashboard + scraper, evaluation + demo generation can come after
