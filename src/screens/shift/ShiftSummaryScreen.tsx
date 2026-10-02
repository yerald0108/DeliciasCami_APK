import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, formatCurrency, formatQuantity } from '../../constants';
import { useShiftSummary, useShiftActions } from '../../store';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ShiftStackParams } from '../../navigation';
import { ShiftEntry, ShiftEntryType } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<ShiftStackParams, 'ShiftSummary'>;

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
export const ShiftSummaryScreen: React.FC = () => {
  const navigation   = useNavigation<NavigationProp>();
  const shiftSummary = useShiftSummary();
  const { clearShiftSummary } = useShiftActions();

  if (!shiftSummary) return null;

  const {
    shift,
    usageSummary,
    purchaseEntries,
    outputEntries,
    wasteEntries,
    totalInvested,
    totalRevenue,
    netProfit,
  } = shiftSummary;

  const isProfit = netProfit >= 0;

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

  const usageEntries = shift.entries.filter(e => e.type === 'usage');

  const handleFinish = () => {
    clearShiftSummary();
    navigation.navigate('ShiftDashboard');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Cuadre del turno"
        subtitle={shiftDate}
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
              size={24}
              color={isProfit ? Colors.success : Colors.error}
            />
            <Text style={styles.resultTitle}>
              {isProfit ? 'Ganancia del día' : 'Pérdida del día'}
            </Text>
            <Badge
              label={isProfit ? 'Ganancia' : 'Pérdida'}
              variant={isProfit ? 'success' : 'error'}
              size="sm"
            />
          </View>

          <Text style={[
            styles.resultAmount,
            isProfit ? styles.resultAmountProfit : styles.resultAmountLoss,
          ]}>
            {formatCurrency(Math.abs(netProfit))}
          </Text>

          <View style={styles.resultBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Recaudado</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(totalRevenue)}
              </Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Invertido</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(totalInvested)}
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
              <View key={item.ingredientId}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryName}>{item.ingredientName}</Text>
                    <Text style={styles.summaryUsed}>
                      Usado: {formatQuantity(item.totalUsed, item.unit)}
                    </Text>
                  </View>
                  <View style={styles.summaryRight}>
                    <Text style={styles.summaryCost}>
                      {formatCurrency(item.totalCost)}
                    </Text>
                    <Badge
                      label={`Queda: ${formatQuantity(item.remainingStock, item.unit)}`}
                      variant={item.remainingStock <= 0 ? 'error' : 'neutral'}
                      size="sm"
                    />
                  </View>
                </View>
                {index < usageSummary.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))}

            <View style={styles.sectionTotal}>
              <Text style={styles.sectionTotalLabel}>Total invertido</Text>
              <Text style={[styles.sectionTotalValue, { color: Colors.primary }]}>
                {formatCurrency(totalInvested)}
              </Text>
            </View>
          </Card>
        )}

        {/* ── Detalle por categoría ─────────────────────────────────── */}
        <EntriesSection type="usage"    entries={usageEntries}    />
        <EntriesSection type="purchase" entries={purchaseEntries} />
        <EntriesSection type="output"   entries={outputEntries}   />
        <EntriesSection type="waste"    entries={wasteEntries}    />

        {/* ── Nota de inventario actualizado ────────────────────────── */}
        <Card variant="filled" style={styles.inventoryNote}>
          <View style={styles.inventoryNoteRow}>
            <Feather name="check-circle" size={16} color={Colors.success} />
            <Text style={styles.inventoryNoteText}>
              El inventario fue actualizado automáticamente: insumos utilizados, salidas y mermas descontados; entradas sumadas al stock.
            </Text>
          </View>
        </Card>

        {/* ── Botón finalizar ───────────────────────────────────────── */}
        <Button
          label="Finalizar y volver al inicio"
          onPress={handleFinish}
          variant="primary"
          size="lg"
          fullWidth
          style={styles.finishButton}
          leftIcon={
            <Feather name="home" size={18} color={Colors.textOnPrimary} />
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

  resultCard: {
    gap:     Spacing.lg,
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

  resultAmountProfit: {
    color: Colors.success,
  },

  resultAmountLoss: {
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
    alignItems:      'flex-start',
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

  summaryRight: {
    alignItems: 'flex-end',
    gap:        Spacing.xs,
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

  inventoryNote: {
    padding: Spacing.md,
  },

  inventoryNoteRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Spacing.sm,
  },

  inventoryNoteText: {
    flex:       1,
    fontSize:   Typography.sm,
    color:      Colors.textSecondary,
    lineHeight: Typography.sm * 1.5,
  },

  finishButton: {
    marginTop: Spacing.sm,
  },
});