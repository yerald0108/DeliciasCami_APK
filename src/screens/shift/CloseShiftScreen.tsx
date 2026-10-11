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
          <Text style={styles.sectionTotalLabel}>Subtotal insumos</Text>
          <Text style={[styles.sectionTotalValue, { color: config.color }]}>
            {formatCurrency(entries.reduce((s, e) => s + e.totalCost, 0))}
          </Text>
        </View>
      )}
    </Card>
  );
};

// ─── Fila de desglose financiero ─────────────────────────────────────────────
const DesgloseFila: React.FC<{
  label:    string;
  value:    number;
  color?:   string;
  bold?:    boolean;
  hint?:    string;
  signo?:   string;
}> = ({ label, value, color, bold, hint, signo = '' }) => (
  <View style={styles.desgloseRow}>
    <View style={styles.desgloseLeft}>
      <Text style={[styles.desgloseLabel, bold && styles.desgloseLabelBold]}>
        {signo}{label}
      </Text>
      {hint && <Text style={styles.desgloseHint}>{hint}</Text>}
    </View>
    <Text style={[
      styles.desgloseValue,
      bold  && styles.desgloseValueBold,
      color ? { color } : {},
    ]}>
      {formatCurrency(value)}
    </Text>
  </View>
);

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export const CloseShiftScreen: React.FC = () => {
  const navigation   = useNavigation<NavigationProp>();
  const currentShift = useCurrentShift();
  const { closeShift } = useShiftActions();

  const [cashRevenue,     setCashRevenue]     = useState('');
  const [transferRevenue, setTransferRevenue] = useState('');
  const [cashError,       setCashError]       = useState('');
  const [transferError,   setTransferError]   = useState('');
  const [isLoading,       setIsLoading]       = useState(false);

  if (!currentShift) return null;

  // ── Entradas por tipo ─────────────────────────────────────────────────────
  const usageEntries    = currentShift.entries.filter(e => e.type === 'usage');
  const purchaseEntries = currentShift.entries.filter(e => e.type === 'purchase');
  const outputEntries   = currentShift.entries.filter(e => e.type === 'output');
  const wasteEntries    = currentShift.entries.filter(e => e.type === 'waste');

  // ── Cálculos en tiempo real ───────────────────────────────────────────────
  const cashValue     = parseFloat(cashRevenue)     || 0;
  const transferValue = parseFloat(transferRevenue) || 0;
  const totalBruto    = cashValue + transferValue;

  const comisionTransfer = transferValue * 0.15;
  const gastosFijos      = totalBruto   * 0.05;
  const totalInsumos     = usageEntries.reduce((s, e) => s + e.totalCost, 0);
  const totalInvertido   = totalInsumos + comisionTransfer + gastosFijos;
  const gananciaReal     = totalBruto - comisionTransfer - gastosFijos - totalInsumos;

  const hayDatos = totalBruto > 0;

  // ── Validación ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    let ok = true;

    if (cashValue < 0) {
      setCashError('El valor no puede ser negativo');
      ok = false;
    } else {
      setCashError('');
    }

    if (transferValue < 0) {
      setTransferError('El valor no puede ser negativo');
      ok = false;
    } else {
      setTransferError('');
    }

    return ok;
  };

  // ── Cerrar turno ──────────────────────────────────────────────────────────
  const handleClose = async () => {
    if (!validate()) return;

    Alert.alert(
      'Cerrar turno',
      cashValue === 0 && transferValue === 0
        ? '¿Confirmas cerrar el turno sin ventas del día?'
        : `¿Confirmas cerrar el turno?\n\nEfectivo: ${formatCurrency(cashValue)}\nTransferencia: ${formatCurrency(transferValue)}\nGanancia real estimada: ${formatCurrency(gananciaReal)}`,
      [
        { text: 'Revisar', style: 'cancel' },
        {
          text:    'Cerrar y calcular',
          style:   'default',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await closeShift(cashValue, transferValue);
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
            <Text style={styles.summaryInvestedLabel}>Invertido en insumos</Text>
            <Text style={styles.summaryInvestedValue}>
              {formatCurrency(totalInsumos)}
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
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrapper, { backgroundColor: Colors.secondaryLight }]}>
              <Feather name="dollar-sign" size={14} color={Colors.secondary} />
            </View>
            <Text style={[styles.sectionTitle, { color: Colors.secondaryDark }]}>
              Ventas del día
            </Text>
          </View>

          <Input
            label="Efectivo recibido"
            placeholder="0.00"
            value={cashRevenue}
            onChangeText={v => {
              setCashRevenue(v);
              if (cashError) setCashError('');
            }}
            error={cashError}
            keyboardType="decimal-pad"
            hint="Dinero que recibiste en billetes/monedas"
            leftIcon={<Text style={styles.currencyPrefix}>$</Text>}
          />

          <Input
            label="Transferencias recibidas"
            placeholder="0.00"
            value={transferRevenue}
            onChangeText={v => {
              setTransferRevenue(v);
              if (transferError) setTransferError('');
            }}
            error={transferError}
            keyboardType="decimal-pad"
            hint="Monto total cobrado por transferencia (ya incluye el 15% de comisión)"
            leftIcon={<Text style={styles.currencyPrefix}>$</Text>}
          />

          {transferValue > 0 && (
            <View style={styles.commissionNote}>
              <Feather name="info" size={13} color={Colors.warning} />
              <Text style={styles.commissionNoteText}>
                Se descontará {formatCurrency(comisionTransfer)} (15%) por costo de extracción de transferencia
              </Text>
            </View>
          )}
        </Card>

        {/* ── Desglose financiero ───────────────────────────────────── */}
        {hayDatos && (
          <Card variant="outlined" style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: Colors.infoLight }]}>
                <Feather name="bar-chart-2" size={14} color={Colors.info} />
              </View>
              <Text style={[styles.sectionTitle, { color: Colors.info }]}>
                Desglose del cuadre
              </Text>
            </View>

            <DesgloseFila
              label="Efectivo"
              value={cashValue}
              color={Colors.success}
            />
            <DesgloseFila
              label="Transferencias"
              value={transferValue}
              color={Colors.success}
            />
            <View style={styles.desgloseSeparator} />
            <DesgloseFila
              label="Total bruto"
              value={totalBruto}
              bold
            />
            <View style={styles.desgloseSeparator} />
            <DesgloseFila
              label="Comisión transferencia (15%)"
              value={comisionTransfer}
              color={Colors.error}
              hint="Costo de extraer el dinero"
              signo="− "
            />
            <DesgloseFila
              label="Gastos fijos (5%)"
              value={gastosFijos}
              color={Colors.error}
              hint="Agua, luz, gas, etc."
              signo="− "
            />
            <DesgloseFila
              label="Inversión en insumos"
              value={totalInsumos}
              color={Colors.error}
              signo="− "
            />
            <View style={styles.desgloseSeparator} />
            <DesgloseFila
              label="Total descontado"
              value={totalInvertido}
              color={Colors.error}
              bold
              signo="− "
            />
            <View style={[styles.desgloseSeparator, styles.desgloseSeparatorThick]} />
            <DesgloseFila
              label="Ganancia real"
              value={gananciaReal}
              color={gananciaReal >= 0 ? Colors.success : Colors.error}
              bold
            />
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
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    backgroundColor: Colors.primaryLight,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
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
    flex:          1,
    fontSize:      Typography.sm,
    fontWeight:    Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionNotice: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    fontStyle: 'italic',
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
  commissionNote: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             Spacing.xs,
    backgroundColor: Colors.warningLight,
    borderRadius:    Radius.sm,
    padding:         Spacing.sm,
    marginTop:       Spacing.xs,
  },
  commissionNoteText: {
    flex:      1,
    fontSize:  Typography.xs,
    color:     Colors.warning,
    lineHeight: 16,
  },
  desgloseRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  desgloseLeft: {
    flex: 1,
    gap:  2,
  },
  desgloseLabel: {
    fontSize: Typography.sm,
    color:    Colors.textSecondary,
  },
  desgloseLabelBold: {
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },
  desgloseHint: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    fontStyle: 'italic',
  },
  desgloseValue: {
    fontSize:   Typography.sm,
    color:      Colors.textPrimary,
    fontWeight: Typography.medium,
  },
  desgloseValueBold: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
  },
  desgloseSeparator: {
    height:          1,
    backgroundColor: Colors.border,
    marginVertical:  Spacing.xs,
  },
  desgloseSeparatorThick: {
    height:          2,
    backgroundColor: Colors.borderStrong,
    marginVertical:  Spacing.sm,
  },
  closeButton: {
    marginTop: Spacing.sm,
  },
});