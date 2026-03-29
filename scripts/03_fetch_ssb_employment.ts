/**
 * SSB register-based employment by 4-digit STYRK (table 12542).
 * PxWeb JSON values are already in persons (whole numbers); store as integers (null if suppressed).
 * Output: data/raw/ssb_employment.json
 */
import fs from 'fs';
import { countryConfig } from '../src/config/country.config';

type JsonStat2 = {
  id: string[];
  size: number[];
  value: (number | null)[];
  dimension: Record<string, { category: { index: Record<string, number>; label?: Record<string, string> } }>;
};

function padYrke(code: string): string {
  if (/^\d{1,4}$/.test(code)) return code.padStart(4, '0');
  return code;
}

function orderedYrkeCodes(ds: JsonStat2): string[] {
  const idx = ds.dimension.Yrke.category.index;
  return Object.entries(idx)
    .sort((a, b) => a[1] - b[1])
    .map(([code]) => code);
}

async function main() {
  const tableId = countryConfig.ssb.employmentTableId;
  const year = process.env.SSB_EMPLOYMENT_YEAR ?? '2024';
  const base = `${countryConfig.ssb.pxWebBase}/tables/${tableId}/data`;
  const params = new URLSearchParams({
    lang: 'en',
    'valueCodes[Yrke]': '*',
    'valueCodes[Kjonn]': '0',
    'valueCodes[ArbeidsTidRen]': 'P000-100',
    'valueCodes[ContentsCode]': 'Lonnstakere',
    'valueCodes[Tid]': year,
  });
  const url = `${base}?${params.toString()}`;
  console.log('Fetching SSB employment:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SSB fetch failed: ${res.status} ${await res.text()}`);
  const ds = (await res.json()) as JsonStat2;

  const codes = orderedYrkeCodes(ds);
  const rows: { code: string; employment: number | null; year: number; source: string }[] = [];

  for (let i = 0; i < codes.length; i++) {
    const raw = ds.value[i];
    const code = padYrke(codes[i]);
    if (!/^\d{4}$/.test(code)) continue;
    let employment: number | null = null;
    if (raw !== null && raw !== undefined && !Number.isNaN(Number(raw))) {
      employment = Math.round(Number(raw));
    }
    rows.push({
      code,
      employment,
      year: Number(year),
      source: 'SSB',
    });
  }

  const outDir = countryConfig.paths.rawDir;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(countryConfig.paths.ssbEmploymentJson, JSON.stringify(rows, null, 2));
  console.log(`Saved ${rows.length} SSB employment rows (${year}) to ${countryConfig.paths.ssbEmploymentJson}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
