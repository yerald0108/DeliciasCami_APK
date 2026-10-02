import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, UNIT_OPTIONS, DEFAULT_LOW_STOCK_THRESHOLD, formatCurrency } from '../../constants';
import { useIngredients, useIngredientActions } from '../../store';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { InventoryStackParams } from '../../navigation';
import { UnitOfMeasure } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<InventoryStackParams, 'IngredientForm'>;
type RoutePropType  = RouteProp<InventoryStackParams, 'IngredientForm'>;

// ─── Estado del formulario ────────────────────────────────────────────────────
interface FormState {
  name:               string;
  quantity:           string;
  unit:               UnitOfMeasure | '';
  totalCost:          string;
  lowStockThreshold:  string;
}

interface FormErrors {
  name?:              string;
  quantity?:          string;
  unit?:              string;
  totalCost?:         string;
  lowStockThreshold?: string;
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export const IngredientFormScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route      = useRoute<RoutePropType>();
  const { ingredientId } = route.params ?? {};
  const isEditing  = Boolean(ingredientId);

  const ingredients = useIngredients();
  const { createIngredient, updateIngredient, clearIngredientError } = useIngredientActions();

  const existing = ingredients.find(i => i.id === ingredientId);

  // ── Estado del formulario ─────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    name:              existing?.name              ?? '',
    quantity:          existing?.quantity.toString() ?? '',
    unit:              existing?.unit              ?? '',
    totalCost:         existing?.totalCost.toString() ?? '',
    lowStockThreshold: existing?.lowStockThreshold.toString() ?? '',
  });

  const [errors,    setErrors]    = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // ── Costo por unidad calculado automáticamente ────────────────────────────
  const costPerUnit = (() => {
    const qty  = parseFloat(form.quantity);
    const cost = parseFloat(form.totalCost);
    if (!isNaN(qty) && !isNaN(cost) && qty > 0) {
      return cost / qty;
    }
    return 0;
  })();

  // ── Umbral por defecto según unidad ──────────────────────────────────────
  useEffect(() => {
    if (form.unit && !isEditing && !form.lowStockThreshold) {
      setForm(prev => ({
        ...prev,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD[form.unit]?.toString() ?? '',
      }));
    }
  }, [form.unit]);

  // ── Actualizar campo ──────────────────────────────────────────────────────
  const setField = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ── Validación ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    const qty = parseFloat(form.quantity);
    if (!form.quantity || isNaN(qty) || qty < 0) {
      newErrors.quantity = 'Ingresa una cantidad válida';
    }

    if (!form.unit) {
      newErrors.unit = 'Selecciona una unidad de medida';
    }

    const cost = parseFloat(form.totalCost);
    if (!form.totalCost || isNaN(cost) || cost < 0) {
      newErrors.totalCost = 'Ingresa un costo válido';
    }

    const threshold = parseFloat(form.lowStockThreshold);
    if (!form.lowStockThreshold || isNaN(threshold) || threshold < 0) {
      newErrors.lowStockThreshold = 'Ingresa un umbral válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    setIsLoading(true);
    clearIngredientError();

    const payload = {
      name:              form.name.trim(),
      quantity:          parseFloat(form.quantity),
      unit:              form.unit as UnitOfMeasure,
      totalCost:         parseFloat(form.totalCost),
      costPerUnit,
      lowStockThreshold: parseFloat(form.lowStockThreshold),
    };

    try {
      const success = isEditing
        ? await updateIngredient(ingredientId!, payload)
        : await createIngredient(payload);

      if (success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', 'No se pudo guardar el insumo. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <ScreenHeader
        title={isEditing ? 'Editar insumo' : 'Nuevo insumo'}
        subtitle={isEditing ? existing?.name : undefined}
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
        {/* ── Información básica ───────────────────────────────────────── */}
        <Card variant="outlined" style={styles.section}>
          <Text style={styles.sectionTitle}>Información básica</Text>

          <Input
            label="Nombre del insumo"
            placeholder="Ej: Harina de trigo"
            value={form.name}
            onChangeText={v => setField('name', v)}
            error={errors.name}
            required
            autoCapitalize="words"
          />

          <SelectPicker
            label="Unidad de medida"
            options={UNIT_OPTIONS as any}
            value={form.unit || null}
            onChange={v => setField('unit', v)}
            error={errors.unit}
            required
          />

          <Input
            label="Cantidad en existencia"
            placeholder="Ej: 2.5"
            value={form.quantity}
            onChangeText={v => setField('quantity', v)}
            error={errors.quantity}
            required
            keyboardType="decimal-pad"
            rightIcon={
              form.unit ? (
                <Text style={styles.unitSuffix}>{form.unit}</Text>
              ) : undefined
            }
          />
        </Card>

        {/* ── Costos ──────────────────────────────────────────────────── */}
        <Card variant="outlined" style={styles.section}>
          <Text style={styles.sectionTitle}>Costos</Text>

          <Input
            label="Costo total del lote"
            placeholder="Ej: 5.00"
            value={form.totalCost}
            onChangeText={v => setField('totalCost', v)}
            error={errors.totalCost}
            required
            keyboardType="decimal-pad"
            hint="Lo que pagaste por la cantidad que compraste"
            leftIcon={
              <Text style={styles.currencyPrefix}>$</Text>
            }
          />

          {costPerUnit > 0 && (
            <View style={styles.costPreview}>
              <Feather name="info" size={14} color={Colors.info} />
              <Text style={styles.costPreviewText}>
                Costo por {form.unit || 'unidad'}:{' '}
                <Text style={styles.costPreviewValue}>
                  {formatCurrency(costPerUnit)}
                </Text>
              </Text>
            </View>
          )}
        </Card>

        {/* ── Alerta de stock ──────────────────────────────────────────── */}
        <Card variant="outlined" style={styles.section}>
          <Text style={styles.sectionTitle}>Alerta de stock bajo</Text>

          <Input
            label="Cantidad mínima"
            placeholder="Ej: 0.5"
            value={form.lowStockThreshold}
            onChangeText={v => setField('lowStockThreshold', v)}
            error={errors.lowStockThreshold}
            required
            keyboardType="decimal-pad"
            hint="Te avisaremos cuando el stock llegue a este valor"
            rightIcon={
              form.unit ? (
                <Text style={styles.unitSuffix}>{form.unit}</Text>
              ) : undefined
            }
          />
        </Card>

        {/* ── Botón guardar ────────────────────────────────────────────── */}
        <Button
          label={isEditing ? 'Guardar cambios' : 'Agregar insumo'}
          onPress={handleSave}
          loading={isLoading}
          fullWidth
          size="lg"
          style={styles.saveButton}
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
    padding: Spacing.base,
    gap:     Spacing.md,
    paddingBottom: Spacing.xxxl,
  },

  section: {
    gap: Spacing.md,
  },

  sectionTitle: {
    fontSize:     Typography.sm,
    fontWeight:   Typography.semibold,
    color:        Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  Spacing.xs,
  },

  costPreview: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.xs,
    backgroundColor: Colors.infoLight,
    borderRadius:    Radius.sm,
    padding:         Spacing.sm,
  },

  costPreviewText: {
    fontSize: Typography.sm,
    color:    Colors.info,
  },

  costPreviewValue: {
    fontWeight: Typography.bold,
    color:      Colors.info,
  },

  unitSuffix: {
    fontSize:    Typography.sm,
    color:       Colors.textSecondary,
    fontWeight:  Typography.medium,
    paddingRight: Spacing.sm,
  },

  currencyPrefix: {
    fontSize:   Typography.base,
    color:      Colors.textSecondary,
    fontWeight: Typography.medium,
    paddingLeft: Spacing.sm,
  },

  saveButton: {
    marginTop: Spacing.sm,
  },
});