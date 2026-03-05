import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, { BaseToast, ErrorToast, ToastConfig } from "react-native-toast-message";

import { AuthProvider } from "./context/auth/AuthProvider";
import { ShopProvider } from "./context/shop/ShopProvider";
import "./global.css";

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#16BB05",
        backgroundColor: "#ffffff",
        borderRadius: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}
      text2Style={{ fontSize: 13, color: "#6B7280" }}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: "#EF4444",
        backgroundColor: "#ffffff",
        borderRadius: 16,
      }}
      text1Style={{ fontSize: 15, fontWeight: "800" }}
      text2Style={{ fontSize: 13 }}
    />
  ),
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ShopProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" />
            <Stack.Screen name="shop-select" />
            <Stack.Screen name="master/(tabs)" />
            <Stack.Screen name="subadmin/(tabs)" />

          </Stack>

          {/* ✅ Toast must be mounted once in root */}
          <Toast config={toastConfig} position="top" topOffset={60} />
        </ShopProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}