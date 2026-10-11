import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmDialog, ConfirmVariant } from '../components/ui/ConfirmDialog';

// ─── Tipos públicos ───────────────────────────────────────────────────────────
export type { ConfirmVariant };

export interface ConfirmOptions {
  /** Título del diálogo (bold, arriba del mensaje). */
  title:        string;
  /** Mensaje o pregunta. Puede ser largo, se ajusta en varias líneas. */
  message?:     string;
  /** Texto del botón de confirmación. Default: "Confirmar". */
  confirmText?: string;
  /** Texto del botón de cancelación. Default: "Cancelar". */
  cancelText?:  string;
  /** Variante visual: 'danger' (rojo), 'warning' (naranja), 'info' (azul). */
  variant?:     ConfirmVariant;
  /** Ícono custom (Feather). Si no se pasa, se usa uno por defecto según variant. */
  icon?:        string;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// ─── Contexto ─────────────────────────────────────────────────────────────────
const ConfirmContext = createContext<ConfirmFn | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
interface ConfirmProviderProps {
  children: React.ReactNode;
}

export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  // Guardamos el resolver de la promesa en un ref para no perderlo entre renders
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  // ── API pública: confirm() devuelve una promesa ───────────────────────────
  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
      setVisible(true);
    });
  }, []);

  // ── El usuario confirmó ───────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setVisible(false);
    // Limpiamos las opciones después de que termine la animación de cierre
    setTimeout(() => setOptions(null), 300);
  }, []);

  // ── El usuario canceló (botón, tap fuera, o back de Android) ─────────────
  const handleCancel = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setVisible(false);
    setTimeout(() => setOptions(null), 300);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        visible={visible}
        title={options?.title        ?? ''}
        message={options?.message}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        variant={options?.variant}
        icon={options?.icon}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useConfirm = (): ConfirmFn => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error(
      '[useConfirm] El hook debe usarse dentro de <ConfirmProvider>. ' +
      'Asegurate de que <ConfirmProvider> envuelva tu árbol de componentes en App.tsx.'
    );
  }

  return context;
};