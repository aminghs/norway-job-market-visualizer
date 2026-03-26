"use client";

import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';

interface ScoreBreakdownProps {
  scores: {
    theoreticalExposureRationale: string;
    currentAdoptionRationale: string;
    promptUsed: string;
    modelName: string;
    scoredAt: string;
  };
}

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showPrompt, setShowPrompt] = React.useState(false);

  return (
    <div className="mt-4 border border-slate-700 rounded-md shadow-sm bg-slate-800/50 relative overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold bg-slate-900 border-b border-slate-700 hover:bg-slate-800 transition-colors text-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🔍</span>
            WHY THIS SCORE?
          </div>
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 py-3 text-sm text-slate-300 space-y-4">
          <div>
            <h4 className="font-semibold text-slate-100 mb-1">Theoretical Exposure Rationale</h4>
            <p className="leading-relaxed">{scores.theoreticalExposureRationale}</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-100 mb-1">Current Adoption Rationale</h4>
            <p className="leading-relaxed">{scores.currentAdoptionRationale}</p>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row justify-between sm:items-center text-xs text-slate-500 border-t border-slate-700">
            <div className="flex flex-col">
              <span>Model: <strong className="text-slate-400">{scores.modelName || 'gpt-4o-mini'}</strong></span>
              <span>Scored: {new Date(scores.scoredAt).toLocaleDateString()}</span>
            </div>
            
            <button 
              onClick={() => setShowPrompt(!showPrompt)}
              className="mt-2 sm:mt-0 flex items-center gap-1 hover:text-blue-400 transition-colors text-left"
            >
              <Terminal size={12} />
              {showPrompt ? "Hide raw prompt" : "View raw prompt"}
            </button>
          </div>
          
          {showPrompt && (
            <div className="bg-slate-950 text-slate-400 p-3 rounded text-xs font-mono overflow-auto max-h-[300px] whitespace-pre-wrap border border-slate-800">
              {scores.promptUsed}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
