# Norway Job Market Visualizer

Interactive AI exposure and adoption analysis for **Norwegian** labour market occupations (**STYRK-08**), using official **SSB** statistics and optional **OpenAI** scoring.

Forked from [hamidfarmani/sweden-job-market-visualizer](https://github.com/hamidfarmani/sweden-job-market-visualizer).

### Inspiration

Inspired by [Andrej Karpathy's US jobs visualizer](https://karpathy.ai/jobs/). This fork adapts the same pipeline idea for Norway: **KLASS** (STYRK), **SSB** register employment (PxWebApi), and **model-generated** exposure/adoption scores cached in SQLite.

---

## Data pipeline

Configuration lives in [`src/config/country.config.ts`](src/config/country.config.ts). Run scripts **in order**:

| # | Script | Output |
|---|--------|--------|
| 01 | `scripts/01_fetch_nav_outlook.ts` | `data/raw/nav_outlook.json` (v1: empty records; extend when a NAV/EURES feed is wired) |
| 02 | `scripts/02_fetch_styrk.ts` | `data/raw/styrk.json` — STYRK-08 from **SSB KLASS** (nb + en) |
| 03 | `scripts/03_fetch_ssb_employment.ts` | `data/raw/ssb_employment.json` — **SSB** table **12542** (employed by 4-digit occupation, Q4; year via `SSB_EMPLOYMENT_YEAR`, default `2024`) |
| 04 | `scripts/04_score_occupations.ts` | `data/scores.db` — OpenAI scores (needs `OPENAI_API_KEY`, or `PIPELINE_ALLOW_SIMULATED_SCORES=1` for fixed local test scores only) |
| 05 | `scripts/05_merge.ts` | `data/processed/occupations.json` — merged dataset + provenance fields |
| 06 | `scripts/06_validate.ts` | Validation summary |

**One command:**

```bash
pnpm install
pnpm run pipeline
```

**Fetch only (no AI):**

```bash
pnpm run pipeline:fetch
```

Then merge after scoring, or merge without scores (scores will be null in the UI until you run step 04):

```bash
pnpm exec tsx scripts/05_merge.ts
pnpm exec tsx scripts/06_validate.ts
```

### Environment

Create `.env.local`:

```bash
OPENAI_API_KEY=sk-...                    # Required for step 04 (unless PIPELINE_ALLOW_SIMULATED_SCORES=1)
PIPELINE_ALLOW_SIMULATED_SCORES=1       # Optional: only for local testing — fixed dummy scores
ADMIN_SECRET=your-secret                # Optional: protects POST /api/score
```

---

## Architecture

```
data/raw/
  styrk.json           ← 02 KLASS
  ssb_employment.json ← 03 SSB PxWebApi
  nav_outlook.json     ← 01 (v1 may be empty)
data/
  scores.db            ← 04 SQLite cache (gitignored)
data/processed/
  occupations.json     ← 05 merged file the app reads
```

The app reads **`data/processed/occupations.json`** via [`src/app/api/occupations/route.ts`](src/app/api/occupations/route.ts). LLM work runs **offline** in the pipeline, not on each page view.

---

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **ECharts** (treemap + scatter)
- **Zustand**, **Shadcn/UI**, **Tailwind CSS**
- **Vercel AI SDK** + OpenAI (pipeline scoring)
- **SQLite** (`better-sqlite3`) for score cache

---

## Inspecting scores (SQLite)

```bash
sqlite3 data/scores.db "SELECT ssyk, theoreticalExposure, currentAdoption, modelName FROM scores LIMIT 20;"
```

---

## License / credits

Upstream: Sweden Job Market Visualizer by Hamid Farmani. This fork focuses on Norwegian sources (SSB, KLASS) and STYRK-08.
