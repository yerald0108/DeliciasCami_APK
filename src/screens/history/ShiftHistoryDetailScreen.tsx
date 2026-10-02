import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, formatCurrency, formatQuantity } from '../../constants';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Shift, ShiftEntry, ShiftEntryType } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────
interface ShiftHistoryDetailScreenProps {
  shift:  Shift;
  onBack: () => void;
}

// ─── Configuración visual por tipo ───────────────────────────────────────────
const TYPE_CONFIG: Record<ShiftEntryType, {
  label: string;
  color: string;
  bg:    string;
  icon:  string;
}> = {
  usage: {
    label: 'Insumos utilizados',
    color: Colors.primary,
    bg:    Colors.primaryLight,
    icon:  'tool',
  },
  purchase: {
    label: 'Entradas / Compras',
    color: Colors.success,
    bg:    Colors.successLight,
    icon:  'arrow-down-circle',
  },
  output: {
    label: 'Salidas',
    color: Colors.info,
    bg:    Colors.infoLight,
    icon:  'arrow-up-circle',
  },
  waste: {
    label: 'Mermas',
    color: Colors.warning,
    bg:    Colors.warningLight,
    icon:  'alert-triangle',
  },
};

// ─── Sección de entradas por tipo ────────────────────────────────────────────
const EntriesSection: React.FC<{
  type:    ShiftEntryType;
  entries: ShiftEntry[];
}> = ({ type, entries }) => {
  if (entries.length === 0) return null;
  const config = TYPE_CONFIG[type];

  return (
    <Card variant="outlined" style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: config.bg }]}>
          <Feather name={config.icon as any} size={14} color={config.color} />
        </View>
        <Text style={[styles.sectionTitle, { color: config.color }]}>
          {config.label} ({entries.length})
        </Text>
      </View>

      {entries.map((entry, index) => (
        <View key={entry.id}>
          <View style={styles.entryRow}>
            <View style={styles.entryInfo}>
              <Text style={styles.entryName}>{entry.ingredientName}</Text>
              <Text style={styles.entryMeta}>
                {formatQuantity(entry.quantityUsed, entry.unit)}
                {entry.note ? ` · ${entry.note}` : ''}
              </Text>
            </View>
            {type === 'usage' && (
              <Text style={[styles.entryCost, { color: config.color }]}>
                {formatCurrency(entry.totalCost)}
              </Text>
            )}
          </View>
          {index < entries.length - 1 && (
            <View style={styles.divider} />
          )}
        </View>
      ))}

      {type === 'usage' && (
        <View style={styles.sectionTotal}>
          <Text style={styles.sectionTotalLabel}>Subtotal</Text>
          <Text style={[styles.sectionTotalValue, { color: config.color }]}>
            {formatCurrency(entries.reduce((s, e) => s + e.totalCost, 0))}
          </Text>
        </View>
      )}
    </Card>
  );
};

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export const ShiftHistoryDetailScreen: React.FC<ShiftHistoryDetailScreenProps> = ({
  shift,
  onBack,
}) => {
  const isProfit = shift.netProfit >= 0;

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

  // ── Entradas por tipo ─────────────────────────────────────────────────────
  const usageEntries    = shift.entries.filter(e => e.type === 'usage');
  const purchaseEntries = shift.entries.filter(e => e.type === 'purchase');
  const outputEntries   = shift.entries.filter(e => e.type === 'output');
  const wasteEntries    = shift.entries.filter(e => e.type === 'waste');

  // ── Consolidar insumos utilizados ─────────────────────────────────────────
  const usageMap = new Map<string, {
    name:      string;
    totalUsed: number;
    unit:      string;
    totalCost: number;
  }>();

  for (const entry of usageEntries) {
    const existing = usageMap.get(entry.ingredientId);
    if (existing) {
      existing.totalUsed += entry.quantityUsed;
      existing.totalCost += entry.totalCost;
    } else {
      usageMap.set(entry.ingredientId, {
        name:      entry.ingredientName,
        totalUsed: entry.quantityUsed,
        unit:      entry.unit,
        totalCost: entry.totalCost,
      });
    }
  }

  const usageSummary = Array.from(usageMap.values());

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
        {/* ── Resultado principal ───────────────────────────────────── */}
        <Card
          variant="elevated"
          style={[
            styles.resultCard,
            isProfit ? styles.resultCardProfit : styles.resultCardLoss,
          ]}
        >
          <View style={styles.resultHeader}>
            <Feather
              name={isProfit ? 'trending-up' : 'trending-down'}
              size={22}
              color={isProfit ? Colors.success : Colors.error}
            />
            <Text style={styles.resultTitle}>
              {isProfit ? 'Ganancia del turno' : 'Pérdida del turno'}
            </Text>
            <Badge
              label={isProfit ? 'Ganancia' : 'Pérdida'}
              variant={isProfit ? 'success' : 'error'}
              size="sm"
            />
          </View>

          <Text style={[
            styles.resultAmount,
            isProfit ? styles.profitText : styles.lossText,
          ]}>
            {formatCurrency(Math.abs(shift.netProfit))}
          </Text>

          <View style={styles.resultBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Recaudado</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(shift.totalRevenue)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Invertido</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(shift.totalInvested)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Horario</Text>
              <Text style={styles.breakdownValue}>
                {openedTime} — {closedTime}
              </Text>
            </View>
          </View>

          {/* ── Conteo por categoría ───────────────────────────────── */}
          <View style={styles.categoryStats}>
            {(Object.keys(TYPE_CONFIG) as ShiftEntryType[]).map(type => {
              const count  = shift.entries.filter(e => e.type === type).length;
              const config = TYPE_CONFIG[type];
              if (count === 0) return null;
              return (
                <View key={type} style={[styles.categoryStat, { backgroundColor: config.bg }]}>
                  <Feather name={config.icon as any} size={12} color={config.color} />
                  <Text style={[styles.categoryStatText, { color: config.color }]}>
                    {count} {config.label.split(' ')[0].toLowerCase()}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* ── Resumen consolidado de insumos utilizados ─────────────── */}
        {usageSummary.length > 0 && (
          <Card variant="outlined" style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: Colors.primaryLight }]}>
                <Feather name="bar-chart-2" size={14} color={Colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: Colors.primary }]}>
                Resumen de insumos utilizados
              </Text>
            </View>

            {usageSummary.map((item, index) => (
              <View key={item.name}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryName}>{item.name}</Text>
                    <Text style={styles.summaryUsed}>
                      Total: {formatQuantity(item.totalUsed, item.unit)}
                    </Text>
                  </View>
                  <Text style={styles.summaryCost}>
                    {formatCurrency(item.totalCost)}
                  </Text>
                </View>
                {index < usageSummary.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}

            <View style={styles.sectionTotal}>
              <Text style={styles.sectionTotalLabel}>Total invertido</Text>
              <Text style={[styles.sectionTotalValue, { color: Colors.primary }]}>
                {formatCurrency(shift.totalInvested)}
              </Text>
            </View>
          </Card>
        )}

        {/* ── Detalle por categoría ─────────────────────────────────── */}
        <EntriesSection type="usage"    entries={usageEntries}    />
        <EntriesSection type="purchase" entries={purchaseEntries} />
        <EntriesSection type="output"   entries={outputEntries}   />
        <EntriesSection type="waste"    entries={wasteEntries}    />
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

  resultCard: {
    gap:     Spacing.md,
    padding: Spacing.xl,
  },

  resultCardProfit: {
    backgroundColor: Colors.successLight,
    borderWidth:     1.5,
    borderColor:     Colors.success,
  },

  resultCardLoss: {
    backgroundColor: Colors.errorLight,
    borderWidth:     1.5,
    borderColor:     Colors.error,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    flexWrap:      'wrap',
  },

  resultTitle: {
    flex:       1,
    fontSize:   Typography.md,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  resultAmount: {
    fontSize:   Typography.xxxl,
    fontWeight: Typography.bold,
  },

  profitText: {
    color: Colors.success,
  },

  lossText: {
    color: Colors.error,
  },

  resultBreakdown: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    alignItems:      'center',
  },

  breakdownItem: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  breakdownDivider: {
    width:            1,
    height:           36,
    backgroundColor:  Colors.border,
    marginHorizontal: Spacing.xs,
  },

  breakdownLabel: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
  },

  breakdownValue: {
    fontSize:   Typography.sm,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },

  categoryStats: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.xs,
  },

  categoryStat: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingVertical:   4,
    paddingHorizontal: Spacing.sm,
    borderRadius:      Radius.full,
  },

  categoryStatText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
  },

  section: {
    gap: Spacing.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },

  sectionIcon: {
    width:          26,
    height:         26,
    borderRadius:   Radius.sm,
    alignItems:     'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    flex:          1,
    fontSize:      Typography.sm,
    fontWeight:    Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  sectionTotal: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingTop:     Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop:      Spacing.xs,
  },

  sectionTotalLabel: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.textSecondary,
  },

  sectionTotalValue: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
  },

  summaryRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: Spacing.xs,
    gap:             Spacing.md,
  },

  summaryInfo: {
    flex: 1,
    gap:  2,
  },

  summaryName: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },

  summaryUsed: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  summaryCost: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  entryRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: Spacing.xs,
  },

  entryInfo: {
    flex: 1,
    gap:  2,
  },

  entryName: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },

  entryMeta: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  entryCost: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
  },

  divider: {
    height:          1,
    backgroundColor: Colors.divider,
    marginVertical:  Spacing.xs,
  },
});