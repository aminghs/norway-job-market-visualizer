/**
 * Fetch STYRK-08 (4-digit) from SSB KLASS â€” Norwegian + English labels.
 * Output: data/raw/styrk.json
 */
import fs from 'fs';
import { countryConfig } from '../src/config/country.config';

type KlassCode = {
  code: string;
  level: string;
  name: string;
  parentCode: string | null;
};

function pad4(code: string): string {
  if (/^\d{1,4}$/.test(code)) return code.padStart(4, '0');
  return code;
}

async function fetchKlassJson(lang: 'nb' | 'en'): Promise<{ codes: KlassCode[] }> {
  const cid = countryConfig.klass.styrkClassificationId;
  const from = countryConfig.klass.versionDate;
  const url = `https://data.ssb.no/api/klass/v1/classifications/${cid}/codes.json?from=${from}&language=${lang}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`KLASS ${lang} fetch failed: ${res.status}`);
  return res.json() as Promise<{ codes: KlassCode[] }>;
}

async function main() {
  console.log('Fetching STYRK from SSB KLASS (nb + en)...');
  const [nb, en] = await Promise.all([fetchKlassJson('nb'), fetchKlassJson('en')]);

  const enByCode = new Map<string, string>();
  for (const c of en.codes) {
    enByCode.set(c.code, c.name);
  }

  const unit4 = nb.codes.filter((c) => c.level === '4' && /^\d{1,4}$/.test(c.code));
  const byCode = new Map(nb.codes.map((c) => [c.code, c]));

  const occupations = unit4.map((c) => {
    const code = pad4(c.code);
    const major = code[0] ?? '';
    const subMajor = code.slice(0, 2);
    const minor = code.slice(0, 3);
    const parent3 = c.parentCode ? byCode.get(c.parentCode) : undefined;
    const parent2 = parent3?.parentCode ? byCode.get(parent3.parentCode) : undefined;
    const parent1 = parent2?.parentCode ? byCode.get(parent2.parentCode) : undefined;

    return {
      ssyk: code,
      nameSwedish: c.name,
      nameEnglish: enByCode.get(c.code) ?? c.name,
      description: '',
      descriptionEnglish: '',
      majorGroup: major,
      subMajorGroup: subMajor,
      minorGroup: minor,
      hierarchy: {
        major: parent1?.name ?? major,
        subMajor: parent2?.name ?? subMajor,
        minor: parent3?.name ?? minor,
        unitGroup: c.name,
      },
    };
  });

  occupations.sort((a, b) => a.ssyk.localeCompare(b.ssyk));

  const outDir = countryConfig.paths.rawDir;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(countryConfig.paths.styrkJson, JSON.stringify(occupations, null, 2));
  console.log(`Saved ${occupations.length} STYRK unit groups to ${countryConfig.paths.styrkJson}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
