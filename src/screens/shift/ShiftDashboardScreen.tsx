import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows, formatCurrency } from '../../constants';
import { useCurrentShift, useIsLoadingShift, useShiftActions, useIngredientActions } from '../../store';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { EntryModal } from '../../components/shift/EntryModal';
import { ShiftStackParams } from '../../navigation';
import { ShiftEntry, ShiftEntryType } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<ShiftStackParams, 'ShiftDashboard'>;

// ─── Configuración por tipo ───────────────────────────────────────────────────
const ENTRY_TYPE_CONFIG: Record<ShiftEntryType, {
  label:       string;
  description: string;
  color:       string;
  bg:          string;
  border:      string;
  icon:        string;
}> = {
  usage: {
    label:       'Utilizados',
    description: 'Lo que usaste en producción',
    color:       Colors.primary,
    bg:          Colors.primaryLight,
    border:      Colors.primary,
    icon:        'tool',
  },
  purchase: {
    label:       'Entradas',
    description: 'Compras durante el turno',
    color:       Colors.success,
    bg:          Colors.successLight,
    border:      Colors.success,
    icon:        'arrow-down-circle',
  },
  output: {
    label:       'Salidas',
    description: 'Consumo familiar u otros',
    color:       Colors.info,
    bg:          Colors.infoLight,
    border:      Colors.info,
    icon:        'arrow-up-circle',
  },
  waste: {
    label:       'Mermas',
    description: 'Productos dañados o perdidos',
    color:       Colors.warning,
    bg:          Colors.warningLight,
    border:      Colors.warning,
    icon:        'alert-triangle',
  },
};

// ─── Tarjeta de movimiento ────────────────────────────────────────────────────
const MovementCard: React.FC<{
  type:    ShiftEntryType;
  entries: ShiftEntry[];
  onPress: () => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
}> = ({ type, entries, onPress }) => {
  const config     = ENTRY_TYPE_CONFIG[type];
  const hasEntries = entries.length > 0;

  return (
    <TouchableOpacity
      style={[styles.movementCard, { backgroundColor: config.bg, borderColor: config.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.movementCardIcon, { backgroundColor: config.color }]}>
        <Feather name={config.icon as any} size={24} color={Colors.textOnPrimary} />
      </View>

      <Text style={[styles.movementCardTitle, { color: config.color }]}>
        {config.label}
      </Text>

      {hasEntries && (
        <View style={[styles.movementCardBadge, { backgroundColor: config.color }]}>
          <Text style={styles.movementCardBadgeText}>{entries.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export const ShiftDashboardScreen: React.FC = () => {
  const navigation   = useNavigation<NavigationProp>();
  const insets       = useSafeAreaInsets();
  const currentShift = useCurrentShift();
  const isLoading    = useIsLoadingShift();
  const { loadOpenShift, openShift } = useShiftActions();
  const { loadIngredients } = useIngredientActions();

  // ── Modal de movimientos ──────────────────────────────────────────────────
  const [modalEntryType, setModalEntryType] = useState<ShiftEntryType | null>(null);

  useEffect(() => {
    loadOpenShift();
    loadIngredients();
  }, []);

  // ── Entradas por tipo ─────────────────────────────────────────────────────
  const usageEntries    = currentShift?.entries.filter(e => e.type === 'usage')    ?? [];
  const purchaseEntries = currentShift?.entries.filter(e => e.type === 'purchase') ?? [];
  const outputEntries   = currentShift?.entries.filter(e => e.type === 'output')   ?? [];
  const wasteEntries    = currentShift?.entries.filter(e => e.type === 'waste')    ?? [];

  const totalInvested = usageEntries.reduce((sum, e) => sum + e.totalCost, 0);

  const entriesByType: Record<ShiftEntryType, ShiftEntry[]> = {
    usage:    usageEntries,
    purchase: purchaseEntries,
    output:   outputEntries,
    waste:    wasteEntries,
  };

  // ── Abrir turno ───────────────────────────────────────────────────────────
  const handleOpenShift = async () => {
    const success = await openShift();
    if (!success) {
      Alert.alert('Error', 'No se pudo abrir el turno. Intenta de nuevo.');
    }
  };

  // ── Sin turno abierto ─────────────────────────────────────────────────────
  if (!currentShift) {
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Text style={styles.headerTitle}>Turno</Text>
        </View>
        <EmptyState
          icon={
            <MaterialCommunityIcons
              name="chef-hat"
              size={56}
              color={Colors.textMuted}
            />
          }
          title="Sin turno activo"
          description="Inicia un turno para comenzar a registrar movimientos del día."
          actionLabel="Iniciar turno"
          onAction={handleOpenShift}
        />
      </View>
    );
  }

  const shiftDate = new Date(currentShift.openedAt).toLocaleDateString('es-ES', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  });

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* ── Encabezado ────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>Turno activo</Text>
          <Text style={styles.headerSubtitle}>{shiftDate}</Text>
        </View>
        <Badge label="En curso" variant="success" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Resumen de inversión ───────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total invertido</Text>
              <Text style={[styles.summaryValue, styles.summaryValueAccent]}>
                {formatCurrency(totalInvested)}
              </Text>
              <Text style={styles.summaryHint}>Solo insumos utilizados</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Movimientos</Text>
              <Text style={styles.summaryValue}>
                {currentShift.entries.length}
              </Text>
              <Text style={styles.summaryHint}>En este turno</Text>
            </View>
          </View>
        </View>

        {/* ── Grid 2x2 de tarjetas ──────────────────────────────────── */}
        <View style={styles.movementsGrid}>
          {(Object.keys(ENTRY_TYPE_CONFIG) as ShiftEntryType[]).map(type => (
            <MovementCard
              key={type}
              type={type}
              entries={entriesByType[type]}
              onPress={() => setModalEntryType(type)}
            />
          ))}
        </View>

        {/* ── Botón cerrar turno ─────────────────────────────────────── */}
        <Button
          label="Cerrar turno y hacer cuadre"
          onPress={() => navigation.navigate('CloseShift')}
          variant="primary"
          size="lg"
          fullWidth
          style={styles.closeButton}
          leftIcon={
          <Feather name="check-circle" size={18} color={Colors.textOnPrimary} />
        }
        />
      </ScrollView>

      {/* ── Modal de movimientos ──────────────────────────────────── */}
      {modalEntryType !== null && (
        <EntryModal
          visible={modalEntryType !== null}
          entryType={modalEntryType}
          onClose={() => setModalEntryType(null)}
        />
      )}
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.md,
    backgroundColor:   Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  headerTitle: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  headerSubtitle: {
    fontSize:      Typography.sm,
    color:         Colors.textSecondary,
    marginTop:     2,
    textTransform: 'capitalize',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding:       Spacing.base,
    gap:           Spacing.md,
    paddingBottom: Spacing.xxxl,
  },

  // ── Resumen ───────────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    ...Shadows.md,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  summaryItem: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  summaryDivider: {
    width:           1,
    height:          50,
    backgroundColor: Colors.border,
  },

  summaryLabel: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
  },

  summaryValue: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  summaryValueAccent: {
    color: Colors.primary,
  },

  summaryHint: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
    opacity:   0.7,
  },

  // ── Grid de movimientos ───────────────────────────────────────────────────
    movementsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },

  movementCard: {
    width:          '48.5%',
    borderRadius:   Radius.xl,
    borderWidth:    1.5,
    padding:        Spacing.lg,
    alignItems:     'center',
    gap:            Spacing.sm,
    minHeight:      130,
    justifyContent: 'center',
    ...Shadows.sm,
  },

  movementCardIcon: {
    width:          52,
    height:         52,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },

  movementCardTitle: {
    fontSize:   Typography.base,
    fontWeight: Typography.bold,
    textAlign:  'center',
  },

  movementCardBadge: {
    minWidth:          22,
    height:            22,
    borderRadius:      Radius.full,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 6,
  },

  movementCardBadgeText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.bold,
    color:      Colors.textOnPrimary,
  },

  closeButton: {
    marginTop: Spacing.sm,
  },
});