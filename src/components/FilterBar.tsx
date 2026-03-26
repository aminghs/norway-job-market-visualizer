"use client";

import React from 'react';
import { Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function FilterBar() {
  const {
    metric, setMetric,
    view, setView,
    searchQuery, setSearchQuery
  } = useAppStore();

  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between items-center p-4 bg-slate-900 border-b border-slate-800 text-slate-200">
      <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">

        {/* Metric Selector (Radio Group) */}
        <div className="flex items-center gap-3">
          <RadioGroup
            value={metric}
            onValueChange={(val: any) => setMetric(val)}
            className="flex items-center gap-4"
          >
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem value="theoreticalExposure" id="r1" className="border-slate-500 text-blue-500" />
              <Label htmlFor="r1" className="text-sm cursor-pointer hover:text-white transition-colors">Exposure</Label>
            </div>
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem value="currentAdoption" id="r2" className="border-slate-500 text-orange-500" />
              <Label htmlFor="r2" className="text-sm cursor-pointer hover:text-white transition-colors">Adoption</Label>
            </div>
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem value="outlook" id="r3" className="border-slate-500 text-green-500" />
              <Label htmlFor="r3" className="text-sm cursor-pointer hover:text-white transition-colors">Outlook</Label>
            </div>
          </RadioGroup>
        </div>

      </div>

      <div className="flex items-center gap-4 w-full md:w-auto">
        {/* Search Input */}
        <div className="relative w-full md:w-[250px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search occupations..."
            className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Toggle */}
        <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="treemap" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Treemap</TabsTrigger>
            <TabsTrigger value="scatter" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Scatter</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
