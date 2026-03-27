import React from 'react';
import fs from 'fs';
import path from 'path';
import type { Occupation } from '@/lib/types';
import { OccupationCard } from '@/components/OccupationCard';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
  const dataFile = path.resolve(process.cwd(), 'data/occupations.json');
  let title = `Occupation SSYK ${ssyk}`;
  
  if (fs.existsSync(dataFile)) {
    try {
      const occupations: Occupation[] = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
      const occ = occupations.find((o) => o.ssyk === ssyk);
      if (occ) title = `${occ.nameEnglish || occ.nameSwedish} - SSYK ${ssyk}`;
    } catch (e) {}
  }

  return {
    title: `${title} | Sweden Job Market Visualizer`,
    description: `AI Exposure and Adoption profile for ${title} in the Swedish labor market.`,
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
    <div className="min-h-screen bg-slate-950 text-slate-200 relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10 opacity-50" />
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-orange-600/5 blur-[100px] rounded-full -z-10" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50 flex items-center px-4 md:px-8 justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Visualizer</span>
        </Link>
        <div className="text-xs font-mono text-slate-500 hidden sm:block">SYSTEM ID: {occ.ssyk}</div>
      </header>
      
      <main className="container mx-auto max-w-4xl pt-28 pb-20 px-4 min-h-screen">
        <div className="grid grid-cols-1 gap-10">
          <div className="rounded-2xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] bg-slate-900 border border-slate-800 h-auto">
            <OccupationCard occupation={occ} />
          </div>
          
          <div className="max-w-2xl mx-auto w-full">
            <DisclaimerBanner />
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-slate-900 text-center text-slate-600 text-xs bg-slate-950 relative z-10">
        <p>© 2026 Sweden Job Market Visualizer. Inspired by Andrej Karpathy.</p>
      </footer>
    </div>
  );
}
