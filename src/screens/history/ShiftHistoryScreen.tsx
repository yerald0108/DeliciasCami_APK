import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows, formatCurrency } from '../../constants';
import { useShiftHistory, useIsLoadingShift, useShiftActions } from '../../store';
import { useConfirm } from '../../hooks';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Shift } from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────
interface ShiftHistoryScreenProps {
  onSelectShift: (shift: Shift) => void;
}

// ─── Tarjeta de turno cerrado ─────────────────────────────────────────────────
const ShiftHistoryCard: React.FC<{
  shift:    Shift;
  onPress:  () => void;
  onDelete: () => void;
}> = ({ shift, onPress, onDelete }) => {
  const isProfit = shift.netProfit >= 0;

  const date = new Date(shift.openedAt).toLocaleDateString('es-ES', {
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

  return (
    <Card variant="elevated" style={styles.card}>
      {/* ── Encabezado ──────────────────────────────────────────────── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardDateWrapper}>
          <Text style={styles.cardDate}>{date}</Text>
          <Text style={styles.cardTime}>
            {openedTime} — {closedTime}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Badge
            label={isProfit ? 'Ganancia' : 'Pérdida'}
            variant={isProfit ? 'success' : 'error'}
            size="sm"
          />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={15} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Métricas ────────────────────────────────────────────────── */}
      <View style={styles.cardMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Recaudado</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(shift.totalRevenue)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Invertido</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(shift.totalInvested)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>
            {isProfit ? 'Ganancia' : 'Pérdida'}
          </Text>
          <Text style={[
            styles.metricValue,
            styles.metricValueLarge,
            isProfit ? styles.profitText : styles.lossText,
          ]}>
            {formatCurrency(Math.abs(shift.netProfit))}
          </Text>
        </View>
      </View>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.cardFooter}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardFooterLeft}>
          <Feather name="list" size={13} color={Colors.textMuted} />
          <Text style={styles.cardFooterText}>
            {shift.entries.length} movimiento{shift.entries.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.cardFooterRight}>
          <Text style={styles.cardFooterSeeMore}>Ver detalle</Text>
          <Feather name="chevron-right" size={14} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    </Card>
  );
};

// ─── Pantalla principal ───────────────────────────────────────────────────────
export const ShiftHistoryScreen: React.FC<ShiftHistoryScreenProps> = ({
  onSelectShift,
}) => {
  const insets       = useSafeAreaInsets();
  const shiftHistory = useShiftHistory();
  const isLoading    = useIsLoadingShift();
  const { loadShiftHistory, deleteShift } = useShiftActions();
  const confirm      = useConfirm();

  useEffect(() => {
    loadShiftHistory();
  }, []);

  // ── Estadísticas globales ─────────────────────────────────────────────────
  const totalRevenue  = shiftHistory.reduce((s, t) => s + t.totalRevenue,  0);
  const totalInvested = shiftHistory.reduce((s, t) => s + t.totalInvested, 0);
  const totalProfit   = shiftHistory.reduce((s, t) => s + t.netProfit,     0);

  // ── Eliminar turno ────────────────────────────────────────────────────────
  const handleDelete = async (shift: Shift) => {
    const date = new Date(shift.openedAt).toLocaleDateString('es-ES', {
      day:   'numeric',
      month: 'long',
      year:  'numeric',
    });

    const ok = await confirm({
      title:       'Eliminar turno',
      message:     `¿Seguro que querés eliminar el turno del ${date}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText:  'Cancelar',
      variant:     'danger',
    });

    if (!ok) return;

    const success = await deleteShift(shift.id);
    if (!success) {
      Alert.alert('Error', 'No se pudo eliminar el turno. Intenta de nuevo.');
    }
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* ── Encabezado ────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>Historial</Text>
          <Text style={styles.headerSubtitle}>
            {shiftHistory.length} turno{shiftHistory.length !== 1 ? 's' : ''} cerrado{shiftHistory.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <FlatList
        data={shiftHistory}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadShiftHistory}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={
          shiftHistory.length > 0 ? (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Resumen general</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total recaudado</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(totalRevenue)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total invertido</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(totalInvested)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Ganancia total</Text>
                  <Text style={[
                    styles.statValue,
                    styles.statValueLarge,
                    totalProfit >= 0 ? styles.profitText : styles.lossText,
                  ]}>
                    {formatCurrency(Math.abs(totalProfit))}
                  </Text>
                </View>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<Feather name="clock" size={48} color={Colors.textMuted} />}
              title="Sin turnos cerrados"
              description="Aquí aparecerán tus turnos una vez que los cierres con su cuadre completo."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <ShiftHistoryCard
            shift={item}
            onPress={() => onSelectShift(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    marginTop: 2,
  },

  listContent: {
    padding:  Spacing.base,
    flexGrow: 1,
    gap:      Spacing.sm,
  },

  statsCard: {
    backgroundColor: Colors.primary,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    marginBottom:    Spacing.md,
    gap:             Spacing.md,
    ...Shadows.md,
  },

  statsTitle: {
    fontSize:      Typography.sm,
    fontWeight:    Typography.semibold,
    color:         Colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  statItem: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  statDivider: {
    width:           1,
    height:          40,
    backgroundColor: Colors.primaryLight,
    opacity:         0.4,
  },

  statLabel: {
    fontSize:  Typography.xs,
    color:     Colors.primaryLight,
    textAlign: 'center',
    opacity:   0.85,
  },

  statValue: {
    fontSize:   Typography.sm,
    fontWeight: Typography.bold,
    color:      Colors.textOnPrimary,
    textAlign:  'center',
  },

  statValueLarge: {
    fontSize: Typography.md,
  },

  card: {
    gap: Spacing.md,
  },

  cardHeader: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            Spacing.sm,
  },

  cardDateWrapper: {
    flex: 1,
    gap:  2,
  },

  cardDate: {
    fontSize:      Typography.base,
    fontWeight:    Typography.semibold,
    color:         Colors.textPrimary,
    textTransform: 'capitalize',
  },

  cardTime: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  cardHeaderRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },

  deleteButton: {
    width:           32,
    height:          32,
    borderRadius:    Radius.full,
    backgroundColor: Colors.errorLight,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     Colors.error,
  },

  cardMetrics: {
    flexDirection:   'row',
    backgroundColor: Colors.background,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    alignItems:      'center',
  },

  metric: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  metricDivider: {
    width:           1,
    height:          36,
    backgroundColor: Colors.border,
  },

  metricLabel: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
  },

  metricValue: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },

  metricValueLarge: {
    fontSize: Typography.md,
  },

  profitText: {
    color: Colors.success,
  },

  lossText: {
    color: Colors.error,
  },

  cardFooter: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingTop:     Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },

  cardFooterLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },

  cardFooterText: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  cardFooterRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },

  cardFooterSeeMore: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
    color:      Colors.primary,
  },

  separator: {
    height: Spacing.xs,
  },
});