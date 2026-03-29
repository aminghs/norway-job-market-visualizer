"use client";

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useAppStore } from '@/lib/store';
import { FilterBar } from '@/components/FilterBar';
import { Treemap } from '@/components/Treemap';
import { ScatterPlot } from '@/components/ScatterPlot';
import { OccupationCard } from '@/components/OccupationCard';
import { Legend } from '@/components/Legend';
import { DisclaimerBanner } from '@/components/DisclaimerBanner';
import { Skeleton } from '@/components/ui/skeleton';
import type { Occupation } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HomePage() {
  const { metric, searchQuery, view, selectedSsyk, setSelectedSsyk } = useAppStore();
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce search query to avoid spamming the API
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const queryParams = new URLSearchParams({
    metric,
    search: debouncedSearch
  });

  const { data: occupations, error, isLoading } = useSWR<Occupation[]>(
    `/api/occupations?${queryParams}`,
    fetcher,
    { keepPreviousData: true }
  );

  const selectedOccupation = selectedSsyk && occupations
    ? occupations.find(o => o.ssyk === selectedSsyk)
    : null;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!occupations || occupations.length === 0) return;

      if (e.key === 'Escape') {
        setSelectedSsyk(null);
        return;
      }

      const currentIndex = occupations.findIndex(o => o.ssyk === selectedSsyk);

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % occupations.length;
        setSelectedSsyk(occupations[nextIndex].ssyk);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? occupations.length - 1 : currentIndex - 1;
        setSelectedSsyk(occupations[prevIndex].ssyk);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [occupations, selectedSsyk, setSelectedSsyk]);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">

      {/* Top Header */}
      <header className="bg-slate-900 shadow-sm z-20 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shadow-lg shrink-0 bg-[#BA0C2F]"
            title="Norway"
            aria-label="Norway flag"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 110 80"
              className="w-full h-full block"
              aria-hidden
            >
              <rect width="110" height="80" fill="#BA0C2F" />
              <rect x="40" width="30" height="80" fill="#fff" />
              <rect y="30" width="110" height="20" fill="#fff" />
              <rect x="45" width="20" height="80" fill="#00205B" />
              <rect y="35" width="110" height="10" fill="#00205B" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-50 tracking-tight">
              Norway Job Market Visualizer
            </h1>
            <p className="text-sm text-slate-400 font-medium">AI Exposure & Adoption Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <Legend metric={metric} />
          </div>
          <a 
            href="https://github.com/aminghs/norway-job-market-visualizer" 
            target="_blank" 
            rel="noreferrer"
            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            title="View on GitHub"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          </a>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="shrink-0 z-10 relative">
        <FilterBar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* Chart Area */}
        <section className="flex-1 w-full h-full relative">
          {isLoading && !occupations ? (
            <div className="absolute inset-0 p-4 flex gap-4">
              <Skeleton className="w-full h-full rounded-xl bg-slate-800" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-center px-4">
              <p>Failed to load data. Ensure the database pipeline has run.</p>
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full p-2">
              {view === 'treemap' && <Treemap data={occupations || []} />}
              {view === 'scatter' && <ScatterPlot data={occupations || []} />}
            </div>
          )}
        </section>

        {/* Sidebar Overlay for Details */}
        {selectedOccupation && (
          <>
            <div
              className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm cursor-pointer"
              onClick={() => setSelectedSsyk(null)}
            />
            <aside className="absolute z-40 top-0 right-0 w-full sm:w-96 md:w-[420px] h-full overflow-y-auto bg-slate-900 shadow-2xl border-l border-slate-800 animate-in slide-in-from-right-8">
              <OccupationCard occupation={selectedOccupation} />
            </aside>
          </>
        )}
      </main>

      <DisclaimerBanner />
    </div>
  );
}
