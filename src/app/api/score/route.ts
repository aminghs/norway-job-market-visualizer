import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '@/lib/db';
import fs from 'fs';
import { countryConfig } from '@/config/country.config';

const ScoringSchema = z.object({
  score: z.number().min(0).max(10),
  rationale: z.string(),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.ADMIN_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ssyk, model: reqModel, force } = body;

    if (!ssyk) {
      return NextResponse.json({ error: 'Missing SSYK' }, { status: 400 });
    }

    const modelName = reqModel || 'gpt-4o-mini';

    // Verify occupation exists in generated data
    const dataFile = countryConfig.paths.mergedOccupationsJson;
    if (!fs.existsSync(dataFile)) {
      return NextResponse.json({ error: 'Data file missing' }, { status: 503 });
    }

    const occupations = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    const occIndex = occupations.findIndex((o: any) => o.ssyk === ssyk);
    if (occIndex === -1) {
      return NextResponse.json({ error: 'Occupation not found' }, { status: 404 });
    }

    const occ = occupations[occIndex];

    if (!force) {
      const existingScore = db.prepare(`SELECT * FROM scores WHERE ssyk = ? AND modelName = ?`).get(ssyk, modelName) as any;
      if (existingScore) {
        return NextResponse.json(existingScore);
      }
    }

    const theoreticalPrompt = `You are scoring Norwegian occupations (STYRK-08) for AI exposure. Assess the occupation below and return a JSON object.

OCCUPATION (STYRK code: ${occ.ssyk}): ${occ.nameSwedish} / ${occ.nameEnglish}
DESCRIPTION: ${occ.description}

SCORING RUBRIC for "theoreticalExposure" (0â€“10):
- 9â€“10: Almost entirely screen/knowledge-based; output is text, code, data, or decisions AI models excel at
- 7â€“8: Majority of tasks are cognitive/digital but with some physical or interpersonal components
- 5â€“6: Mixed â€” significant cognitive tasks that AI could assist with, significant physical/relational tasks it cannot
- 3â€“4: Mostly physical, hands-on, interpersonal, or highly context-dependent (Norwegian welfare/care setting)
- 1â€“2: Almost entirely physical, outdoor, or dependent on real-world embodiment
- 0: No plausible AI impact on core task structure

IMPORTANT CONTEXT (Norway-specific):
- Strong unions and collective agreements can slow adoption even in exposed occupations
- Many public sector roles involve statutory duties that cannot be delegated to AI
- Consider TASK composition, not just the job title
- High exposure does NOT mean job loss — demand may rise`;

    const adoptionPrompt = `You are assessing current AI adoption signals for a Norwegian occupation, NOT theoretical potential.

OCCUPATION: ${occ.nameSwedish} / ${occ.nameEnglish}
STYRK: ${occ.ssyk}
DESCRIPTION: ${occ.description}

Rate "currentAdoption" (0â€“10) based on OBSERVABLE signals as of early 2026:
- 8â€“10: Tools actively used (e.g. GitHub Copilot for devs, AI drafting for lawyers, AI diagnostics for radiologists)
- 6â€“7: Significant tooling available and many employers adopting (e.g. AI-assisted customer service, data analysts using LLMs)
- 4â€“5: Early adoption â€” some employers experimenting, tools exist but not mainstream
- 2â€“3: Marginal â€” a few pilot programs, mostly talk, little deployment
- 0â€“1: No meaningful current adoption signals

Norwegian context: adoption varies by sector; public sector can be slower.`;

    const model = openai(modelName);

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
      promptUsed: theoreticalPrompt + "\n\n---\n\n" + adoptionPrompt,
      modelUsed: modelName,
      scoredAt: new Date().toISOString()
    };

    db.prepare(`
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
    `).run(
      occ.ssyk, modelName, newScore.theoreticalExposure, newScore.theoreticalExposureRationale,
      newScore.currentAdoption, newScore.currentAdoptionRationale, newScore.promptUsed, newScore.scoredAt
    );

    // Update in memory JSON representation
    occ.scores = newScore;
    const exposure = newScore.theoreticalExposure;
    const adoption = newScore.currentAdoption;
    let q = "low-exposure-low-adoption";
    if (exposure >= 5 && adoption >= 5) q = "high-exposure-high-adoption";
    else if (exposure >= 5 && adoption < 5) q = "high-exposure-low-adoption";
    else if (exposure < 5 && adoption >= 5) q = "low-exposure-high-adoption";
    occ.quadrant = q;

    fs.writeFileSync(dataFile, JSON.stringify(occupations, null, 2));

    return NextResponse.json(newScore);

  } catch (err: any) {
    console.error('API /api/score error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
