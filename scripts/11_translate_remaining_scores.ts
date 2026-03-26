/**
 * Scripts to find any remaining Swedish rationales in scores.db 
 * and translate them to English using the correct project AI SDK.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const dbPath = path.resolve(process.cwd(), 'data/scores.db');
const db = new Database(dbPath);

async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length < 10) return text;
  
  try {
    const { text: translated } = await generateText({
      model: openai('gpt-4o-mini'),
      system: "You are a professional translator. Translate the following Swedish text to professional English. If it's already English, return it exactly as is.",
      prompt: text,
    });
    return translated || text;
  } catch (e) {
    console.error('Translation error:', e);
    return text;
  }
}

async function fixRationales() {
  console.log('Finding Swedish rationales in scores.db...');
  
  // Find rows with Swedish characters
  const rows = db.prepare(`
    SELECT ssyk, theoreticalExposureRationale, currentAdoptionRationale 
    FROM scores 
    WHERE (theoreticalExposureRationale LIKE '%å%' 
       OR theoreticalExposureRationale LIKE '%ä%' 
       OR theoreticalExposureRationale LIKE '%ö%')
       OR (currentAdoptionRationale LIKE '%å%' 
       OR currentAdoptionRationale LIKE '%ä%' 
       OR currentAdoptionRationale LIKE '%ö%')
  `).all() as any[];

  console.log(`Found ${rows.length} rows with potential Swedish text.`);

  for (const row of rows) {
    console.log(`Checking/Translating SSYK ${row.ssyk}...`);
    
    // Check if theoretical exposure rationale is Swedish
    let newExposure = row.theoreticalExposureRationale;
    if (/[åäö]/.test(row.theoreticalExposureRationale)) {
      console.log(`  Translating theoretical rationale for ${row.ssyk}...`);
      newExposure = await translateText(row.theoreticalExposureRationale);
    }

    // Check if current adoption rationale is Swedish
    let newAdoption = row.currentAdoptionRationale;
    if (/[åäö]/.test(row.currentAdoptionRationale)) {
      console.log(`  Translating adoption rationale for ${row.ssyk}...`);
      newAdoption = await translateText(row.currentAdoptionRationale);
    }

    db.prepare(`
      UPDATE scores 
      SET theoreticalExposureRationale = ?, 
          currentAdoptionRationale = ?
      WHERE ssyk = ?
    `).run(newExposure, newAdoption, row.ssyk);
  }

  console.log('Done fixing rationales. Refreshing occupations.json via 04_merge.ts...');
}

fixRationales().catch(console.error);
