import fs from 'fs';
import { countryConfig } from '../src/config/country.config';

const dataFile = countryConfig.paths.mergedOccupationsJson;

function validate() {
  if (!fs.existsSync(dataFile)) {
    console.error('Missing merged occupations JSON. Run 05_merge.ts first.');
    process.exit(1);
  }
  const occupations = JSON.parse(fs.readFileSync(dataFile, 'utf-8')) as any[];

  let missingEmployed = 0;
  let missingScores = 0;
  let missingOutlook = 0;

  for (const occ of occupations) {
    if (occ.employed === null || occ.employed === undefined) missingEmployed++;
    if (!occ.scores) missingScores++;
    if (!occ.forecast) missingOutlook++;
  }

  console.log('--- Validation ---');
  console.log(`Total: ${occupations.length}`);
  console.log(`Null employment: ${missingEmployed}`);
  console.log(`Missing AI scores: ${missingScores}`);
  console.log(`Null forecast (expected partial in v1): ${missingOutlook}`);
  console.log('Validation complete (warnings only).');
}

validate();
