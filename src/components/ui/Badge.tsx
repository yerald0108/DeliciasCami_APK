import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  label:    string;
  variant?: BadgeVariant;
  size?:    BadgeSize;
  style?:   ViewStyle;
}

// ─── Mapa de colores por variante ─────────────────────────────────────────────
const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  success: {
    bg:     Colors.successLight,
    text:   Colors.success,
    border: Colors.success,
  },
  warning: {
    bg:     Colors.warningLight,
    text:   Colors.warning,
    border: Colors.warning,
  },
  error: {
    bg:     Colors.errorLight,
    text:   Colors.error,
    border: Colors.error,
  },
  info: {
    bg:     Colors.infoLight,
    text:   Colors.info,
    border: Colors.info,
  },
  neutral: {
    bg:     Colors.divider,
    text:   Colors.textSecondary,
    border: Colors.border,
  },
  primary: {
    bg:     Colors.primaryLight,
    text:   Colors.primaryDark,
    border: Colors.primary,
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size    = 'md',
  style,
}) => {
  const colors = variantColors[variant];

  return (
    <View
      style={[
        styles.base,
        styles[`size_${size}`],
        {
          backgroundColor: colors.bg,
          borderColor:     colors.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          styles[`labelSize_${size}`],
          { color: colors.text },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    alignSelf:      'flex-start',
    borderRadius:   Radius.full,
    borderWidth:    1,
    flexDirection:  'row',
    alignItems:     'center',
  },

  size_sm: {
    paddingVertical:   2,
    paddingHorizontal: Spacing.sm,
  },

  size_md: {
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.md,
  },

  label: {
    fontWeight: Typography.semibold,
  },

  labelSize_sm: {
    fontSize: Typography.xs,
  },

  labelSize_md: {
    fontSize: Typography.sm,
  },
});