/**
 * METHODOLOGY (merged JSON):
 * - taxonomySource / STYRK labels: official SSB KLASS (see 02_fetch_styrk.ts).
 * - employed: SSB table 12542 (register-based), null if suppressed or missing cell â€” never fabricated.
 * - forecast: official NAV/EURES outlook when 01_fetch provides records; else null (v1).
 * - scores: OpenAI model output cached in SQLite â€” model-generated, not official statistics.
 */
import fs from 'fs';
import Database from 'better-sqlite3';
import { countryConfig } from '../src/config/country.config';

type EmpRow = { code: string; employment: number | null; year: number; source: string };
type NavFile = {
  meta?: { source?: string; note?: string };
  records: { code: string; outlookScore: number | null; category: string | null }[];
};

function mergeData() {
  const styrkPath = countryConfig.paths.styrkJson;
  const ssbPath = countryConfig.paths.ssbEmploymentJson;
  const navPath = countryConfig.paths.navOutlookJson;
  const outFile = countryConfig.paths.mergedOccupationsJson;
  const dbPath = countryConfig.paths.scoresDb;

  if (!fs.existsSync(styrkPath) || !fs.existsSync(ssbPath)) {
    console.error('Missing data/raw/styrk.json or ssb_employment.json. Run 02 and 03 first.');
    process.exit(1);
  }

  const styrkData = JSON.parse(fs.readFileSync(styrkPath, 'utf-8')) as any[];
  const ssbRows: EmpRow[] = JSON.parse(fs.readFileSync(ssbPath, 'utf-8'));
  const empByCode = new Map(ssbRows.map((r) => [r.code, r]));

  let nav: NavFile = { records: [] };
  if (fs.existsSync(navPath)) {
    nav = JSON.parse(fs.readFileSync(navPath, 'utf-8')) as NavFile;
  }
  const outlookByCode = new Map(nav.records.map((r) => [r.code, r]));

  let scoreMap = new Map<string, any>();
  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare(
        `SELECT ssyk, theoreticalExposure, currentAdoption,
                theoreticalExposureRationale, currentAdoptionRationale,
                modelName, promptUsed, scoredAt FROM scores`,
      )
      .all() as any[];
    for (const r of rows) {
      scoreMap.set(r.ssyk, {
        theoreticalExposure: r.theoreticalExposure,
        currentAdoption: r.currentAdoption,
        theoreticalExposureRationale: r.theoreticalExposureRationale,
        currentAdoptionRationale: r.currentAdoptionRationale,
        modelName: r.modelName,
        promptUsed: r.promptUsed,
        scoredAt: r.scoredAt || new Date().toISOString(),
      });
    }
  } else {
    console.warn(`[WARN] No scores.db at ${dbPath}`);
  }

  const getQuadrant = (exposure: number, adoption: number) => {
    if (exposure >= 5 && adoption >= 5) return 'high-exposure-high-adoption';
    if (exposure >= 5 && adoption < 5) return 'high-exposure-low-adoption';
    if (exposure < 5 && adoption >= 5) return 'low-exposure-high-adoption';
    return 'low-exposure-low-adoption';
  };

  const merged: any[] = [];

  for (const row of styrkData) {
    const code = row.ssyk as string;
    const emp = empByCode.get(code);
    const outlook = outlookByCode.get(code);
    const sc = scoreMap.get(code);

    const employed =
      emp && emp.employment !== null && emp.employment !== undefined ? emp.employment : null;

    let forecast: any = null;
    if (outlook && outlook.outlookScore !== null && outlook.outlookScore !== undefined) {
      forecast = {
        outlookScore: outlook.outlookScore,
        competitionLevel: outlook.category ?? 'Unknown',
        shortTermOutlook: '',
        mediumTermOutlook: '',
        conceptId: null,
        ingress: null,
      };
    }

    merged.push({
      ssyk: code,
      nameSwedish: row.nameSwedish,
      nameEnglish: row.nameEnglish,
      description: row.description,
      descriptionEnglish: row.descriptionEnglish,
      majorGroup: row.majorGroup,
      subMajorGroup: row.subMajorGroup,
      minorGroup: row.minorGroup,
      hierarchy: row.hierarchy,
      employed,
      sector: 'mixed' as const,
      medianWageSEK: undefined,
      educationLevel: 'Varies',

      forecast,
      scores: sc ?? null,
      quadrant: sc ? getQuadrant(sc.theoreticalExposure, sc.currentAdoption) : null,

      taxonomySource: countryConfig.taxonomySource,
      employmentSource: emp ? countryConfig.employmentSource : null,
      outlookSource: outlook ? countryConfig.outlookSource : null,
      scoringSource: sc ? `${countryConfig.scoringSource} (${sc.modelName})` : null,
    });
  }

  const procDir = countryConfig.paths.processedDir;
  if (!fs.existsSync(procDir)) fs.mkdirSync(procDir, { recursive: true });

  fs.writeFileSync(outFile, JSON.stringify(merged, null, 2));
  console.log(`Merged ${merged.length} occupations -> ${outFile}`);
}

mergeData();
