import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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
    const dataFile = path.resolve(process.cwd(), 'data/occupations.json');
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

    const theoreticalPrompt = `You are scoring Swedish occupations for AI exposure. Assess the occupation below and return a JSON object.

OCCUPATION (SSYK code: ${occ.ssyk}): ${occ.nameSwedish} / ${occ.nameEnglish}
DESCRIPTION: ${occ.description}

SCORING RUBRIC for "theoreticalExposure" (0–10):
- 9–10: Almost entirely screen/knowledge-based; output is text, code, data, or decisions AI models excel at
- 7–8: Majority of tasks are cognitive/digital but with some physical or interpersonal components
- 5–6: Mixed — significant cognitive tasks that AI could assist with, significant physical/relational tasks it cannot
- 3–4: Mostly physical, hands-on, interpersonal, or highly context-dependent (Swedish welfare/care setting)
- 1–2: Almost entirely physical, outdoor, or dependent on real-world embodiment
- 0: No plausible AI impact on core task structure

IMPORTANT CONTEXT (Sweden-specific):
- Sweden has high union density and strong collective agreements that slow adoption even in exposed occupations
- Many public sector roles (nurses, teachers, social workers) involve statutory duties that cannot be delegated to AI by law
- Consider the TASK composition, not just the job title
- High exposure does NOT mean job loss — demand may rise`;

    const adoptionPrompt = `You are assessing current AI adoption signals for a Swedish occupation, NOT theoretical potential.

OCCUPATION: ${occ.nameSwedish} / ${occ.nameEnglish}
SSYK: ${occ.ssyk}
DESCRIPTION: ${occ.description}

Rate "currentAdoption" (0–10) based on OBSERVABLE signals as of early 2026:
- 8–10: Tools actively used (e.g. GitHub Copilot for devs, AI drafting for lawyers, AI diagnostics for radiologists)
- 6–7: Significant tooling available and many employers adopting (e.g. AI-assisted customer service, data analysts using LLMs)
- 4–5: Early adoption — some employers experimenting, tools exist but not mainstream
- 2–3: Marginal — a few pilot programs, mostly talk, little deployment
- 0–1: No meaningful current adoption signals

Swedish context: AI adoption in Swedish workplaces is accelerating (AI tool mentions in job ads +328% since 2016, TechSverige 2026), but penetration is uneven. Public sector adoption is structurally slower.`;

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
