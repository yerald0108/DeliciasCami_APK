import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  formatCurrency,
  formatQuantity,
  TRANSFER_COMMISSION_PCT,
  FIXED_COSTS_PCT,
} from '../../constants';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Shift } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ShiftHistoryDetailScreenProps {
  shift:  Shift;
  onBack: () => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const MAX_VISIBLE_INGREDIENTS = 5;
const LOW_MARGIN_THRESHOLD    = 30; // % mínimo de margen "saludable"

// ─── Componente ───────────────────────────────────────────────────────────────
export const ShiftHistoryDetailScreen: React.FC<ShiftHistoryDetailScreenProps> = ({
  shift,
  onBack,
}) => {
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  const isProfit = shift.netProfit >= 0;

  // ── Fechas y duración ─────────────────────────────────────────────────────
  const shiftDate = new Date(shift.openedAt).toLocaleDateString('es-ES', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });

  const openedTime = new Date(shift.openedAt).toLocaleTimeString('es-ES', {
    hour:   '2-digit',
    minute: '2-digit',
  });

  const closedTime = shift.closedAt
    ? new Date(shift.closedAt).toLocaleTimeString('es-ES', {
        hour:   '2-digit',
        minute: '2-digit',
      })
    : '--';

  const duration = (() => {
    if (!shift.closedAt) return null;
    const ms = new Date(shift.closedAt).getTime() - new Date(shift.openedAt).getTime();
    const hours   = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  })();

  // ── Margen de ganancia ────────────────────────────────────────────────────
  const marginPct = shift.totalRevenue > 0
    ? (shift.netProfit / shift.totalRevenue) * 100
    : 0;

  const marginVariant: 'success' | 'warning' | 'error' =
    marginPct >= LOW_MARGIN_THRESHOLD ? 'success'
    : marginPct >= 0                   ? 'warning'
    :                                    'error';

  const marginLabel =
    marginVariant === 'success' ? 'Saludable'
    : marginVariant === 'warning' ? 'Margen bajo'
    : 'Pérdida';

  const marginIcon =
    marginVariant === 'success' ? 'check-circle'
    : marginVariant === 'warning' ? 'alert-circle'
    : 'x-circle';

  const marginColor =
    marginVariant === 'success' ? Colors.success
    : marginVariant === 'warning' ? Colors.warning
    : Colors.error;

  // ── Consolidar insumos usados desde las entradas ──────────────────────────
  const usageMap = new Map<string, {
    ingredientId: string;
    name:         string;
    totalUsed:    number;
    unit:         string;
    totalCost:    number;
  }>();

  for (const entry of shift.entries) {
    if (entry.type !== 'usage') continue;

    const existing = usageMap.get(entry.ingredientId);
    if (existing) {
      existing.totalUsed += entry.quantityUsed;
      existing.totalCost += entry.totalCost;
    } else {
      usageMap.set(entry.ingredientId, {
        ingredientId: entry.ingredientId,
        name:         entry.ingredientName,
        totalUsed:    entry.quantityUsed,
        unit:         entry.unit,
        totalCost:    entry.totalCost,
      });
    }
  }

  // Ordenar por costo descendente (los más caros primero)
  const usageSummary = Array.from(usageMap.values()).sort(
    (a, b) => b.totalCost - a.totalCost
  );

  const visibleUsage = showAllIngredients
    ? usageSummary
    : usageSummary.slice(0, MAX_VISIBLE_INGREDIENTS);

  const hiddenCount = usageSummary.length - MAX_VISIBLE_INGREDIENTS;

  // Total de insumos calculado desde las entradas
  const totalInsumos = usageSummary.reduce((s, i) => s + i.totalCost, 0);

  // ── Contadores de movimientos ─────────────────────────────────────────────
  const usageCount    = shift.entries.filter(e => e.type === 'usage').length;
  const purchaseCount = shift.entries.filter(e => e.type === 'purchase').length;
  const outputCount   = shift.entries.filter(e => e.type === 'output').length;
  const wasteCount    = shift.entries.filter(e => e.type === 'waste').length;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Detalle del turno"
        subtitle={shiftDate}
        leftAction={{
          icon:    <Feather name="arrow-left" size={20} color={Colors.textPrimary} />,
          onPress: onBack,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 1: GANANCIA NETA (destacado)
        ══════════════════════════════════════════════════════════════════ */}
        <Card
          variant="elevated"
          style={[
            styles.profitCard,
            isProfit ? styles.profitCardSuccess : styles.profitCardLoss,
          ]}
        >
          <View style={styles.profitHeader}>
            <Feather
              name={isProfit ? 'trending-up' : 'trending-down'}
              size={20}
              color={marginColor}
            />
            <Text style={styles.profitHeaderLabel}>
              {isProfit ? 'Ganancia neta' : 'Pérdida neta'}
            </Text>
            <View style={styles.badgeWithIcon}>
              <Feather
                name={marginIcon as any}
                size={14}
                color={marginColor}
              />
              <Badge
                label={marginLabel}
                variant={marginVariant}
                size="sm"
              />
            </View>
          </View>

          <Text style={[styles.profitAmount, { color: marginColor }]}>
            {isProfit ? '' : '− '}{formatCurrency(Math.abs(shift.netProfit))}
          </Text>

          {shift.totalRevenue > 0 && (
            <View style={styles.marginBarWrapper}>
              <View style={styles.marginBarTrack}>
                <View
                  style={[
                    styles.marginBarFill,
                    {
                      width:           `${Math.min(Math.max(marginPct, 0), 100)}%`,
                      backgroundColor: marginColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.marginBarLabel, { color: marginColor }]}>
                {marginPct.toFixed(1)}% sobre lo recaudado
              </Text>
            </View>
          )}

          <View style={styles.durationRow}>
            <Feather name="clock" size={12} color={Colors.textMuted} />
            <Text style={styles.durationText}>
              {openedTime} — {closedTime}
              {duration ? `  ·  ${duration}` : ''}
            </Text>
          </View>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 2: DINERO RECAUDADO
        ══════════════════════════════════════════════════════════════════ */}
        <Card variant="outlined" style={styles.blockCard}>
          <View style={styles.blockHeader}>
            <View style={[styles.blockIcon, { backgroundColor: Colors.successLight }]}>
              <Feather name="dollar-sign" size={14} color={Colors.success} />
            </View>
            <Text style={[styles.blockTitle, { color: Colors.success }]}>
              Dinero recaudado
            </Text>
            <Text style={styles.blockTotal}>{formatCurrency(shift.totalRevenue)}</Text>
          </View>

          <View style={styles.subItem}>
            <View style={styles.subItemLeft}>
              <Text style={styles.bullet}>├─</Text>
              <Text style={styles.subItemLabel}>Efectivo</Text>
            </View>
            <Text style={styles.subItemValue}>
              {formatCurrency(shift.cashRevenue)}
            </Text>
          </View>

          <View style={styles.subItem}>
            <View style={styles.subItemLeft}>
              <Text style={styles.bullet}>└─</Text>
              <Text style={styles.subItemLabel}>Transferencia</Text>
            </View>
            <Text style={styles.subItemValue}>
              {formatCurrency(shift.transferRevenue)}
            </Text>
          </View>
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 3: DESCUENTOS
        ══════════════════════════════════════════════════════════════════ */}
        <Card variant="outlined" style={styles.blockCard}>
          <View style={styles.blockHeader}>
            <View style={[styles.blockIcon, { backgroundColor: Colors.errorLight }]}>
              <Feather name="trending-down" size={14} color={Colors.error} />
            </View>
            <Text style={[styles.blockTitle, { color: Colors.error }]}>
              Descuentos
            </Text>
            <Text style={[styles.blockTotal, { color: Colors.error }]}>
              − {formatCurrency(shift.totalInvested)}
            </Text>
          </View>

          {shift.transferCommission > 0 && (
            <View style={styles.subItem}>
              <View style={styles.subItemLeft}>
                <Text style={styles.bullet}>├─</Text>
                <Text style={styles.subItemLabel}>
                  Comisión transferencia ({TRANSFER_COMMISSION_PCT}%)
                </Text>
              </View>
              <Text style={[styles.subItemValue, styles.subItemValueNegative]}>
                − {formatCurrency(shift.transferCommission)}
              </Text>
            </View>
          )}

          {shift.fixedCosts > 0 && (
            <View style={styles.subItem}>
              <View style={styles.subItemLeft}>
                <Text style={styles.bullet}>
                  {shift.transferCommission > 0 ? '├─' : '┌─'}
                </Text>
                <Text style={styles.subItemLabel}>
                  Gastos fijos ({FIXED_COSTS_PCT}%)
                </Text>
              </View>
              <Text style={[styles.subItemValue, styles.subItemValueNegative]}>
                − {formatCurrency(shift.fixedCosts)}
              </Text>
            </View>
          )}

          {totalInsumos > 0 && (
            <View style={styles.subItem}>
              <View style={styles.subItemLeft}>
                <Text style={styles.bullet}>└─</Text>
                <Text style={styles.subItemLabel}>Inversión en insumos</Text>
              </View>
              <Text style={[styles.subItemValue, styles.subItemValueNegative]}>
                − {formatCurrency(totalInsumos)}
              </Text>
            </View>
          )}
        </Card>

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 4: INSUMOS USADOS EN ESTE TURNO
        ══════════════════════════════════════════════════════════════════ */}
        {usageSummary.length > 0 && (
          <Card variant="outlined" style={styles.blockCard}>
            <View style={styles.blockHeader}>
              <View style={[styles.blockIcon, { backgroundColor: Colors.primaryLight }]}>
                <Feather name="tool" size={14} color={Colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: Colors.primary }]}>
                Insumos usados en este turno
              </Text>
              <Text style={[styles.blockTotal, { color: Colors.primary }]}>
                {formatCurrency(totalInsumos)}
              </Text>
            </View>

            {visibleUsage.map((item) => (
              <View key={item.ingredientId} style={styles.inventoryRow}>
                <View style={styles.inventoryLeft}>
                  <Text style={styles.inventoryName}>{item.name}</Text>
                  <Text style={styles.inventoryMeta}>
                    Se usó: {formatQuantity(item.totalUsed, item.unit)}
                  </Text>
                </View>
                <View style={styles.inventoryRight}>
                  <Text style={styles.inventoryCost}>
                    {formatCurrency(item.totalCost)}
                  </Text>
                </View>
              </View>
            ))}

            {!showAllIngredients && hiddenCount > 0 && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllIngredients(true)}
                activeOpacity={0.7}
              >
                <Feather name="chevron-down" size={14} color={Colors.primary} />
                <Text style={styles.showMoreText}>
                  Ver {hiddenCount} más
                </Text>
              </TouchableOpacity>
            )}

            {showAllIngredients && usageSummary.length > MAX_VISIBLE_INGREDIENTS && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllIngredients(false)}
                activeOpacity={0.7}
              >
                <Feather name="chevron-up" size={14} color={Colors.primary} />
                <Text style={styles.showMoreText}>Ver menos</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            BLOQUE 5: MOVIMIENTOS DEL TURNO
        ══════════════════════════════════════════════════════════════════ */}
        <Card variant="outlined" style={styles.blockCard}>
          <View style={styles.blockHeader}>
            <View style={[styles.blockIcon, { backgroundColor: Colors.infoLight }]}>
              <Feather name="activity" size={14} color={Colors.info} />
            </View>
            <Text style={[styles.blockTitle, { color: Colors.info }]}>
              Movimientos del turno
            </Text>
          </View>

          <View style={styles.movementsGrid}>
            <View style={styles.movementItem}>
              <View style={[styles.movementIcon, { backgroundColor: Colors.primaryLight }]}>
                <Feather name="tool" size={12} color={Colors.primary} />
              </View>
              <View style={styles.movementText}>
                <Text style={styles.movementCount}>{usageCount}</Text>
                <Text style={styles.movementLabel}>Utilizados</Text>
              </View>
            </View>

            <View style={styles.movementItem}>
              <View style={[styles.movementIcon, { backgroundColor: Colors.successLight }]}>
                <Feather name="arrow-down-circle" size={12} color={Colors.success} />
              </View>
              <View style={styles.movementText}>
                <Text style={styles.movementCount}>{purchaseCount}</Text>
                <Text style={styles.movementLabel}>Entradas</Text>
              </View>
            </View>

            <View style={styles.movementItem}>
              <View style={[styles.movementIcon, { backgroundColor: Colors.infoLight }]}>
                <Feather name="arrow-up-circle" size={12} color={Colors.info} />
              </View>
              <View style={styles.movementText}>
                <Text style={styles.movementCount}>{outputCount}</Text>
                <Text style={styles.movementLabel}>Salidas</Text>
              </View>
            </View>

            <View style={styles.movementItem}>
              <View style={[styles.movementIcon, { backgroundColor: Colors.warningLight }]}>
                <Feather name="alert-triangle" size={12} color={Colors.warning} />
              </View>
              <View style={styles.movementText}>
                <Text style={styles.movementCount}>{wasteCount}</Text>
                <Text style={styles.movementLabel}>Mermas</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* ── Botón volver ────────────────────────────────────────────────── */}
        <Button
          label="Volver al historial"
          onPress={onBack}
          variant="primary"
          size="lg"
          fullWidth
          style={styles.finishButton}
          leftIcon={
            <Feather name="arrow-left" size={18} color={Colors.textOnPrimary} />
          }
        />
      </ScrollView>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: Colors.background,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding:       Spacing.base,
    gap:           Spacing.md,
    paddingBottom: Spacing.xxxl,
  },

  // ── Bloque 1: Ganancia ────────────────────────────────────────────────────
  profitCard: {
    gap:     Spacing.md,
    padding: Spacing.lg,
  },

  profitCardSuccess: {
    backgroundColor: Colors.successLight,
    borderWidth:     1.5,
    borderColor:     Colors.success,
  },

  profitCardLoss: {
    backgroundColor: Colors.errorLight,
    borderWidth:     1.5,
    borderColor:     Colors.error,
  },

  profitHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },

  profitHeaderLabel: {
    flex:          1,
    fontSize:      Typography.sm,
    fontWeight:    Typography.semibold,
    color:         Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  badgeWithIcon: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },

  profitAmount: {
    fontSize:   Typography.xxxl,
    fontWeight: Typography.bold,
  },

  marginBarWrapper: {
    gap: Spacing.xs,
  },

  marginBarTrack: {
    height:          8,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.full,
    overflow:        'hidden',
  },

  marginBarFill: {
    height:       8,
    borderRadius: Radius.full,
  },

  marginBarLabel: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
    textAlign:  'right',
  },

  durationRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },

  durationText: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  // ── Bloques 2, 3, 4, 5 ────────────────────────────────────────────────────
  blockCard: {
    gap:     Spacing.sm,
    padding: Spacing.md,
  },

  blockHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    marginBottom:  Spacing.xs,
  },

  blockIcon: {
    width:          26,
    height:         26,
    borderRadius:   Radius.sm,
    alignItems:     'center',
    justifyContent: 'center',
  },

  blockTitle: {
    flex:          1,
    fontSize:      Typography.sm,
    fontWeight:    Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  blockTotal: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  subItem: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: 4,
    paddingLeft:     Spacing.xs,
  },

  subItemLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
    flex:          1,
  },

  bullet: {
    fontSize:   Typography.sm,
    color:      Colors.textMuted,
    fontWeight: Typography.regular,
  },

  subItemLabel: {
    fontSize: Typography.sm,
    color:    Colors.textSecondary,
    flex:     1,
  },

  subItemValue: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  subItemValueNegative: {
    color: Colors.error,
  },

  // ── Bloque 4: Insumos usados ──────────────────────────────────────────────
  inventoryRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },

  inventoryLeft: {
    flex: 1,
    gap:  2,
  },

  inventoryName: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },

  inventoryMeta: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  inventoryRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },

  inventoryCost: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.primary,
  },

  showMoreButton: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop:       Spacing.xs,
  },

  showMoreText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.primary,
  },

  // ── Bloque 5: Movimientos ─────────────────────────────────────────────────
  movementsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },

  movementItem: {
    width:           '48%',
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.sm,
    paddingVertical: Spacing.xs,
  },

  movementIcon: {
    width:          32,
    height:         32,
    borderRadius:   Radius.sm,
    alignItems:     'center',
    justifyContent: 'center',
  },

  movementText: {
    gap: 2,
  },

  movementCount: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  movementLabel: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  // ── Botón finalizar ───────────────────────────────────────────────────────
  finishButton: {
    marginTop: Spacing.sm,
  },
});