import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows, formatCurrency, formatQuantity, UNIT_LABELS } from '../../constants';
import { useIngredients, useLowStockItems, useIsLoadingIngredients, useIngredientActions } from '../../store';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { InventoryStackParams } from '../../navigation';
import { Ingredient } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<InventoryStackParams, 'InventoryList'>;

// ─── Componente de fila de ingrediente ───────────────────────────────────────
const IngredientRow: React.FC<{
  ingredient: Ingredient;
  isLowStock: boolean;
  onEdit:     () => void;
  onDelete:   () => void;
}> = ({ ingredient, isLowStock, onEdit, onDelete }) => (
  <Card variant="elevated" style={styles.ingredientCard}>
    <View style={styles.ingredientHeader}>
      <View style={styles.ingredientInfo}>
        <Text style={styles.ingredientName}>{ingredient.name}</Text>
        <Text style={styles.ingredientUnit}>
          {UNIT_LABELS[ingredient.unit]}
        </Text>
      </View>
      <View style={styles.ingredientActions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onEdit}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={16} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, styles.iconButtonDanger]}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.ingredientStats}>
      <View style={styles.stat}>
        <Text style={styles.statLabel}>En existencia</Text>
        <Text style={styles.statValue}>
          {formatQuantity(ingredient.quantity, ingredient.unit)}
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.stat}>
        <Text style={styles.statLabel}>Costo por unidad</Text>
        <Text style={styles.statValue}>
          {formatCurrency(ingredient.costPerUnit)}
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.stat}>
        <Text style={styles.statLabel}>Costo total</Text>
        <Text style={styles.statValue}>
          {formatCurrency(ingredient.totalCost)}
        </Text>
      </View>
    </View>

    {isLowStock && (
      <View style={styles.lowStockBanner}>
        <Feather name="alert-triangle" size={13} color={Colors.warning} />
        <Text style={styles.lowStockText}>
          Stock bajo — mínimo {formatQuantity(ingredient.lowStockThreshold, ingredient.unit)}
        </Text>
      </View>
    )}
  </Card>
);

// ─── Pantalla principal ───────────────────────────────────────────────────────
export const InventoryListScreen: React.FC = () => {
  const navigation    = useNavigation<NavigationProp>();
  const insets        = useSafeAreaInsets();
  const ingredients   = useIngredients();
  const lowStockItems = useLowStockItems();
  const isLoading     = useIsLoadingIngredients();
  const { loadIngredients, deleteIngredient } = useIngredientActions();

  const lowStockIds = new Set(lowStockItems.map(i => i.id));

  useEffect(() => {
    loadIngredients();
  }, []);

  const handleDelete = useCallback((ingredient: Ingredient) => {
    Alert.alert(
      'Eliminar insumo',
      `¿Seguro que quieres eliminar "${ingredient.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text:    'Eliminar',
          style:   'destructive',
          onPress: async () => {
            const success = await deleteIngredient(ingredient.id);
            if (!success) {
              Alert.alert(
                'No se puede eliminar',
                `"${ingredient.name}" fue usado en uno o más turnos. Solo puedes eliminar insumos que no hayan sido utilizados.`
              );
            }
          },
        },
      ]
    );
  }, [deleteIngredient]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View>
          <Text style={styles.headerTitle}>Inventario</Text>
          <Text style={styles.headerSubtitle}>
            {ingredients.length} insumo{ingredients.length !== 1 ? 's' : ''} registrado{ingredients.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {lowStockItems.length > 0 && (
            <Badge
              label={`${lowStockItems.length} bajo`}
              variant="warning"
              size="sm"
            />
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('IngredientForm', {})}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      <FlatList
        data={ingredients}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadIngredients}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<Feather name="package" size={48} color={Colors.textMuted} />}
              title="Sin insumos registrados"
              description="Agrega los ingredientes que usas para hacer tus postres."
              actionLabel="Agregar insumo"
              onAction={() => navigation.navigate('IngredientForm', {})}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <IngredientRow
            ingredient={item}
            isLowStock={lowStockIds.has(item.id)}
            onEdit={() => navigation.navigate('IngredientForm', { ingredientId: item.id })}
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

  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },

  addButton: {
    width:           40,
    height:          40,
    borderRadius:    Radius.full,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    ...Shadows.md,
  },

  listContent: {
    padding:    Spacing.base,
    flexGrow:   1,
  },

  separator: {
    height: Spacing.sm,
  },

  ingredientCard: {
    gap: Spacing.md,
  },

  ingredientHeader: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
  },

  ingredientInfo: {
    flex: 1,
    gap:  2,
  },

  ingredientName: {
    fontSize:   Typography.md,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  ingredientUnit: {
    fontSize: Typography.sm,
    color:    Colors.textSecondary,
  },

  ingredientActions: {
    flexDirection: 'row',
    gap:           Spacing.xs,
  },

  iconButton: {
    width:           34,
    height:          34,
    borderRadius:    Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems:      'center',
    justifyContent:  'center',
  },

  iconButtonDanger: {
    backgroundColor: Colors.errorLight,
  },

  ingredientStats: {
    flexDirection:   'row',
    backgroundColor: Colors.background,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
  },

  stat: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },

  statLabel: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    textAlign: 'center',
  },

  statValue: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },

  statDivider: {
    width:           1,
    backgroundColor: Colors.border,
    marginVertical:  Spacing.xs,
  },

  lowStockBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.xs,
    backgroundColor: Colors.warningLight,
    borderRadius:    Radius.sm,
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },

  lowStockText: {
    fontSize:   Typography.xs,
    color:      Colors.warning,
    fontWeight: Typography.medium,
  },
});