import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { IngredientRepository } from './repositories/ingredient.repository';
import { ShiftRepository } from './repositories/shift.repository';
import { StatsRepository } from './repositories/stats.repository';
import { DB_NAME } from './schema';

// ─── Instancia única de la base de datos (Singleton) ─────────────────────────
let dbInstance:      SQLite.SQLiteDatabase | null = null;
let ingredientRepo:  IngredientRepository  | null = null;
let shiftRepo:       ShiftRepository       | null = null;
let statsRepo:       StatsRepository       | null = null;

// ─── Inicializa la base de datos ──────────────────────────────────────────────
export async function initDatabase(): Promise<void> {
  try {
    dbInstance    = await SQLite.openDatabaseAsync(DB_NAME);
    await runMigrations(dbInstance);
    ingredientRepo = new IngredientRepository(dbInstance);
    shiftRepo      = new ShiftRepository(dbInstance);
    statsRepo      = new StatsRepository(dbInstance);
    console.log('[DB] Base de datos inicializada correctamente.');
  } catch (error) {
    console.error('[DB] Error al inicializar la base de datos:', error);
    throw error;
  }
}

// ─── Acceso a repositorios ────────────────────────────────────────────────────
export function getIngredientRepository(): IngredientRepository {
  if (!ingredientRepo) throw new Error('[DB] Base de datos no inicializada.');
  return ingredientRepo;
}

export function getShiftRepository(): ShiftRepository {
  if (!shiftRepo) throw new Error('[DB] Base de datos no inicializada.');
  return shiftRepo;
}

export function getStatsRepository(): StatsRepository {
  if (!statsRepo) throw new Error('[DB] Base de datos no inicializada.');
  return statsRepo;
}