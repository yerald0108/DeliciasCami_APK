import * as SQLite from 'expo-sqlite';
import { Ingredient, DbResult, UnitOfMeasure } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function now(): string {
  return new Date().toISOString();
}

// ─── Mapea fila de SQLite a tipo Ingredient ───────────────────────────────────
function rowToIngredient(row: any): Ingredient {
  return {
    id:                 row.id,
    name:               row.name,
    quantity:           row.quantity,
    unit:               row.unit as UnitOfMeasure,
    costPerUnit:        row.cost_per_unit,
    totalCost:          row.total_cost,
    lowStockThreshold:  row.low_stock_threshold,
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
  };
}

// ─── Repositorio de ingredientes ──────────────────────────────────────────────
export class IngredientRepository {
  constructor(private db: SQLite.SQLiteDatabase) {}

  // ── Obtener todos los ingredientes ─────────────────────────────────────────
  async getAll(): Promise<DbResult<Ingredient[]>> {
    try {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM ingredients ORDER BY name ASC;`
      );
      return { success: true, data: rows.map(rowToIngredient) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Obtener un ingrediente por ID ──────────────────────────────────────────
  async getById(id: string): Promise<DbResult<Ingredient>> {
    try {
      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM ingredients WHERE id = ?;`,
        [id]
      );
      if (!row) return { success: false, error: 'Ingrediente no encontrado' };
      return { success: true, data: rowToIngredient(row) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Crear ingrediente ──────────────────────────────────────────────────────
  async create(
    input: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DbResult<Ingredient>> {
    try {
      const id        = generateId();
      const createdAt = now();
      const updatedAt = createdAt;

      await this.db.runAsync(
        `INSERT INTO ingredients
          (id, name, quantity, unit, cost_per_unit, total_cost, low_stock_threshold, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          input.name,
          input.quantity,
          input.unit,
          input.costPerUnit,
          input.totalCost,
          input.lowStockThreshold,
          createdAt,
          updatedAt,
        ]
      );

      return await this.getById(id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Actualizar ingrediente ─────────────────────────────────────────────────
  async update(
    id: string,
    input: Partial<Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<DbResult<Ingredient>> {
    try {
      const existing = await this.getById(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Ingrediente no encontrado' };
      }

      const merged = { ...existing.data, ...input };

      await this.db.runAsync(
        `UPDATE ingredients SET
          name                = ?,
          quantity            = ?,
          unit                = ?,
          cost_per_unit       = ?,
          total_cost          = ?,
          low_stock_threshold = ?,
          updated_at          = ?
         WHERE id = ?;`,
        [
          merged.name,
          merged.quantity,
          merged.unit,
          merged.costPerUnit,
          merged.totalCost,
          merged.lowStockThreshold,
          now(),
          id,
        ]
      );

      return await this.getById(id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Descontar stock al cerrar turno ───────────────────────────────────────
  async decreaseStock(
    id: string,
    amount: number
  ): Promise<DbResult<Ingredient>> {
    try {
      await this.db.runAsync(
        `UPDATE ingredients
         SET quantity   = MAX(0, quantity - ?),
             updated_at = ?
         WHERE id = ?;`,
        [amount, now(), id]
      );
      return await this.getById(id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

    // ── Aumentar stock al registrar una compra ────────────────────────────────
    async increaseStock(
      id:     string,
      amount: number
    ): Promise<DbResult<Ingredient>> {
      try {
        await this.db.runAsync(
          `UPDATE ingredients
          SET quantity   = quantity + ?,
              updated_at = ?
          WHERE id = ?;`,
          [amount, now(), id]
        );
        return await this.getById(id);
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }

  // ── Eliminar ingrediente ───────────────────────────────────────────────────
  async delete(id: string): Promise<DbResult<boolean>> {
    try {
      // Verificar si el insumo fue usado en algún turno
      const usageCheck = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM shift_entries WHERE ingredient_id = ?;`,
        [id]
      );

      if (usageCheck && usageCheck.count > 0) {
        return {
          success: false,
          error:   'Este insumo fue usado en uno o más turnos y no puede eliminarse.',
        };
      }

      await this.db.runAsync(
        `DELETE FROM ingredients WHERE id = ?;`,
        [id]
      );

      return { success: true, data: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Obtener ingredientes con stock bajo ────────────────────────────────────
  async getLowStock(): Promise<DbResult<Ingredient[]>> {
    try {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM ingredients
         WHERE quantity <= low_stock_threshold
         ORDER BY quantity ASC;`
      );
      return { success: true, data: rows.map(rowToIngredient) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}