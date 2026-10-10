// ─── Versión actual del esquema ───────────────────────────────────────────────
export const DB_VERSION = 4;
export const DB_NAME    = 'delicias_cami.db';

// ─── Sentencias SQL de creación de tablas ─────────────────────────────────────
export const CREATE_TABLES_SQL = `

  CREATE TABLE IF NOT EXISTS ingredients (
    id                  TEXT PRIMARY KEY NOT NULL,
    name                TEXT NOT NULL,
    quantity            REAL NOT NULL DEFAULT 0,
    unit                TEXT NOT NULL,
    cost_per_unit       REAL NOT NULL DEFAULT 0,
    total_cost          REAL NOT NULL DEFAULT 0,
    low_stock_threshold REAL NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id                   TEXT PRIMARY KEY NOT NULL,
    date                 TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'open',
    total_revenue        REAL NOT NULL DEFAULT 0,
    cash_revenue         REAL NOT NULL DEFAULT 0,
    transfer_revenue     REAL NOT NULL DEFAULT 0,
    transfer_commission  REAL NOT NULL DEFAULT 0,
    fixed_costs          REAL NOT NULL DEFAULT 0,
    total_invested       REAL NOT NULL DEFAULT 0,
    net_profit           REAL NOT NULL DEFAULT 0,
    opened_at            TEXT NOT NULL,
    closed_at            TEXT
  );

  CREATE TABLE IF NOT EXISTS shift_entries (
    id              TEXT PRIMARY KEY NOT NULL,
    shift_id        TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'usage',
    ingredient_id   TEXT NOT NULL,
    ingredient_name TEXT NOT NULL,
    quantity_used   REAL NOT NULL,
    unit            TEXT NOT NULL,
    cost_at_time    REAL NOT NULL DEFAULT 0,
    total_cost      REAL NOT NULL DEFAULT 0,
    note            TEXT,
    created_at      TEXT NOT NULL,
    FOREIGN KEY (shift_id)      REFERENCES shifts(id)      ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
  );

`;

// ─── Índices ──────────────────────────────────────────────────────────────────
export const CREATE_INDEXES_SQL = `

  CREATE INDEX IF NOT EXISTS idx_shifts_status
    ON shifts(status);

  CREATE INDEX IF NOT EXISTS idx_shifts_date
    ON shifts(date);

  CREATE INDEX IF NOT EXISTS idx_shift_entries_shift_id
    ON shift_entries(shift_id);

  CREATE INDEX IF NOT EXISTS idx_shift_entries_ingredient_id
    ON shift_entries(ingredient_id);

  CREATE INDEX IF NOT EXISTS idx_shift_entries_type
    ON shift_entries(type);

`;

// ─── Migración v2 ─────────────────────────────────────────────────────────────
export const MIGRATION_V2_SQL = `

  DROP TABLE IF EXISTS dessert_ingredients;
  DROP TABLE IF EXISTS desserts;

  CREATE TABLE IF NOT EXISTS shift_entries (
    id              TEXT PRIMARY KEY NOT NULL,
    shift_id        TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'usage',
    ingredient_id   TEXT NOT NULL,
    ingredient_name TEXT NOT NULL,
    quantity_used   REAL NOT NULL,
    unit            TEXT NOT NULL,
    cost_at_time    REAL NOT NULL DEFAULT 0,
    total_cost      REAL NOT NULL DEFAULT 0,
    note            TEXT,
    created_at      TEXT NOT NULL,
    FOREIGN KEY (shift_id)      REFERENCES shifts(id)      ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_shift_entries_shift_id
    ON shift_entries(shift_id);

  CREATE INDEX IF NOT EXISTS idx_shift_entries_ingredient_id
    ON shift_entries(ingredient_id);

`;

// ─── Migración v3: agregar columna type y note a shift_entries ────────────────
export const MIGRATION_V3_SQL = `

  ALTER TABLE shift_entries ADD COLUMN type TEXT NOT NULL DEFAULT 'usage';
  ALTER TABLE shift_entries ADD COLUMN note TEXT;

  CREATE INDEX IF NOT EXISTS idx_shift_entries_type
    ON shift_entries(type);

`;

export const MIGRATION_V4_SQL = `
  ALTER TABLE shifts ADD COLUMN cash_revenue        REAL NOT NULL DEFAULT 0;
  ALTER TABLE shifts ADD COLUMN transfer_revenue    REAL NOT NULL DEFAULT 0;
  ALTER TABLE shifts ADD COLUMN transfer_commission REAL NOT NULL DEFAULT 0;
  ALTER TABLE shifts ADD COLUMN fixed_costs         REAL NOT NULL DEFAULT 0;
`;