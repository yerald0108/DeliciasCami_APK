import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/database';
import { AppNavigator } from './src/navigation';
import { ConfirmProvider } from './src/hooks';
import { Colors, Typography, Spacing } from './src/constants';

// ─── Pantalla de carga inicial ────────────────────────────────────────────────
function SplashScreen() {
  return (
    <View style={styles.splash}>
      <Text style={styles.splashTitle}>Delicias'Cami</Text>
      <Text style={styles.splashSubtitle}>Cargando...</Text>
      <ActivityIndicator
        size="large"
        color={Colors.primary}
        style={styles.splashLoader}
      />
    </View>
  );
}

// ─── Pantalla de error de base de datos ───────────────────────────────────────
function ErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Error al iniciar</Text>
      <Text style={styles.errorMessage}>{message}</Text>
    </View>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        setIsReady(true);
      } catch (err: any) {
        setError(err.message ?? 'Error desconocido al inicializar la base de datos.');
      }
    }
    bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />

      {/* ConfirmProvider envuelve TODO el árbol para que useConfirm() funcione
          en cualquier pantalla. Monta el ConfirmDialog una sola vez. */}
      <ConfirmProvider>
        {error    ? <ErrorScreen message={error} /> :
         !isReady ? <SplashScreen /> :
                    <AppNavigator />}
      </ConfirmProvider>
    </SafeAreaProvider>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  splash: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.background,
    gap:             Spacing.md,
  },

  splashTitle: {
    fontSize:   Typography.xxl,
    fontWeight: Typography.bold,
    color:      Colors.primary,
  },

  splashSubtitle: {
    fontSize: Typography.base,
    color:    Colors.textSecondary,
  },

  splashLoader: {
    marginTop: Spacing.lg,
  },

  error: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.background,
    padding:         Spacing.xl,
    gap:             Spacing.md,
  },

  errorTitle: {
    fontSize:   Typography.xl,
    fontWeight: Typography.bold,
    color:      Colors.error,
  },

  errorMessage: {
    fontSize:  Typography.base,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },
});