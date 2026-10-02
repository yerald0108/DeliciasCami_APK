import * as SQLite from 'expo-sqlite';
import { DbResult } from '../../types';

// ─── Tipos de estadísticas ────────────────────────────────────────────────────
export interface DailyStats {
  date:          string;
  totalRevenue:  number;
  totalInvested: number;
  netProfit:     number;
  shiftsCount:   number;
}

export interface IngredientUsageStat {
  ingredientId:   string;
  ingredientName: string;
  totalUsed:      number;
  unit:           string;
  totalCost:      number;
  timesUsed:      number;
}

export interface PeriodSummary {
  totalRevenue:  number;
  totalInvested: number;
  netProfit:     number;
  shiftsCount:   number;
  bestDay:       string | null;
  bestDayProfit: number;
}

export interface StatsData {
  periodSummary:     PeriodSummary;
  dailyStats:        DailyStats[];
  topIngredients:    IngredientUsageStat[];
}

// ─── Repositorio de estadísticas ─────────────────────────────────────────────
export class StatsRepository {
  constructor(private db: SQLite.SQLiteDatabase) {}

  // ─── Estadísticas por período ─────────────────────────────────────────────
  async getStatsByPeriod(
    startDate: string,
    endDate:   string
  ): Promise<DbResult<StatsData>> {
    try {
      // ── Resumen general del período ───────────────────────────────────────
      const summaryRow = await this.db.getFirstAsync<{
        total_revenue:  number;
        total_invested: number;
        net_profit:     number;
        shifts_count:   number;
      }>(
        `SELECT
           COALESCE(SUM(total_revenue),  0) AS total_revenue,
           COALESCE(SUM(total_invested), 0) AS total_invested,
           COALESCE(SUM(net_profit),     0) AS net_profit,
           COUNT(*)                         AS shifts_count
         FROM shifts
         WHERE status   = 'closed'
           AND date >= ?
           AND date <= ?;`,
        [startDate, endDate]
      );

      // ── Mejor día ─────────────────────────────────────────────────────────
      const bestDayRow = await this.db.getFirstAsync<{
        date:       string;
        net_profit: number;
      }>(
        `SELECT date, SUM(net_profit) AS net_profit
         FROM shifts
         WHERE status = 'closed'
           AND date >= ?
           AND date <= ?
         GROUP BY date
         ORDER BY net_profit DESC
         LIMIT 1;`,
        [startDate, endDate]
      );

      // ── Estadísticas diarias ──────────────────────────────────────────────
      const dailyRows = await this.db.getAllAsync<{
        date:          string;
        total_revenue: number;
        total_invested:number;
        net_profit:    number;
        shifts_count:  number;
      }>(
        `SELECT
           date,
           SUM(total_revenue)  AS total_revenue,
           SUM(total_invested) AS total_invested,
           SUM(net_profit)     AS net_profit,
           COUNT(*)            AS shifts_count
         FROM shifts
         WHERE status = 'closed'
           AND date >= ?
           AND date <= ?
         GROUP BY date
         ORDER BY date ASC;`,
        [startDate, endDate]
      );

      // ── Top insumos más usados ────────────────────────────────────────────
      const ingredientRows = await this.db.getAllAsync<{
        ingredient_id:   string;
        ingredient_name: string;
        total_used:      number;
        unit:            string;
        total_cost:      number;
        times_used:      number;
      }>(
        `SELECT
           se.ingredient_id,
           se.ingredient_name,
           SUM(se.quantity_used) AS total_used,
           se.unit,
           SUM(se.total_cost)    AS total_cost,
           COUNT(*)              AS times_used
         FROM shift_entries se
         INNER JOIN shifts s ON se.shift_id = s.id
         WHERE s.status = 'closed'
           AND s.date >= ?
           AND s.date <= ?
           AND se.type = 'usage'
         GROUP BY se.ingredient_id, se.ingredient_name, se.unit
         ORDER BY total_used DESC
         LIMIT 8;`,
        [startDate, endDate]
      );

      const periodSummary: PeriodSummary = {
        totalRevenue:  summaryRow?.total_revenue  ?? 0,
        totalInvested: summaryRow?.total_invested ?? 0,
        netProfit:     summaryRow?.net_profit     ?? 0,
        shiftsCount:   summaryRow?.shifts_count   ?? 0,
        bestDay:       bestDayRow?.date            ?? null,
        bestDayProfit: bestDayRow?.net_profit      ?? 0,
      };

      const dailyStats: DailyStats[] = dailyRows.map(row => ({
        date:          row.date,
        totalRevenue:  row.total_revenue,
        totalInvested: row.total_invested,
        netProfit:     row.net_profit,
        shiftsCount:   row.shifts_count,
      }));

      const topIngredients: IngredientUsageStat[] = ingredientRows.map(row => ({
        ingredientId:   row.ingredient_id,
        ingredientName: row.ingredient_name,
        totalUsed:      row.total_used,
        unit:           row.unit,
        totalCost:      row.total_cost,
        timesUsed:      row.times_used,
      }));

      return {
        success: true,
        data: { periodSummary, dailyStats, topIngredients },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}