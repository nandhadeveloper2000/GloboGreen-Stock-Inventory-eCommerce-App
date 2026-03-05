import { useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "./constants/SummaryApi";
import { useAuth } from "./context/auth/AuthProvider";
import { useShop } from "./context/shop/ShopProvider";

interface ApiResponse {
  success?: boolean;
  message?: string;
  accessToken?: string;
  token?: string;
  user?: any;
  data?: {
    accessToken?: string;
    user?: any;
  };
}

type PostResult<T> = { ok: boolean; status: number; data: T | null };

async function postJson<T>(
  url: string,
  payload: unknown,
  method: string = "POST"
): Promise<PostResult<T>> {
  const fullUrl = `${baseURL}${url}`;

  const res = await fetch(fullUrl, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function pickAuth(r: ApiResponse | null) {
  const token = r?.accessToken || r?.token || r?.data?.accessToken || "";
  const user = r?.user || r?.data?.user || null;
  return { token, user };
}

export default function Login() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { setCurrentShopId } = useShop();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const disabled = loginLoading;

  const headerSubtitle = useMemo(() => "Sign in with your ShopStack account", []);

  const goByRole = useCallback(
    async (user: any) => {
      const role = String(user?.role || "").toUpperCase();
      const shopIds: string[] = Array.isArray(user?.shopIds) ? user.shopIds : [];

      // Reset shop context for admin-like roles
      if (role === "MASTER_ADMIN") {
        await setCurrentShopId(null);
        router.replace("/master/(tabs)");
        return;
      }

      if (role === "SUB_ADMIN") {
        await setCurrentShopId(null);
        router.replace("/subadmin/(tabs)" as any);
        return;
      }

      // For shop users:
      if (shopIds.length > 1) {
        router.replace("/shop-select");
        return;
      }

      if (shopIds.length === 1) {
        await setCurrentShopId(shopIds[0]);
        router.replace("/"); // your home/dashboard route
        return;
      }

      router.replace("/"); // fallback
    },
    [router, setCurrentShopId]
  );

  const doLogin = useCallback(async () => {
    const e = emailOrUsername.trim();
    const p = pin.trim();

    if (!e || !p) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Enter login/email and PIN",
      });
      return;
    }

    // Optional stricter PIN check (you can relax if needed)
    if (!/^\d{4,6}$/.test(p)) {
      Toast.show({
        type: "error",
        text1: "Invalid PIN",
        text2: "PIN must be 4 to 6 digits",
      });
      return;
    }

    try {
      setLoginLoading(true);

      // 1) Master login
      const masterRes = await postJson<ApiResponse>(SummaryApi.master_login.url, {
        login: e,
        pin: p,
      });

      let finalRes = masterRes;

      // 2) SubAdmin fallback
      if (!finalRes.ok || !finalRes.data?.success) {
        finalRes = await postJson<ApiResponse>(SummaryApi.subadmin_login.url, {
          emailOrUsername: e,
          pin: p,
        });
      }

      if (!finalRes.ok || !finalRes.data?.success) {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: finalRes.data?.message || "Invalid credentials",
        });
        return;
      }

      const { token, user } = pickAuth(finalRes.data);

      if (!token || !user) {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: "Auth data missing in response",
        });
        return;
      }

      await setAuth(user, token);

      Toast.show({
        type: "success",
        text1: "Login Successful",
        text2: "Welcome back 👋",
      });

      await goByRole(user);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: err?.message || "Something went wrong",
      });
    } finally {
      setLoginLoading(false);
    }
  }, [emailOrUsername, pin, setAuth, goByRole]);

  return (
    <SafeAreaView className="flex-1 bg-[#F6F7FB]">
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-6 pt-6 flex-1">
          {/* Header */}
          <View className="items-center mt-2">
            <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center border border-gray-100 shadow-sm">
              <Image
                source={require("../assets/images/icon.png")}
                className="w-12 h-12"
                resizeMode="contain"
              />
            </View>

            <Text className="text-2xl font-extrabold text-gray-900 mt-4">
              Welcome Back
            </Text>
            <Text className="text-gray-500 mt-1 text-center">
              {headerSubtitle}
            </Text>
          </View>

          {/* Card */}
          <View className="mt-8 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            {/* Email */}
            <Text className="text-gray-800 font-semibold mb-2">
              Email / Username / Login
            </Text>

            <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3 bg-gray-50">
              <View className="w-9 h-9 rounded-xl bg-white border border-gray-100 items-center justify-center">
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color="#6B7280"
                />
              </View>

              <TextInput
                value={emailOrUsername}
                onChangeText={setEmailOrUsername}
                placeholder="email or username or 5914"
                autoCapitalize="none"
                returnKeyType="next"
                className="flex-1 ml-3 text-[15px] text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Premium PIN block */}
            <View className="mt-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-800 font-semibold">PIN</Text>

                {/* subtle lock badge */}
                <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100">
                  <MaterialCommunityIcons name="shield-lock-outline" size={14} color="#6B7280" />
                  <Text className="text-[11px] text-gray-500 font-semibold">
                    Secure
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3 bg-gray-50">
                <View className="w-9 h-9 rounded-xl bg-white border border-gray-100 items-center justify-center">
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color="#6B7280"
                  />
                </View>

                <TextInput
                  value={pin}
                  onChangeText={(t) => setPin(t.replace(/[^\d]/g, ""))} // numeric only
                  placeholder="Enter your PIN"
                  secureTextEntry={!showPin}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={doLogin}
                  className="flex-1 ml-3 text-[15px] text-gray-900 tracking-widest"
                  placeholderTextColor="#9CA3AF"
                  maxLength={6}
                />

                <Pressable
                  onPress={() => setShowPin((s) => !s)}
                  hitSlop={10}
                  className="w-10 h-10 rounded-xl items-center justify-center"
                >
                  <MaterialCommunityIcons
                    name={showPin ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            </View>

            {/* Button */}
            <TouchableOpacity
              onPress={doLogin}
              disabled={disabled}
              activeOpacity={0.92}
              className={`w-full mt-6 rounded-2xl py-4 flex-row items-center justify-center ${
                disabled ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
              }`}
            >
              {loginLoading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text className="ml-3 text-white text-[16px] font-extrabold">
                    Logging in...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="login" size={22} color="#FFFFFF" />
                  <Text className="ml-2 text-white text-[16px] font-extrabold">
                    Log In
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Optional: quick hint row */}
            <View className="mt-4 flex-row items-center justify-center">
              <MaterialCommunityIcons name="information-outline" size={14} color="#9CA3AF" />
              <Text className="ml-2 text-[11px] text-gray-400">
                Use master login (e.g., 5914) or your SubAdmin credentials
              </Text>
            </View>
          </View>

          <Text className="mt-auto mb-6 text-center text-[10px] text-gray-400">
            © 2026 Globo Green Tech System Pvt. Ltd
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}