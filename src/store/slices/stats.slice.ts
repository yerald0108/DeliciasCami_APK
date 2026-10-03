import { StateCreator } from 'zustand';
import { getStatsRepository } from '../../database';
import { StatsData } from '../../database/repositories/stats.repository';

// ─── Tipos de período ─────────────────────────────────────────────────────────
export type StatsPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  startDate: string;
  endDate:   string;
}

// ─── Helpers de fecha ─────────────────────────────────────────────────────────
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getRangeForPeriod(period: StatsPeriod, custom?: DateRange): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      return {
        startDate: toDateString(today),
        endDate:   toDateString(today),
      };

    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return {
        startDate: toDateString(start),
        endDate:   toDateString(today),
      };
    }

    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: toDateString(start),
        endDate:   toDateString(today),
      };
    }

    case 'year': {
      const start = new Date(today.getFullYear(), 0, 1);
      return {
        startDate: toDateString(start),
        endDate:   toDateString(today),
      };
    }

    case 'custom':
      return custom ?? {
        startDate: toDateString(today),
        endDate:   toDateString(today),
      };
  }
}

// ─── Estado y acciones ────────────────────────────────────────────────────────
export interface StatsSlice {
  // Estado
  statsData:      StatsData | null;
  statsPeriod:    StatsPeriod;
  customRange:    DateRange | null;
  isLoadingStats: boolean;
  statsError:     string | null;

  // Acciones
  loadStats:        (period: StatsPeriod, custom?: DateRange) => Promise<void>;
  setStatsPeriod:   (period: StatsPeriod) => void;
  setCustomRange:   (range: DateRange) => void;
  clearStatsError:  () => void;
}

// ─── Implementación ───────────────────────────────────────────────────────────
export const createStatsSlice: StateCreator<StatsSlice> = (set, get) => ({
  statsData:      null,
  statsPeriod:    'today',
  customRange:    null,
  isLoadingStats: false,
  statsError:     null,

  // ── Cargar estadísticas ───────────────────────────────────────────────────
  loadStats: async (period, custom) => {
    set({ isLoadingStats: true, statsError: null });
    try {
      const range  = getRangeForPeriod(period, custom);
      const repo   = getStatsRepository();
      const result = await repo.getStatsByPeriod(range.startDate, range.endDate);

      if (result.success && result.data) {
        set({
          statsData:   result.data,
          statsPeriod: period,
          customRange: period === 'custom' ? (custom ?? null) : null,
        });
      } else {
        set({ statsError: result.error ?? 'Error al cargar estadísticas' });
      }
    } catch (error: any) {
      set({ statsError: error.message });
    } finally {
      set({ isLoadingStats: false });
    }
  },

  // ── Cambiar período ───────────────────────────────────────────────────────
  setStatsPeriod: (period) => {
    set({ statsPeriod: period });
    get().loadStats(period, get().customRange ?? undefined);
  },

  // ── Rango personalizado ───────────────────────────────────────────────────
  setCustomRange: (range) => {
    set({ customRange: range });
    get().loadStats('custom', range);
  },

  // ── Limpiar error ─────────────────────────────────────────────────────────
  clearStatsError: () => set({ statsError: null }),
});