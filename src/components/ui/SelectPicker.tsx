import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface SelectOption {
  label: string;
  value: string;
}

interface SelectPickerProps {
  label?:          string;
  placeholder?:    string;
  options:         SelectOption[];
  value:           string | null;
  onChange:        (value: string) => void;
  error?:          string;
  required?:       boolean;
  containerStyle?: ViewStyle;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const SelectPicker: React.FC<SelectPickerProps> = ({
  label,
  placeholder = 'Seleccionar...',
  options,
  value,
  onChange,
  error,
  required,
  containerStyle,
}) => {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find(o => o.value === value);
  const hasError       = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.trigger,
          hasError && styles.triggerError,
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholder,
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {hasError && (
        <Text style={styles.error}>{error}</Text>
      )}

      {/* ── Modal de opciones ─────────────────────────────────────────────── */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.sheet}>
            {label && (
              <Text style={styles.sheetTitle}>{label}</Text>
            )}

            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.separator} />
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },

  label: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },

  required: {
    color: Colors.error,
  },

  trigger: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   Colors.surface,
    borderRadius:      Radius.md,
    borderWidth:       1.5,
    borderColor:       Colors.border,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight:         48,
  },

  triggerError: {
    borderColor:     Colors.error,
    backgroundColor: Colors.errorLight,
  },

  triggerText: {
    fontSize:   Typography.base,
    color:      Colors.textPrimary,
    flex:       1,
  },

  placeholder: {
    color: Colors.textMuted,
  },

  chevron: {
    fontSize: Typography.md,
    color:    Colors.textSecondary,
  },

  error: {
    fontSize: Typography.xs,
    color:    Colors.error,
    marginTop: 2,
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  overlay: {
    flex:            1,
    backgroundColor: Colors.overlay,
    justifyContent:  'flex-end',
  },

  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop:      Spacing.lg,
    paddingBottom:   Spacing.xxxl,
    maxHeight:       '60%',
    ...Shadows.lg,
  },

  sheetTitle: {
    fontSize:          Typography.md,
    fontWeight:        Typography.semibold,
    color:             Colors.textPrimary,
    textAlign:         'center',
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom:      Spacing.sm,
  },

  option: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  optionSelected: {
    backgroundColor: Colors.primaryLight,
  },

  optionText: {
    fontSize: Typography.base,
    color:    Colors.textPrimary,
  },

  optionTextSelected: {
    color:      Colors.primary,
    fontWeight: Typography.semibold,
  },

  checkmark: {
    fontSize: Typography.base,
    color:    Colors.primary,
    fontWeight: Typography.bold,
  },

  separator: {
    height:          1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.base,
  },
});