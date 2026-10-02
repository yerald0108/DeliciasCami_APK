import * as SQLite from 'expo-sqlite';
import { Shift, ShiftEntry, ShiftEntryType, DbResult, ShiftStatus, UnitOfMeasure } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function now(): string {
  return new Date().toISOString();
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
function rowToShift(row: any, entries: ShiftEntry[] = []): Shift {
  return {
    id:            row.id,
    date:          row.date,
    status:        row.status as ShiftStatus,
    entries,
    totalRevenue:  row.total_revenue,
    totalInvested: row.total_invested,
    netProfit:     row.net_profit,
    openedAt:      row.opened_at,
    closedAt:      row.closed_at ?? null,
  };
}

function rowToShiftEntry(row: any): ShiftEntry {
  return {
    id:             row.id,
    shiftId:        row.shift_id,
    type:           (row.type ?? 'usage') as ShiftEntryType,
    ingredientId:   row.ingredient_id,
    ingredientName: row.ingredient_name,
    quantityUsed:   row.quantity_used,
    unit:           row.unit as UnitOfMeasure,
    costAtTime:     row.cost_at_time,
    totalCost:      row.total_cost,
    note:           row.note ?? undefined,
    createdAt:      row.created_at,
  };
}

// ─── Repositorio de turnos ────────────────────────────────────────────────────
export class ShiftRepository {
  constructor(private db: SQLite.SQLiteDatabase) {}

  // ─── Cargar entradas de un turno ──────────────────────────────────────────
  private async loadEntriesForShift(shiftId: string): Promise<ShiftEntry[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM shift_entries
       WHERE shift_id = ?
       ORDER BY created_at ASC;`,
      [shiftId]
    );
    return rows.map(rowToShiftEntry);
  }

  // ─── Obtener turno abierto ────────────────────────────────────────────────
  async getOpenShift(): Promise<DbResult<Shift | null>> {
    try {
      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM shifts
         WHERE status = 'open'
         ORDER BY opened_at DESC
         LIMIT 1;`
      );

      if (!row) return { success: true, data: null };

      const entries = await this.loadEntriesForShift(row.id);
      return { success: true, data: rowToShift(row, entries) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ─── Obtener todos los turnos cerrados ────────────────────────────────────
  async getAll(): Promise<DbResult<Shift[]>> {
    try {
      const rows = await this.db.getAllAsync<any>(
        `SELECT * FROM shifts
         WHERE status = 'closed'
         ORDER BY opened_at DESC;`
      );

      const shifts: Shift[] = [];
      for (const row of rows) {
        const entries = await this.loadEntriesForShift(row.id);
        shifts.push(rowToShift(row, entries));
      }

      return { success: true, data: shifts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ─── Abrir nuevo turno ────────────────────────────────────────────────────
  async openShift(): Promise<DbResult<Shift>> {
    try {
      const existing = await this.getOpenShift();
      if (existing.success && existing.data) {
        return { success: false, error: 'Ya existe un turno abierto' };
      }

      const id       = generateId();
      const openedAt = now();
      const date     = new Date().toISOString().split('T')[0];

      await this.db.runAsync(
        `INSERT INTO shifts
          (id, date, status, total_revenue, total_invested, net_profit, opened_at, closed_at)
         VALUES (?, ?, 'open', 0, 0, 0, ?, NULL);`,
        [id, date, openedAt]
      );

      return await this.getOpenShift() as DbResult<Shift>;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ─── Agregar entrada al turno ─────────────────────────────────────────────
  async addEntry(
    shiftId: string,
    input: {
      type:           ShiftEntryType;
      ingredientId:   string;
      ingredientName: string;
      quantityUsed:   number;
      unit:           UnitOfMeasure;
      costAtTime:     number;
      note?:          string;
    }
  ): Promise<DbResult<ShiftEntry>> {
    try {
      const id        = generateId();
      const createdAt = now();
      const totalCost = input.type === 'usage'
        ? input.quantityUsed * input.costAtTime
        : 0; // entradas, salidas y mermas no cuentan en el cuadre

      await this.db.runAsync(
        `INSERT INTO shift_entries
          (id, shift_id, type, ingredient_id, ingredient_name,
           quantity_used, unit, cost_at_time, total_cost, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          shiftId,
          input.type,
          input.ingredientId,
          input.ingredientName,
          input.quantityUsed,
          input.unit,
          input.costAtTime,
          totalCost,
          input.note ?? null,
          createdAt,
        ]
      );

      const row = await this.db.getFirstAsync<any>(
        `SELECT * FROM shift_entries WHERE id = ?;`,
        [id]
      );

      return { success: true, data: rowToShiftEntry(row) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ─── Eliminar entrada del turno ───────────────────────────────────────────
  async removeEntry(entryId: string): Promise<DbResult<boolean>> {
    try {
      await this.db.runAsync(
        `DELETE FROM shift_entries WHERE id = ?;`,
        [entryId]
      );
      return { success: true, data: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ─── Cerrar turno ─────────────────────────────────────────────────────────
  async closeShift(
    shiftId:      string,
    totalRevenue: number
  ): Promise<DbResult<Shift>> {
    try {
      const shiftResult = await this.getOpenShift();
      if (!shiftResult.success || !shiftResult.data) {
        return { success: false, error: 'No hay turno abierto' };
      }

      const shift = shiftResult.data;

      // Solo las entradas de tipo 'usage' cuentan como inversión
      const totalInvested = shift.entries
        .filter(e => e.type === 'usage')
        .reduce((sum, e) => sum + e.totalCost, 0);

      const netProfit = totalRevenue - totalInvested;

      await this.db.runAsync(
        `UPDATE shifts SET
          status         = 'closed',
          total_revenue  = ?,
          total_invested = ?,
          net_profit     = ?,
          closed_at      = ?
         WHERE id = ?;`,
        [totalRevenue, totalInvested, netProfit, now(), shiftId]
      );

      const row     = await this.db.getFirstAsync<any>(
        `SELECT * FROM shifts WHERE id = ?;`,
        [shiftId]
      );
      const entries = await this.loadEntriesForShift(shiftId);

      return { success: true, data: rowToShift(row, entries) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ─── Eliminar turno del historial ─────────────────────────────────────────
  async deleteShift(shiftId: string): Promise<DbResult<boolean>> {
    try {
      await this.db.runAsync(
        `DELETE FROM shifts WHERE id = ?;`,
        [shiftId]
      );
      return { success: true, data: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}