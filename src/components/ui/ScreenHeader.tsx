import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ScreenHeaderProps {
  title:        string;
  subtitle?:    string;
  leftAction?:  {
    icon:    React.ReactNode;
    onPress: () => void;
  };
  rightAction?: {
    icon:    React.ReactNode;
    onPress: () => void;
  };
  style?:       ViewStyle;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.sm },
        style,
      ]}
    >
      <View style={styles.row}>
        {leftAction ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={leftAction.onPress}
            activeOpacity={0.7}
          >
            {leftAction.icon}
          </TouchableOpacity>
        ) : (
          <View style={styles.actionPlaceholder} />
        )}

        <View style={styles.titleWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {rightAction ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={rightAction.onPress}
            activeOpacity={0.7}
          >
            {rightAction.icon}
          </TouchableOpacity>
        ) : (
          <View style={styles.actionPlaceholder} />
        )}
      </View>
    </View>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingBottom:   Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },

  titleWrapper: {
    flex:      1,
    alignItems: 'center',
    gap:        2,
  },

  title: {
    fontSize:   Typography.md,
    fontWeight: Typography.semibold,
    color:      Colors.textPrimary,
  },

  subtitle: {
    fontSize: Typography.xs,
    color:    Colors.textSecondary,
  },

  actionButton: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },

  actionPlaceholder: {
    width: 40,
  },
});