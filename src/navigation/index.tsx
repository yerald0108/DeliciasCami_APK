import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants';
import { useLowStockItems } from '../store';
import { Shift } from '../types';

// ─── Importaciones de pantallas ───────────────────────────────────────────────
import { InventoryListScreen }        from '../screens/inventory/InventoryListScreen';
import { IngredientFormScreen }       from '../screens/inventory/IngredientFormScreen';
import { ShiftDashboardScreen }       from '../screens/shift/ShiftDashboardScreen';
import { CloseShiftScreen }           from '../screens/shift/CloseShiftScreen';
import { ShiftSummaryScreen }         from '../screens/shift/ShiftSummaryScreen';
import { ShiftHistoryScreen }         from '../screens/history/ShiftHistoryScreen';
import { ShiftHistoryDetailScreen }   from '../screens/history/ShiftHistoryDetailScreen';
import { StatsScreen }                from '../screens/stats/StatsScreen';

// ─── Tipos de rutas ───────────────────────────────────────────────────────────
export type InventoryStackParams = {
  InventoryList:  undefined;
  IngredientForm: { ingredientId?: string };
};

export type ShiftStackParams = {
  ShiftDashboard: undefined;
  CloseShift:     undefined;
  ShiftSummary:   undefined;
};

export type TabParams = {
  InventoryTab:  undefined;
  ShiftTab:      undefined;
  HistoryTab:    undefined;
  StatsTab:      undefined;
};

// ─── Navegadores ──────────────────────────────────────────────────────────────
const Tab            = createBottomTabNavigator<TabParams>();
const InventoryStack = createNativeStackNavigator<InventoryStackParams>();
const ShiftStack     = createNativeStackNavigator<ShiftStackParams>();

// ─── Stack de inventario ──────────────────────────────────────────────────────
function InventoryNavigator() {
  return (
    <InventoryStack.Navigator screenOptions={{ headerShown: false }}>
      <InventoryStack.Screen name="InventoryList"  component={InventoryListScreen}  />
      <InventoryStack.Screen name="IngredientForm" component={IngredientFormScreen} />
    </InventoryStack.Navigator>
  );
}

// ─── Stack de turno ───────────────────────────────────────────────────────────
function ShiftNavigator() {
  return (
    <ShiftStack.Navigator screenOptions={{ headerShown: false }}>
      <ShiftStack.Screen name="ShiftDashboard" component={ShiftDashboardScreen} />
      <ShiftStack.Screen name="CloseShift"     component={CloseShiftScreen}     />
      <ShiftStack.Screen name="ShiftSummary"   component={ShiftSummaryScreen}   />
    </ShiftStack.Navigator>
  );
}

// ─── Historial con detalle manejado localmente ────────────────────────────────
function HistoryNavigator() {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  if (selectedShift) {
    return (
      <ShiftHistoryDetailScreen
        shift={selectedShift}
        onBack={() => setSelectedShift(null)}
      />
    );
  }

  return (
    <ShiftHistoryScreen onSelectShift={setSelectedShift} />
  );
}

// ─── Icono de tab con badge ───────────────────────────────────────────────────
function TabIcon({
  icon,
  badgeCount,
}: {
  icon:        React.ReactNode;
  badgeCount?: number;
}) {
  return (
    <View style={styles.tabIconWrapper}>
      {icon}
      {badgeCount && badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Navegador principal ──────────────────────────────────────────────────────
export function AppNavigator() {
  const lowStockItems = useLowStockItems();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown:             false,
          tabBarStyle:             styles.tabBar,
          tabBarActiveTintColor:   Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle:        styles.tabLabel,
        }}
      >
        <Tab.Screen
          name="InventoryTab"
          component={InventoryNavigator}
          options={{
            tabBarLabel: 'Inventario',
            tabBarIcon: ({ color }) => (
              <TabIcon
                badgeCount={lowStockItems.length}
                icon={<Feather name="package" size={22} color={color} />}
              />
            ),
          }}
        />

        <Tab.Screen
          name="ShiftTab"
          component={ShiftNavigator}
          options={{
            tabBarLabel: 'Turno',
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={
                  <MaterialCommunityIcons
                    name="chef-hat"
                    size={24}
                    color={color}
                  />
                }
              />
            ),
          }}
        />

        <Tab.Screen
          name="HistoryTab"
          component={HistoryNavigator}
          options={{
            tabBarLabel: 'Historial',
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={<Feather name="clock" size={22} color={color} />}
              />
            ),
          }}
        />

        <Tab.Screen
          name="StatsTab"
          component={StatsScreen}
          options={{
            tabBarLabel: 'Estadísticas',
            tabBarIcon: ({ color }) => (
              <TabIcon
                icon={<Feather name="bar-chart-2" size={22} color={color} />}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor:  Colors.surface,
    borderTopWidth:   1,
    borderTopColor:   Colors.border,
    paddingBottom:    Spacing.sm,
    paddingTop:       Spacing.xs,
    height:           64,
  },

  tabLabel: {
    fontSize:   Typography.xs,
    fontWeight: Typography.medium,
    marginTop:  2,
  },

  tabIconWrapper: {
    position: 'relative',
  },

  badge: {
    position:          'absolute',
    top:               -4,
    right:             -8,
    backgroundColor:   Colors.error,
    borderRadius:      Radius.full,
    minWidth:          16,
    height:            16,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
  },

  badgeText: {
    fontSize:   8,
    fontWeight: Typography.bold,
    color:      Colors.textOnPrimary,
  },
});