// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "./context/auth/AuthProvider";
import "./global.css";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Public */}
          <Stack.Screen name="Onboarding" />
          <Stack.Screen name="Login" />

          {/* Groups */}
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin/(tabs)" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
