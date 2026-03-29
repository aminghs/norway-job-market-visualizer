/**
 * Norway MVP — paths and default provenance labels.
 * See scripts/05_merge.ts for official vs model-generated fields.
 */
import path from 'path';

export const countryConfig = {
  country: 'no' as const,
  occupationSystem: 'STYRK08',
  locale: 'nb-NO',
  taxonomySource: 'SSB KLASS classification 7 / STYRK-08 (version 33)',
  employmentSource:
    'SSB PxWebApi v2 table 12542: Employed persons by occupation (4-digit), sex, working hours (register-based A scheme), Q4 annual average',
  outlookSource:
    'v1: no official occupation-level outlook feed wired — see data/raw/nav_outlook.json',
  scoringSource: 'OpenAI (model from score script / SQLite) — model-generated exposure & adoption scores',

  paths: {
    rawDir: path.resolve(process.cwd(), 'data/raw'),
    processedDir: path.resolve(process.cwd(), 'data/processed'),
    mergedOccupationsJson: path.resolve(process.cwd(), 'data/processed/occupations.json'),
    styrkJson: path.resolve(process.cwd(), 'data/raw/styrk.json'),
    ssbEmploymentJson: path.resolve(process.cwd(), 'data/raw/ssb_employment.json'),
    navOutlookJson: path.resolve(process.cwd(), 'data/raw/nav_outlook.json'),
    scoresDb: path.resolve(process.cwd(), 'data/scores.db'),
  },

  ssb: {
    pxWebBase: 'https://data.ssb.no/api/pxwebapi/v2',
    employmentTableId: '12542',
  },

  klass: {
    styrkClassificationId: 7,
    versionDate: '2024-01-01',
  },
} as const;

export type CountryConfig = typeof countryConfig;
