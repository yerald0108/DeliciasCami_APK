import type { Ingredient, Shift, ShiftSummary } from '../types';

// ─── Estado compartido entre slices ───────────────────────────────────────────
// Cada slice declara acá SOLO lo que necesita ver de otros slices.
// Evita imports circulares y mantiene el tipado estricto sin `as any`.

/** Lo que shift.slice necesita ver del ingredient.slice. */
export interface IngredientSliceState {
  // ── Estado ────────────────────────────────────────────────────────────
  ingredients:   Ingredient[];
  lowStockItems: Ingredient[];

  // ── Acciones consumidas por otros slices ──────────────────────────────
  updateIngredientInStore: (updated: Ingredient) => void;
  checkLowStock:           () => Promise<void>;
}

/** Lo que stats.slice necesita ver del shift.slice. */
export interface ShiftSliceState {
  currentShift:  Shift | null;
  shiftHistory:  Shift[];
  shiftSummary:  ShiftSummary | null;
}