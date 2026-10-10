import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL, MIGRATION_V2_SQL, MIGRATION_V3_SQL, MIGRATION_V4_SQL, DB_VERSION } from './schema';

// ─── Inicializa la base de datos y ejecuta migraciones ───────────────────────
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`PRAGMA foreign_keys = ON;`);

    const result = await db.getFirstAsync<{ user_version: number }>(
      `PRAGMA user_version;`
    );

    const currentVersion = result?.user_version ?? 0;
    console.log(`[DB] Versión actual: ${currentVersion}, requerida: ${DB_VERSION}`);

    if (currentVersion === 0) {
      await applyMigration_v1(db);
      await db.execAsync(`PRAGMA user_version = 1;`);
    }

    if (currentVersion < 2) {
      await applyMigration_v2(db);
      await db.execAsync(`PRAGMA user_version = 2;`);
    }

    if (currentVersion < 3) {
      await applyMigration_v3(db);
      await db.execAsync(`PRAGMA user_version = 3;`);
    }

    if (currentVersion < 4) {
      await db.execAsync(MIGRATION_V4_SQL);
      await db.execAsync(`PRAGMA user_version = 4;`);
    }

  } catch (error) {
    console.error('[DB] Error en migraciones:', error);
    throw error;
  }
}

// ─── Migración v1: creación inicial ──────────────────────────────────────────
async function applyMigration_v1(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Aplicando migración v1...');

  const statements = CREATE_TABLES_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await db.execAsync(statement + ';');
  }

  const indexStatements = CREATE_INDEXES_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of indexStatements) {
    await db.execAsync(statement + ';');
  }

  console.log('[DB] Migración v1 completada.');
}

// ─── Migración v2: reemplazar postres por entradas ───────────────────────────
async function applyMigration_v2(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Aplicando migración v2...');

  const statements = MIGRATION_V2_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await db.execAsync(statement + ';');
  }

  console.log('[DB] Migración v2 completada.');
}

// ─── Migración v3: agregar type y note a shift_entries ───────────────────────
async function applyMigration_v3(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Aplicando migración v3...');

  // Verificar si la columna type ya existe para evitar error en DB nueva
  const tableInfo = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(shift_entries);`
  );

  const columnNames = tableInfo.map(col => col.name);

  if (!columnNames.includes('type')) {
    await db.execAsync(
      `ALTER TABLE shift_entries ADD COLUMN type TEXT NOT NULL DEFAULT 'usage';`
    );
  }

  if (!columnNames.includes('note')) {
    await db.execAsync(
      `ALTER TABLE shift_entries ADD COLUMN note TEXT;`
    );
  }

  // Crear índice si no existe
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_shift_entries_type
      ON shift_entries(type);
  `);

  console.log('[DB] Migración v3 completada.');
}