import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants';
import { Button } from './Button';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?:           React.ReactNode;
  title:           string;
  description?:    string;
  actionLabel?:    string;
  onAction?:       () => void;
  style?:          ViewStyle;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={styles.iconWrapper}>
          {icon}
        </View>
      )}

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.action}
        />
      )}
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical:   Spacing.xxxl,
    gap:            Spacing.md,
  },

  iconWrapper: {
    marginBottom: Spacing.sm,
    opacity:      0.4,
  },

  title: {
    fontSize:   Typography.lg,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },

  description: {
    fontSize:   Typography.base,
    color:      Colors.textSecondary,
    textAlign:  'center',
    lineHeight: Typography.base * Typography.normal,
  },

  action: {
    marginTop: Spacing.md,
  },
});