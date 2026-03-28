import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast, {
    BaseToast,
    ErrorToast,
    ToastConfig,
} from "react-native-toast-message";

import "../global.css";
import { COLORS } from "../src/constants/colors";
import { AuthProvider } from "../src/context/auth/AuthProvider";
import { ShopProvider } from "../src/context/shop/ShopProvider";

const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: COLORS.primary,
        backgroundColor: COLORS.white,
        borderRadius: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 14 }}
      text1Style={{ fontSize: 15, fontWeight: "800", color: COLORS.heading }}
      text2Style={{ fontSize: 13, color: COLORS.secondaryText }}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: COLORS.danger,
        backgroundColor: COLORS.white,
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
            <Stack.Screen name="index" />
            <Stack.Screen name="Login" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="master" />
            <Stack.Screen name="subadmin" />
            <Stack.Screen name="staff" />
            <Stack.Screen name="supervisor" />
          </Stack>

          <Toast config={toastConfig} position="top" topOffset={60} />
        </ShopProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}