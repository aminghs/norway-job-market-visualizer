# Sweden Job Market Visualizer

Interactive AI Exposure & Adoption Analysis of Swedish labor market occupations.

### 🌟 Inspiration
This project is deeply inspired by [Andrej Karpathy's analysis of US occupations](https://karpathy.ai/jobs/). We have adapted his methodology for the Swedish context, utilizing local data from SCB and Arbetsförmedlingen to provide a specialized view of the Nordic labor market.

---

## Data Pipeline

Run these scripts **in order** when setting up from scratch, or when you want to refresh the dataset.
All scripts require `OPENAI_API_KEY` set in `.env.local`.

| # | Script | What it does | How often |
|---|--------|-------------|-----------|
| 01 | `npx tsx scripts/01_fetch_yrkesprognoser.ts` | Downloads Arbetsförmedlingen forecast data (bristvärde, outlook text) and **translates** the Swedish forecast text to English using `gpt-5.4-mini`. Writes `data/raw/yrkesprognoser.json`. | Monthly (Arbetsförmedlingen updates quarterly) |
| 02 | `npx tsx scripts/02_fetch_ssyk.ts` | Downloads SSYK 2012 occupation codes from JobTech taxonomy, fetches real employment counts from SCB (`YREG56N` table, national level 2021), and **translates** all names + descriptions to English. Writes `data/raw/ssyk_occupations.json`. | Yearly (SSYK taxonomy is stable) |
| 03 | `npx tsx scripts/03_score_occupations.ts` | Scores every occupation for **Theoretical AI Exposure** (0–10) and **Current Adoption** (0–10) using `gpt-5.4-mini`. Results are cached in `data/scores.db` (SQLite) so re-runs are fast and cheap. **Rationale text is always returned in English.** | Once, or when you want to re-score with a new model |
| 04 | `npx tsx scripts/04_merge.ts` | Joins all three datasets into `data/occupations.json`, the file the Next.js app reads. | After any of the above scripts |
| 05 | `npx tsx scripts/05_validate.ts` | Sanity-checks the merged file (missing scores, null values, etc.). | After `04_merge` |

**Quick full refresh:**
```bash
npx tsx scripts/01_fetch_yrkesprognoser.ts
npx tsx scripts/02_fetch_ssyk.ts
npx tsx scripts/03_score_occupations.ts
npx tsx scripts/04_merge.ts
npx tsx scripts/05_validate.ts
```

**Full clean-slate reset (delete all cached data and start from scratch):**
```bash
# Delete everything cached
rm -f data/scores.db data/occupations.json data/raw/yrkesprognoser.json data/raw/ssyk_occupations.json

# Re-run the full pipeline
npx tsx scripts/01_fetch_yrkesprognoser.ts
npx tsx scripts/02_fetch_ssyk.ts
npx tsx scripts/03_score_occupations.ts   # takes ~15–30 min for all 400 occupations
npx tsx scripts/04_merge.ts
npx tsx scripts/05_validate.ts
```

> After a clean-slate run, all scores and translations will be fully generated for the UI.

---

## Inspecting the Database

```bash
# List scored occupations
sqlite3 data/scores.db "SELECT ssyk, theoreticalExposure, currentAdoption, scoredAt FROM scores ORDER BY theoreticalExposure DESC LIMIT 20;"

# Count scored vs total
sqlite3 data/scores.db "SELECT COUNT(*) FROM scores;"

# Check a specific occupation
sqlite3 data/scores.db "SELECT * FROM scores WHERE ssyk = '2512';"
```

---

## Environment Variables

Create `.env.local` in the project root:

```bash
OPENAI_API_KEY=sk-...          # Required for scoring and translation
ADMIN_SECRET=your-secret       # Optional: protects the /api/score endpoint
```

---

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **ECharts** (Treemap + Scatter visualizations)
- **Zustand** (global UI state)
- **Vercel AI SDK** + `gpt-5.4-mini` (scoring + translation)
- **SQLite** via `better-sqlite3` (score cache)
- **Shadcn/UI + Tailwind CSS**

---

## Architecture

```
data/raw/
  yrkesprognoser.json   ← from 01, includes English forecast text
  ssyk_occupations.json ← from 02, includes English names + descriptions
data/
  scores.db             ← SQLite cache from 03 (AI scores)
  occupations.json      ← merged output from 04 (what the app reads)
```

The API route (`/api/occupations`) reads `occupations.json` and applies search/filter params.
The UI never calls the LLM at runtime — all AI work happens offline in the pipeline scripts.
