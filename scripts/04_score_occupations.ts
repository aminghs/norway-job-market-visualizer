import fs from 'fs';
import path from 'path';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '../src/lib/db';
import dotenv from 'dotenv';
import { countryConfig } from '../src/config/country.config';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dataFile = countryConfig.paths.styrkJson;
const occupations = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

const args = process.argv.slice(2);
const ssykArgIndex = args.indexOf('--ssyk');
const targetSsyk = ssykArgIndex > -1 ? args[ssykArgIndex + 1] : null;

const modelArgIndex = args.indexOf('--model');
const modelName = modelArgIndex > -1 ? args[modelArgIndex + 1] : 'gpt-4o-mini';

const dryRunIndex = args.indexOf('--dry-run');
const isDryRun = dryRunIndex > -1;

const allowSim = process.env.PIPELINE_ALLOW_SIMULATED_SCORES === '1';

const model = openai(modelName);

const ScoringSchema = z.object({
  score: z.number().min(0).max(10),
  rationale: z.string(),
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scoreOccupation(occ: any) {
  const existingScore = db
    .prepare(`SELECT * FROM scores WHERE ssyk = ? AND modelName = ?`)
    .get(occ.ssyk, modelName) as any;
  if (existingScore && !targetSsyk) {
    return {
      theoreticalExposure: existingScore.theoreticalExposure,
      theoreticalExposureRationale: existingScore.theoreticalExposureRationale,
      currentAdoption: existingScore.currentAdoption,
      currentAdoptionRationale: existingScore.currentAdoptionRationale,
      promptUsed: existingScore.promptUsed,
      modelUsed: modelName,
      scoredAt: existingScore.scoredAt,
    };
  }

  const description = occ.descriptionEnglish || occ.description || '';
  const theoreticalPrompt = `You are scoring Norwegian occupations (STYRK-08) for AI exposure. Assess the occupation below and return a JSON object.

OCCUPATION (STYRK code: ${occ.ssyk}): ${occ.nameEnglish || occ.nameSwedish}
DESCRIPTION: ${description}

SCORING RUBRIC for "theoreticalExposure" (0â€“10):
- 9â€“10: Almost entirely screen/knowledge-based; output is text, code, data, or decisions AI models excel at
- 7â€“8: Majority of tasks are cognitive/digital but with some physical or interpersonal components
- 5â€“6: Mixed â€” significant cognitive tasks that AI could assist with, significant physical/relational tasks it cannot
- 3â€“4: Mostly physical, hands-on, interpersonal, or highly context-dependent (Norwegian welfare/care setting)
- 1â€“2: Almost entirely physical, outdoor, or dependent on real-world embodiment
- 0: No plausible AI impact on core task structure

IMPORTANT CONTEXT (Norway):
- Strong unions and collective agreements can slow adoption even in exposed occupations
- Many public sector roles involve statutory duties that cannot be delegated to AI
- Consider TASK composition, not just the job title

CRITICAL REQUIREMENT:
You MUST output your rationale strictly in English.`;

  const adoptionPrompt = `You are assessing current AI adoption signals for a Norwegian occupation, NOT theoretical potential.

OCCUPATION: ${occ.nameEnglish || occ.nameSwedish}
STYRK: ${occ.ssyk}
DESCRIPTION: ${description}

Rate "currentAdoption" (0â€“10) based on OBSERVABLE signals as of early 2026:
- 8â€“10: Tools actively used in the occupation
- 6â€“7: Significant tooling available and many employers adopting
- 4â€“5: Early adoption â€” some experimentation
- 2â€“3: Marginal pilots
- 0â€“1: No meaningful current adoption signals

Norwegian context: adoption varies by sector; public sector can be slower.

CRITICAL REQUIREMENT:
You MUST output your rationale strictly in English.`;

  console.log(`[${occ.ssyk}] Scoring ${occ.nameSwedish}...`);

  try {
    const theoResult = await generateObject({
      model,
      schema: ScoringSchema,
      prompt: theoreticalPrompt,
    });

    const adoptResult = await generateObject({
      model,
      schema: ScoringSchema,
      prompt: adoptionPrompt,
    });

    const newScore = {
      theoreticalExposure: theoResult.object.score,
      theoreticalExposureRationale: theoResult.object.rationale,
      currentAdoption: adoptResult.object.score,
      currentAdoptionRationale: adoptResult.object.rationale,
      promptUsed: theoreticalPrompt + '\n\n---\n\n' + adoptionPrompt,
      modelUsed: modelName,
      scoredAt: new Date().toISOString(),
    };

    db.prepare(
      `
      INSERT INTO scores (
        ssyk, modelName, theoreticalExposure, theoreticalExposureRationale,
        currentAdoption, currentAdoptionRationale, promptUsed, scoredAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ssyk, modelName) DO UPDATE SET
        theoreticalExposure=excluded.theoreticalExposure,
        theoreticalExposureRationale=excluded.theoreticalExposureRationale,
        currentAdoption=excluded.currentAdoption,
        currentAdoptionRationale=excluded.currentAdoptionRationale,
        promptUsed=excluded.promptUsed,
        scoredAt=excluded.scoredAt
    `,
    ).run(
      occ.ssyk,
      modelName,
      newScore.theoreticalExposure,
      newScore.theoreticalExposureRationale,
      newScore.currentAdoption,
      newScore.currentAdoptionRationale,
      newScore.promptUsed,
      newScore.scoredAt,
    );

    return newScore;
  } catch (error) {
    console.error(`Error scoring ${occ.ssyk}:`, error);
    return null;
  }
}

async function run() {
  if (!process.env.OPENAI_API_KEY && !allowSim) {
    console.error('Missing OPENAI_API_KEY. Set PIPELINE_ALLOW_SIMULATED_SCORES=1 for local testing only.');
    process.exit(1);
  }

  const jobsToScore = targetSsyk ? occupations.filter((o: any) => o.ssyk === targetSsyk) : occupations;
  const loopLimit = isDryRun ? Math.min(5, jobsToScore.length) : jobsToScore.length;

  for (let i = 0; i < loopLimit; i++) {
    const occ = jobsToScore[i];

    if (!process.env.OPENAI_API_KEY && allowSim) {
      const simulatedScore = {
        theoreticalExposure: 5,
        theoreticalExposureRationale: 'Simulated â€” PIPELINE_ALLOW_SIMULATED_SCORES=1',
        currentAdoption: 3,
        currentAdoptionRationale: 'Simulated â€” local testing only.',
        promptUsed: 'simulated',
        modelUsed: 'simulation',
        scoredAt: new Date().toISOString(),
      };
      db.prepare(
        `
        INSERT INTO scores (
          ssyk, modelName, theoreticalExposure, theoreticalExposureRationale,
          currentAdoption, currentAdoptionRationale, promptUsed, scoredAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ssyk, modelName) DO UPDATE SET
          theoreticalExposure=excluded.theoreticalExposure,
          theoreticalExposureRationale=excluded.theoreticalExposureRationale,
          currentAdoption=excluded.currentAdoption,
          currentAdoptionRationale=excluded.currentAdoptionRationale,
          promptUsed=excluded.promptUsed,
          scoredAt=excluded.scoredAt
      `,
      ).run(
        occ.ssyk,
        'simulation',
        simulatedScore.theoreticalExposure,
        simulatedScore.theoreticalExposureRationale,
        simulatedScore.currentAdoption,
        simulatedScore.currentAdoptionRationale,
        simulatedScore.promptUsed,
        simulatedScore.scoredAt,
      );
    } else {
      const scores = await scoreOccupation(occ);
      occ.scores = scores;
      if (scores) {
        const exposure = scores.theoreticalExposure;
        const adoption = scores.currentAdoption;
        let q = 'low-exposure-low-adoption';
        if (exposure >= 5 && adoption >= 5) q = 'high-exposure-high-adoption';
        else if (exposure >= 5 && adoption < 5) q = 'high-exposure-low-adoption';
        else if (exposure < 5 && adoption >= 5) q = 'low-exposure-high-adoption';
        occ.quadrant = q;
      }
      await sleep(200);
    }
  }

  console.log('Scoring pass done. Run 05_merge.ts next.');
}

run();
