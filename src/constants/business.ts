// ─── Reglas de negocio financieras ────────────────────────────────────────────
// Fuente única de verdad para los porcentajes usados en el cuadre del turno.
//
// Cualquier cambio acá se refleja automáticamente en:
//   - CloseShiftScreen   (preview en tiempo real del cuadre)
//   - shift.slice        (armado del ShiftSummary)
//   - shift.repository   (persistencia en SQLite)
//   - types/index.ts     (documentación de campos de Shift)

/** Comisión cobrada por extracción de transferencias (15%). */
export const TRANSFER_COMMISSION_RATE = 0.15;

/** Gastos fijos sobre el total bruto del día: agua, luz, gas, etc. (5%). */
export const FIXED_COSTS_RATE = 0.05;

// ─── Valores listos para mostrar en UI (evita repetir "* 100") ────────────────
export const TRANSFER_COMMISSION_PCT = TRANSFER_COMMISSION_RATE * 100; // 15
export const FIXED_COSTS_PCT         = FIXED_COSTS_RATE         * 100; // 5