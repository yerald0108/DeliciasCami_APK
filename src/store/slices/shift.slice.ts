import { StateCreator } from 'zustand';
import { Shift, ShiftEntry, ShiftEntryType, ShiftSummary, ShiftSummaryItem, UnitOfMeasure } from '../../types';
import { getShiftRepository, getIngredientRepository } from '../../database';
import { TRANSFER_COMMISSION_RATE, FIXED_COSTS_RATE } from '../../constants';

// ─── Estado y acciones del slice de turnos ────────────────────────────────────
export interface ShiftSlice {
  currentShift:    Shift | null;
  shiftHistory:    Shift[];
  shiftSummary:    ShiftSummary | null;
  isLoadingShift:  boolean;
  shiftError:      string | null;

  loadOpenShift:    () => Promise<void>;
  loadShiftHistory: () => Promise<void>;
  openShift:        () => Promise<boolean>;
  addEntry: (input: {
    type:           ShiftEntryType;
    ingredientId:   string;
    ingredientName: string;
    quantityUsed:   number;
    unit:           UnitOfMeasure;
    costAtTime:     number;
    note?:          string;
  }) => Promise<boolean>;
  removeEntry:       (entryId: string) => Promise<boolean>;
  closeShift: (cashRevenue: number, transferRevenue: number) => Promise<boolean>;
  clearShiftSummary: () => void;
  clearShiftError:   () => void;
  deleteShift: (shiftId: string) => Promise<boolean>;
}

// ─── Implementación ───────────────────────────────────────────────────────────
export const createShiftSlice: StateCreator<ShiftSlice> = (set, get) => ({
  currentShift:   null,
  shiftHistory:   [],
  shiftSummary:   null,
  isLoadingShift: false,
  shiftError:     null,

  // ── Cargar turno abierto ──────────────────────────────────────────────────
  loadOpenShift: async () => {
    set({ isLoadingShift: true, shiftError: null });
    try {
      const repo   = getShiftRepository();
      const result = await repo.getOpenShift();
      if (result.success) {
        set({ currentShift: result.data ?? null });
      } else {
        set({ shiftError: result.error ?? 'Error al cargar turno' });
      }
    } catch (error: any) {
      set({ shiftError: error.message });
    } finally {
      set({ isLoadingShift: false });
    }
  },

  // ── Cargar historial ──────────────────────────────────────────────────────
  loadShiftHistory: async () => {
    set({ isLoadingShift: true, shiftError: null });
    try {
      const repo   = getShiftRepository();
      const result = await repo.getAll();
      if (result.success && result.data) {
        set({ shiftHistory: result.data });
      } else {
        set({ shiftError: result.error ?? 'Error al cargar historial' });
      }
    } catch (error: any) {
      set({ shiftError: error.message });
    } finally {
      set({ isLoadingShift: false });
    }
  },

  // ── Abrir turno ───────────────────────────────────────────────────────────
  openShift: async () => {
    set({ shiftError: null });
    try {
      const repo   = getShiftRepository();
      const result = await repo.openShift();
      if (result.success && result.data) {
        set({ currentShift: result.data });
        return true;
      }
      set({ shiftError: result.error ?? 'Error al abrir turno' });
      return false;
    } catch (error: any) {
      set({ shiftError: error.message });
      return false;
    }
  },

  // ── Agregar entrada y actualizar stock en tiempo real ─────────────────────
  addEntry: async (input) => {
    set({ shiftError: null });
    try {
      const shift = get().currentShift;
      if (!shift) {
        set({ shiftError: 'No hay turno abierto' });
        return false;
      }

      const shiftRepo      = getShiftRepository();
      const ingredientRepo = getIngredientRepository();

      // ── Registrar la entrada en la base de datos ──────────────────────────
      const result = await shiftRepo.addEntry(shift.id, input);

      if (!result.success || !result.data) {
        set({ shiftError: result.error ?? 'Error al agregar entrada' });
        return false;
      }

      // ── Actualizar stock en tiempo real según el tipo ─────────────────────
      let updatedIngredient = null;

      switch (input.type) {
        case 'usage':
          const usageResult = await ingredientRepo.decreaseStock(
            input.ingredientId,
            input.quantityUsed
          );
          if (usageResult.success) updatedIngredient = usageResult.data;
          break;

        case 'purchase':
          const purchaseResult = await ingredientRepo.increaseStock(
            input.ingredientId,
            input.quantityUsed
          );
          if (purchaseResult.success) updatedIngredient = purchaseResult.data;
          break;

        case 'output':
          const outputResult = await ingredientRepo.decreaseStock(
            input.ingredientId,
            input.quantityUsed
          );
          if (outputResult.success) updatedIngredient = outputResult.data;
          break;

        case 'waste':
          const wasteResult = await ingredientRepo.decreaseStock(
            input.ingredientId,
            input.quantityUsed
          );
          if (wasteResult.success) updatedIngredient = wasteResult.data;
          break;
      }

      // ── Actualizar el store de ingredientes en tiempo real ────────────────
      if (updatedIngredient) {
        set(state => ({
          currentShift: state.currentShift
            ? {
                ...state.currentShift,
                entries: [...state.currentShift.entries, result.data!],
              }
            : null,
          ingredients: (state as any).ingredients?.map((ing: any) =>
            ing.id === updatedIngredient!.id ? updatedIngredient : ing
          ) ?? (state as any).ingredients,
        }));

        const lowStockResult = await ingredientRepo.getLowStock();
        if (lowStockResult.success && lowStockResult.data) {
          set({ lowStockItems: lowStockResult.data } as any);
        }
      } else {
        set(state => ({
          currentShift: state.currentShift
            ? {
                ...state.currentShift,
                entries: [...state.currentShift.entries, result.data!],
              }
            : null,
        }));
      }

      return true;
    } catch (error: any) {
      set({ shiftError: error.message });
      return false;
    }
  },

  // ── Eliminar entrada y revertir stock ─────────────────────────────────────
  removeEntry: async (entryId) => {
    set({ shiftError: null });
    try {
      const shift = get().currentShift;
      if (!shift) return false;

      const entry = shift.entries.find(e => e.id === entryId);

      const shiftRepo      = getShiftRepository();
      const ingredientRepo = getIngredientRepository();

      const result = await shiftRepo.removeEntry(entryId);

      if (!result.success) {
        set({ shiftError: result.error ?? 'Error al eliminar entrada' });
        return false;
      }

      let updatedIngredient = null;

      if (entry) {
        switch (entry.type) {
          case 'usage':
            const revertUsage = await ingredientRepo.increaseStock(
              entry.ingredientId,
              entry.quantityUsed
            );
            if (revertUsage.success) updatedIngredient = revertUsage.data;
            break;

          case 'purchase':
            const revertPurchase = await ingredientRepo.decreaseStock(
              entry.ingredientId,
              entry.quantityUsed
            );
            if (revertPurchase.success) updatedIngredient = revertPurchase.data;
            break;

          case 'output':
            const revertOutput = await ingredientRepo.increaseStock(
              entry.ingredientId,
              entry.quantityUsed
            );
            if (revertOutput.success) updatedIngredient = revertOutput.data;
            break;

          case 'waste':
            const revertWaste = await ingredientRepo.increaseStock(
              entry.ingredientId,
              entry.quantityUsed
            );
            if (revertWaste.success) updatedIngredient = revertWaste.data;
            break;
        }
      }

      set(state => ({
        currentShift: state.currentShift
          ? {
              ...state.currentShift,
              entries: state.currentShift.entries.filter(e => e.id !== entryId),
            }
          : null,
        ...(updatedIngredient ? {
          ingredients: (state as any).ingredients?.map((ing: any) =>
            ing.id === updatedIngredient!.id ? updatedIngredient : ing
          ) ?? (state as any).ingredients,
        } : {}),
      }));

      if (updatedIngredient) {
        const lowStockResult = await ingredientRepo.getLowStock();
        if (lowStockResult.success && lowStockResult.data) {
          set({ lowStockItems: lowStockResult.data } as any);
        }
      }

      return true;
    } catch (error: any) {
      set({ shiftError: error.message });
      return false;
    }
  },

  // ── Cerrar turno ──────────────────────────────────────────────────────────
  closeShift: async (cashRevenue, transferRevenue) => {
    set({ shiftError: null });
    try {
      const shift = get().currentShift;
      if (!shift) {
        set({ shiftError: 'No hay turno abierto' });
        return false;
      }

      const shiftRepo      = getShiftRepository();
      const ingredientRepo = getIngredientRepository();

      // ── Cálculos financieros (tasas centralizadas en constants/business) ──
      const totalRevenue       = cashRevenue + transferRevenue;
      const transferCommission = transferRevenue * TRANSFER_COMMISSION_RATE;
      const fixedCosts         = totalRevenue    * FIXED_COSTS_RATE;

      // ── Consolidar insumos utilizados para el resumen ─────────────────────
      const usageMap = new Map<string, ShiftSummaryItem>();

      for (const entry of shift.entries.filter((e: ShiftEntry) => e.type === 'usage')) {
        const existing = usageMap.get(entry.ingredientId);
        if (existing) {
          existing.totalUsed += entry.quantityUsed;
          existing.totalCost += entry.totalCost;
        } else {
          usageMap.set(entry.ingredientId, {
            ingredientId:   entry.ingredientId,
            ingredientName: entry.ingredientName,
            totalUsed:      entry.quantityUsed,
            unit:           entry.unit,
            totalCost:      entry.totalCost,
            remainingStock: 0,
          });
        }
      }

      // ── Obtener stock actual de cada insumo utilizado ─────────────────────
      for (const [ingredientId, summary] of usageMap) {
        const result = await ingredientRepo.getById(ingredientId);
        if (result.success && result.data) {
          summary.remainingStock = result.data.quantity;
        }
      }

      const totalInsumos  = Array.from(usageMap.values()).reduce(
        (sum: number, item: ShiftSummaryItem) => sum + item.totalCost, 0
      );
      const totalInvested = totalInsumos + transferCommission + fixedCosts;
      const netProfit     = totalRevenue - transferCommission - fixedCosts - totalInsumos;

      // ── Cerrar en base de datos ───────────────────────────────────────────
      const closeResult = await shiftRepo.closeShift(shift.id, cashRevenue, transferRevenue);

      if (closeResult.success && closeResult.data) {
        const summary: ShiftSummary = {
          shift:              closeResult.data,
          usageSummary:       Array.from(usageMap.values()),
          purchaseEntries:    shift.entries.filter((e: ShiftEntry) => e.type === 'purchase'),
          outputEntries:      shift.entries.filter((e: ShiftEntry) => e.type === 'output'),
          wasteEntries:       shift.entries.filter((e: ShiftEntry) => e.type === 'waste'),
          totalInsumos,
          transferCommission,
          fixedCosts,
          totalInvested,
          cashRevenue,
          transferRevenue,
          totalRevenue,
          netProfit,
        };

        set({
          currentShift: null,
          shiftSummary: summary,
          shiftHistory: [closeResult.data, ...get().shiftHistory],
        });
        return true;
      }

      set({ shiftError: closeResult.error ?? 'Error al cerrar turno' });
      return false;
    } catch (error: any) {
      set({ shiftError: error.message });
      return false;
    }
  },

  // ── Eliminar turno del historial ──────────────────────────────────────────
  deleteShift: async (shiftId) => {
    set({ shiftError: null });
    try {
      const repo   = getShiftRepository();
      const result = await repo.deleteShift(shiftId);

      if (result.success) {
        set(state => ({
          shiftHistory: state.shiftHistory.filter(s => s.id !== shiftId),
        }));
        return true;
      }

      set({ shiftError: result.error ?? 'Error al eliminar turno' });
      return false;
    } catch (error: any) {
      set({ shiftError: error.message });
      return false;
    }
  },

  clearShiftSummary: () => set({ shiftSummary: null }),
  clearShiftError:   () => set({ shiftError: null }),
});