// app/index.tsx
import { router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "./context/auth/AuthProvider";

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const role = String(user?.role || "").toUpperCase();
    const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

    if (!user) router.replace("/Login" as any);
    else if (isAdmin) router.replace("/admin/(tabs)" as any);
    else router.replace("/(tabs)" as any);
  }, [user, loading]);

  return null;
}
