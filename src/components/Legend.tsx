import React from 'react';

type LegendProps = {
  metric: 'theoreticalExposure' | 'currentAdoption' | 'outlook' | 'educationLevel';
};

export function Legend({ metric }: LegendProps) {
  let style = {};
  let startLabel = '';
  let endLabel = '';
  let title = '';

  const heatGradient = 'linear-gradient(to right, #14532d, #166534, #ca8a04, #b91c1c, #7f1d1d)';
  const outlookGradient = 'linear-gradient(to right, #7f1d1d, #b91c1c, #ca8a04, #166534, #14532d)';

  if (metric === 'theoreticalExposure') {
    title = 'Theoretical AI Exposure (0-10)';
    style = { background: heatGradient };
    startLabel = '0 (Low Exposure)';
    endLabel = '10 (High Exposure)';
  } else if (metric === 'currentAdoption') {
    title = 'Current AI Adoption (0-10)';
    style = { background: heatGradient };
    startLabel = '0 (Low Adoption)';
    endLabel = '10 (High Adoption)';
  } else if (metric === 'outlook') {
    title = 'Labor Market Outlook (Shortage Index)';
    style = { background: outlookGradient };
    startLabel = 'High Competition';
    endLabel = 'Shortage (Brist)';
  } else {
    return null;
  }

  return (
    <div className="w-64">
      <div className="text-xs font-semibold mb-1 text-slate-300">{title}</div>
      <div className="h-3 w-full rounded" style={style}></div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
