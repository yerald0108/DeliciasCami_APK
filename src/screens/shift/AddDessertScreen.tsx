import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, formatCurrency, formatQuantity, UNIT_OPTIONS, DEFAULT_LOW_STOCK_THRESHOLD } from '../../constants';
import { useIngredients, useShiftActions, useIngredientActions, useAppStore } from '../../store';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { ShiftStackParams } from '../../navigation';
import { Ingredient, ShiftEntryType, UnitOfMeasure } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<ShiftStackParams, 'AddDessert'>;
type RoutePropType  = RouteProp<ShiftStackParams, 'AddDessert'>;

type PurchaseMode = 'existing' | 'new';

// ─── Conversiones de unidades ─────────────────────────────────────────────────
type UnitConversion = {
  from: UnitOfMeasure;
  to:   UnitOfMeasure;
  factor: number; // cuántas unidades "to" hay en 1 "from"
};

const UNIT_CONVERSIONS: UnitConversion[] = [
  { from: 'kg', to: 'g',  factor: 0.001 },
  { from: 'g',  to: 'kg', factor: 1000 },
  { from: 'l',  to: 'ml', factor: 0.001 },
  { from: 'ml', to: 'l',  factor: 1000 },
];

// Devuelve las unidades compatibles para registrar uso de un ingrediente
function getCompatibleUnits(unit: UnitOfMeasure): UnitOfMeasure[] {
  const related = UNIT_CONVERSIONS
    .filter(c => c.from === unit)
    .map(c => c.to);
  return [unit, ...related];
}

// Convierte una cantidad de unidad "from" a unidad "to"
// Retorna la cantidad ya en la unidad base del ingrediente
function convertToBase(
  quantity: number,
  fromUnit: UnitOfMeasure,
  toUnit:   UnitOfMeasure
): number {
  if (fromUnit === toUnit) return quantity;
  const conversion = UNIT_CONVERSIONS.find(
    c => c.from === fromUnit && c.to === toUnit
  );
  if (!conversion) return quantity;
  return quantity / conversion.factor;
}

// ─── Configuración por tipo de entrada ───────────────────────────────────────
const ENTRY_CONFIG: Record<ShiftEntryType, {
  title:     string;
  subtitle:  string;
  color:     string;
  bg:        string;
  icon:      string;
  showCost:  boolean;
  hint:      string;
  noteLabel: string;
}> = {
  usage: {
    title:     'Registrar insumo utilizado',
    subtitle:  'Cuenta en el cuadre del día',
    color:     Colors.primary,
    bg:        Colors.primaryLight,
    icon:      'tool',
    showCost:  true,
    hint:      'Insumo usado en producción. Descuenta del inventario y cuenta como inversión.',
    noteLabel: 'Observación (opcional)',
  },
  purchase: {
    title:     'Registrar entrada / compra',
    subtitle:  'No cuenta en el cuadre',
    color:     Colors.success,
    bg:        Colors.successLight,
    icon:      'arrow-down-circle',
    showCost:  false,
    hint:      'Compra realizada durante el turno. Aumenta el inventario sin afectar el cuadre.',
    noteLabel: 'Proveedor o detalle (opcional)',
  },
  output: {
    title:     'Registrar salida',
    subtitle:  'No cuenta en el cuadre',
    color:     Colors.info,
    bg:        Colors.infoLight,
    icon:      'arrow-up-circle',
    showCost:  false,
    hint:      'Producto que sale para consumo familiar. Descuenta del inventario sin afectar el cuadre.',
    noteLabel: 'Motivo (opcional)',
  },
  waste: {
    title:     'Registrar merma',
    subtitle:  'No cuenta en el cuadre',
    color:     Colors.warning,
    bg:        Colors.warningLight,
    icon:      'alert-triangle',
    showCost:  false,
    hint:      'Producto dañado o desperdiciado. Descuenta del inventario sin afectar el cuadre.',
    noteLabel: 'Causa de la merma (opcional)',
  },
};

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export const AddDessertScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route      = useRoute<RoutePropType>();
  const entryType  = route.params?.entryType ?? 'usage';
  const config     = ENTRY_CONFIG[entryType];

  const ingredients = useIngredients();
  const { addEntry } = useShiftActions();
  const { createIngredient, loadIngredients } = useIngredientActions();

  // ── Modo de compra (solo para purchase) ──────────────────────────────────
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>('existing');

  // ── Estado para producto existente ────────────────────────────────────────
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [quantityUsed,       setQuantityUsed]        = useState('');
  const [note,               setNote]                = useState('');
  const [quantityError,      setQuantityError]        = useState('');
  const [searchQuery,        setSearchQuery]          = useState('');

  // ── Unidad de registro (puede diferir de la unidad base del ingrediente) ──
  const [selectedUnit, setSelectedUnit] = useState<UnitOfMeasure | null>(null);

  // ── Estado para producto nuevo (solo purchase) ────────────────────────────
  const [newName,          setNewName]          = useState('');
  const [newUnit,          setNewUnit]          = useState<UnitOfMeasure | ''>('');
  const [newQuantity,      setNewQuantity]      = useState('');
  const [newTotalCost,     setNewTotalCost]     = useState('');
  const [newThreshold,     setNewThreshold]     = useState('');
  const [newNote,          setNewNote]          = useState('');
  const [newErrors,        setNewErrors]        = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);

  // ── Costo por unidad calculado ────────────────────────────────────────────
  const newCostPerUnit = (() => {
    const qty  = parseFloat(newQuantity);
    const cost = parseFloat(newTotalCost);
    if (!isNaN(qty) && !isNaN(cost) && qty > 0) return cost / qty;
    return 0;
  })();

  // ── Costo en tiempo real para usage ──────────────────────────────────────
  const calculatedCost = (() => {
    if (!selectedIngredient || entryType !== 'usage') return 0;
    const qty     = parseFloat(quantityUsed) || 0;
    const unit    = selectedUnit ?? selectedIngredient.unit;
    const qtyBase = convertToBase(qty, unit, selectedIngredient.unit);
    return qtyBase * selectedIngredient.costPerUnit;
  })();

  // ── Filtro de búsqueda ────────────────────────────────────────────────────
  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Seleccionar ingrediente existente ───────────────────────────────────── 
  const handleSelectIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSelectedUnit(ingredient.unit); // por defecto la unidad base
    setQuantityUsed('');
    setQuantityError('');
    setSearchQuery('');
  };

  // ── Validar formulario de producto existente ──────────────────────────────
  const validateExisting = (): boolean => {
    if (!selectedIngredient) return false;

    const qty      = parseFloat(quantityUsed);
    const unit     = selectedUnit ?? selectedIngredient.unit;
    const qtyBase  = convertToBase(qty, unit, selectedIngredient.unit);

    if (!quantityUsed || isNaN(qty) || qty <= 0) {
      setQuantityError('Ingresa una cantidad válida');
      return false;
    }
    if (
      (entryType === 'usage' || entryType === 'output' || entryType === 'waste') &&
      qtyBase > selectedIngredient.quantity
    ) {
      setQuantityError(
        `Solo tienes ${formatQuantity(selectedIngredient.quantity, selectedIngredient.unit)} disponible`
      );
      return false;
    }
    setQuantityError('');
    return true;
  };

  // ── Validar formulario de producto nuevo ──────────────────────────────────
  const validateNew = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newName.trim())
      errors.name = 'El nombre es obligatorio';

    const qty = parseFloat(newQuantity);
    if (!newQuantity || isNaN(qty) || qty <= 0)
      errors.quantity = 'Ingresa una cantidad válida';

    if (!newUnit)
      errors.unit = 'Selecciona una unidad de medida';

    const cost = parseFloat(newTotalCost);
    if (!newTotalCost || isNaN(cost) || cost < 0)
      errors.totalCost = 'Ingresa un costo válido';

    const threshold = parseFloat(newThreshold);
    if (!newThreshold || isNaN(threshold) || threshold < 0)
      errors.threshold = 'Ingresa un umbral válido';

    setNewErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Guardar producto existente ────────────────────────────────────────────
  const handleSaveExisting = async () => {
    if (!validateExisting() || !selectedIngredient) return;

    setIsLoading(true);
    try {
      const qty     = parseFloat(quantityUsed);
      const unit    = selectedUnit ?? selectedIngredient.unit;
      // Convertir a la unidad base para descontar del inventario correctamente
      const qtyBase = convertToBase(qty, unit, selectedIngredient.unit);

      // El costo se calcula sobre la cantidad en unidad base
      const costAtTime = selectedIngredient.costPerUnit;

      const success = await addEntry({
        type:           entryType,
        ingredientId:   selectedIngredient.id,
        ingredientName: selectedIngredient.name,
        quantityUsed:   qtyBase,   // siempre en unidad base
        unit:           selectedIngredient.unit,
        costAtTime,
        note:           note.trim() || undefined,
      });

      if (success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', 'No se pudo registrar. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Guardar producto nuevo (purchase) ─────────────────────────────────────
  const handleSaveNew = async () => {
    if (!validateNew()) return;

    setIsLoading(true);
    try {
      const qty         = parseFloat(newQuantity);
      const totalCost   = parseFloat(newTotalCost);
      const costPerUnit = newCostPerUnit;
      const threshold   = parseFloat(newThreshold);

      // Crear el ingrediente en el inventario
      const created = await createIngredient({
        name:              newName.trim(),
        quantity:          qty,
        unit:              newUnit as UnitOfMeasure,
        totalCost,
        costPerUnit,
        lowStockThreshold: threshold,
      });

      if (!created) {
        Alert.alert('Error', 'No se pudo crear el insumo. Intenta de nuevo.');
        return;
      }

      // Recargar inventario para obtener el nuevo ingrediente con su ID real
      await loadIngredients();

      // El store ya tiene el ingrediente actualizado, buscarlo por nombre
      const allIngredients = useAppStore.getState().ingredients;
      const fresh = allIngredients.find(
        i => i.name.trim().toLowerCase() === newName.trim().toLowerCase()
      );

      if (!fresh) {
        Alert.alert('Error', 'No se pudo encontrar el insumo creado.');
        return;
      }

      // Registrar la entrada en el turno
      const success = await addEntry({
        type:           'purchase',
        ingredientId:   fresh.id,
        ingredientName: fresh.name,
        quantityUsed:   qty,
        unit:           fresh.unit,
        costAtTime:     fresh.costPerUnit,
        note:           newNote.trim() || undefined,
      });

      if (success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', 'No se pudo registrar la entrada. Intenta de nuevo.');
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
      <ScreenHeader
        title={config.title}
        subtitle={config.subtitle}
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
        {/* ── Banner informativo ────────────────────────────────────── */}
        <View style={[styles.infoBanner, { backgroundColor: config.bg }]}>
          <Feather name={config.icon as any} size={16} color={config.color} />
          <Text style={[styles.infoBannerText, { color: config.color }]}>
            {config.hint}
          </Text>
        </View>

        {/* ── Selector de modo (solo para purchase) ────────────────── */}
        {entryType === 'purchase' && (
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                purchaseMode === 'existing' && styles.modeButtonActive,
              ]}
              onPress={() => {
                setPurchaseMode('existing');
                setSelectedIngredient(null);
                setQuantityUsed('');
                setQuantityError('');
              }}
              activeOpacity={0.8}
            >
              <Feather
                name="package"
                size={16}
                color={purchaseMode === 'existing' ? Colors.textOnPrimary : Colors.textSecondary}
              />
              <Text style={[
                styles.modeButtonText,
                purchaseMode === 'existing' && styles.modeButtonTextActive,
              ]}>
                Producto existente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                purchaseMode === 'new' && styles.modeButtonActive,
              ]}
              onPress={() => {
                setPurchaseMode('new');
                setSelectedIngredient(null);
                setQuantityUsed('');
                setQuantityError('');
              }}
              activeOpacity={0.8}
            >
              <Feather
                name="plus-circle"
                size={16}
                color={purchaseMode === 'new' ? Colors.textOnPrimary : Colors.textSecondary}
              />
              <Text style={[
                styles.modeButtonText,
                purchaseMode === 'new' && styles.modeButtonTextActive,
              ]}>
                Producto nuevo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Formulario producto nuevo (solo purchase + new) ──────── */}
        {entryType === 'purchase' && purchaseMode === 'new' ? (
          <>
            <Card variant="outlined" style={styles.section}>
              <Text style={styles.sectionTitle}>Información del insumo</Text>

              <Input
                label="Nombre del insumo"
                placeholder="Ej: Harina de trigo"
                value={newName}
                onChangeText={v => {
                  setNewName(v);
                  if (newErrors.name) setNewErrors(p => ({ ...p, name: undefined as any }));
                }}
                error={newErrors.name}
                required
                autoCapitalize="words"
              />

              <SelectPicker
                label="Unidad de medida"
                options={UNIT_OPTIONS as any}
                value={newUnit || null}
                onChange={v => {
                  setNewUnit(v as UnitOfMeasure);
                  setNewThreshold(DEFAULT_LOW_STOCK_THRESHOLD[v]?.toString() ?? '');
                  if (newErrors.unit) setNewErrors(p => ({ ...p, unit: undefined as any }));
                }}
                error={newErrors.unit}
                required
              />

              <Input
                label="Cantidad que ingresa"
                placeholder="Ej: 2.5"
                value={newQuantity}
                onChangeText={v => {
                  setNewQuantity(v);
                  if (newErrors.quantity) setNewErrors(p => ({ ...p, quantity: undefined as any }));
                }}
                error={newErrors.quantity}
                required
                keyboardType="decimal-pad"
                rightIcon={
                  newUnit ? <Text style={styles.unitSuffix}>{newUnit}</Text> : undefined
                }
              />
            </Card>

            <Card variant="outlined" style={styles.section}>
              <Text style={styles.sectionTitle}>Costo</Text>

              <Input
                label="Costo total del lote"
                placeholder="0.00"
                value={newTotalCost}
                onChangeText={v => {
                  setNewTotalCost(v);
                  if (newErrors.totalCost) setNewErrors(p => ({ ...p, totalCost: undefined as any }));
                }}
                error={newErrors.totalCost}
                required
                keyboardType="decimal-pad"
                hint="Lo que pagaste por esta cantidad"
                leftIcon={<Text style={styles.currencyPrefix}>$</Text>}
              />

              {newCostPerUnit > 0 && (
                <View style={[styles.costPreview, { backgroundColor: config.bg, borderColor: config.color }]}>
                  <Text style={[styles.costPreviewLabel, { color: config.color }]}>
                    Costo por {newUnit || 'unidad'}:
                  </Text>
                  <Text style={[styles.costPreviewValue, { color: config.color }]}>
                    {formatCurrency(newCostPerUnit)}
                  </Text>
                </View>
              )}

              <Input
                label="Alerta de stock mínimo"
                placeholder="Ej: 0.5"
                value={newThreshold}
                onChangeText={v => {
                  setNewThreshold(v);
                  if (newErrors.threshold) setNewErrors(p => ({ ...p, threshold: undefined as any }));
                }}
                error={newErrors.threshold}
                required
                keyboardType="decimal-pad"
                rightIcon={
                  newUnit ? <Text style={styles.unitSuffix}>{newUnit}</Text> : undefined
                }
              />

              <Input
                label="Proveedor o detalle (opcional)"
                placeholder="Escribe aquí..."
                value={newNote}
                onChangeText={setNewNote}
              />
            </Card>

            <Button
              label="Agregar al inventario y registrar entrada"
              onPress={handleSaveNew}
              loading={isLoading}
              fullWidth
              size="lg"
              style={styles.saveButton}
              leftIcon={
                <Feather name="plus-circle" size={18} color={Colors.textOnPrimary} />
              }
            />
          </>
        ) : (
          <>
            {/* ── Seleccionar insumo existente ──────────────────────── */}
            <Card variant="outlined" style={styles.section}>
              <Text style={styles.sectionTitle}>Seleccionar insumo</Text>

              {selectedIngredient ? (
                <View style={[styles.selectedIngredient, { borderColor: config.color }]}>
                  <View style={styles.selectedIngredientInfo}>
                    <Text style={styles.selectedIngredientName}>
                      {selectedIngredient.name}
                    </Text>
                    <Text style={styles.selectedIngredientMeta}>
                      Disponible: {formatQuantity(selectedIngredient.quantity, selectedIngredient.unit)}
                      {entryType === 'usage' && (
                        ` · ${formatCurrency(selectedIngredient.costPerUnit)}/${selectedIngredient.unit}`
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.changeButton, { borderColor: config.color }]}
                    onPress={() => {
                      setSelectedIngredient(null);
                      setQuantityUsed('');
                      setQuantityError('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.changeButtonText, { color: config.color }]}>
                      Cambiar
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Input
                    placeholder="Buscar insumo..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    leftIcon={
                      <Feather name="search" size={16} color={Colors.textMuted} />
                    }
                  />

                  {ingredients.length === 0 ? (
                    <View style={styles.emptyIngredients}>
                      <Text style={styles.emptyIngredientsText}>
                        No tienes insumos registrados. Agrega insumos en la sección de Inventario.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.ingredientsList}>
                      {filteredIngredients.map((ing, index) => (
                        <View key={ing.id}>
                          <TouchableOpacity
                            style={styles.ingredientItem}
                            onPress={() => handleSelectIngredient(ing)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.ingredientItemInfo}>
                              <Text style={styles.ingredientItemName}>{ing.name}</Text>
                              <Text style={styles.ingredientItemStock}>
                                {formatQuantity(ing.quantity, ing.unit)} disponible
                              </Text>
                            </View>
                            <View style={styles.ingredientItemRight}>
                              {entryType === 'usage' && (
                                <Text style={[styles.ingredientItemCost, { color: config.color }]}>
                                  {formatCurrency(ing.costPerUnit)}/{ing.unit}
                                </Text>
                              )}
                              <Feather name="chevron-right" size={16} color={Colors.textMuted} />
                            </View>
                          </TouchableOpacity>
                          {index < filteredIngredients.length - 1 && (
                            <View style={styles.ingredientDivider} />
                          )}
                        </View>
                      ))}
                      {filteredIngredients.length === 0 && (
                        <Text style={styles.noResults}>
                          No se encontraron insumos con ese nombre.
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </Card>

            {/* ── Cantidad ──────────────────────────────────────────── */}
            {selectedIngredient && (
              <Card variant="outlined" style={styles.section}>
                <Text style={styles.sectionTitle}>Cantidad</Text>

                {/* Selector de unidad si hay conversiones disponibles */}
                {getCompatibleUnits(selectedIngredient.unit).length > 1 && (
                  <View style={styles.unitSelector}>
                    <Text style={styles.unitSelectorLabel}>Unidad de registro:</Text>
                    <View style={styles.unitSelectorOptions}>
                      {getCompatibleUnits(selectedIngredient.unit).map(unit => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitOption,
                            (selectedUnit ?? selectedIngredient.unit) === unit
                              && styles.unitOptionActive,
                          ]}
                          onPress={() => {
                            setSelectedUnit(unit);
                            setQuantityUsed('');
                            setQuantityError('');
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={[
                            styles.unitOptionText,
                            (selectedUnit ?? selectedIngredient.unit) === unit
                              && styles.unitOptionTextActive,
                          ]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {(selectedUnit && selectedUnit !== selectedIngredient.unit) && (
                      <Text style={styles.unitConversionHint}>
                        Se convertirá automáticamente a {selectedIngredient.unit} para descontar del inventario
                      </Text>
                    )}
                  </View>
                )}

                <Input
                  label={`Cantidad en ${selectedUnit ?? selectedIngredient.unit}`}
                  placeholder="0"
                  value={quantityUsed}
                  onChangeText={v => {
                    setQuantityUsed(v);
                    if (quantityError) setQuantityError('');
                  }}
                  error={quantityError}
                  required
                  keyboardType="decimal-pad"
                  autoFocus
                  rightIcon={
                    <Text style={styles.unitSuffix}>
                      {selectedUnit ?? selectedIngredient.unit}
                    </Text>
                  }
                />

                {entryType === 'usage' && calculatedCost > 0 && (
                  <View style={[styles.costPreview, { backgroundColor: config.bg, borderColor: config.color }]}>
                    <View style={styles.costPreviewRow}>
                      <Text style={[styles.costPreviewLabel, { color: config.color }]}>
                        Costo de esta entrada
                      </Text>
                      <Text style={[styles.costPreviewValue, { color: config.color }]}>
                        {formatCurrency(calculatedCost)}
                      </Text>
                    </View>
                    <Text style={[styles.costPreviewFormula, { color: config.color }]}>
                      {quantityUsed} {selectedUnit ?? selectedIngredient.unit}
                      {selectedUnit && selectedUnit !== selectedIngredient.unit
                        ? ` = ${convertToBase(
                            parseFloat(quantityUsed) || 0,
                            selectedUnit,
                            selectedIngredient.unit
                          ).toFixed(4)} ${selectedIngredient.unit}`
                        : ''
                      }
                      {' × '}{formatCurrency(selectedIngredient.costPerUnit)}/{selectedIngredient.unit}
                    </Text>
                  </View>
                )}

                <Input
                  label={config.noteLabel}
                  placeholder="Escribe aquí..."
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={2}
                />
              </Card>
            )}

            {selectedIngredient && (
              <Button
                label={`Registrar ${config.title.split(' ')[1]}`}
                onPress={handleSaveExisting}
                loading={isLoading}
                fullWidth
                size="lg"
                style={styles.saveButton}
                leftIcon={
                  <Feather name="plus-circle" size={18} color={Colors.textOnPrimary} />
                }
              />
            )}
          </>
        )}
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

  infoBanner: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Spacing.sm,
    borderRadius:  Radius.md,
    padding:       Spacing.md,
  },

  infoBannerText: {
    flex:       1,
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    lineHeight: Typography.sm * 1.5,
  },

  modeSelector: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.xs,
    borderWidth:     1,
    borderColor:     Colors.border,
  },

  modeButton: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               Spacing.xs,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.md,
  },

  modeButtonActive: {
    backgroundColor: Colors.success,
  },

  modeButtonText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },

  modeButtonTextActive: {
    color: Colors.textOnPrimary,
  },

  section: {
    gap: Spacing.md,
  },

  sectionTitle: {
    fontSize:      Typography.sm,
    fontWeight:    Typography.semibold,
    color:         Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  selectedIngredient: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    borderWidth:     1.5,
    backgroundColor: Colors.surface,
  },

  selectedIngredientInfo: {
    flex: 1,
    gap:  4,
  },

  selectedIngredientName: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  selectedIngredientMeta: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },

  changeButton: {
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius:      Radius.sm,
    borderWidth:       1,
  },

  changeButtonText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.semibold,
  },

  emptyIngredients: {
    padding:    Spacing.lg,
    alignItems: 'center',
  },

  emptyIngredientsText: {
    fontSize:  Typography.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },

  ingredientsList: {
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        'hidden',
    backgroundColor: Colors.surface,
  },

  ingredientItem: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.md,
  },

  ingredientItemInfo: {
    flex: 1,
    gap:  2,
  },

  ingredientItemName: {
    fontSize:   Typography.base,
    fontWeight: Typography.medium,
    color:      Colors.textPrimary,
  },

  ingredientItemStock: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
  },

  ingredientItemRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },

  ingredientItemCost: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
  },

  ingredientDivider: {
    height:           1,
    backgroundColor:  Colors.divider,
    marginHorizontal: Spacing.md,
  },

  noResults: {
    fontSize:  Typography.sm,
    color:     Colors.textMuted,
    textAlign: 'center',
    padding:   Spacing.md,
  },

  unitSuffix: {
    fontSize:     Typography.sm,
    color:        Colors.textSecondary,
    fontWeight:   Typography.medium,
    paddingRight: Spacing.sm,
  },

  currencyPrefix: {
    fontSize:    Typography.base,
    color:       Colors.textSecondary,
    fontWeight:  Typography.medium,
    paddingLeft: Spacing.sm,
  },

  costPreview: {
    borderRadius: Radius.md,
    padding:      Spacing.md,
    gap:          Spacing.xs,
    borderWidth:  1,
  },

  costPreviewRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },

  costPreviewLabel: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
  },

  costPreviewValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
  },

  costPreviewFormula: {
    fontSize: Typography.xs,
    opacity:  0.8,
  },

  saveButton: {
    marginTop: Spacing.sm,
  },

  unitSelector: {
    gap: Spacing.sm,
  },

  unitSelectorLabel: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },

  unitSelectorOptions: {
    flexDirection: 'row',
    gap:           Spacing.sm,
  },

  unitOption: {
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius:      Radius.full,
    borderWidth:       1.5,
    borderColor:       Colors.border,
    backgroundColor:   Colors.surface,  
  },

  unitOptionActive: {
    backgroundColor: Colors.primary,
    borderColor:     Colors.primary,
  },

  unitOptionText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.semibold,
    color:      Colors.textSecondary,
  },

  unitOptionTextActive: {
    color: Colors.textOnPrimary,
  },

  unitConversionHint: {
    fontSize:  Typography.xs,
    color:     Colors.textMuted,
    fontStyle: 'italic',
  },
});