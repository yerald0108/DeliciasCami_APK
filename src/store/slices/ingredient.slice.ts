import { StateCreator } from 'zustand';
import { Ingredient } from '../../types';
import { getIngredientRepository } from '../../database';

// ─── Estado y acciones del slice de ingredientes ──────────────────────────────
export interface IngredientSlice {
  // Estado
  ingredients:          Ingredient[];
  lowStockItems:        Ingredient[];
  isLoadingIngredients: boolean;
  ingredientError:      string | null;

  // Acciones
  loadIngredients:   () => Promise<void>;
  createIngredient:  (input: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateIngredient:  (id: string, input: Partial<Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>;
  deleteIngredient:  (id: string) => Promise<boolean>;
  checkLowStock:     () => Promise<void>;
  clearIngredientError: () => void;

  // ── Acciones cruzadas (consumidas por otros slices) ───────────────────────
  // ──  No usar directamente desde componentes UI. Son para uso entre slices.
  updateIngredientInStore: (updated: Ingredient) => void;
}

// ─── Implementación del slice ─────────────────────────────────────────────────
export const createIngredientSlice: StateCreator<IngredientSlice> = (set, get) => ({
  ingredients:          [],
  lowStockItems:        [],
  isLoadingIngredients: false,
  ingredientError:      null,

  // ── Cargar todos los ingredientes ─────────────────────────────────────────
  loadIngredients: async () => {
    set({ isLoadingIngredients: true, ingredientError: null });
    try {
      const repo   = getIngredientRepository();
      const result = await repo.getAll();

      if (result.success && result.data) {
        set({ ingredients: result.data });
        await get().checkLowStock();
      } else {
        set({ ingredientError: result.error ?? 'Error al cargar ingredientes' });
      }
    } catch (error: any) {
      set({ ingredientError: error.message });
    } finally {
      set({ isLoadingIngredients: false });
    }
  },

  // ── Crear ingrediente ─────────────────────────────────────────────────────
  createIngredient: async (input) => {
    set({ ingredientError: null });
    try {
      const repo   = getIngredientRepository();
      const result = await repo.create(input);

      if (result.success && result.data) {
        set(state => ({
          ingredients: [...state.ingredients, result.data!]
            .sort((a, b) => a.name.localeCompare(b.name)),
        }));
        await get().checkLowStock();
        return true;
      }

      set({ ingredientError: result.error ?? 'Error al crear ingrediente' });
      return false;
    } catch (error: any) {
      set({ ingredientError: error.message });
      return false;
    }
  },

  // ── Actualizar ingrediente ────────────────────────────────────────────────
  updateIngredient: async (id, input) => {
    set({ ingredientError: null });
    try {
      const repo   = getIngredientRepository();
      const result = await repo.update(id, input);

      if (result.success && result.data) {
        set(state => ({
          ingredients: state.ingredients.map(ing =>
            ing.id === id ? result.data! : ing
          ),
        }));
        await get().checkLowStock();
        return true;
      }

      set({ ingredientError: result.error ?? 'Error al actualizar ingrediente' });
      return false;
    } catch (error: any) {
      set({ ingredientError: error.message });
      return false;
    }
  },

  // ── Eliminar ingrediente ──────────────────────────────────────────────────
  deleteIngredient: async (id) => {
    set({ ingredientError: null });
    try {
      const repo   = getIngredientRepository();
      const result = await repo.delete(id);

      if (result.success) {
        set(state => ({
          ingredients:   state.ingredients.filter(ing => ing.id !== id),
          lowStockItems: state.lowStockItems.filter(ing => ing.id !== id),
        }));
        return true;
      }

      set({ ingredientError: result.error ?? 'Error al eliminar ingrediente' });
      return false;
    } catch (error: any) {
      set({ ingredientError: error.message });
      return false;
    }
  },

  // ── Verificar stock bajo ──────────────────────────────────────────────────
  checkLowStock: async () => {
    try {
      const repo   = getIngredientRepository();
      const result = await repo.getLowStock();

      if (result.success && result.data) {
        set({ lowStockItems: result.data });
      }
    } catch (error: any) {
      console.warn('[Store] Error al verificar stock bajo:', error.message);
    }
  },

  // ── Limpiar error ─────────────────────────────────────────────────────────
  clearIngredientError: () => set({ ingredientError: null }),

  // ── Actualizar un ingrediente en el store (uso cruzado) ───────────────────
  // Reemplaza el ingrediente por su versión actualizada, sin tocar el repo.
  // Pensado para que shift.slice lo llame después de modificar el stock.
  updateIngredientInStore: (updated) => {
    set(state => ({
      ingredients: state.ingredients.map(ing =>
        ing.id === updated.id ? updated : ing
      ),
    }));
  },
});