import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const rawDir = path.resolve(process.cwd(), 'data/raw');
const ssykFile = path.join(rawDir, 'ssyk_occupations.json');
const forecastFile = path.join(rawDir, 'yrkesprognoser.json');
const outFile = path.resolve(process.cwd(), 'data/occupations.json');

function mapCompetitionLevel(score: number): string {
  if (score === 1) return 'Very high competition';
  if (score === 2) return 'High competition';
  if (score === 3) return 'Balanced';
  if (score === 4) return 'Low competition';
  if (score === 5) return 'Labour shortage';
  return 'Unknown';
}

function mergeData() {
  console.log('Merging datasets...');
  
  if (!fs.existsSync(ssykFile) || !fs.existsSync(forecastFile)) {
    console.error('Missing raw data files. Please run scripts 01 and 02 first.');
    process.exit(1);
  }

  const ssykData = JSON.parse(fs.readFileSync(ssykFile, 'utf-8'));
  const forecastData = JSON.parse(fs.readFileSync(forecastFile, 'utf-8'))
    .sort((a: any, b: any) => (a.ar || 0) - (b.ar || 0));

  const forecastMap = new Map();
  for (const f of forecastData) {
    if (f.ssyk) {
      forecastMap.set(f.ssyk.toString(), f);
    }
  }

  // Hook up sqlite and load all cached scores
  const dbPath = path.resolve(process.cwd(), 'data/scores.db');
  let scoreMap = new Map();
  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath, { readonly: true });
    // prefer the model we used this session, or just get the latest score
    const rows = db.prepare(`
      SELECT ssyk, theoreticalExposure, currentAdoption, 
             theoreticalExposureRationale, currentAdoptionRationale, 
             modelName, promptUsed, scoredAt 
      FROM scores
    `).all() as any[];

    for (const r of rows) {
      scoreMap.set(r.ssyk, {
        theoreticalExposure: r.theoreticalExposure,
        currentAdoption: r.currentAdoption,
        theoreticalExposureRationale: r.theoreticalExposureRationale,
        currentAdoptionRationale: r.currentAdoptionRationale,
        modelName: r.modelName,
        promptUsed: r.promptUsed,
        scoredAt: r.scoredAt || new Date().toISOString()
      });
    }
  } else {
    console.warn(`[WARN] No scores.db found at ${dbPath}, output will have null scores.`);
  }

  const getQuadrant = (exposure: number, adoption: number) => {
    if (exposure >= 5 && adoption >= 5) return 'high-exposure-high-adoption';
    if (exposure >= 5 && adoption < 5) return 'high-exposure-low-adoption';
    if (exposure < 5 && adoption >= 5) return 'low-exposure-high-adoption';
    return 'low-exposure-low-adoption';
  };

  let matched = 0;
  let scored = 0;
  const merged: any[] = [];

  for (const ssyk of ssykData) {
    const code = ssyk.ssyk;
    const forecast = forecastMap.get(code);

    if (forecast) {
      matched++;
    }

    const mergedOcc = {
      ssyk: code,
      nameSwedish: ssyk.nameSwedish,
      nameEnglish: ssyk.nameEnglish,
      description: ssyk.description, // Translated below if available
      descriptionEnglish: ssyk.descriptionEnglish,
      majorGroup: ssyk.majorGroup,
      subMajorGroup: ssyk.subMajorGroup,
      minorGroup: ssyk.minorGroup,
      employed: ssyk.employed,
      sector: "mixed",           // Missing detailed data: defaulting
      medianWageSEK: undefined,  // Could fetch from SCB if available
      educationLevel: "Varies",  // Fallback if not specified

      forecast: {
        outlookScore: forecast ? forecast.bristvarde : 3,
        competitionLevel: mapCompetitionLevel(forecast ? forecast.bristvarde : 3),
        shortTermOutlook: forecast?.stycke1En || forecast?.stycke1 || 'No forecast available.',
        mediumTermOutlook: forecast?.stycke2En || forecast?.stycke2 || 'No forecast available.',
        conceptId: forecast?.concept_id || null,
        ingress: forecast?.ingress || null,
      },

      scores: scoreMap.get(code) || null,
      quadrant: scoreMap.has(code) ? getQuadrant(scoreMap.get(code).theoreticalExposure, scoreMap.get(code).currentAdoption) : null
    };

    if (mergedOcc.scores) {
      scored++;
    }

    merged.push(mergedOcc);
  }

  fs.writeFileSync(outFile, JSON.stringify(merged, null, 2));

  console.log(`Merged ${merged.length} occupations.`);
  console.log(`Matched with forecast data: ${matched} (${((matched / merged.length) * 100).toFixed(1)}%)`);
  console.log(`Scored with SQLite data: ${scored} (${((scored / merged.length) * 100).toFixed(1)}%)`);
  console.log(`Unmatched: ${merged.length - matched}`);
  console.log(`Saved to ${outFile}`);
}

mergeData();
