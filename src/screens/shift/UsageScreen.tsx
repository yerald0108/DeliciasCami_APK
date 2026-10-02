import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows, formatCurrency, formatQuantity } from '../../constants';
import { useCurrentShift, useShiftActions } from '../../store';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ShiftStackParams } from '../../navigation';
import { ShiftEntry } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<ShiftStackParams, 'UsageScreen'>;

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export const UsageScreen: React.FC = () => {
  const navigation   = useNavigation<NavigationProp>();
  const currentShift = useCurrentShift();
  const { removeEntry } = useShiftActions();

  const entries = currentShift?.entries.filter(e => e.type === 'usage') ?? [];
  const total   = entries.reduce((s, e) => s + e.totalCost, 0);

  const handleRemove = (entry: ShiftEntry) => {
    Alert.alert(
      'Quitar insumo',
      `¿Quitar "${entry.ingredientName}" del turno?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text:    'Quitar',
          style:   'destructive',
          onPress: () => removeEntry(entry.id),
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Insumos utilizados"
        subtitle="Cuentan en el cuadre del día"
        leftAction={{
          icon:    <Feather name="arrow-left" size={20} color={Colors.textPrimary} />,
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          icon:    <Feather name="plus" size={22} color={Colors.primary} />,
          onPress: () => navigation.navigate('AddDessert', { entryType: 'usage' }),
        }}
      />

      {/* ── Resumen de inversión ───────────────────────────────────── */}
      {entries.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryBarItem}>
            <Text style={styles.summaryBarLabel}>Registros</Text>
            <Text style={styles.summaryBarValue}>{entries.length}</Text>
          </View>
          <View style={styles.summaryBarDivider} />
          <View style={styles.summaryBarItem}>
            <Text style={styles.summaryBarLabel}>Total invertido</Text>
            <Text style={[styles.summaryBarValue, { color: Colors.primary }]}>
              {formatCurrency(total)}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Feather name="tool" size={48} color={Colors.textMuted} />}
            title="Sin insumos registrados"
            description="Registra los insumos que usas en tu producción del día."
            actionLabel="Registrar insumo"
            onAction={() => navigation.navigate('AddDessert', { entryType: 'usage' })}
          />
        }
        renderItem={({ item, index }) => (
          <Card variant="outlined" style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={[styles.entryIcon, { backgroundColor: Colors.primaryLight }]}>
                <Feather name="tool" size={16} color={Colors.primary} />
              </View>
              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{item.ingredientName}</Text>
                <Text style={styles.entryMeta}>
                  {formatQuantity(item.quantityUsed, item.unit)}
                  {' · '}{formatCurrency(item.costAtTime)}/{item.unit}
                </Text>
                {item.note && (
                  <Text style={styles.entryNote}>{item.note}</Text>
                )}
              </View>
              <View style={styles.entryRight}>
                <Text style={[styles.entryCost, { color: Colors.primary }]}>
                  {formatCurrency(item.totalCost)}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(item)}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={14} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListFooterComponent={
          entries.length > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total invertido</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          ) : null
        }
      />

      {/* ── Botón agregar ─────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Button
          label="Registrar insumo utilizado"
          onPress={() => navigation.navigate('AddDessert', { entryType: 'usage' })}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Feather name="plus-circle" size={18} color={Colors.textOnPrimary} />}
        />
      </View>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: Colors.background,
  },

  summaryBar: {
    flexDirection:     'row',
    backgroundColor:   Colors.primaryLight,
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
  },

  summaryBarItem: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  summaryBarDivider: {
    width:           1,
    backgroundColor: Colors.primary,
    opacity:         0.3,
    marginVertical:  Spacing.xs,
  },

  summaryBarLabel: {
    fontSize: Typography.xs,
    color:    Colors.primaryDark,
    opacity:  0.8,
  },

  summaryBarValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  listContent: {
    padding:    Spacing.base,
    flexGrow:   1,
    paddingBottom: Spacing.xxxl,
  },

  entryCard: {
    padding: Spacing.md,
  },

  entryRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },

  entryIcon: {
    width:          36,
    height:         36,
    borderRadius:   Radius.sm,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  entryInfo: {
    flex: 1,
    gap:  2,
  },

  entryName: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  entryMeta: {
    fontSize: Typography.sm,
    color:    Colors.textSecondary,
  },

  entryNote: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    fontStyle: 'italic',
  },

  entryRight: {
    alignItems:  'flex-end',
    gap:         Spacing.xs,
    flexShrink:  0,
  },

  entryCost: {
    fontSize:   Typography.base,
    fontWeight: Typography.bold,
  },

  removeButton: {
    width:           30,
    height:          30,
    borderRadius:    Radius.full,
    backgroundColor: Colors.errorLight,
    alignItems:      'center',
    justifyContent:  'center',
  },

  totalRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginTop:         Spacing.md,
    paddingTop:        Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderTopWidth:    2,
    borderTopColor:    Colors.primary,
  },

  totalLabel: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textSecondary,
  },

  totalValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    color:      Colors.primary,
  },

  footer: {
    padding:         Spacing.base,
    backgroundColor: Colors.surface,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    ...Shadows.sm,
  },
});