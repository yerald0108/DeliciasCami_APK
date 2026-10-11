import type { Ingredient, Shift, ShiftSummary } from '../types';

// ─── Estado compartido entre slices ───────────────────────────────────────────
// Cada slice declara acá SOLO lo que necesita ver de otros slices.
// Evita imports circulares y mantiene el tipado estricto sin `as any`.

/** Lo que shift.slice necesita ver del ingredient.slice. */
export interface IngredientSliceState {
  ingredients:   Ingredient[];
  lowStockItems: Ingredient[];
}

/** Lo que stats.slice necesita ver del shift.slice. */
export interface ShiftSliceState {
  currentShift:  Shift | null;
  shiftHistory:  Shift[];
  shiftSummary:  ShiftSummary | null;
}