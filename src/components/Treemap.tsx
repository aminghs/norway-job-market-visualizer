"use client";

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useAppStore } from '@/lib/store';
import type { Occupation } from '@/lib/types';
import { MAJOR_GROUP_NAMES } from '@/lib/ssyk-groups';

interface TreemapProps {
  data: Occupation[];
}

/** ECharts treemap label formatter argument (subset we use). */
interface TreemapLabelParams {
  name: string;
  value?: number;
}

interface TreemapLeafData {
  name: string;
  value: number;
  ssyk: string;
  colorValue: number | null;
  label: {
    show: boolean;
    position: string;
    formatter: (params: TreemapLabelParams) => string;
    rich: Record<
      string,
      { color: string; fontWeight?: string; fontSize: number; padding?: number[] }
    >;
  };
  itemStyle: {
    color: string;
    borderWidth: number;
    borderColor: string;
    gapWidth: number;
  };
}

interface TreemapGroupNode {
  name: string;
  itemStyle: { borderWidth: number };
  children: TreemapLeafData[];
}

interface TreemapTooltipInfo {
  name: string;
  value?: number;
  treePathInfo: { name?: string }[];
  data?: { ssyk?: string; colorValue?: number | null };
}

interface TreemapClickParams {
  data?: { ssyk?: string };
}

export function Treemap({ data }: TreemapProps) {
  const { metric, setSelectedSsyk } = useAppStore();

  const getColor = (val: number, min: number, max: number, colors: string[]) => {
    if (val === 0 || !val) return '#422006'; // Dark brown for unscored/neutral
    const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
    const cIndex = Math.min(Math.floor(ratio * colors.length), colors.length - 1);
    return colors[cIndex];
  };

  const chartOptions = useMemo(() => {
    // Group occupations by majorGroup
    const groupMap = new Map<string, TreemapGroupNode>();

    // SSYK 2012 Major Groups (from shared constant)
    const majorGroupNames = MAJOR_GROUP_NAMES;

    data.forEach((occ) => {
      let g = groupMap.get(occ.majorGroup);
      if (!g) {
        g = {
          name: majorGroupNames[occ.majorGroup] || `Group ${occ.majorGroup}`,
          itemStyle: { borderWidth: 0 },
          children: []
        };
        groupMap.set(occ.majorGroup, g);
      }

      const val = occ.employed && occ.employed > 0 ? occ.employed : 1;
      let colorValue: number | null = 0;

      if (metric === 'theoreticalExposure') {
        colorValue = occ.scores?.theoreticalExposure || 0;
      } else if (metric === 'currentAdoption') {
        colorValue = occ.scores?.currentAdoption || 0;
      } else if (metric === 'outlook') {
        const os = occ.forecast?.outlookScore;
        colorValue =
          typeof os === 'number' && !Number.isNaN(os) ? os : null;
      }

      let childColor = '#422006';

      // We map 0=Safe (Dark Green) to 10=Exposed (Dark Red)
      const heatColors = ['#14532d', '#166534', '#ca8a04', '#b91c1c', '#7f1d1d'];

      if (metric === 'theoreticalExposure') {
        childColor = getColor(colorValue ?? 0, 0, 10, heatColors);
      } else if (metric === 'currentAdoption') {
        childColor = getColor(colorValue ?? 0, 0, 10, heatColors);
      } else {
        // 1=Competition (Red), 5=Shortage (Green). No NAV outlook => neutral (not "3" = orange).
        if (colorValue == null) {
          childColor = '#422006';
        } else {
          childColor = getColor(colorValue, 1, 5, ['#7f1d1d', '#b91c1c', '#ca8a04', '#166534', '#14532d']);
        }
      }

      g.children.push({
        name: occ.nameEnglish || occ.nameSwedish,
        value: val,
        ssyk: occ.ssyk,
        colorValue: colorValue,
        label: {
          show: true,
          position: 'insideTopLeft',
          formatter: (params: TreemapLabelParams) => {
            return `{name|${params.name}}\n{emp|${(params.value || 0).toLocaleString('en-US')} employed}`;
          },
          rich: {
            name: { color: '#f8fafc', fontWeight: 'bold', fontSize: 11, padding: [4, 0, 2, 0] },
            emp: { color: '#cbd5e1', fontSize: 9 }
          }
        },
        itemStyle: { color: childColor, borderWidth: 1, borderColor: '#0f172a', gapWidth: 0 }
      });
    });

    const seriesData = Array.from(groupMap.values());

    return {
      color: [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
        '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
      ],
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc' },
        formatter: (info: TreemapTooltipInfo) => {
          if (info.treePathInfo.length === 2) {
            // hovering on major group level
            return `<strong>${info.name}</strong><br />${(info.value || 0).toLocaleString('en-US')
              } employed`;
          }
          const occName = info.name;
          const emp = (info.value || 0).toLocaleString('en-US');
          const ssyk = info.data?.ssyk || 'N/A';
          const cv = info.data?.colorValue;
          const score =
            cv === null || cv === undefined
              ? 'N/A'
              : typeof cv === 'number'
                ? cv.toFixed(1)
                : 'N/A';
          const metricLabels: Record<string, string> = {
            theoreticalExposure: 'Exposure',
            currentAdoption: 'Adoption',
            outlook: 'Outlook'
          };
          const metricLabel = metricLabels[metric] || 'Score';
          return `<strong>${occName} (SSYK ${ssyk})</strong><br />Employed: ${emp}<br />${metricLabel}: ${score}`;
        }
      },
      series: [{
        type: 'treemap',
        data: seriesData,
        roam: true, // Allow native panning and mouse-wheel zooming!
        nodeClick: false, // Prevent drilling to match flat UI
        width: '100%',
        height: '100%',
        squareRatio: 0.5 * (1 + Math.sqrt(5)), // golden ratio
        breadcrumb: { show: false }, // No drilling, no breadcrumb needed
        label: {
          show: true,
          position: 'insideTopLeft'
        },
        upperLabel: {
          show: true,
          height: 20,
          color: '#f8fafc',
          backgroundColor: 'transparent',
          fontSize: 12,
          fontWeight: 'bold',
          formatter: '{b}'
        },
        itemStyle: {
          borderColor: '#020617',
          borderWidth: 2
        },
        levels: [
          {
            itemStyle: {
              borderColor: '#020617',
              borderWidth: 2,
              gapWidth: 1
            }
          },
          {
            itemStyle: {
              borderColor: '#0f172a',
              borderWidth: 1,
              gapWidth: 0
            }
          }
        ]
      }]
    };
  }, [data, metric]);

  const onEvents = {
    'click': (params: TreemapClickParams) => {
      if (params.data?.ssyk) {
        setSelectedSsyk(params.data.ssyk);
      }
    }
  };

  return (
    <div className="w-full h-full relative border border-slate-800 rounded-md shadow-inner bg-slate-900 overflow-hidden">
      {data.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-slate-500">
          No occupations available. Try clearing your filters or check the backend data.
        </div>
      ) : (
        <ReactECharts
          option={chartOptions}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
          onEvents={onEvents}
        />
      )}
    </div>
  );
}
