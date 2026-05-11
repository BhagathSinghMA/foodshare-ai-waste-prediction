// src/navigation/AppNavigator.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOWS } from '../theme';

import LoginScreen        from '../screens/LoginScreen';
import SignupScreen       from '../screens/SignupScreen';
import DashboardScreen    from '../screens/DashboardScreen';
import FoodAvailableScreen from '../screens/FoodAvailableScreen';
import DonateFoodScreen   from '../screens/DonateFoodScreen';
import DeliveredScreen    from '../screens/DeliveredScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_CONFIG = {
  Dashboard:     { icon: 'grid',              iconO: 'grid-outline',              label: 'Dashboard' },
  FoodAvailable: { icon: 'restaurant',        iconO: 'restaurant-outline',        label: 'Available'  },
  Donate:        { icon: 'add-circle',        iconO: 'add-circle-outline',        label: 'Donate'     },
  Delivered:     { icon: 'checkmark-circle',  iconO: 'checkmark-circle-outline',  label: 'Delivered'  },
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
    <Stack.Screen name="Login"  component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => {
      const cfg = TAB_CONFIG[route.name] || {};
      return {
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 82 : 65,
          paddingBottom: Platform.OS === 'ios' ? 22 : 10,
          paddingTop: 8,
          ...SHADOWS.lg,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
        tabBarLabel: cfg.label,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? cfg.icon : cfg.iconO} size={focused ? 26 : 22} color={color} />
        ),
      };
    }}
  >
    <Tab.Screen name="Dashboard"     component={DashboardScreen} />
    <Tab.Screen name="FoodAvailable" component={FoodAvailableScreen} />
    <Tab.Screen name="Donate"        component={DonateFoodScreen} />
    <Tab.Screen name="Delivered"     component={DeliveredScreen} />
  </Tab.Navigator>
);

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={ss.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

const ss = StyleSheet.create({
  splash: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor: COLORS.primaryDeep },
});