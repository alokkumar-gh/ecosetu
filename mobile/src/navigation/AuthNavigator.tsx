/**
 * AuthNavigator — Pre-Authentication Stack
 *
 * Flow:
 *  Landing (onboarding carousel + language selector)
 *    ↓ handleFinishCarousel → AuthGateway
 *  AuthGateway (brand bridge — Get Started / Sign In)
 *    ↓ Register | Login
 *  Login → ForgotPassword
 *  Register (3-step progressive flow)
 *
 * Note: Account status gating (PENDING_VERIFICATION, SUSPENDED, DEACTIVATED)
 * is handled at the RootNavigator level — not here.
 *
 * Animation: slide_from_right for forward steps, fade for gateway transitions.
 * headerShown: false on all screens — headers are rendered in-screen.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';

// ─── Screens ─────────────────────────────────────────────────────────────────
import { LandingScreen } from '../screens/auth/LandingScreen';
import { AuthGatewayScreen } from '../screens/auth/AuthGatewayScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* ── Onboarding ─────────────────────────────────────────────────────── */}
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
        options={{ animation: 'fade' }}
      />

      {/* ── Auth Gateway (brand bridge) ────────────────────────────────────── */}
      <Stack.Screen
        name="AuthGateway"
        component={AuthGatewayScreen}
        options={{ animation: 'fade' }}
      />

      {/* ── Authentication Screens ─────────────────────────────────────────── */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
