import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?:       string;
  error?:       string;
  hint?:        string;
  leftIcon?:    React.ReactNode;
  rightIcon?:   React.ReactNode;
  containerStyle?: ViewStyle;
  required?:    boolean;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  required,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          isFocused  && styles.inputWrapperFocused,
          hasError   && styles.inputWrapperError,
        ]}
      >
        {leftIcon && (
          <View style={styles.iconLeft}>
            {leftIcon}
          </View>
        )}

        <TextInput
          style={[
            styles.input,
            leftIcon  != null ? styles.inputWithLeftIcon  : undefined,
            rightIcon != null ? styles.inputWithRightIcon : undefined,
          ]}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {rightIcon && (
          <View style={styles.iconRight}>
            {rightIcon}
          </View>
        )}
      </View>

      {hasError && (
        <Text style={styles.error}>{error}</Text>
      )}

      {hint && !hasError && (
        <Text style={styles.hint}>{hint}</Text>
      )}
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

  inputWrapper: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    borderWidth:     1.5,
    borderColor:     Colors.border,
    minHeight:       48,
  },

  inputWrapperFocused: {
    borderColor:     Colors.primary,
    backgroundColor: Colors.surfaceAlt,
  },

  inputWrapperError: {
    borderColor:     Colors.error,
    backgroundColor: Colors.errorLight,
  },

  input: {
    flex:              1,
    fontSize:          Typography.base,
    color:             Colors.textPrimary,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.md,
  },

  inputWithLeftIcon: {
    paddingLeft: Spacing.xs,
  },

  inputWithRightIcon: {
    paddingRight: Spacing.xs,
  },

  iconLeft: {
    paddingLeft:  Spacing.md,
    paddingRight: Spacing.xs,
    justifyContent: 'center',
    alignItems:     'center',
  },

  iconRight: {
    paddingRight: Spacing.md,
    paddingLeft:  Spacing.xs,
    justifyContent: 'center',
    alignItems:     'center',
  },

  error: {
    fontSize: Typography.xs,
    color:    Colors.error,
    marginTop: 2,
  },

  hint: {
    fontSize: Typography.xs,
    color:    Colors.textMuted,
    marginTop: 2,
  },
});