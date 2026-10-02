// ─── Paleta de colores ────────────────────────────────────────────────────────
export const Colors = {
  // Primarios
  primary:        '#C2185B',  // Rosa pastelería — identidad de Delicias'Cami
  primaryLight:   '#F8BBD9',
  primaryDark:    '#880E4F',

  // Secundarios
  secondary:      '#F9A825',  // Ámbar cálido — energía y dulzura
  secondaryLight: '#FFF9C4',
  secondaryDark:  '#F57F17',

  // Superficies
  background:     '#FFF8F9',  // Blanco rosado muy suave
  surface:        '#FFFFFF',
  surfaceAlt:     '#FFF0F5',

  // Texto
  textPrimary:    '#1A1A2E',
  textSecondary:  '#6B6B80',
  textMuted:      '#A0A0B0',
  textOnPrimary:  '#FFFFFF',

  // Semánticos
  success:        '#2E7D32',
  successLight:   '#E8F5E9',
  warning:        '#E65100',
  warningLight:   '#FFF3E0',
  error:          '#C62828',
  errorLight:     '#FFEBEE',
  info:           '#1565C0',
  infoLight:      '#E3F2FD',

  // Bordes y divisores
  border:         '#F0E0E8',
  borderStrong:   '#D4A0B8',
  divider:        '#F5E8EE',

  // Transparencias
  overlay:        'rgba(26, 26, 46, 0.5)',
  shadowColor:    '#C2185B',
} as const;

// ─── Tipografía ───────────────────────────────────────────────────────────────
export const Typography = {
  // Tamaños
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  30,
  xxxl: 36,

  // Pesos
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,

  // Altura de línea
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.75,
} as const;

// ─── Espaciado ────────────────────────────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const;

// ─── Bordes ───────────────────────────────────────────────────────────────────
export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
} as const;

// ─── Sombras ──────────────────────────────────────────────────────────────────
export const Shadows = {
  sm: {
    shadowColor:   '#C2185B',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius:  4,
    elevation:     2,
  },
  md: {
    shadowColor:   '#C2185B',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius:  8,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#C2185B',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius:  16,
    elevation:     8,
  },
} as const;

// ─── Unidades de medida ───────────────────────────────────────────────────────
export const UNIT_LABELS: Record<string, string> = {
  kg:   'Kilogramo',
  lb:   'Libra',
  g:    'Gramo',
  unit: 'Unidad',
  ml:   'Mililitro',
  l:    'Litro',
};

export const UNIT_OPTIONS = [
  { label: 'Kilogramo (kg)', value: 'kg' },
  { label: 'Libra (lb)',     value: 'lb' },
  { label: 'Gramo (g)',      value: 'g'  },
  { label: 'Unidad',        value: 'unit'},
  { label: 'Mililitro (ml)',value: 'ml' },
  { label: 'Litro (l)',     value: 'l'  },
] as const;

// ─── Umbrales de stock bajo por defecto ───────────────────────────────────────
export const DEFAULT_LOW_STOCK_THRESHOLD: Record<string, number> = {
  kg:   0.5,
  lb:   1,
  g:    100,
  unit: 2,
  ml:   100,
  l:    0.5,
};

// ─── Formato de moneda ────────────────────────────────────────────────────────
export const CURRENCY_SYMBOL = '$';

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}

export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity % 1 === 0 ? quantity.toFixed(0) : quantity.toFixed(2)} ${unit}`;
}