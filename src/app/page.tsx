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
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-50 tracking-tight">
            Sweden Job Market Visualizer
          </h1>
          <p className="text-sm text-slate-400 font-medium">AI Exposure & Adoption Analysis</p>
        </div>
        <div className="hidden sm:block">
          <Legend metric={metric} />
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
