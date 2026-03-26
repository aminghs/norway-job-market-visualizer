"use client";

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/lib/store';
import type { Occupation } from '@/lib/types';
import { MAJOR_GROUP_NAMES } from '@/lib/ssyk-groups';

interface ScatterPlotProps {
  data: Occupation[];
}

export function ScatterPlot({ data }: ScatterPlotProps) {
  const { setSelectedSsyk } = useAppStore();

  const chartOptions = useMemo(() => {
    // Generate series by grouping majorGroup
    const groupMap = new Map<string, any[]>();

    // Max emp for bubble size scaling
    const maxEmp = Math.max(...data.map(d => d.employed || 0), 1);

    data.forEach((occ) => {
      const g = occ.majorGroup;
      if (!groupMap.has(g)) groupMap.set(g, []);

      const x = occ.scores?.theoreticalExposure || 0;
      const y = occ.scores?.currentAdoption || 0;
      const size = occ.employed || 0;

      groupMap.get(g)!.push({
        name: occ.nameEnglish || occ.nameSwedish,
        value: [x, y, size, occ.ssyk],
        ssyk: occ.ssyk
      });
    });

    const series: any[] = [];

    // Dark mode color palette for scatter groups
    const darkColors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9',
      '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#8b5cf6'
    ];

    let colorIndex = 0;

    Array.from(groupMap.entries()).forEach(([group, points]) => {
      series.push({
        name: MAJOR_GROUP_NAMES[group] || `Group ${group}`,
        type: 'scatter',
        symbolSize: (dataItem: any) => {
          // simple scaling: min 5, max 40
          const size = dataItem[2];
          return Math.max(5, Math.min(40, (size / maxEmp) * 100));
        },
        data: points,
        itemStyle: {
          color: darkColors[colorIndex % darkColors.length],
          opacity: 0.8,
          borderColor: '#1e293b',
          borderWidth: 1
        },
        emphasis: { focus: 'series' }
      });
      colorIndex++;
    });

    return {
      title: {
        text: 'AI Exposure vs. Current Adoption',
        subtext: 'Bubble size = Number of employed',
        left: 'center',
        top: 10,
        textStyle: { color: '#e2e8f0' },
        subtextStyle: { color: '#94a3b8' }
      },
      legend: {
        type: 'scroll',
        bottom: 10,
        textStyle: { color: '#cbd5e1' },
        data: series.map(s => s.name)
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '15%',
        containLabel: true
      },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' },
        formatter: (params: any) => {
          const occName = params.data.name;
          const [x, y, emp, ssyk] = params.value;
          return `
            <div style="font-size:12px;">
              <strong>${occName} (SSYK ${ssyk})</strong><br/>
              Theoretical Exposure: ${x.toFixed(1)}/10<br/>
              Current Adoption: ${y.toFixed(1)}/10<br/>
              Employed: ${emp}
            </div>
          `;
        }
      },
      xAxis: {
        name: 'Theoretical Exposure (0 - 10)',
        nameLocation: 'middle',
        nameGap: 30,
        type: 'value',
        min: 0,
        max: 10,
        splitLine: { show: false },
        nameTextStyle: { color: '#cbd5e1' },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        name: 'Current Adoption (0 - 10)',
        nameLocation: 'middle',
        nameGap: 40,
        type: 'value',
        min: 0,
        max: 10,
        splitLine: { show: false },
        nameTextStyle: { color: '#cbd5e1' },
        axisLabel: { color: '#94a3b8' }
      },
      series: [
        ...series,
        {
          type: 'scatter',
          silent: true,
          data: [],
          markLine: {
            silent: true,
            symbol: 'none',
            label: { show: false },
            lineStyle: { type: 'solid', color: '#475569', width: 2 },
            data: [
              { xAxis: 5 },
              { yAxis: 5 }
            ]
          },
          markArea: {
            silent: true,
            itemStyle: { color: 'transparent' },
            label: {
              position: 'inside',
              color: '#64748b',
              fontSize: 14,
              fontWeight: 'bold',
              opacity: 0.8
            },
            data: [
              [{ name: 'High exposure, already changing', coord: [5, 10] }, { coord: [10, 5] }],
              [{ name: 'Adopting fast, lower exposure', coord: [0, 10] }, { coord: [5, 5] }],
              [{ name: 'Exposed but not yet disrupted', coord: [5, 5] }, { coord: [10, 0] }],
              [{ name: 'Stable, low AI impact', coord: [0, 5] }, { coord: [5, 0] }]
            ]
          }
        }
      ]
    };
  }, [data]);

  const onEvents = {
    'click': (params: any) => {
      if (params.data && params.data.ssyk) {
        setSelectedSsyk(params.data.ssyk);
      }
    }
  };

  return (
    <div className="w-full h-full border border-slate-800 rounded-md shadow-inner bg-slate-900 overflow-hidden relative">
      <ReactECharts
        option={chartOptions}
        style={{ height: '100%', width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
        onEvents={onEvents}
      />
    </div>
  );
}
