import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { COLORS } from "../src/constants/colors";
import { useAuth } from "../src/context/auth/AuthProvider";

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const role = String(user?.role || user?.roles?.[0] || "").toUpperCase();

    if (!user) {
      router.replace("/onboarding");
      return;
    }

    if (role === "MASTER_ADMIN") {
      router.replace("/master/dashboard");
      return;
    }

    if (role === "SUB_ADMIN" || role === "MANAGER") {
      router.replace("/subadmin/dashboard");
      return;
    }

    if (role === "SUPERVISOR") {
      router.replace("/supervisor/dashboard");
      return;
    }

    if (role === "STAFF") {
      router.replace("/staff/dashboard");
      return;
    }

    router.replace("/Login");
  }, [user, loading]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}