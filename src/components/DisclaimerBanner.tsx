import React from 'react';

export function DisclaimerBanner() {
  return (
    <div className="shrink-0 w-full bg-slate-900 border-t border-slate-800 text-slate-300 text-xs md:text-sm py-3 px-4 z-10 overflow-hidden">
      <div className="container mx-auto flex items-center gap-3">
        <p className="flex-1">
          <strong className="text-slate-100">Exploration tool, not a forecast.</strong> AI exposure does not equal job loss. Research suggests AI changes tasks and skills, rather than eliminating entire professions.{" "}
          <a href="/methodology" className="shrink-0 text-blue-400 hover:text-blue-300 underline font-semibold transition-colors">
            Read methodology
          </a>
        </p>
      </div>
    </div>
  );
}
