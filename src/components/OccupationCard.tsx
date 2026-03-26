"use client";

import React from 'react';
import type { Occupation } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { ScoreBreakdown } from './ScoreBreakdown';
import { X, ExternalLink, Link2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface OccupationCardProps {
  occupation: Occupation;
}

export function OccupationCard({ occupation }: OccupationCardProps) {
  const { setSelectedSsyk } = useAppStore();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/occupation/${occupation.ssyk}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderDots = (score: number, filledColor: string) => {
    const dots = [];
    const filledCount = Math.round(score);
    for (let i = 1; i <= 10; i++) {
      dots.push(
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${i <= filledCount ? filledColor : 'bg-slate-200'}`}
        />
      );
    }
    return <div className="flex gap-1 mt-1">{dots}</div>;
  };

  const exposureScore = occupation.scores?.theoreticalExposure || 0;
  const adoptionScore = occupation.scores?.currentAdoption || 0;
  // App is English-only — prefer English translations, fall back to Swedish source
  const displayName = occupation.nameEnglish || occupation.nameSwedish;
  const displayDescription = occupation.descriptionEnglish || occupation.description;


  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 shadow-lg overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 p-4 border-b border-slate-800 flex justify-between items-start">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">SSYK {occupation.ssyk}</div>
          <h2 className="text-xl font-bold text-slate-50 leading-tight">
            {displayName}
          </h2>
        </div>
        <button
          onClick={() => setSelectedSsyk(null)}
          className="p-1 rounded-full hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-300"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 flex-1 space-y-6">

        {/* Basic Stats */}
        <section className="flex flex-col gap-2">
          <div className="flex justify-between items-center py-2 border-slate-800">
            <span className="text-sm text-slate-400">Employed in Sweden</span>
            <span className="font-semibold text-slate-200">
              {new Intl.NumberFormat('en-US').format(occupation.employed || 0)}
            </span>
          </div>
        </section>

        {/* AI Scores */}
        <section className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-4">AI Scores</h3>

          <div className="mb-4">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-semibold text-slate-300">Theoretical AI Exposure</span>
              <span className="text-lg font-bold text-blue-400">{exposureScore.toFixed(1)} <span className="text-xs text-slate-500 font-normal">/ 10</span></span>
            </div>
            {renderDots(exposureScore, 'bg-blue-600')}
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-semibold text-slate-300">Current AI Adoption</span>
              <span className="text-lg font-bold text-orange-400">{adoptionScore.toFixed(1)} <span className="text-xs text-slate-500 font-normal">/ 10</span></span>
            </div>
            {renderDots(adoptionScore, 'bg-orange-500')}
          </div>

          {occupation.scores && (
            <ScoreBreakdown scores={occupation.scores} />
          )}
        </section>

        {/* Meaning Overview */}
        <section className="bg-blue-900/20 p-4 rounded-lg text-sm text-slate-300 border border-blue-900/50">
          <h3 className="font-bold text-blue-400 mb-2">What this means</h3>
          <p className="leading-relaxed">
            With an exposure score of <strong className="text-blue-400">{exposureScore.toFixed(1)}</strong> and an adoption score of <strong className="text-orange-400">{adoptionScore.toFixed(1)}</strong>,
            this occupation falls in the <strong className="capitalize text-slate-100">{occupation.quadrant?.replace(/-/g, ' ') || 'unknown'}</strong> quadrant.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            High exposure does NOT mean this role is at risk of elimination; demand for skilled professionals may remain stable or even grow as tasks evolve.
          </p>
        </section>

        {/* Market Outlook */}
        {occupation.forecast && (
          <section>
            <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-3 border-b border-slate-800 pb-2">Outlook (Arbetsförmedlingen)</h3>
            <div className="mb-3">
              <span className="inline-block text-xs font-medium text-slate-400 mr-2">Competition Level:</span>
              <Badge variant={occupation.forecast.outlookScore >= 4 ? "destructive" : occupation.forecast.outlookScore <= 2 ? "default" : "secondary"}>
                {occupation.forecast.competitionLevel}
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <strong className="block text-slate-200 mb-1">Short Term (1 year)</strong>
                <p className="text-slate-400 bg-slate-800/50 p-3 rounded">{occupation.forecast.shortTermOutlook}</p>
              </div>
              <div>
                <strong className="block text-slate-200 mb-1">Medium Term (2+ years)</strong>
                <p className="text-slate-400 bg-slate-800/50 p-3 rounded">{occupation.forecast.mediumTermOutlook}</p>
              </div>
            </div>
          </section>
        )}

        {/* Links */}
        <section className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <button onClick={handleCopyLink} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors text-left">
            {copied ? <Check size={14} className="text-green-500" /> : <Link2 size={14} />}
            {copied ? "Link copied!" : "Copy link to occupation"}
          </button>

          <a href="/methodology" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline">
            <ExternalLink size={14} /> View Methodology
          </a>
        </section>
      </div>
    </div>
  );
}
