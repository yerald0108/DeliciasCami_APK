// ─── Unidades de medida ───────────────────────────────────────────────────────
export type UnitOfMeasure = 'kg' | 'lb' | 'g' | 'unit' | 'ml' | 'l';

// ─── Insumo / Ingrediente ─────────────────────────────────────────────────────
export interface Ingredient {
  id:                string;
  name:              string;
  quantity:          number;
  unit:              UnitOfMeasure;
  costPerUnit:       number;
  totalCost:         number;
  lowStockThreshold: number;
  createdAt:         string;
  updatedAt:         string;
}

// ─── Tipos de movimiento en un turno ─────────────────────────────────────────
export type ShiftEntryType = 'usage' | 'purchase' | 'output' | 'waste';

// ─── Entrada de movimiento en un turno ───────────────────────────────────────
export interface ShiftEntry {
  id:             string;
  shiftId:        string;
  type:           ShiftEntryType;
  ingredientId:   string;
  ingredientName: string;
  quantityUsed:   number;
  unit:           UnitOfMeasure;
  costAtTime:     number;
  totalCost:      number;
  note?:          string;
  createdAt:      string;
}

// ─── Turno de trabajo ─────────────────────────────────────────────────────────
export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  id:                  string;
  date:                string;
  status:              ShiftStatus;
  entries:             ShiftEntry[];
  totalRevenue:        number;   // efectivo + transferencia (bruto)
  cashRevenue:         number;   // dinero recibido en efectivo
  transferRevenue:     number;   // dinero recibido en transferencia
  transferCommission:  number;   // TRANSFER_COMMISSION_RATE (15%) de transferRevenue
  fixedCosts:          number;   // FIXED_COSTS_RATE (5%) del total bruto
  totalInvested:       number;   // insumos + commission + fixedCosts
  netProfit:           number;   // ganancia real
  openedAt:            string;
  closedAt:            string | null;
}

// ─── Resumen del cuadre de turno ─────────────────────────────────────────────
export interface ShiftSummaryItem {
  ingredientId:   string;
  ingredientName: string;
  totalUsed:      number;
  unit:           UnitOfMeasure;
  totalCost:      number;
  remainingStock: number;
}

export interface ShiftSummary {
  shift:              Shift;
  usageSummary:       ShiftSummaryItem[];
  purchaseEntries:    ShiftEntry[];
  outputEntries:      ShiftEntry[];
  wasteEntries:       ShiftEntry[];
  totalInsumos:       number;
  transferCommission: number;
  fixedCosts:         number;
  totalInvested:      number;
  cashRevenue:        number;
  transferRevenue:    number;
  totalRevenue:       number;
  netProfit:          number;
}

// ─── Respuesta genérica de base de datos ─────────────────────────────────────
export interface DbResult<T> {
  success: boolean;
  data?:   T;
  error?:  string;
}