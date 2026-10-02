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
type NavigationProp = NativeStackNavigationProp<ShiftStackParams, 'PurchaseScreen'>;

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export const PurchaseScreen: React.FC = () => {
  const navigation   = useNavigation<NavigationProp>();
  const currentShift = useCurrentShift();
  const { removeEntry } = useShiftActions();

  const entries = currentShift?.entries.filter(e => e.type === 'purchase') ?? [];

  const handleRemove = (entry: ShiftEntry) => {
    Alert.alert(
      'Quitar entrada',
      `¿Quitar la entrada de "${entry.ingredientName}"? Esto revertirá el stock.`,
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
        title="Entradas / Compras"
        subtitle="No cuentan en el cuadre del día"
        leftAction={{
          icon:    <Feather name="arrow-left" size={20} color={Colors.textPrimary} />,
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          icon:    <Feather name="plus" size={22} color={Colors.success} />,
          onPress: () => navigation.navigate('AddDessert', { entryType: 'purchase' }),
        }}
      />

      {/* ── Resumen ───────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryBarItem}>
            <Text style={styles.summaryBarLabel}>Compras registradas</Text>
            <Text style={[styles.summaryBarValue, { color: Colors.success }]}>
              {entries.length}
            </Text>
          </View>
          <View style={styles.summaryBarDivider} />
          <View style={styles.summaryBarItem}>
            <Text style={styles.summaryBarLabel}>Insumos distintos</Text>
            <Text style={[styles.summaryBarValue, { color: Colors.success }]}>
              {new Set(entries.map(e => e.ingredientId)).size}
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
            icon={<Feather name="arrow-down-circle" size={48} color={Colors.textMuted} />}
            title="Sin entradas registradas"
            description="Registra las compras que haces durante el turno. Se suman al inventario automáticamente."
            actionLabel="Registrar entrada"
            onAction={() => navigation.navigate('AddDessert', { entryType: 'purchase' })}
          />
        }
        renderItem={({ item }) => (
          <Card variant="outlined" style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={[styles.entryIcon, { backgroundColor: Colors.successLight }]}>
                <Feather name="arrow-down-circle" size={16} color={Colors.success} />
              </View>
              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{item.ingredientName}</Text>
                <Text style={styles.entryMeta}>
                  {formatQuantity(item.quantityUsed, item.unit)}
                </Text>
                {item.note && (
                  <Text style={styles.entryNote}>{item.note}</Text>
                )}
              </View>
              <View style={styles.entryRight}>
                <View style={styles.stockBadge}>
                  <Feather name="trending-up" size={12} color={Colors.success} />
                  <Text style={styles.stockBadgeText}>+Stock</Text>
                </View>
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
      />

      {/* ── Botón agregar ─────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Button
          label="Registrar entrada / compra"
          onPress={() => navigation.navigate('AddDessert', { entryType: 'purchase' })}
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
    backgroundColor:   Colors.successLight,
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.success,
  },

  summaryBarItem: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  summaryBarDivider: {
    width:           1,
    backgroundColor: Colors.success,
    opacity:         0.3,
    marginVertical:  Spacing.xs,
  },

  summaryBarLabel: {
    fontSize: Typography.xs,
    color:    Colors.success,
    opacity:  0.8,
  },

  summaryBarValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
  },

  listContent: {
    padding:       Spacing.base,
    flexGrow:      1,
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

  stockBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   Colors.successLight,
    borderRadius:      Radius.full,
    paddingVertical:   2,
    paddingHorizontal: Spacing.sm,
    borderWidth:       1,
    borderColor:       Colors.success,
  },

  stockBadgeText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
    color:      Colors.success,
  },

  removeButton: {
    width:           30,
    height:          30,
    borderRadius:    Radius.full,
    backgroundColor: Colors.errorLight,
    alignItems:      'center',
    justifyContent:  'center',
  },

  footer: {
    padding:         Spacing.base,
    backgroundColor: Colors.surface,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    ...Shadows.sm,
  },
});