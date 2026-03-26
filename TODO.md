# 🇸🇪 Swedish AI Job Exposure Visualizer — Claude Agent Build Prompt

## Overview & Goal

Build a full-stack **Next.js 16 (App Router)** web application called **"Sweden Job Market Visualizer"** that visualizes AI exposure and adoption across Swedish occupations. This is inspired by [karpathy.ai/jobs](https://karpathy.ai/jobs/) but built with Swedish data, a dual-scoring model, and transparent methodology. It is intended as an **exploration and skills-transition tool**, not a forecast.

---

## Core Design Principles

1. **Two scores, not one**: Every occupation gets both a **"Theoretical AI Exposure"** score (0–10, how much of the job's tasks AI *could* affect) and a **"Current AI Adoption"** score (0–10, how much employers in Sweden are *already* deploying AI for this role).
2. **Transparency first**: Every score must link to an expandable panel showing the exact LLM prompt, full response, and rationale — raw outputs must be visible. No black-box numbers.
3. **Swedish context**: All data, descriptions, and framing reference Swedish labor market conditions — collective agreements (kollektivavtal), Swedish welfare services, union density, and Swedish sector structure.
4. **Non-alarmist framing**: The UI must prominently disclaim that "exposure ≠ displacement" and anchor the narrative in skills transitions, not job losses.
5. **Open source ready**: Code and pipeline should be structured cleanly enough to open-source.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Visualization | ECharts (via echarts-for-react) — treemap, scatter, bar |
| State management | Zustand |
| Data fetching (client) | SWR |
| LLM calls (server) | Vercel AI SDK with OpenAI or Anthropic provider |
| Database / cache | SQLite via better-sqlite3 (for cached LLM scores) |
| Data pipeline | Node.js scripts in `/scripts/` folder |
| Testing | Vitest |
| Deployment | Vercel |

---

## Project File Structure

```
sweden-job-market-visualizer/
├── app/
│   ├── layout.tsx                 # Root layout with nav and disclaimer banner
│   ├── page.tsx                   # Main treemap view
│   ├── occupation/
│   │   └── [ssyk]/page.tsx        # Individual occupation detail page
│   ├── methodology/page.tsx       # Methodology explanation page
│   ├── api/
│   │   ├── occupations/route.ts   # GET all occupations with scores
│   │   └── score/route.ts         # POST: score a single occupation via LLM
├── components/
│   ├── Treemap.tsx                # Main ECharts treemap component
│   ├── ScatterPlot.tsx            # Exposure vs Adoption 2D scatter
│   ├── OccupationCard.tsx         # Sidebar detail card
│   ├── ScoreBreakdown.tsx         # Expandable LLM rationale panel
│   ├── FilterBar.tsx              # Metric toggle (exposure/adoption/salary/outlook)
│   ├── DisclaimerBanner.tsx       # Persistent non-alarmist disclaimer
│   └── Legend.tsx                 # Color scale legend
├── lib/
│   ├── db.ts                      # SQLite connection and helpers
│   ├── scorer.ts                  # LLM scoring logic (multi-model)
│   ├── types.ts                   # TypeScript types
│   └── utils.ts                   # Helpers
├── data/
│   ├── occupations.json           # Built by pipeline — final merged dataset
│   └── raw/                       # Raw downloads from SCB and Arbetsförmedlingen
├── scripts/
│   ├── 01_fetch_yrkesprognoser.ts # Fetches forecast JSON from Jobtechdev
│   ├── 02_fetch_ssyk.ts           # Fetches/parses SSYK 2012 occupation list
│   ├── 03_score_occupations.ts    # Runs LLM scoring for all occupations
│   ├── 04_merge.ts                # Merges all sources into occupations.json
│   └── 05_validate.ts             # Sanity-check the merged data
├── public/
└── ...config files
```

---

## Data Sources & Pipeline

### Source 1: Arbetsförmedlingen / JobtechDev — Occupational Forecasts

- **URL**: `https://data.jobtechdev.se/yrkesprognoser/current/Yrkesprognos.json`
- **License**: Open data, free to use
- **Contains**: ~170 occupation groups with SSYK codes, forecast competition level (competition for jobs), short-term and medium-term labor market outlook, geographic demand data
- **Script**: `/scripts/01_fetch_yrkesprognoser.ts` — downloads this JSON and saves to `/data/raw/yrkesprognoser.json`

### Source 2: SCB SSYK 2012 Occupational Structure

- **URL**: `https://www.scb.se/dokumentation/klassifikationer-och-standarder/standard-for-svensk-yrkesklassificering-ssyk/`
- **Also available**: `https://www.scb.se/en/finding-statistics/statistics-by-subject-area/labour-market/labour-force-supply/the-swedish-occupational-register-with-statistics/`
- **Contains**: Full hierarchical SSYK 2012 taxonomy (major group, sub-major, minor group, unit group), occupation names in Swedish and English, employment counts, industry distribution
- **Script**: `/scripts/02_fetch_ssyk.ts` — parse SSYK structure. For occupational counts, use the SCB API (`api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0208/`) to fetch employed persons by 4-digit SSYK code.
- **SCB API**: Base URL: `https://api.scb.se/OV0104/v1/doris/en/ssd/` — use the PX-Web JSON-stat API with POST requests.

### Source 3: JobTech Taxonomy API

- **URL**: `https://taxonomy.api.jobtechdev.se/v1/taxonomy/specific/concepts/list?taxonomy-code=SSYK`
- **Contains**: Structured list of SSYK-coded occupations with Swedish/English labels and descriptions
- **License**: EPL-2.0

### Source 4: LLM Scoring (generated in pipeline)

See "Scoring Pipeline" section below.

### Data Merge Logic (`/scripts/04_merge.ts`)

Each occupation entry in the final `occupations.json` should have:

```typescript
interface Occupation {
  ssyk: string;               // 4-digit SSYK 2012 code
  nameSwedish: string;        // Swedish name
  nameEnglish: string;        // English name
  majorGroup: string;         // SSYK major group (1–9)
  subMajorGroup: string;
  minorGroup: string;
  employed: number;           // Number of employed persons in Sweden (from SCB)
  sector: "public" | "private" | "mixed";
  medianWageSEK?: number;     // Median monthly wage in SEK (from SCB lön statistics if available)
  educationLevel: string;     // Required typical education level

  // Arbetsförmedlingen forecast
  forecast: {
    outlookScore: number;       // 1–5 mapped from competition level
    competitionLevel: string;   // e.g. "Stor konkurrens", "Balans", "Brist"
    shortTermOutlook: string;   // Swedish text
    mediumTermOutlook: string;
  };

  // LLM-generated scores
  scores: {
    theoreticalExposure: number;      // 0–10
    theoreticalExposureRationale: string;
    currentAdoption: number;          // 0–10
    currentAdoptionRationale: string;
    promptUsed: string;               // Exact prompt used — stored for transparency
    modelUsed: string;                // e.g. "gpt-4o", "claude-3-5-sonnet"
    scoredAt: string;                 // ISO timestamp
  };

  // Derived
  quadrant: "high-exposure-high-adoption" | "high-exposure-low-adoption" | "low-exposure-high-adoption" | "low-exposure-low-adoption";
}
```

---

## Scoring Pipeline

### Theoretical Exposure Score (0–10)

This measures how much of the occupation's *tasks* AI theoretically *could* affect, based on Swedish task structure.

**Prompt template** (to be stored verbatim alongside each score):

```
You are scoring Swedish occupations for AI exposure. Assess the occupation below and return a JSON object.

OCCUPATION (SSYK code: {ssyk}): {nameSwedish} / {nameEnglish}
DESCRIPTION: {occupationDescription}

SCORING RUBRIC for "theoreticalExposure" (0–10):
- 9–10: Almost entirely screen/knowledge-based; output is text, code, data, or decisions AI models excel at
- 7–8: Majority of tasks are cognitive/digital but with some physical or interpersonal components
- 5–6: Mixed — significant cognitive tasks that AI could assist with, significant physical/relational tasks it cannot
- 3–4: Mostly physical, hands-on, interpersonal, or highly context-dependent (Swedish welfare/care setting)
- 1–2: Almost entirely physical, outdoor, or dependent on real-world embodiment
- 0: No plausible AI impact on core task structure

IMPORTANT CONTEXT (Sweden-specific):
- Sweden has high union density and strong collective agreements that slow adoption even in exposed occupations
- Many public sector roles (nurses, teachers, social workers) involve statutory duties that cannot be delegated to AI by law
- Consider the TASK composition, not just the job title
- High exposure does NOT mean job loss — demand may rise

Return ONLY valid JSON:
{
  "theoreticalExposure": <number 0-10 to one decimal>,
  "rationale": "<2-3 sentence explanation citing specific tasks>"
}
```

### Current AI Adoption Score (0–10)

This measures observable signals that AI is *already being deployed* in this occupation in Sweden.

**Inputs for this score (weighted composite)**:
1. (40%) Share of Swedish job ads for this SSYK group mentioning AI/ML/automation keywords in the past 12 months — use JobTech's historical ads dataset if available, or proxy via the job stream API
2. (30%) Sector-level AI adoption rates from TechSverige and AI Sweden surveys (map by SSYK major group to sector adoption %)
3. (30%) LLM-estimated adoption signal: prompt asks the model to estimate observable adoption signals given job description + known Swedish deployment trends

**Prompt template for the LLM component** (30%):

```
You are assessing current AI adoption signals for a Swedish occupation, NOT theoretical potential.

OCCUPATION: {nameSwedish} / {nameEnglish}
SSYK: {ssyk}
DESCRIPTION: {occupationDescription}

Rate "currentAdoption" (0–10) based on OBSERVABLE signals as of early 2026:
- 8–10: Tools actively used (e.g. GitHub Copilot for devs, AI drafting for lawyers, AI diagnostics for radiologists)
- 6–7: Significant tooling available and many employers adopting (e.g. AI-assisted customer service, data analysts using LLMs)
- 4–5: Early adoption — some employers experimenting, tools exist but not mainstream
- 2–3: Marginal — a few pilot programs, mostly talk, little deployment
- 0–1: No meaningful current adoption signals

Swedish context: AI adoption in Swedish workplaces is accelerating (AI tool mentions in job ads +328% since 2016, TechSverige 2026), but penetration is uneven. Public sector adoption is structurally slower.

Return ONLY valid JSON:
{
  "currentAdoption": <number 0-10 to one decimal>,
  "rationale": "<2-3 sentence explanation with specific tool/deployment examples if known>"
}
```

### Script: `/scripts/03_score_occupations.ts`

- Iterates over all merged occupations
- Checks SQLite cache first (`scores` table keyed on ssyk + modelName) — skip if already scored
- Calls LLM with rate limiting (max 5 req/sec)
- Stores full prompt, raw response, parsed scores, and timestamp in SQLite
- On error: log and continue; mark occupation as `scoredAt: null`
- Support `--model gpt-4o` or `--model claude-3-5-sonnet` CLI flag
- Support `--ssyk 3141` to re-score a single occupation

---

## Frontend — Main Treemap View (`/`)

### Layout

- Full-screen treemap (80% of viewport height)
- Top bar: app title "Sweden Job Market Visualizer", metric selector, view toggle (treemap / scatter)
- Left sidebar (320px, collapsible): occupation detail when clicked
- Bottom persistent disclaimer banner (see below)

### Treemap Behavior

- Rectangle **area** = number of employed persons in Sweden (from SCB)
- Rectangle **color** = selected metric:
  - **Theoretical Exposure** (default): Blue gradient, 0=white, 10=deep blue
  - **Current Adoption**: Orange gradient, 0=white, 10=deep orange
  - **Labor Market Outlook**: Green (shortage/brist) → Red (high competition)
  - **Education Level**: Categorical color scale
- On hover: tooltip showing occupation name (SV/EN toggle), score, employed count
- On click: opens occupation detail in left sidebar
- Group labels show SSYK major group names
- Animate color transition when user switches metric

### Filter Bar

Buttons/toggles at top:
- **Color metric**: Theoretical Exposure | Current Adoption | Outlook | Education
- **View**: Treemap | Scatter Plot (exposure vs. adoption)
- **Sector filter**: All | Public | Private | Mixed
- **Search**: fuzzy-search occupation name (Swedish or English)

### Scatter Plot View

X-axis: Theoretical Exposure (0–10)
Y-axis: Current Adoption (0–10)
Bubble size: Employment count
Color: SSYK major group (categorical)
Quadrant lines at 5,5 with labeled quadrants:
- Top-right: "High exposure, already changing"
- Top-left: "Adopting fast, lower exposure"
- Bottom-right: "Exposed but not yet disrupted" ← most interesting
- Bottom-left: "Stable, low AI impact"

---

## Frontend — Occupation Detail Sidebar / Page

When an occupation is clicked, show a panel (or navigate to `/occupation/[ssyk]`):

```
[SSYK 2412] Personalspecialister
HR Specialists

Employed in Sweden: ~18,400

--- SCORES ---
Theoretical AI Exposure:   7.2 / 10  [●●●●●●●○○○]
Current AI Adoption:       4.1 / 10  [●●●●○○○○○○]
Labor Market Outlook:      Balans (neutral, 3/5)

--- OUTLOOK (Arbetsförmedlingen) ---
Short-term: ...
Medium-term: ...

--- WHY THIS SCORE? (expandable) ---
Theoretical Exposure rationale: [text from LLM]
Current Adoption rationale: [text from LLM]
Model used: gpt-4o | Scored: 2026-03-26
[View raw prompt ↓] [View raw LLM response ↓]

--- WHAT THIS MEANS ---
High exposure means AI tools could assist significantly with
tasks like candidate screening, document drafting, and
HR analytics. Current adoption is moderate — many Swedish
employers are beginning to use AI recruiting tools but
adoption is uneven. This does NOT mean this role is at risk
of elimination; demand for skilled HR professionals
in Sweden remains stable.

--- LINKS ---
→ Arbetsförmedlingen forecast page for this occupation
→ SCB occupational statistics
→ Methodology
```

---

## Methodology Page (`/methodology`)

Full-page explainer covering:

1. **What this tool is** — a coding and exploration pipeline, NOT an economic forecast or academic study. Inspired by karpathy.ai/jobs, built for Sweden.
2. **Data sources** — with links to SCB, Arbetsförmedlingen/JobtechDev, TechSverige, AI Sweden
3. **How theoretical exposure is scored** — exact rubric and prompt published verbatim
4. **How current adoption is scored** — methodology including job-ad signals and LLM component
5. **Key limitation: Exposure ≠ Displacement** — explain elasticity of demand, the difference between task automation and job elimination, Swedish labor market specifics (strong unions, slow public sector change, welfare state protection)
6. **Key limitation: LLM self-referential bias** — acknowledge that an LLM scoring its own impact may overestimate
7. **Key limitation: Coarse occupation categories** — SSYK groups aggregate very different workers; within-group variance is high
8. **What you should use this for** — skills exploration, career transition thinking, policy conversation starters
9. **What you should NOT use this for** — making predictions about layoffs, dismissing fields of study, treating scores as ground truth

---

## Disclaimer Banner

A persistent sticky banner at the bottom of every page:

> **ℹ️ This is an exploration tool, not a forecast.** Scores are rough AI-generated estimates of task exposure, not predictions of job loss. Exposure does not equal displacement — Swedish labor market research shows AI is currently changing tasks and skill demands, not eliminating jobs wholesale. [Learn more about methodology →]

---

## API Routes

### `GET /api/occupations`

Returns the full `occupations.json` dataset (all occupations with scores).

Query params:
- `metric=theoreticalExposure|currentAdoption|outlook` — sort by
- `sector=public|private|mixed`
- `majorGroup=1-9`
- `search=query`

### `POST /api/score`

Admin-only (protected by `ADMIN_SECRET` env var). Re-scores a single occupation.

Body: `{ ssyk: "2412", model: "gpt-4o", force: true }`

Returns updated score object.

---

## Environment Variables

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
ADMIN_SECRET=
NEXT_PUBLIC_APP_URL=
DATABASE_URL=./data/scores.db
```

---

## Key npm Packages
Use pnpm
```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "typescript": "latest",
    "tailwindcss": "latest",
    "@shadcn/ui": "latest",
    "echarts": "latest",
    "echarts-for-react": "latest",
    "zustand": "latest",
    "swr": "2",
    "ai": "3",
    "better-sqlite3": "9",
    "zod": "3",
    "fuse.js": "7",
    "clsx": "2",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "vitest": "1",
    "@types/better-sqlite3": "7",
    "tsx": "4"
  }
}
```

---

## Build Sequence for Claude Agent

Follow these steps in order. Do not skip steps.

### Step 1 — Project Scaffold

1. Run `npx create-next-app@latest sweden-job-market-visualizer --typescript --tailwind --app --src-dir=false`
2. Install all npm packages listed above
3. Initialize shadcn/ui: `npx shadcn-ui@latest init`
4. Set up `lib/types.ts` with the full `Occupation` TypeScript interface
5. Set up `lib/db.ts` with better-sqlite3, creating tables: `occupations` and `scores`
6. Set up `.env.local` template

### Step 2 — Data Pipeline Scripts

1. Write and run `/scripts/01_fetch_yrkesprognoser.ts`:
   - Fetch `https://data.jobtechdev.se/yrkesprognoser/current/Yrkesprognos.json`
   - Save to `/data/raw/yrkesprognoser.json`
   - Log occupation count

2. Write `/scripts/02_fetch_ssyk.ts`:
   - Fetch occupation list from JobTech Taxonomy API: `https://taxonomy.api.jobtechdev.se/v1/taxonomy/specific/concepts/list?taxonomy-code=SSYK`
   - Fetch employment counts from SCB API for SSYK groups
   - Save merged list to `/data/raw/ssyk_occupations.json`

3. Write `/scripts/04_merge.ts`:
   - Join yrkesprognoser + ssyk_occupations on SSYK code
   - Initialize `scores` as null for all occupations
   - Output to `/data/occupations.json`
   - Log merge statistics (matched %, unmatched)

4. Write `/scripts/03_score_occupations.ts`:
   - Read `/data/occupations.json`
   - For each occupation, check SQLite cache
   - If not cached, call LLM with both prompts (theoretical + adoption)
   - Parse and validate JSON response with Zod
   - Cache result in SQLite
   - Update `/data/occupations.json` with scores
   - Support `--dry-run` flag to test first 5 occupations only

### Step 3 — API Routes

1. `app/api/occupations/route.ts` — serve the dataset with filtering
2. `app/api/score/route.ts` — admin re-scoring endpoint

### Step 4 — Core Components

Build in this order:
1. `components/DisclaimerBanner.tsx`
2. `components/FilterBar.tsx`
3. `components/Legend.tsx`
4. `components/Treemap.tsx` — use `echarts-for-react` with `treemap` series; bind click handler to open sidebar
5. `components/ScatterPlot.tsx` — use `echarts-for-react` with `scatter` series; quadrant lines as markLine
6. `components/ScoreBreakdown.tsx` — collapsible panel with prompt/response verbatim
7. `components/OccupationCard.tsx` — assembles all occupation detail

### Step 5 — Pages

1. `app/page.tsx` — fetch data via SWR, render FilterBar + Treemap/ScatterPlot + OccupationCard sidebar
2. `app/occupation/[ssyk]/page.tsx` — full-page occupation view (good for sharing links)
3. `app/methodology/page.tsx` — static explainer

### Step 6 — Polish

1. Add Swedish/English language toggle (store preference in localStorage via Zustand)
2. Add loading skeletons for treemap
3. Add keyboard navigation (arrow keys in sidebar to browse occupations)
4. Add "Copy link to occupation" button
5. Make layout responsive (mobile: stacked, no sidebar)

---

## Validation Checklist

Before considering the build complete, verify:

- [ ] All 100+ Swedish occupations render in treemap with correct area proportional to employed count
- [ ] Clicking an occupation opens its detail with both scores, rationale, and expandable raw prompt/response
- [ ] Switching between color metrics animates smoothly
- [ ] Scatter plot quadrants render correctly with labeled regions
- [ ] Disclaimer banner visible on all pages
- [ ] Methodology page is complete and links correctly
- [ ] `/api/occupations` returns correct JSON
- [ ] LLM score cache works (running pipeline twice doesn't re-call LLM)
- [ ] TypeScript has zero errors (`tsc --noEmit`)
- [ ] Works on mobile (responsive layout)
- [ ] Swedish occupation names display without character encoding issues (ä, ö, å)

---

## Important Notes for Claude Agent

1. **Do not hallucinate data.** If the SCB or Arbetsförmedlingen API returns fewer occupations than expected, log it and proceed — do not fill in fake employment counts.
2. **Keep LLM prompts verbatim in the codebase** as constants (not hidden in logic) so they are easy to audit and update.
3. **All LLM calls go through server-side API routes or scripts only** — never expose API keys to the client.
4. **Treemap area encoding is non-negotiable** — the visual weight of each occupation must reflect real Swedish employment counts, not arbitrary sizes.
5. **The disclaimer must be impossible to miss.** It is a core feature, not an afterthought.
6. **Cache all LLM scores in SQLite.** Re-running the scoring script should be idempotent.
7. **The two scores (theoretical exposure vs. current adoption) must always be visually distinct** — never conflate them or add them together.

---

*Built for the Swedish labor market. Data: SCB, Arbetsförmedlingen/JobtechDev, AI Sweden, TechSverige. Inspired by karpathy.ai/jobs.*
