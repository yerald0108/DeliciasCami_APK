import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, formatCurrency, formatQuantity } from '../../constants';
import { useCurrentShift, useShiftActions } from '../../store';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ShiftStackParams } from '../../navigation';
import { ShiftEntry, ShiftEntryType } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<ShiftStackParams, 'CloseShift'>;

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
        <View style={[styles.sectionIconWrapper, { backgroundColor: config.bg }]}>
          <Feather name={config.icon as any} size={14} color={config.color} />
        </View>
        <Text style={[styles.sectionTitle, { color: config.color }]}>
          {config.label} ({entries.length})
        </Text>
        {type === 'usage' && (
          <Text style={styles.sectionNotice}>Cuenta en cuadre</Text>
        )}
      </View>

      {entries.map((entry, index) => (
        <View key={entry.id}>
          <View style={styles.entryRow}>
            <View style={styles.entryInfo}>
              <Text style={styles.entryName}>{entry.ingredientName}</Text>
              <Text style={styles.entryQty}>
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
export const CloseShiftScreen: React.FC = () => {
  const navigation   = useNavigation<NavigationProp>();
  const currentShift = useCurrentShift();
  const { closeShift } = useShiftActions();

  const [totalRevenue, setTotalRevenue] = useState('');
  const [revenueError, setRevenueError] = useState('');
  const [isLoading,    setIsLoading]    = useState(false);

  if (!currentShift) return null;

  // ── Entradas por tipo ─────────────────────────────────────────────────────
  const usageEntries    = currentShift.entries.filter(e => e.type === 'usage');
  const purchaseEntries = currentShift.entries.filter(e => e.type === 'purchase');
  const outputEntries   = currentShift.entries.filter(e => e.type === 'output');
  const wasteEntries    = currentShift.entries.filter(e => e.type === 'waste');

  // ── Total invertido (solo usage) ──────────────────────────────────────────
  const totalInvested = usageEntries.reduce((s, e) => s + e.totalCost, 0);

  const revenueValue    = parseFloat(totalRevenue) || 0;
  const projectedProfit = revenueValue - totalInvested;

  // ── Validación ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const value = parseFloat(totalRevenue);
    if (!totalRevenue || isNaN(value) || value < 0) {
      setRevenueError('Ingresa el total recaudado en ventas');
      return false;
    }
    setRevenueError('');
    return true;
  };

  // ── Cerrar turno ──────────────────────────────────────────────────────────
  const handleClose = async () => {
    if (!validate()) return;

    Alert.alert(
      'Cerrar turno',
      `¿Confirmas cerrar el turno con ${formatCurrency(revenueValue)} en ventas?`,
      [
        { text: 'Revisar', style: 'cancel' },
        {
          text:    'Cerrar y calcular',
          style:   'default',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await closeShift(revenueValue);
              if (success) {
                navigation.replace('ShiftSummary');
              } else {
                Alert.alert('Error', 'No se pudo cerrar el turno. Intenta de nuevo.');
              }
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Cerrar turno"
        subtitle="Cuadre del día"
        leftAction={{
          icon:    <Feather name="arrow-left" size={20} color={Colors.textPrimary} />,
          onPress: () => navigation.goBack(),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Resumen rápido ────────────────────────────────────────── */}
        <Card variant="elevated" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Feather name="clipboard" size={18} color={Colors.primary} />
            <Text style={styles.summaryTitle}>Resumen del turno</Text>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{usageEntries.length}</Text>
              <Text style={styles.summaryStatLabel}>Utilizados</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: Colors.success }]}>
                {purchaseEntries.length}
              </Text>
              <Text style={styles.summaryStatLabel}>Entradas</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: Colors.info }]}>
                {outputEntries.length}
              </Text>
              <Text style={styles.summaryStatLabel}>Salidas</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: Colors.warning }]}>
                {wasteEntries.length}
              </Text>
              <Text style={styles.summaryStatLabel}>Mermas</Text>
            </View>
          </View>

          <View style={styles.summaryInvested}>
            <Text style={styles.summaryInvestedLabel}>Total invertido en insumos</Text>
            <Text style={styles.summaryInvestedValue}>
              {formatCurrency(totalInvested)}
            </Text>
          </View>
        </Card>

        {/* ── Secciones por tipo ────────────────────────────────────── */}
        <EntriesSection type="usage"    entries={usageEntries}    />
        <EntriesSection type="purchase" entries={purchaseEntries} />
        <EntriesSection type="output"   entries={outputEntries}   />
        <EntriesSection type="waste"    entries={wasteEntries}    />

        {/* ── Ventas del día ────────────────────────────────────────── */}
        <Card variant="outlined" style={styles.section}>
          <Text style={styles.sectionTitle}>Ventas del día</Text>

          <Input
            label="Total recaudado en ventas"
            placeholder="0.00"
            value={totalRevenue}
            onChangeText={v => {
              setTotalRevenue(v);
              if (revenueError) setRevenueError('');
            }}
            error={revenueError}
            required
            keyboardType="decimal-pad"
            hint="Suma todo el dinero que recibiste hoy por tus ventas"
            leftIcon={
              <Text style={styles.currencyPrefix}>$</Text>
            }
          />
        </Card>

        {/* ── Vista previa de ganancia ──────────────────────────────── */}
        {revenueValue > 0 && (
          <Card
            variant="elevated"
            style={[
              styles.profitCard,
              projectedProfit >= 0 ? styles.profitCardPositive : styles.profitCardNegative,
            ]}
          >
            <View style={styles.profitRow}>
              <View style={styles.profitItem}>
                <Text style={styles.profitItemLabel}>Recaudado</Text>
                <Text style={styles.profitItemValue}>
                  {formatCurrency(revenueValue)}
                </Text>
              </View>
              <Text style={styles.profitOperator}>−</Text>
              <View style={styles.profitItem}>
                <Text style={styles.profitItemLabel}>Invertido</Text>
                <Text style={styles.profitItemValue}>
                  {formatCurrency(totalInvested)}
                </Text>
              </View>
              <Text style={styles.profitOperator}>=</Text>
              <View style={styles.profitItem}>
                <Text style={styles.profitItemLabel}>Ganancia</Text>
                <Text style={[
                  styles.profitResult,
                  projectedProfit >= 0
                    ? styles.profitResultPositive
                    : styles.profitResultNegative,
                ]}>
                  {formatCurrency(projectedProfit)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Botón cerrar ──────────────────────────────────────────── */}
        <Button
          label="Cerrar turno y ver cuadre"
          onPress={handleClose}
          loading={isLoading}
          fullWidth
          size="lg"
          style={styles.closeButton}
          leftIcon={
            <Feather name="check-circle" size={18} color={Colors.textOnPrimary} />
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
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

  summaryCard: {
    gap: Spacing.md,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },

  summaryTitle: {
    fontSize:   Typography.md,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  summaryStats: {
    flexDirection:   'row',
    backgroundColor: Colors.background,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
  },

  summaryStat: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  summaryStatValue: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  summaryStatLabel: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
  },

  summaryInvested: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   Colors.primaryLight,
    borderRadius:      Radius.md,
    padding:           Spacing.md,
  },

  summaryInvestedLabel: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.primaryDark,
  },

  summaryInvestedValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    color:      Colors.primary,
  },

  section: {
    gap: Spacing.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },

  sectionIconWrapper: {
    width:          26,
    height:         26,
    borderRadius:   Radius.sm,
    alignItems:     'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    flex:       1,
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  sectionNotice: {
    fontSize:   Typography.xs,
    color:      Colors.textMuted,
    fontStyle:  'italic',
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

  entryQty: {
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

  currencyPrefix: {
    fontSize:    Typography.base,
    color:       Colors.textSecondary,
    fontWeight:  Typography.medium,
    paddingLeft: Spacing.sm,
  },

  profitCard: {
    padding: Spacing.lg,
  },

  profitCardPositive: {
    backgroundColor: Colors.successLight,
    borderWidth:     1.5,
    borderColor:     Colors.success,
  },

  profitCardNegative: {
    backgroundColor: Colors.errorLight,
    borderWidth:     1.5,
    borderColor:     Colors.error,
  },

  profitRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },

  profitItem: {
    alignItems: 'center',
    gap:        4,
    flex:       1,
  },

  profitItemLabel: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },

  profitItemValue: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  profitOperator: {
    fontSize:   Typography.xl,
    color:      Colors.textMuted,
    fontWeight: Typography.bold,
  },

  profitResult: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
  },

  profitResultPositive: {
    color: Colors.success,
  },

  profitResultNegative: {
    color: Colors.error,
  },

  closeButton: {
    marginTop: Spacing.sm,
  },
});