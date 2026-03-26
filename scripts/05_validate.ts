import fs from 'fs';
import path from 'path';

const dataFile = path.resolve(process.cwd(), 'data/occupations.json');
const occupations = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

function validate() {
  console.log('Validating merged occupations data...');

  let missingScores = 0;
  let missingForecast = 0;
  let missingEmployed = 0;

  for (const occ of occupations) {
    if (!occ.ssyk || occ.ssyk.length !== 4) {
      console.warn(`Invalid SSYK: ${occ.ssyk} for ${occ.nameSwedish}`);
    }
    if (!occ.scores) missingScores++;
    if (!occ.forecast || occ.forecast.outlookScore === 3 && occ.forecast.competitionLevel === 'Okänd') {
      missingForecast++;
    }
    if (!occ.employed || occ.employed === 0) missingEmployed++;
    
    if (!['high-exposure-high-adoption', 'high-exposure-low-adoption', 'low-exposure-high-adoption', 'low-exposure-low-adoption', null].includes(occ.quadrant)) {
      console.warn(`Invalid quadrant: ${occ.quadrant} for ${occ.ssyk}`);
    }
  }

  console.log('--- Validation Results ---');
  console.log(`Total Occupations: ${occupations.length}`);
  console.log(`Missing Scores: ${missingScores}`);
  console.log(`Missing Forecasts: ${missingForecast}`);
  console.log(`Missing Employed Counts: ${missingEmployed}`);

  if (missingScores === 0) {
    console.log('✅ Scoring complete for all occupations.');
  } else {
    console.warn(`⚠️ ${missingScores} occupations lack scores.`);
  }

  console.log('Validation complete.');
}

validate();
