import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  visible:      boolean;
  title:        string;
  message?:     string;
  confirmText?: string;
  cancelText?:  string;
  variant?:     ConfirmVariant;
  icon?:        string;
  onConfirm:    () => void;
  onCancel:     () => void;
}

// ─── Configuración visual por variante ───────────────────────────────────────
const VARIANT_CONFIG: Record<ConfirmVariant, {
  color:      string;
  bg:         string;
  defaultIcon: string;
  confirmLabel: string;
}> = {
  danger: {
    color:        Colors.error,
    bg:           Colors.errorLight,
    defaultIcon:  'trash-2',
    confirmLabel: 'Eliminar',
  },
  warning: {
    color:        Colors.warning,
    bg:           Colors.warningLight,
    defaultIcon:  'alert-circle',
    confirmLabel: 'Confirmar',
  },
  info: {
    color:        Colors.info,
    bg:           Colors.infoLight,
    defaultIcon:  'info',
    confirmLabel: 'Aceptar',
  },
};

// ─── Animación ────────────────────────────────────────────────────────────────
const ANIM_DURATION_OPEN  = 220;
const ANIM_DURATION_CLOSE = 180;

// ─── Componente ───────────────────────────────────────────────────────────────
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  icon,
  onConfirm,
  onCancel,
}) => {
  const config = VARIANT_CONFIG[variant];

  // ── Valores animados ──────────────────────────────────────────────────────
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const dialogAnim  = useRef(new Animated.Value(0)).current;

  // ── Animación al abrir/cerrar ─────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      // Resetear antes de animar (por si quedó a medio camino)
      overlayAnim.setValue(0);
      dialogAnim.setValue(0);

      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue:         1,
          duration:        ANIM_DURATION_OPEN,
          easing:          Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dialogAnim, {
          toValue:         1,
          duration:        ANIM_DURATION_OPEN,
          easing:          Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // La animación de cierre la maneja el provider con setTimeout,
      // así que acá solo reseteamos los valores.
      overlayAnim.setValue(0);
      dialogAnim.setValue(0);
    }
  }, [visible, overlayAnim, dialogAnim]);

  // ── Interpolaciones ───────────────────────────────────────────────────────
  const dialogScale = dialogAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.92, 1],
  });

  const dialogTranslateY = dialogAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [12, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Overlay con fade */}
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        {/* Cerrar tocando fuera */}
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Diálogo animado */}
        <Animated.View
          style={[
            styles.dialog,
            {
              opacity:   dialogAnim,
              transform: [
                { scale:       dialogScale },
                { translateY:  dialogTranslateY },
              ],
            },
          ]}
        >
          {/* Ícono */}
          <View style={[styles.iconWrapper, { backgroundColor: config.bg }]}>
            <Feather
              name={(icon ?? config.defaultIcon) as any}
              size={26}
              color={config.color}
            />
          </View>

          {/* Título */}
          <Text style={styles.title}>{title}</Text>

          {/* Mensaje */}
          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}

          {/* Botones */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>
                {cancelText ?? 'Cancelar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: config.color }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>
                {confirmText ?? config.confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: Colors.overlay,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.lg,
  },

  dialog: {
    width:           '100%',
    maxWidth:        380,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    alignItems:      'center',
    gap:             Spacing.md,
    ...Shadows.lg,
  },

  iconWrapper: {
    width:          64,
    height:         64,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing.xs,
  },

  title: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
    textAlign:  'center',
    lineHeight: Typography.lg * 1.3,
  },

  message: {
    fontSize:   Typography.base,
    color:      Colors.textSecondary,
    textAlign:  'center',
    lineHeight: Typography.base * 1.5,
  },

  actions: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    marginTop:     Spacing.md,
    width:         '100%',
  },

  cancelButton: {
    flex:              1,
    paddingVertical:   Spacing.md,
    borderRadius:      Radius.md,
    alignItems:        'center',
    justifyContent:    'center',
    backgroundColor:   Colors.background,
    borderWidth:       1,
    borderColor:       Colors.border,
    minHeight:         48,
  },

  cancelButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.textSecondary,
  },

  confirmButton: {
    flex:              1,
    paddingVertical:   Spacing.md,
    borderRadius:      Radius.md,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         48,
  },

  confirmButtonText: {
    fontSize:   Typography.base,
    fontWeight: Typography.bold,
    color:      Colors.textOnPrimary,
  },
});