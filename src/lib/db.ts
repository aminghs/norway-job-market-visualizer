import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL
  ? path.resolve(process.cwd(), process.env.DATABASE_URL)
  : path.resolve(process.cwd(), 'data/scores.db');

export const db = new Database(dbPath);

// Initialize tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS occupations (
    ssyk TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ssyk TEXT NOT NULL,
    modelName TEXT NOT NULL,
    theoreticalExposure REAL NOT NULL,
    theoreticalExposureRationale TEXT NOT NULL,
    currentAdoption REAL NOT NULL,
    currentAdoptionRationale TEXT NOT NULL,
    promptUsed TEXT NOT NULL,
    scoredAt TEXT NOT NULL,
    UNIQUE(ssyk, modelName)
  );
`);
