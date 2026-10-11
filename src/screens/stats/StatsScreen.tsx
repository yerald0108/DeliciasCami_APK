import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { Colors, Typography, Spacing, Radius, Shadows, formatCurrency } from '../../constants';
import {
  useStatsData,
  useStatsPeriod,
  useIsLoadingStats,
  useStatsActions,
  useCustomRange,
} from '../../store';
import { StatsPeriod, DateRange } from '../../store/slices/stats.slice';
import { Card } from '../../components/ui/Card';

// ─── Constantes ───────────────────────────────────────────────────────────────
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH  = SCREEN_WIDTH - Spacing.base * 2 - Spacing.base * 2;

// ─── Animación del modal ──────────────────────────────────────────────────────
const MODAL_ANIM_DURATION_OPEN  = 250;
const MODAL_ANIM_DURATION_CLOSE = 200;
const MODAL_SHEET_OFFSET        = 400; // px desde abajo al abrir

// ─── Configuración de períodos ────────────────────────────────────────────────
const PERIOD_OPTIONS: { label: string; value: StatsPeriod }[] = [
  { label: 'Hoy',    value: 'today'  },
  { label: 'Semana', value: 'week'   },
  { label: 'Mes',    value: 'month'  },
  { label: 'Año',    value: 'year'   },
  { label: 'Rango',  value: 'custom' },
];

// ─── Configuración de gráficos ────────────────────────────────────────────────
const CHART_CONFIG = {
  backgroundColor:             Colors.surface,
  backgroundGradientFrom:      Colors.surface,
  backgroundGradientTo:        Colors.surface,
  decimalPlaces:               0,
  color:                       (opacity = 1) => `rgba(194, 24, 91, ${opacity})`,
  labelColor:                  (opacity = 1) => `rgba(107, 107, 128, ${opacity})`,
  style:                       { borderRadius: Radius.lg },
  propsForDots:                { r: '5', strokeWidth: '2', stroke: Colors.primary },
  propsForBackgroundLines:     { stroke: Colors.border, strokeWidth: 1 },
};

// ─── Tarjeta de resumen ───────────────────────────────────────────────────────
const SummaryCard: React.FC<{
  label:   string;
  value:   string;
  icon:    string;
  color:   string;
  bg:      string;
  hint?:   string;
}> = ({ label, value, icon, color, bg, hint }) => (
  <View style={[styles.summaryCard, { backgroundColor: bg, borderColor: color }]}>
    <View style={[styles.summaryCardIcon, { backgroundColor: color }]}>
      <Feather name={icon as any} size={18} color={Colors.textOnPrimary} />
    </View>
    <Text style={styles.summaryCardLabel}>{label}</Text>
    <Text style={[styles.summaryCardValue, { color }]}>{value}</Text>
    {hint && <Text style={styles.summaryCardHint}>{hint}</Text>}
  </View>
);

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export const StatsScreen: React.FC = () => {
  const insets      = useSafeAreaInsets();
  const statsData   = useStatsData();
  const period      = useStatsPeriod();
  const customRange = useCustomRange();
  const isLoading   = useIsLoadingStats();
  const { loadStats, setStatsPeriod, setCustomRange } = useStatsActions();

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart,     setCustomStart]     = useState('');
  const [customEnd,       setCustomEnd]       = useState('');

  // ── Animación del modal ───────────────────────────────────────────────────
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStats('today');
  }, []);

  // ── Abrir modal con animación ─────────────────────────────────────────────
  const openModal = () => {
    setShowCustomModal(true);
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue:         1,
        duration:        MODAL_ANIM_DURATION_OPEN,
        easing:          Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue:         1,
        duration:        MODAL_ANIM_DURATION_OPEN,
        easing:          Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Cerrar modal con animación ────────────────────────────────────────────
  const closeModal = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue:         0,
        duration:        MODAL_ANIM_DURATION_CLOSE,
        easing:          Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue:         0,
        duration:        MODAL_ANIM_DURATION_CLOSE,
        easing:          Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShowCustomModal(false);
        // Reset para la próxima apertura
        overlayAnim.setValue(0);
        sheetAnim.setValue(0);
      }
    });
  };

  // ── Aplicar rango personalizado ───────────────────────────────────────────
  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) return;
    const range: DateRange = { startDate: customStart, endDate: customEnd };
    setCustomRange(range);
    closeModal();
  };

  // ── Formatear fecha para label ────────────────────────────────────────────
  const formatDateLabel = (date: string): string => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  // ── Datos para gráfico de líneas ──────────────────────────────────────────
  const lineData = (() => {
    if (!statsData?.dailyStats.length) return null;

    const days = statsData.dailyStats.slice(-10);

    return {
      labels:   days.map(d => formatDateLabel(d.date)),
      datasets: [
        {
          data:        days.map(d => Math.max(0, d.netProfit)),
          color:       (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data:        days.map(d => d.totalRevenue),
          color:       (opacity = 1) => `rgba(194, 24, 91, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data:        days.map(d => d.totalInvested),
          color:       (opacity = 1) => `rgba(249, 168, 37, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Ganancia', 'Recaudado', 'Invertido'],
    };
  })();

  // ── Datos para gráfico de pastel ──────────────────────────────────────────
  const pieData = (() => {
    if (!statsData?.periodSummary) return null;
    const { totalRevenue, totalInvested, netProfit } = statsData.periodSummary;
    if (totalRevenue === 0) return null;

    return [
      {
        name:       'Ganancia',
        value:      Math.max(0, netProfit),
        color:      Colors.success,
        legendFontColor: Colors.textSecondary,
        legendFontSize:  12,
      },
      {
        name:       'Invertido',
        value:      totalInvested,
        color:      Colors.warning,
        legendFontColor: Colors.textSecondary,
        legendFontSize:  12,
      },
    ].filter(d => d.value > 0);
  })();

  // ── Datos para gráfico de barras (insumos) ────────────────────────────────
  const barData = (() => {
    if (!statsData?.topIngredients.length) return null;
    const top5 = statsData.topIngredients.slice(0, 5);

    return {
      labels:   top5.map(i => i.ingredientName.split(' ')[0]),
      datasets: [{
        data:  top5.map(i => i.totalUsed),
        color: (opacity = 1) => `rgba(194, 24, 91, ${opacity})`,
      }],
    };
  })();

  const summary = statsData?.periodSummary;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* ── Encabezado ────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>Estadísticas</Text>
          <Text style={styles.headerSubtitle}>
            {customRange && period === 'custom'
              ? `${customRange.startDate} — ${customRange.endDate}`
              : PERIOD_OPTIONS.find(p => p.value === period)?.label ?? 'Hoy'}
          </Text>
        </View>
        <Feather name="bar-chart-2" size={24} color={Colors.primary} />
      </View>

      {/* ── Selector de período ────────────────────────────────────────── */}
      <View style={styles.periodSelector}>
        {PERIOD_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.periodButton,
              period === opt.value && styles.periodButtonActive,
            ]}
            onPress={() => {
              if (opt.value === 'custom') {
                openModal();
              } else {
                setStatsPeriod(opt.value);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.periodButtonText,
              period === opt.value && styles.periodButtonTextActive,
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Calculando estadísticas...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Sin datos ─────────────────────────────────────────────── */}
          {!summary || summary.shiftsCount === 0 ? (
            <View style={styles.emptyWrapper}>
              <Feather name="bar-chart-2" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Sin datos en este período</Text>
              <Text style={styles.emptyDescription}>
                Cierra al menos un turno en el período seleccionado para ver estadísticas.
              </Text>
            </View>
          ) : (
            <>
              {/* ── Tarjetas de resumen ─────────────────────────────────── */}
              <View style={styles.summaryGrid}>
                <SummaryCard
                  label="Recaudado"
                  value={formatCurrency(summary.totalRevenue)}
                  icon="dollar-sign"
                  color={Colors.primary}
                  bg={Colors.primaryLight}
                  hint={`${summary.shiftsCount} turno${summary.shiftsCount !== 1 ? 's' : ''}`}
                />
                <SummaryCard
                  label="Invertido"
                  value={formatCurrency(summary.totalInvested)}
                  icon="shopping-bag"
                  color={Colors.warning}
                  bg={Colors.warningLight}
                />
                <SummaryCard
                  label={summary.netProfit >= 0 ? 'Ganancia' : 'Pérdida'}
                  value={formatCurrency(Math.abs(summary.netProfit))}
                  icon={summary.netProfit >= 0 ? 'trending-up' : 'trending-down'}
                  color={summary.netProfit >= 0 ? Colors.success : Colors.error}
                  bg={summary.netProfit >= 0 ? Colors.successLight : Colors.errorLight}
                />
                {summary.bestDay && (
                  <SummaryCard
                    label="Mejor día"
                    value={formatCurrency(summary.bestDayProfit)}
                    icon="star"
                    color={Colors.secondary}
                    bg={Colors.secondaryLight}
                    hint={new Date(summary.bestDay + 'T00:00:00').toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short',
                    })}
                  />
                )}
              </View>

              {/* ── Gráfico de líneas ──────────────────────────────────── */}
              {lineData && (
                <Card variant="elevated" style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Evolución del período</Text>
                  <Text style={styles.chartSubtitle}>
                    Ganancia · Recaudado · Invertido
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={lineData}
                      width={Math.max(CHART_WIDTH, lineData.labels.length * 60)}
                      height={220}
                      chartConfig={CHART_CONFIG}
                      bezier
                      style={styles.chart}
                      withInnerLines
                      withOuterLines={false}
                      fromZero
                    />
                  </ScrollView>
                  <View style={styles.legend}>
                    {[
                      { color: Colors.success, label: 'Ganancia' },
                      { color: Colors.primary, label: 'Recaudado' },
                      { color: Colors.warning, label: 'Invertido' },
                    ].map(item => (
                      <View key={item.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              {/* ── Gráfico de pastel ──────────────────────────────────── */}
              {pieData && pieData.length > 0 && (
                <Card variant="elevated" style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Distribución del dinero</Text>
                  <Text style={styles.chartSubtitle}>
                    Proporción de ganancia vs inversión
                  </Text>
                  <PieChart
                    data={pieData}
                    width={CHART_WIDTH}
                    height={180}
                    chartConfig={CHART_CONFIG}
                    accessor="value"
                    backgroundColor="transparent"
                    paddingLeft="16"
                    absolute={false}
                    style={styles.chart}
                  />
                  <View style={styles.pieBreakdown}>
                    <View style={styles.pieBreakdownItem}>
                      <Text style={styles.pieBreakdownLabel}>Margen de ganancia</Text>
                      <Text style={[styles.pieBreakdownValue, { color: Colors.success }]}>
                        {summary.totalRevenue > 0
                          ? `${((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)}%`
                          : '0%'}
                      </Text>
                    </View>
                    <View style={styles.pieBreakdownDivider} />
                    <View style={styles.pieBreakdownItem}>
                      <Text style={styles.pieBreakdownLabel}>Costo sobre venta</Text>
                      <Text style={[styles.pieBreakdownValue, { color: Colors.warning }]}>
                        {summary.totalRevenue > 0
                          ? `${((summary.totalInvested / summary.totalRevenue) * 100).toFixed(1)}%`
                          : '0%'}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}

              {/* ── Gráfico de barras (insumos) ────────────────────────── */}
              {barData && (
                <Card variant="elevated" style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Insumos más utilizados</Text>
                  <Text style={styles.chartSubtitle}>
                    Top 5 por cantidad usada
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={barData}
                      width={Math.max(CHART_WIDTH, barData.labels.length * 70)}
                      height={200}
                      chartConfig={{
                        ...CHART_CONFIG,
                        color: (opacity = 1) => `rgba(194, 24, 91, ${opacity})`,
                      }}
                      style={styles.chart}
                      fromZero
                      showValuesOnTopOfBars
                      yAxisLabel=""
                      yAxisSuffix=""
                    />
                  </ScrollView>
                </Card>
              )}

              {/* ── Ranking de insumos ─────────────────────────────────── */}
              {statsData?.topIngredients.length ? (
                <Card variant="elevated" style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Ranking de insumos</Text>
                  <Text style={styles.chartSubtitle}>
                    Por cantidad total utilizada
                  </Text>

                  {statsData.topIngredients.map((ing, index) => {
                    const maxUsed = statsData.topIngredients[0].totalUsed;
                    const pct     = maxUsed > 0 ? (ing.totalUsed / maxUsed) * 100 : 0;

                    return (
                      <View key={ing.ingredientId} style={styles.rankingItem}>
                        <View style={styles.rankingLeft}>
                          <View style={[
                            styles.rankingNumber,
                            { backgroundColor: index === 0 ? Colors.secondary : Colors.surfaceAlt },
                          ]}>
                            <Text style={[
                              styles.rankingNumberText,
                              { color: index === 0 ? Colors.textOnPrimary : Colors.textSecondary },
                            ]}>
                              {index + 1}
                            </Text>
                          </View>
                          <View style={styles.rankingInfo}>
                            <Text style={styles.rankingName}>{ing.ingredientName}</Text>
                            <Text style={styles.rankingMeta}>
                              {ing.totalUsed.toFixed(2)} {ing.unit}
                              {' · '}{ing.timesUsed} vez{ing.timesUsed !== 1 ? 'es' : ''}
                              {' · '}{formatCurrency(ing.totalCost)}
                            </Text>
                            <View style={styles.rankingBar}>
                              <View
                                style={[
                                  styles.rankingBarFill,
                                  {
                                    width:           `${pct}%`,
                                    backgroundColor: index === 0
                                      ? Colors.primary
                                      : Colors.primaryLight,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              ) : null}

              {/* ── Estadísticas diarias ───────────────────────────────── */}
              {statsData?.dailyStats.length ? (
                <Card variant="elevated" style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Detalle por día</Text>

                  {statsData.dailyStats.map((day, index) => {
                    const isProfit = day.netProfit >= 0;
                    const date     = new Date(day.date + 'T00:00:00');
                    const label    = date.toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day:     'numeric',
                      month:   'short',
                    });

                    return (
                      <View key={day.date}>
                        <View style={styles.dayRow}>
                          <View style={styles.dayLeft}>
                            <Text style={styles.dayDate}>{label}</Text>
                            <Text style={styles.dayShifts}>
                              {day.shiftsCount} turno{day.shiftsCount !== 1 ? 's' : ''}
                            </Text>
                          </View>
                          <View style={styles.dayRight}>
                            <View style={styles.dayMetrics}>
                              <Text style={styles.dayMetricLabel}>Recaudado</Text>
                              <Text style={styles.dayMetricValue}>
                                {formatCurrency(day.totalRevenue)}
                              </Text>
                            </View>
                            <View style={styles.dayMetrics}>
                              <Text style={styles.dayMetricLabel}>Ganancia</Text>
                              <Text style={[
                                styles.dayMetricValue,
                                { color: isProfit ? Colors.success : Colors.error },
                              ]}>
                                {formatCurrency(Math.abs(day.netProfit))}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {index < statsData.dailyStats.length - 1 && (
                          <View style={styles.divider} />
                        )}
                      </View>
                    );
                  })}
                </Card>
              ) : null}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Modal rango personalizado (animado) ────────────────────────── */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="none"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        {/* Overlay animado */}
        <Animated.View
          style={[
            styles.modalOverlay,
            { opacity: overlayAnim },
          ]}
        >
          {/* Cerrar tocando fuera del sheet */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
          />

          {/* Sheet animado */}
          <Animated.View
            style={[
              styles.modalSheet,
              {
                transform: [{
                  translateY: sheetAnim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: [MODAL_SHEET_OFFSET, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rango personalizado</Text>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.modalClose}
              >
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.dateInputWrapper}>
                <Text style={styles.dateInputLabel}>Fecha inicio</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="AAAA-MM-DD"
                  value={customStart}
                  onChangeText={setCustomStart}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.dateInputWrapper}>
                <Text style={styles.dateInputLabel}>Fecha fin</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="AAAA-MM-DD"
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.dateHint}>
                Formato: año-mes-día · Ejemplo: 2026-09-01
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalApplyButton,
                  (!customStart || !customEnd) && styles.modalApplyButtonDisabled,
                ]}
                onPress={handleApplyCustomRange}
                activeOpacity={0.8}
                disabled={!customStart || !customEnd}
              >
                <Text style={styles.modalApplyText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
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
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    marginTop: 2,
  },

  // ── Selector de período ───────────────────────────────────────────────────
  periodSelector: {
    flexDirection:     'row',
    backgroundColor:   Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical:   Spacing.sm,
    gap:               Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  periodButton: {
    flex:              1,
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius:      Radius.md,
    alignItems:        'center',
    backgroundColor:   Colors.background,
  },

  periodButtonActive: {
    backgroundColor: Colors.primary,
  },

  periodButtonText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },

  periodButtonTextActive: {
    color:      Colors.textOnPrimary,
    fontWeight: Typography.bold,
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingWrapper: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.md,
  },

  loadingText: {
    fontSize: Typography.base,
    color:    Colors.textSecondary,
  },

  // ── Empty ─────────────────────────────────────────────────────────────────
  emptyWrapper: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.md,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },

  emptyTitle: {
    fontSize:   Typography.lg,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },

  emptyDescription: {
    fontSize:  Typography.base,
    color:     Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * 1.5,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding:       Spacing.base,
    gap:           Spacing.md,
    paddingBottom: Spacing.xxxl,
    flexGrow:      1,
  },

  // ── Tarjetas de resumen ───────────────────────────────────────────────────
  summaryGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },

  summaryCard: {
    width:        '48.5%',
    borderRadius: Radius.lg,
    borderWidth:  1.5,
    padding:      Spacing.md,
    gap:          Spacing.xs,
    alignItems:   'flex-start',
    ...Shadows.sm,
  },

  summaryCardIcon: {
    width:          36,
    height:         36,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing.xs,
  },

  summaryCardLabel: {
    fontSize:  Typography.xs,
    color:     Colors.textSecondary,
    fontWeight: Typography.medium,
  },

  summaryCardValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
  },

  summaryCardHint: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  // ── Gráficos ──────────────────────────────────────────────────────────────
  chartCard: {
    gap:     Spacing.sm,
    padding: Spacing.md,
  },

  chartTitle: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  chartSubtitle: {
    fontSize:    Typography.xs,
    color:       Colors.textMuted,
    marginBottom: Spacing.xs,
  },

  chart: {
    borderRadius: Radius.md,
    marginTop:    Spacing.xs,
  },

  // ── Leyenda ───────────────────────────────────────────────────────────────
  legend: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            Spacing.md,
    marginTop:      Spacing.sm,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },

  legendDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },

  legendText: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },

  // ── Desglose pastel ───────────────────────────────────────────────────────
  pieBreakdown: {
    flexDirection:   'row',
    backgroundColor: Colors.background,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    marginTop:       Spacing.sm,
  },

  pieBreakdownItem: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  pieBreakdownDivider: {
    width:           1,
    backgroundColor: Colors.border,
    marginVertical:  Spacing.xs,
  },

  pieBreakdownLabel: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
  },

  pieBreakdownValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
  },

  // ── Ranking ───────────────────────────────────────────────────────────────
  rankingItem: {
    paddingVertical: Spacing.sm,
  },

  rankingLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
  },

  rankingNumber: {
    width:          28,
    height:         28,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  rankingNumberText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.bold,
  },

  rankingInfo: {
    flex: 1,
    gap:  4,
  },

  rankingName: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  rankingMeta: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  rankingBar: {
    height:          6,
    backgroundColor: Colors.background,
    borderRadius:    Radius.full,
    overflow:        'hidden',
    marginTop:       4,
  },

  rankingBarFill: {
    height:       6,
    borderRadius: Radius.full,
  },

  // ── Detalle diario ────────────────────────────────────────────────────────
  dayRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: Spacing.sm,
  },

  dayLeft: {
    flex: 1,
    gap:  2,
  },

  dayDate: {
    fontSize:      Typography.base,
    fontWeight:    Typography.medium,
    color:         Colors.textPrimary,
    textTransform: 'capitalize',
  },

  dayShifts: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  dayRight: {
    flexDirection: 'row',
    gap:           Spacing.md,
  },

  dayMetrics: {
    alignItems: 'flex-end',
    gap:        2,
  },

  dayMetricLabel: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  dayMetricValue: {
    fontSize:   Typography.sm,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  divider: {
    height:          1,
    backgroundColor: Colors.divider,
  },

  // ── Modal rango personalizado ─────────────────────────────────────────────
  modalOverlay: {
    flex:            1,
    backgroundColor: Colors.overlay,
    justifyContent:  'flex-end',
  },

  modalSheet: {
    backgroundColor:      Colors.surface,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadows.lg,
  },

  modalHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    padding:           Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  modalTitle: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  modalClose: {
    width:          36,
    height:         36,
    borderRadius:   Radius.full,
    backgroundColor: Colors.background,
    alignItems:     'center',
    justifyContent: 'center',
  },

  modalBody: {
    padding: Spacing.base,
    gap:     Spacing.md,
  },

  dateInputWrapper: {
    gap: Spacing.xs,
  },

  dateInputLabel: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },

  dateInput: {
    backgroundColor:   Colors.background,
    borderRadius:      Radius.md,
    borderWidth:       1.5,
    borderColor:       Colors.border,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize:          Typography.base,
    color:             Colors.textPrimary,
    minHeight:         48,
  },

  dateHint: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
  },

  modalFooter: {
    flexDirection:     'row',
    gap:               Spacing.sm,
    padding:           Spacing.base,
    borderTopWidth:    1,
    borderTopColor:    Colors.border,
  },

  modalCancelButton: {
    flex:              1,
    paddingVertical:   Spacing.md,
    borderRadius:      Radius.md,
    alignItems:        'center',
    backgroundColor:   Colors.background,
    borderWidth:       1,
    borderColor:       Colors.border,
  },

  modalCancelText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textSecondary,
  },

  modalApplyButton: {
    flex:            1,
    paddingVertical: Spacing.md,
    borderRadius:    Radius.md,
    alignItems:      'center',
    backgroundColor: Colors.primary,
  },

  modalApplyButtonDisabled: {
    opacity: 0.5,
  },

  modalApplyText: {
    fontSize:   Typography.base,
    fontWeight: Typography.bold,
    color:      Colors.textOnPrimary,
  },
});