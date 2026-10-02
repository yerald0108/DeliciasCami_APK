import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  label:      string;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  style?:     ViewStyle;
  textStyle?: TextStyle;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const Button: React.FC<ButtonProps> = ({
  label,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost'
            ? Colors.primary
            : Colors.textOnPrimary}
        />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.label,
              styles[`label_${variant}`],
              styles[`labelSize_${size}`],
              textStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.sm,
    borderRadius:   Radius.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },

  // ── Variantes ──────────────────────────────────────────────────────────────
  variant_primary: {
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
  variant_secondary: {
    backgroundColor: Colors.secondary,
    ...Shadows.sm,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth:     1.5,
    borderColor:     Colors.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: Colors.error,
    ...Shadows.sm,
  },

  // ── Tamaños ────────────────────────────────────────────────────────────────
  size_sm: {
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.md,
    minHeight:         36,
  },
  size_md: {
    paddingVertical:   Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    minHeight:         46,
  },
  size_lg: {
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight:         54,
  },

  // ── Etiquetas ──────────────────────────────────────────────────────────────
  label: {
    fontWeight:  Typography.semibold,
    letterSpacing: 0.2,
  },
  label_primary: {
    color: Colors.textOnPrimary,
  },
  label_secondary: {
    color: Colors.textOnPrimary,
  },
  label_outline: {
    color: Colors.primary,
  },
  label_ghost: {
    color: Colors.primary,
  },
  label_danger: {
    color: Colors.textOnPrimary,
  },
  labelSize_sm: {
    fontSize: Typography.sm,
  },
  labelSize_md: {
    fontSize: Typography.base,
  },
  labelSize_lg: {
    fontSize: Typography.md,
  },
});