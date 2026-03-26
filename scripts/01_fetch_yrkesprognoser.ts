import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const API_URL = 'https://data.jobtechdev.se/yrkesprognoser/current/Yrkesprognos.json';

async function fetchYrkesprognoser() {
  console.log('Fetching Arbetsförmedlingen Yrkesprognoser...');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    const data: any[] = await response.json();
    console.log(`Fetched ${data.length} forecasts.`);

    if (process.env.OPENAI_API_KEY) {
      console.log('Translating forecast text (stycke1, stycke2) to English...');
      const CHUNK = 40;
      for (let i = 0; i < data.length; i += CHUNK) {
        const chunk = data.slice(i, i + CHUNK);
        console.log(`  Batch ${i + 1}–${i + chunk.length}`);
        try {
          const payload = chunk
            .map((r: any) => `SSYK: ${r.ssyk}\nShort: ${r.stycke1 || ''}\nMedium: ${r.stycke2 || ''}`)
            .join('\n\n');

          const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: z.object({
              forecasts: z.array(z.object({
                ssyk: z.number(),
                shortTermEn: z.string(),
                mediumTermEn: z.string()
              }))
            }),
            prompt: `Translate these Swedish short-term and medium-term labor market outlook texts to standard English.
Return one item per SSYK number.\n\n${payload}`
          });

          for (const t of object.forecasts) {
            // Use filter/forEach to apply translation to ALL entries for this SSYK (2024, 2026 etc)
            data.filter((r: any) => r.ssyk === t.ssyk).forEach((r: any) => {
              r.stycke1En = t.shortTermEn;
              r.stycke2En = t.mediumTermEn;
            });
          }
        } catch (e: any) {
          console.error(`  Batch failed: ${e.message}`);
        }
      }
    } else {
      console.warn('OPENAI_API_KEY not set — forecast text will stay in Swedish. Run 07_translate_db.ts separately.');
    }

    const dataDir = path.resolve(process.cwd(), 'data/raw');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const outFile = path.join(dataDir, 'yrkesprognoser.json');
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
    console.log(`Saved ${data.length} forecasts to ${outFile}`);
  } catch (error) {
    console.error('Error fetching yrkesprognoser:', error);
    process.exit(1);
  }
}

fetchYrkesprognoser();
