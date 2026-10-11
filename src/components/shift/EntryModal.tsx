import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  formatCurrency,
  formatQuantity,
  UNIT_OPTIONS,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from '../../constants';
import {
  useIngredients,
  useShiftActions,
  useIngredientActions,
  useAppStore,
  useCurrentShift,
} from '../../store';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SelectPicker } from '../ui/SelectPicker';
import { EmptyState } from '../ui/EmptyState';
import { Ingredient, ShiftEntry, ShiftEntryType, UnitOfMeasure } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ModalView = 'list' | 'form';
type EntryMode = 'existing' | 'new';

export interface EntryModalProps {
  visible:   boolean;
  onClose:   () => void;
  entryType: ShiftEntryType;
}

// ─── Conversiones de unidades ─────────────────────────────────────────────────
type UnitConversion = {
  from:   UnitOfMeasure;
  to:     UnitOfMeasure;
  factor: number; // cuántas unidades "to" hay en 1 "from"
};

const UNIT_CONVERSIONS: UnitConversion[] = [
  { from: 'kg', to: 'g',  factor: 0.001 },
  { from: 'g',  to: 'kg', factor: 1000  },
  { from: 'l',  to: 'ml', factor: 0.001 },
  { from: 'ml', to: 'l',  factor: 1000  },
];

function getCompatibleUnits(unit: UnitOfMeasure): UnitOfMeasure[] {
  const related = UNIT_CONVERSIONS.filter(c => c.from === unit).map(c => c.to);
  return [unit, ...related];
}

function convertToBase(
  quantity: number,
  fromUnit: UnitOfMeasure,
  toUnit:   UnitOfMeasure
): number {
  if (fromUnit === toUnit) return quantity;
  const conversion = UNIT_CONVERSIONS.find(c => c.from === fromUnit && c.to === toUnit);
  if (!conversion) return quantity;
  return quantity / conversion.factor;
}

// ─── Configuración por tipo ───────────────────────────────────────────────────
const ENTRY_CONFIG: Record<ShiftEntryType, {
  title:       string;
  subtitle:    string;
  addLabel:    string;
  emptyTitle:  string;
  emptyDesc:   string;
  color:       string;
  bg:          string;
  iconName:    string;
  showCost:    boolean;
  hint:        string;
  noteLabel:   string;
}> = {
  usage: {
    title:      'Insumos utilizados',
    subtitle:   'Cuentan en el cuadre del día',
    addLabel:   'Registrar insumo',
    emptyTitle: 'Sin insumos registrados',
    emptyDesc:  'Registra los insumos que usas en tu producción del día.',
    color:      Colors.primary,
    bg:         Colors.primaryLight,
    iconName:   'tool',
    showCost:   true,
    hint:       'Insumo usado en producción. Descuenta del inventario y cuenta como inversión.',
    noteLabel:  'Observación (opcional)',
  },
  purchase: {
    title:      'Entradas / Compras',
    subtitle:   'No cuentan en el cuadre',
    addLabel:   'Registrar entrada',
    emptyTitle: 'Sin entradas registradas',
    emptyDesc:  'Registra las compras realizadas durante el turno.',
    color:      Colors.success,
    bg:         Colors.successLight,
    iconName:   'arrow-down-circle',
    showCost:   false,
    hint:       'Compra realizada durante el turno. Aumenta el inventario sin afectar el cuadre.',
    noteLabel:  'Proveedor o detalle (opcional)',
  },
  output: {
    title:      'Salidas',
    subtitle:   'No cuentan en el cuadre',
    addLabel:   'Registrar salida',
    emptyTitle: 'Sin salidas registradas',
    emptyDesc:  'Registra los productos que salen para consumo familiar.',
    color:      Colors.info,
    bg:         Colors.infoLight,
    iconName:   'arrow-up-circle',
    showCost:   false,
    hint:       'Producto que sale para consumo familiar. Descuenta del inventario sin afectar el cuadre.',
    noteLabel:  'Motivo (opcional)',
  },
  waste: {
    title:      'Mermas',
    subtitle:   'No cuentan en el cuadre',
    addLabel:   'Registrar merma',
    emptyTitle: 'Sin mermas registradas',
    emptyDesc:  'Registra los productos dañados o desperdiciados.',
    color:      Colors.warning,
    bg:         Colors.warningLight,
    iconName:   'alert-triangle',
    showCost:   false,
    hint:       'Producto dañado o desperdiciado. Descuenta del inventario sin afectar el cuadre.',
    noteLabel:  'Causa de la merma (opcional)',
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export const EntryModal: React.FC<EntryModalProps> = ({ visible, onClose, entryType }) => {
  const config       = ENTRY_CONFIG[entryType];
  const ingredients  = useIngredients();
  const currentShift = useCurrentShift();
  const { addEntry, removeEntry }          = useShiftActions();
  const { createIngredient, loadIngredients } = useIngredientActions();

  // ── Vista actual ────────────────────────────────────────────────────────────
  const [view, setView] = useState<ModalView>('list');

  // ── Modo de entrada (existente / nuevo) ─────────────────────────────────────
  const [entryMode, setEntryMode] = useState<EntryMode>('existing');

  // ── Estado formulario — producto existente ───────────────────────────────
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [quantityUsed,       setQuantityUsed]        = useState('');
  const [note,               setNote]                = useState('');
  const [quantityError,      setQuantityError]        = useState('');
  const [searchQuery,        setSearchQuery]          = useState('');
  const [selectedUnit,       setSelectedUnit]         = useState<UnitOfMeasure | null>(null);

  // ── Estado formulario — producto nuevo ─────────────────────────────────────
  const [newName,      setNewName]      = useState('');
  const [newUnit,      setNewUnit]      = useState<UnitOfMeasure | ''>('');
  const [newQuantity,  setNewQuantity]  = useState('');
  const [newTotalCost, setNewTotalCost] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [newNote,      setNewNote]      = useState('');
  const [newErrors,    setNewErrors]    = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);

  // Entradas del turno filtradas por tipo
  const entries = currentShift?.entries.filter(e => e.type === entryType) ?? [];
  const totalCost = entries.reduce((s, e) => s + e.totalCost, 0);

  // ── Costo por unidad calculado (producto nuevo) ─────────────────────────────
  const newCostPerUnit = (() => {
    const qty  = parseFloat(newQuantity);
    const cost = parseFloat(newTotalCost);
    if (!isNaN(qty) && !isNaN(cost) && qty > 0) return cost / qty;
    return 0;
  })();

  // ── Costo en tiempo real para usage ─────────────────────────────────────────
  const calculatedCost = (() => {
    if (!selectedIngredient || entryType !== 'usage') return 0;
    const qty     = parseFloat(quantityUsed) || 0;
    const unit    = selectedUnit ?? selectedIngredient.unit;
    const qtyBase = convertToBase(qty, unit, selectedIngredient.unit);
    return qtyBase * selectedIngredient.costPerUnit;
  })();

  // ── Ingredientes filtrados por búsqueda ──────────────────────────────────────
  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Resetear formulario ──────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setSelectedIngredient(null);
    setQuantityUsed('');
    setNote('');
    setQuantityError('');
    setSearchQuery('');
    setSelectedUnit(null);
    setNewName('');
    setNewUnit('');
    setNewQuantity('');
    setNewTotalCost('');
    setNewThreshold('');
    setNewNote('');
    setNewErrors({});
    setEntryMode('existing');
  }, []);

  // Al cerrar el modal, volver a lista y resetear
  const handleClose = useCallback(() => {
    setView('list');
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Al volver a la lista desde el formulario
  const handleBackToList = useCallback(() => {
    setView('list');
    resetForm();
  }, [resetForm]);

  // Resetear al cambiar tipo o cuando se vuelve invisible
  useEffect(() => {
    if (!visible) {
      setView('list');
      resetForm();
    }
  }, [visible, resetForm]);

  // ── Seleccionar ingrediente existente ────────────────────────────────────────
  const handleSelectIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSelectedUnit(ingredient.unit);
    setQuantityUsed('');
    setQuantityError('');
    setSearchQuery('');
  };

  // ── Validar formulario existente ─────────────────────────────────────────────
  const validateExisting = (): boolean => {
    if (!selectedIngredient) return false;

    const qty     = parseFloat(quantityUsed);
    const unit    = selectedUnit ?? selectedIngredient.unit;
    const qtyBase = convertToBase(qty, unit, selectedIngredient.unit);

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

  // ── Validar formulario nuevo ──────────────────────────────────────────────────
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

  // ── Guardar — producto existente ─────────────────────────────────────────────
  const handleSaveExisting = async () => {
    if (!validateExisting() || !selectedIngredient) return;

    setIsLoading(true);
    try {
      const qty     = parseFloat(quantityUsed);
      const unit    = selectedUnit ?? selectedIngredient.unit;
      const qtyBase = convertToBase(qty, unit, selectedIngredient.unit);
      const costAtTime = selectedIngredient.costPerUnit;

      const success = await addEntry({
        type:           entryType,
        ingredientId:   selectedIngredient.id,
        ingredientName: selectedIngredient.name,
        quantityUsed:   qtyBase,
        unit:           selectedIngredient.unit,
        costAtTime,
        note:           note.trim() || undefined,
      });

      if (success) {
        handleBackToList();
      } else {
        Alert.alert('Error', 'No se pudo registrar. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Guardar — producto nuevo ──────────────────────────────────────────────────
  const handleSaveNew = async () => {
    if (!validateNew()) return;

    setIsLoading(true);
    try {
      const qty         = parseFloat(newQuantity);
      const totalCostVal = parseFloat(newTotalCost);
      const costPerUnit = newCostPerUnit;
      const threshold   = parseFloat(newThreshold);

      const created = await createIngredient({
        name:              newName.trim(),
        quantity:          qty,
        unit:              newUnit as UnitOfMeasure,
        totalCost:         totalCostVal,
        costPerUnit,
        lowStockThreshold: threshold,
      });

      if (!created) {
        Alert.alert('Error', 'No se pudo crear el insumo. Intenta de nuevo.');
        return;
      }

      await loadIngredients();

      // Buscar el ingrediente recién creado en el store actualizado
      const allIngredients = useAppStore.getState().ingredients;
      const fresh = allIngredients.find(
        i => i.name.trim().toLowerCase() === newName.trim().toLowerCase()
      );

      if (!fresh) {
        Alert.alert('Error', 'No se pudo encontrar el insumo creado.');
        return;
      }

      const success = await addEntry({
        type:           entryType,
        ingredientId:   fresh.id,
        ingredientName: fresh.name,
        quantityUsed:   qty,
        unit:           fresh.unit,
        costAtTime:     fresh.costPerUnit,
        note:           newNote.trim() || undefined,
      });

      if (success) {
        handleBackToList();
      } else {
        Alert.alert('Error', 'No se pudo registrar la entrada. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Eliminar entrada ─────────────────────────────────────────────────────────
  const handleRemove = (entry: ShiftEntry) => {
    Alert.alert(
      'Quitar registro',
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

  // ─── Vista Lista ─────────────────────────────────────────────────────────────
  const renderListView = () => (
    <View style={styles.viewContainer}>
      {/* Encabezado modal */}
      <View style={[styles.modalHeader, { borderBottomColor: config.color + '33' }]}>
        <View style={[styles.modalHeaderIcon, { backgroundColor: config.bg }]}>
          <Feather name={config.iconName as any} size={20} color={config.color} />
        </View>
        <View style={styles.modalHeaderText}>
          <Text style={styles.modalTitle}>{config.title}</Text>
          <Text style={styles.modalSubtitle}>{config.subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
          <Feather name="x" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Barra de resumen */}
      {entries.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: config.bg, borderBottomColor: config.color + '44' }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: config.color }]}>Registros</Text>
            <Text style={[styles.summaryValue, { color: config.color }]}>{entries.length}</Text>
          </View>
          {config.showCost && (
            <>
              <View style={[styles.summaryDivider, { backgroundColor: config.color + '44' }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: config.color }]}>Total invertido</Text>
                <Text style={[styles.summaryValue, { color: config.color }]}>
                  {formatCurrency(totalCost)}
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Lista de entradas */}
      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          entries.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Feather name={config.iconName as any} size={44} color={Colors.textMuted} />}
            title={config.emptyTitle}
            description={config.emptyDesc}
            actionLabel={config.addLabel}
            onAction={() => setView('form')}
          />
        }
        renderItem={({ item }) => (
          <Card variant="outlined" style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={[styles.entryIconBadge, { backgroundColor: config.bg }]}>
                <Feather name={config.iconName as any} size={15} color={config.color} />
              </View>
              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{item.ingredientName}</Text>
                <Text style={styles.entryMeta}>
                  {formatQuantity(item.quantityUsed, item.unit)}
                  {config.showCost && ` · ${formatCurrency(item.costAtTime)}/${item.unit}`}
                </Text>
                {item.note ? (
                  <Text style={styles.entryNote}>{item.note}</Text>
                ) : null}
              </View>
              <View style={styles.entryRight}>
                {config.showCost ? (
                  <Text style={[styles.entryCost, { color: config.color }]}>
                    {formatCurrency(item.totalCost)}
                  </Text>
                ) : null}
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
          entries.length > 0 && config.showCost ? (
            <View style={[styles.totalRow, { borderTopColor: config.color }]}>
              <Text style={styles.totalLabel}>Total invertido</Text>
              <Text style={[styles.totalValue, { color: config.color }]}>
                {formatCurrency(totalCost)}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Footer con botón agregar */}
      <View style={styles.listFooter}>
        <Button
          label={config.addLabel}
          onPress={() => setView('form')}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Feather name="plus-circle" size={18} color={Colors.textOnPrimary} />}
        />
      </View>
    </View>
  );

  // ─── Vista Formulario ─────────────────────────────────────────────────────────
  const renderFormView = () => (
    <KeyboardAvoidingView
      style={styles.viewContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Encabezado formulario */}
      <View style={[styles.modalHeader, { borderBottomColor: config.color + '33' }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToList} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.modalHeaderText}>
          <Text style={styles.modalTitle}>{config.addLabel}</Text>
          <Text style={styles.modalSubtitle}>{config.subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
          <Feather name="x" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner informativo */}
        <View style={[styles.infoBanner, { backgroundColor: config.bg }]}>
          <Feather name={config.iconName as any} size={15} color={config.color} />
          <Text style={[styles.infoBannerText, { color: config.color }]}>{config.hint}</Text>
        </View>

        {/* Selector de modo: Existente / Nuevo */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              entryMode === 'existing' && { backgroundColor: config.color },
            ]}
            onPress={() => {
              setEntryMode('existing');
              setSelectedIngredient(null);
              setQuantityUsed('');
              setQuantityError('');
            }}
            activeOpacity={0.8}
          >
            <Feather
              name="package"
              size={15}
              color={entryMode === 'existing' ? Colors.textOnPrimary : Colors.textSecondary}
            />
            <Text style={[
              styles.modeButtonText,
              entryMode === 'existing' && styles.modeButtonTextActive,
            ]}>
              Producto existente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              entryMode === 'new' && { backgroundColor: config.color },
            ]}
            onPress={() => {
              setEntryMode('new');
              setSelectedIngredient(null);
              setQuantityUsed('');
              setQuantityError('');
            }}
            activeOpacity={0.8}
          >
            <Feather
              name="plus-circle"
              size={15}
              color={entryMode === 'new' ? Colors.textOnPrimary : Colors.textSecondary}
            />
            <Text style={[
              styles.modeButtonText,
              entryMode === 'new' && styles.modeButtonTextActive,
            ]}>
              Producto nuevo
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── MODO NUEVO ─────────────────────────────────────────────────────── */}
        {entryMode === 'new' ? (
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
              label="Agregar al inventario y registrar"
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
          /* ── MODO EXISTENTE ────────────────────────────────────────────────── */
          <>
            <Card variant="outlined" style={styles.section}>
              <Text style={styles.sectionTitle}>Seleccionar insumo</Text>

              {selectedIngredient ? (
                <View style={[styles.selectedIngredient, { borderColor: config.color }]}>
                  <View style={styles.selectedIngredientInfo}>
                    <Text style={styles.selectedIngredientName}>{selectedIngredient.name}</Text>
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
                    <Text style={[styles.changeButtonText, { color: config.color }]}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Input
                    placeholder="Buscar insumo..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    leftIcon={<Feather name="search" size={15} color={Colors.textMuted} />}
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
                              <Feather name="chevron-right" size={15} color={Colors.textMuted} />
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

            {selectedIngredient && (
              <Card variant="outlined" style={styles.section}>
                <Text style={styles.sectionTitle}>Cantidad</Text>

                {getCompatibleUnits(selectedIngredient.unit).length > 1 && (
                  <View style={styles.unitSelector}>
                    <Text style={styles.unitSelectorLabel}>Unidad de registro:</Text>
                    <View style={styles.unitSelectorOptions}>
                      {getCompatibleUnits(selectedIngredient.unit).map(unit => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitOption,
                            (selectedUnit ?? selectedIngredient.unit) === unit && {
                              backgroundColor: config.color,
                              borderColor:     config.color,
                            },
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
                    {selectedUnit && selectedUnit !== selectedIngredient.unit && (
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
                label={config.addLabel}
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

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        {view === 'list' ? renderListView() : renderFormView()}
      </View>
    </Modal>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalContainer: {
    flex:            1,
    backgroundColor: Colors.background,
  },

  viewContainer: {
    flex: 1,
  },

  // ── Encabezado ──────────────────────────────────────────────────────────────
  modalHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor:   Colors.surface,
    borderBottomWidth: 1,
    gap:               Spacing.md,
    ...Shadows.sm,
  },

  modalHeaderIcon: {
    width:          40,
    height:         40,
    borderRadius:   Radius.md,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  modalHeaderText: {
    flex: 1,
    gap:  2,
  },

  modalTitle: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },

  modalSubtitle: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },

  closeButton: {
    width:           36,
    height:          36,
    borderRadius:    Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },

  backButton: {
    width:           36,
    height:          36,
    borderRadius:    Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },

  // ── Resumen ──────────────────────────────────────────────────────────────────
  summaryBar: {
    flexDirection:     'row',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
  },

  summaryItem: {
    flex:       1,
    alignItems: 'center',
    gap:        2,
  },

  summaryDivider: {
    width:          1,
    marginVertical: Spacing.xs,
  },

  summaryLabel: {
    fontSize: Typography.xs,
    opacity:  0.8,
  },

  summaryValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
  },

  // ── Lista ────────────────────────────────────────────────────────────────────
  listContent: {
    padding:       Spacing.base,
    paddingBottom: Spacing.xxxl,
  },

  listContentEmpty: {
    flexGrow: 1,
  },

  entryCard: {
    padding: Spacing.md,
  },

  entryRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },

  entryIconBadge: {
    width:          34,
    height:         34,
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
    alignItems: 'flex-end',
    gap:        Spacing.xs,
    flexShrink: 0,
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
  },

  totalLabel: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textSecondary,
  },

  totalValue: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
  },

  listFooter: {
    padding:         Spacing.base,
    backgroundColor: Colors.surface,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    ...Shadows.sm,
  },

  // ── Formulario ───────────────────────────────────────────────────────────────
  formScroll: {
    flex: 1,
  },

  formScrollContent: {
    padding:       Spacing.base,
    gap:           Spacing.md,
    paddingBottom: 120,
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
    flexDirection:    'row',
    gap:              Spacing.sm,
    backgroundColor:  Colors.surface,
    borderRadius:     Radius.lg,
    padding:          Spacing.xs,
    borderWidth:      1,
    borderColor:      Colors.border,
  },

  modeButton: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius:    Radius.md,
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
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    borderRadius:     Radius.md,
    padding:          Spacing.md,
    borderWidth:      1.5,
    backgroundColor:  Colors.surface,
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
    flexWrap:      'wrap',
  },

  unitOption: {
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius:      Radius.full,
    borderWidth:       1.5,
    borderColor:       Colors.border,
    backgroundColor:   Colors.surface,
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
});