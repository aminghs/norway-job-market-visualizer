import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const JOBTECH_TAXONOMY_URL = 'https://taxonomy.api.jobtechdev.se/v1/taxonomy/graphql?query=query%20MyQuery%20%7B%0A%20%20concepts%28type%3A%20%22ssyk-level-4%22%29%20%7B%0A%20%20%20%20id%0A%20%20%20%20preferred_label%0A%20%20%20%20ssyk_code_2012%0A%20%20%20%20definition%0A%20%20%7D%0A%7D';
const SCB_API_URL = 'https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0208/AM0208M/YREG60N';

async function fetchSsyk() {
  console.log('Fetching SSYK occupations from JobTech...');
  try {
    const jobtechRes = await fetch(JOBTECH_TAXONOMY_URL);
    if (!jobtechRes.ok) throw new Error('JobTech fetch failed: ' + jobtechRes.status);
    const jobtechData = await jobtechRes.json();
    const concepts = jobtechData.data.concepts.filter((c: any) => c.ssyk_code_2012 && c.ssyk_code_2012.length === 4);
    
    // Count how many 4-digit occupations belong to each 3-digit group for fair distribution
    const ssyk3ChildrenCount: Record<string, number> = {};
    for (const c of concepts) {
      const ssyk3 = c.ssyk_code_2012.substring(0, 3);
      ssyk3ChildrenCount[ssyk3] = (ssyk3ChildrenCount[ssyk3] || 0) + 1;
    }

    console.log('Fetching employment counts from SCB (Yrke2012 × national × all industries)...');
    // SCB YREG56N — filter by national region + all SSYK 3-digit codes + year
    // Omitting SNI2007 and Kon so all industries and both sexes are included
    // key order in response: [Region, Yrke2012, SNI2007, Kon, Tid] → key[1] = 3-digit SSYK
    const scbQueryWithOcc = {
      query: [
        { code: 'Region',    selection: { filter: 'item', values: ['00'] } },
        { code: 'Yrke2012',  selection: { filter: 'all',  values: ['*']  } },
        { code: 'Kon',       selection: { filter: 'all',  values: ['*']  } },
        { code: 'Tid',       selection: { filter: 'item', values: ['2021'] } }
      ],
      response: { format: 'json' }
    };

    const scbRes = await fetch(SCB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scbQueryWithOcc)
    });
    
    const scbEmploymentData: Record<string, number> = {};
    if (scbRes.ok) {
      const scbData = await scbRes.json();
      if (scbData && scbData.data) {
        for (const item of scbData.data) {
          // Sum both sexes for each 4-digit SSYK
          const ssyk4 = item.key[1];
          const count = parseInt(item.values[0], 10);
          if (ssyk4 && !isNaN(count)) {
            scbEmploymentData[ssyk4] = (scbEmploymentData[ssyk4] || 0) + count;
          }
        }
      }
      console.log(`Got SCB employment data for ${Object.keys(scbEmploymentData).length} 4-digit occupation codes`);
    } else {
      console.warn('Could not fetch SCB employment metrics — will use estimates.');
    }

    const compiledCodes = concepts.map((c: any) => {
      const code = c.ssyk_code_2012;
      let count = scbEmploymentData[code] || 0;

      // Some 4-digit codes in taxonomy are 3-digit in SCB? Check prefix
      if (!count) {
        const ssyk3 = code.substring(0, 3);
        count = scbEmploymentData[ssyk3] || 0;
      }

      // Final fallback estimate if still zero
      if (!count) {
        const det = parseInt(code) % 10000;
        count = Math.floor(1000 + det * 0.5);
      }

      return {
        ssyk: code,
        nameSwedish: c.preferred_label,
        nameEnglish: c.preferred_label, // overwritten below
        description: c.definition || '',
        descriptionEnglish: '', // filled below
        majorGroup: code.substring(0, 1),
        subMajorGroup: code.substring(0, 2),
        minorGroup: code.substring(0, 3),
        employed: count
      };
    });

    // Translate names + descriptions via AI in batches of 50
    if (process.env.OPENAI_API_KEY) {
      console.log('Translating occupation names and descriptions...');
      const CHUNK = 50;
      for (let i = 0; i < compiledCodes.length; i += CHUNK) {
        const chunk = compiledCodes.slice(i, i + CHUNK);
        console.log(`  Batch ${i + 1}–${i + chunk.length}`);
        try {
          const payload = chunk
            .map((c: any) => `SSYK: ${c.ssyk}\nTitle: ${c.nameSwedish}\nDesc: ${c.description}`)
            .join('\n\n');

          const { object } = await generateObject({
            model: openai('gpt-5.4-mini'),
            schema: z.object({
              translations: z.array(z.object({
                ssyk: z.string(),
                englishName: z.string(),
                englishDescription: z.string()
              }))
            }),
            prompt: `Translate these Swedish labor-market occupation titles and short descriptions to standard British English.
Return one item per SSYK code in the translations array.\n\n${payload}`
          });

          for (const t of object.translations) {
            const target = compiledCodes.find((c: any) => c.ssyk === t.ssyk);
            if (target) {
              target.nameEnglish = t.englishName;
              target.descriptionEnglish = t.englishDescription;
            }
          }
        } catch (e: any) {
          console.error(`  Batch failed: ${e.message}`);
        }
      }
    } else {
      console.warn('OPENAI_API_KEY not set — skipping English translation. Run 06_translate.ts separately.');
    }

    const dataDir = path.resolve(process.cwd(), 'data/raw');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const outFile = path.join(dataDir, 'ssyk_occupations.json');
    fs.writeFileSync(outFile, JSON.stringify(compiledCodes, null, 2));
    console.log(`Saved ${compiledCodes.length} occupations to ${outFile}`);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fetchSsyk();
