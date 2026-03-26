import { create } from 'zustand';

export type MetricType = 'theoreticalExposure' | 'currentAdoption' | 'outlook' | 'educationLevel';
export type SectorType = 'all' | 'public' | 'private' | 'mixed';
export type ViewType = 'treemap' | 'scatter';

interface AppState {
  metric: MetricType;
  setMetric: (metric: MetricType) => void;
  
  view: ViewType;
  setView: (view: ViewType) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  selectedSsyk: string | null;
  setSelectedSsyk: (ssyk: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  metric: 'theoreticalExposure',
  setMetric: (metric) => set({ metric }),

  view: 'treemap',
  setView: (view) => set({ view }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  selectedSsyk: null,
  setSelectedSsyk: (ssyk) => set({ selectedSsyk: ssyk }),
}));
