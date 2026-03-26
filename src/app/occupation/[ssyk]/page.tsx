import React from 'react';
import fs from 'fs';
import path from 'path';
import type { Occupation } from '@/lib/types';
import { OccupationCard } from '@/components/OccupationCard';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { Metadata } from 'next';
import Link from 'next/link';

// Pre-render pages if possible or fetch dynamically
export async function generateStaticParams() {
  const dataFile = path.resolve(process.cwd(), 'data/occupations.json');
  if (!fs.existsSync(dataFile)) {
    return [];
  }
  const fileContent = fs.readFileSync(dataFile, 'utf-8');
  const occupations: Occupation[] = JSON.parse(fileContent);

  return occupations.map((occ) => ({
    ssyk: occ.ssyk,
  }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ ssyk: string }> }
): Promise<Metadata> {
  const ssyk = (await params).ssyk;
  return {
    title: `Occupation SSYK ${ssyk} - Sweden Job Market Visualizer`,
  };
}

export default async function OccupationPage(
  { params }: { params: Promise<{ ssyk: string }> }
) {
  const ssyk = (await params).ssyk;
  // Use async read to not block
  const dataFile = path.resolve(process.cwd(), 'data/occupations.json');
  if (!fs.existsSync(dataFile)) {
    return <div className="p-8">Data file not found</div>;
  }

  const occupations: Occupation[] = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const occ = occupations.find((o) => o.ssyk === ssyk);

  if (!occ) {
    return (
      <div className="p-8 text-center mt-20 text-slate-200">
        <h1 className="text-2xl font-bold mb-4">Occupation not found</h1>
        <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <Link href="/" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-medium">
            Back to Visualizer
          </Link>
        </div>

        {/* We reuse the sidebar card component but give it full formatting space */}
        <div className="rounded-xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800 h-auto">
          <OccupationCard occupation={occ} />
        </div>
      </div>
      <DisclaimerBanner />
    </div>
  );
}
