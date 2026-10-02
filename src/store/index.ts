import { create } from 'zustand';
import { IngredientSlice, createIngredientSlice } from './slices/ingredient.slice';
import { ShiftSlice, createShiftSlice } from './slices/shift.slice';

// ─── Tipo del store combinado ─────────────────────────────────────────────────
export type AppStore = IngredientSlice & ShiftSlice;

// ─── Store global único ───────────────────────────────────────────────────────
export const useAppStore = create<AppStore>()((...args) => ({
  ...createIngredientSlice(...args),
  ...createShiftSlice(...args),
}));

// ─── Selectores de ingredientes ───────────────────────────────────────────────
export const useIngredients = () =>
  useAppStore(state => state.ingredients);

export const useLowStockItems = () =>
  useAppStore(state => state.lowStockItems);

export const useIsLoadingIngredients = () =>
  useAppStore(state => state.isLoadingIngredients);

export const useIngredientError = () =>
  useAppStore(state => state.ingredientError);

// ─── Acciones de ingredientes ─────────────────────────────────────────────────
export const useIngredientActions = () => {
  const loadIngredients      = useAppStore(state => state.loadIngredients);
  const createIngredient     = useAppStore(state => state.createIngredient);
  const updateIngredient     = useAppStore(state => state.updateIngredient);
  const deleteIngredient     = useAppStore(state => state.deleteIngredient);
  const checkLowStock        = useAppStore(state => state.checkLowStock);
  const clearIngredientError = useAppStore(state => state.clearIngredientError);

  return {
    loadIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    checkLowStock,
    clearIngredientError,
  };
};

// ─── Selectores de turno ──────────────────────────────────────────────────────
export const useCurrentShift = () =>
  useAppStore(state => state.currentShift);

export const useShiftSummary = () =>
  useAppStore(state => state.shiftSummary);

export const useShiftHistory = () =>
  useAppStore(state => state.shiftHistory);

export const useIsLoadingShift = () =>
  useAppStore(state => state.isLoadingShift);

export const useShiftError = () =>
  useAppStore(state => state.shiftError);

// ─── Acciones de turno ────────────────────────────────────────────────────────
export const useShiftActions = () => {
  const loadOpenShift     = useAppStore(state => state.loadOpenShift);
  const loadShiftHistory  = useAppStore(state => state.loadShiftHistory);
  const openShift         = useAppStore(state => state.openShift);
  const addEntry          = useAppStore(state => state.addEntry);
  const removeEntry       = useAppStore(state => state.removeEntry);
  const closeShift        = useAppStore(state => state.closeShift);
  const clearShiftSummary = useAppStore(state => state.clearShiftSummary);
  const clearShiftError   = useAppStore(state => state.clearShiftError);
  const deleteShift       = useAppStore(state => state.deleteShift);

  return {
    loadOpenShift,
    loadShiftHistory,
    openShift,
    addEntry,
    removeEntry,
    closeShift,
    clearShiftSummary,
    clearShiftError,
    deleteShift,
  };
};