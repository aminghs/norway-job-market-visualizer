import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Occupation } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const metric = searchParams.get('metric') || 'theoreticalExposure';
  const sector = searchParams.get('sector');
  const majorGroup = searchParams.get('majorGroup');
  const search = searchParams.get('search')?.toLowerCase();

  try {
    const dataFile = path.resolve(process.cwd(), 'data/occupations.json');
    if (!fs.existsSync(dataFile)) {
      return NextResponse.json({ error: 'Data not available yet' }, { status: 503 });
    }

    const fileContent = fs.readFileSync(dataFile, 'utf-8');
    let occupations: Occupation[] = JSON.parse(fileContent);

    // Filter by sector
    if (sector && sector !== 'all') {
      occupations = occupations.filter(o => o.sector === sector);
    }

    // Filter by major group
    if (majorGroup && majorGroup !== 'all') {
      occupations = occupations.filter(o => o.majorGroup === majorGroup);
    }

    // Filter by search query
    if (search) {
      occupations = occupations.filter(o => 
        o.nameSwedish.toLowerCase().includes(search) || 
        (o.nameEnglish && o.nameEnglish.toLowerCase().includes(search)) ||
        o.ssyk.includes(search)
      );
    }

    // Sort by metric
    occupations.sort((a, b) => {
      if (metric === 'theoreticalExposure') {
        const scoreA = a.scores?.theoreticalExposure || 0;
        const scoreB = b.scores?.theoreticalExposure || 0;
        return scoreB - scoreA;
      } else if (metric === 'currentAdoption') {
        const scoreA = a.scores?.currentAdoption || 0;
        const scoreB = b.scores?.currentAdoption || 0;
        return scoreB - scoreA;
      } else if (metric === 'outlook') {
        const scoreA = a.forecast?.outlookScore || 0;
        const scoreB = b.forecast?.outlookScore || 0;
        // higher outlook score = more shortage = better outlook. Sort descending
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
