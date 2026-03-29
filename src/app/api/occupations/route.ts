import { NextResponse } from 'next/server';
import fs from 'fs';
import type { Occupation } from '@/lib/types';
import { countryConfig } from '@/config/country.config';

export const dynamic = 'force-dynamic';

function numOrNegInf(n: number | null | undefined) {
  if (n === null || n === undefined) return Number.NEGATIVE_INFINITY;
  return n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const metric = searchParams.get('metric') || 'theoreticalExposure';
  const sector = searchParams.get('sector');
  const majorGroup = searchParams.get('majorGroup');
  const search = searchParams.get('search')?.toLowerCase();

  try {
    const dataFile = countryConfig.paths.mergedOccupationsJson;
    if (!fs.existsSync(dataFile)) {
      return NextResponse.json({ error: 'Data not available yet' }, { status: 503 });
    }

    const fileContent = fs.readFileSync(dataFile, 'utf-8');
    let occupations: Occupation[] = JSON.parse(fileContent);

    if (sector && sector !== 'all') {
      occupations = occupations.filter((o) => o.sector === sector);
    }

    if (majorGroup && majorGroup !== 'all') {
      occupations = occupations.filter((o) => o.majorGroup === majorGroup);
    }

    if (search) {
      occupations = occupations.filter(
        (o) =>
          o.nameSwedish.toLowerCase().includes(search) ||
          (o.nameEnglish && o.nameEnglish.toLowerCase().includes(search)) ||
          o.ssyk.includes(search),
      );
    }

    occupations.sort((a, b) => {
      if (metric === 'theoreticalExposure') {
        const scoreA = numOrNegInf(a.scores?.theoreticalExposure ?? null);
        const scoreB = numOrNegInf(b.scores?.theoreticalExposure ?? null);
        return scoreB - scoreA;
      } else if (metric === 'currentAdoption') {
        const scoreA = numOrNegInf(a.scores?.currentAdoption ?? null);
        const scoreB = numOrNegInf(b.scores?.currentAdoption ?? null);
        return scoreB - scoreA;
      } else if (metric === 'outlook') {
        const scoreA = numOrNegInf(a.forecast?.outlookScore ?? null);
        const scoreB = numOrNegInf(b.forecast?.outlookScore ?? null);
        return scoreB - scoreA;
      }
      return 0;
    });

    return NextResponse.json(occupations);
  } catch (err) {
    console.error('API /api/occupations error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
