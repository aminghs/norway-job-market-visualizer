import React from 'react';

export function DisclaimerBanner() {
  return (
    <div className="shrink-0 w-full bg-slate-900 border-t border-slate-800 text-slate-300 text-xs md:text-sm py-3 px-4 z-10 overflow-hidden">
      <div className="container mx-auto flex items-center gap-3">
        <p className="flex-1">
          <strong className="text-slate-100">This is an exploration tool, not a forecast.</strong> Scores are rough AI-generated estimates of task exposure, not predictions of job loss.
          Exposure does not equal displacement — Swedish labor market research shows AI is currently changing tasks and skill demands, not eliminating jobs wholesale. {" "}
          <a href="/methodology" className="shrink-0 text-blue-400 hover:text-blue-300 underline font-semibold transition-colors">
            Learn more about methodology
          </a>
        </p>
      </div>
    </div>
  );
}
