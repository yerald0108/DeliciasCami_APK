import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Spacing, Radius, Shadows } from '../../constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type CardVariant = 'elevated' | 'outlined' | 'filled';

interface CardProps {
  children:   React.ReactNode;
  variant?:   CardVariant;
  style?:     ViewStyle | ViewStyle[];
  onPress?:   TouchableOpacityProps['onPress'];
  padding?:   keyof typeof Spacing | number;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  style,
  onPress,
  padding = 'base',
}) => {
  const paddingValue = typeof padding === 'number'
    ? padding
    : Spacing[padding];

  const cardStyle = [
    styles.base,
    styles[`variant_${variant}`],
    { padding: paddingValue },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    overflow:     'hidden',
  },

  variant_elevated: {
    backgroundColor: Colors.surface,
    ...Shadows.md,
  },

  variant_outlined: {
    backgroundColor: Colors.surface,
    borderWidth:     1.5,
    borderColor:     Colors.border,
  },

  variant_filled: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth:     1,
    borderColor:     Colors.divider,
  },
});