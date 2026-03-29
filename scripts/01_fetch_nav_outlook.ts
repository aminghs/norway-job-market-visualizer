/**
 * NAV / EURES occupation outlook â€” v1 placeholder: no official per-STYRK feed wired.
 * Writes an empty record list so merge leaves outlook null (implementation rules).
 * Extend this script when a machine-readable source is identified.
 */
import fs from 'fs';
import { countryConfig } from '../src/config/country.config';

async function main() {
  const payload = {
    meta: {
      source: 'none',
      note:
        'v1: No NAV/EURES occupation-level outlook imported. forecast fields in merge will be null. Add API or parse official tables here.',
    },
    records: [] as { code: string; outlookScore: number | null; category: string | null }[],
  };

  const outDir = countryConfig.paths.rawDir;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(countryConfig.paths.navOutlookJson, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${payload.records.length} outlook records to ${countryConfig.paths.navOutlookJson}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
