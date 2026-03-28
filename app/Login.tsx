import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { COLORS } from "../src/constants/colors";
import SummaryApi, { baseURL } from "../src/constants/SummaryApi";
import { useAuth } from "../src/context/auth/AuthProvider";

type ApiResponse = {
  success?: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: any;
  data?: any;
};

type PostResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
};

async function postJson<T>(
  url: string,
  payload: unknown,
  method: string = "POST",
  timeoutMs: number = 10000,
  signal?: AbortSignal
): Promise<PostResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const finalSignal = signal ?? controller.signal;

  try {
    const res = await fetch(`${baseURL}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: finalSignal,
    });

    const data = await res.json().catch(() => null);

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";

    return {
      ok: false,
      status: 0,
      data: null,
      error: isAbort
        ? "Request timed out. Please try again."
        : err?.message || "Network request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function pickAuthData(response: ApiResponse | null) {
  const accessToken =
    response?.accessToken ||
    response?.token ||
    response?.data?.accessToken ||
    "";

  const refreshToken = response?.refreshToken || response?.data?.refreshToken || "";

  const user =
    response?.user ||
    response?.data?.user ||
    (response?.data && !response?.data?.user ? response.data : null) ||
    null;

  return { accessToken, refreshToken, user };
}

function makeLoginPromise(
  request: Promise<PostResult<ApiResponse>>
): Promise<ApiResponse> {
  return new Promise(async (resolve, reject) => {
    const res = await request;

    if (res.ok && res.data?.success) {
      resolve(res.data);
      return;
    }

    reject(new Error(res.error || res.data?.message || "Login failed"));
  });
}

async function firstSuccessfulLogin(promises: Promise<ApiResponse>[]) {
  return new Promise<ApiResponse>((resolve, reject) => {
    let rejectedCount = 0;

    promises.forEach((promise) => {
      promise
        .then(resolve)
        .catch(() => {
          rejectedCount += 1;

          if (rejectedCount === promises.length) {
            reject(new Error("All login attempts failed"));
          }
        });
    });
  });
}

export default function Login() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const { width, height } = useWindowDimensions();

  const pinRef = useRef<TextInput | null>(null);

  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"login" | "pin" | null>(null);

  const isSmallDevice = width < 360 || height < 700;
  const isLargeDevice = width > 430 || height > 900;

  const cardPadding = isSmallDevice ? 16 : isLargeDevice ? 24 : 20;
  const logoSize = isSmallDevice ? 72 : isLargeDevice ? 96 : 88;
  const iconSize = isSmallDevice ? 40 : isLargeDevice ? 52 : 48;
  const titleSize = isSmallDevice ? 24 : isLargeDevice ? 30 : 28;
  const cardRadius = isSmallDevice ? 22 : 28;
  const inputMinHeight = isSmallDevice ? 52 : 58;

  const subtitle = useMemo(
    () => "Sign in to access your Globo Green Shop Stack workspace securely.",
    []
  );

  const goByRole = useCallback(
    (user: any) => {
      const role = String(
        user?.role ?? (Array.isArray(user?.roles) ? user.roles[0] : "") ?? ""
      )
        .trim()
        .toUpperCase();

      if (role === "MASTER_ADMIN" || role === "MASTER") {
        router.replace("/master/dashboard");
        return;
      }

      if (role === "SUB_ADMIN" || role === "SUBADMIN" || role === "MANAGER") {
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

      router.replace("/");
    },
    [router]
  );

  const doLogin = useCallback(async () => {
    Keyboard.dismiss();

    const enteredLoginId = loginId.trim();
    const enteredPin = pin.trim();

    if (!enteredLoginId || !enteredPin) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Enter your login ID and PIN",
      });
      return;
    }

    if (!/^\d{4,6}$/.test(enteredPin)) {
      Toast.show({
        type: "error",
        text1: "Invalid PIN",
        text2: "PIN must contain 4 to 6 digits",
      });
      return;
    }

    const masterController = new AbortController();
    const subadminController = new AbortController();
    const supervisorController = new AbortController();
    const staffController = new AbortController();

    try {
      setLoading(true);

      const masterPromise = makeLoginPromise(
        postJson<ApiResponse>(
          SummaryApi.master_login.url,
          { login: enteredLoginId, pin: enteredPin },
          SummaryApi.master_login.method || "POST",
          10000,
          masterController.signal
        )
      );

      const subadminPromise = makeLoginPromise(
        postJson<ApiResponse>(
          SummaryApi.subadmin_login.url,
          { username: enteredLoginId, pin: enteredPin },
          SummaryApi.subadmin_login.method || "POST",
          10000,
          subadminController.signal
        )
      );

      const supervisorPromise = makeLoginPromise(
        postJson<ApiResponse>(
          SummaryApi.supervisor_login.url,
          { login: enteredLoginId, pin: enteredPin },
          SummaryApi.supervisor_login.method || "POST",
          10000,
          supervisorController.signal
        )
      );

      const staffPromise = makeLoginPromise(
        postJson<ApiResponse>(
          SummaryApi.staff_login.url,
          { login: enteredLoginId, pin: enteredPin },
          SummaryApi.staff_login.method || "POST",
          10000,
          staffController.signal
        )
      );

      const finalResponse = await firstSuccessfulLogin([
        masterPromise,
        subadminPromise,
        supervisorPromise,
        staffPromise,
      ]);

      masterController.abort();
      subadminController.abort();
      supervisorController.abort();
      staffController.abort();

      const { accessToken, refreshToken, user } = pickAuthData(finalResponse);

      if (!accessToken || !user) {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: "Authentication response is incomplete",
        });
        return;
      }

      await setAuth(user, accessToken, refreshToken || null);

      Toast.show({
        type: "success",
        text1: "Login Successful",
        text2: "Welcome back",
      });

      goByRole(user);
    } catch {
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: "Invalid credentials or server is unavailable",
      });
    } finally {
      masterController.abort();
      subadminController.abort();
      supervisorController.abort();
      staffController.abort();
      setLoading(false);
    }
  }, [goByRole, loginId, pin, setAuth]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: isSmallDevice ? 16 : 20,
              paddingTop: isSmallDevice ? 16 : 24,
              paddingBottom: isSmallDevice ? 20 : 30,
              justifyContent: "center",
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <View
              style={{
                position: "absolute",
                top: -40,
                right: -30,
                width: isSmallDevice ? 140 : 180,
                height: isSmallDevice ? 140 : 180,
                borderRadius: 999,
                backgroundColor: COLORS.primarySoft2,
                opacity: 0.45,
              }}
            />

            <View
              style={{
                position: "absolute",
                bottom: 80,
                left: -50,
                width: isSmallDevice ? 110 : 140,
                height: isSmallDevice ? 110 : 140,
                borderRadius: 999,
                backgroundColor: COLORS.successSoft,
                opacity: 0.35,
              }}
            />

            <View
              style={{
                alignItems: "center",
                marginBottom: isSmallDevice ? 20 : 26,
              }}
            >
              <LinearGradient
                colors={[COLORS.white, COLORS.primarySoft]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: logoSize,
                  height: logoSize,
                  borderRadius: isSmallDevice ? 20 : 24,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  shadowColor: COLORS.primary,
                  shadowOpacity: 0.12,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 6,
                }}
              >
                <Image
                  source={require("../assets/images/icon.png")}
                  style={{ width: iconSize, height: iconSize }}
                  resizeMode="contain"
                />
              </LinearGradient>

              <Text
                style={{
                  marginTop: 18,
                  fontSize: titleSize,
                  fontWeight: "800",
                  color: COLORS.heading,
                  letterSpacing: -0.6,
                }}
              >
                Welcome back
              </Text>

              <Text
                style={{
                  marginTop: 8,
                  fontSize: isSmallDevice ? 13 : 14,
                  lineHeight: isSmallDevice ? 19 : 21,
                  textAlign: "center",
                  color: COLORS.secondaryText,
                  maxWidth: 320,
                }}
              >
                {subtitle}
              </Text>
            </View>

            <View
              style={{
                borderRadius: cardRadius,
                backgroundColor: COLORS.card,
                padding: cardPadding,
                borderWidth: 1,
                borderColor: COLORS.border,
                shadowColor: "#0F172A",
                shadowOpacity: 0.07,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 10 },
                elevation: 6,
              }}
            >
              <View style={{ marginBottom: 18 }}>
                <Text
                  style={{
                    fontSize: isSmallDevice ? 17 : 18,
                    fontWeight: "800",
                    color: COLORS.heading,
                  }}
                >
                  Sign in
                </Text>

                <Text
                  style={{
                    marginTop: 6,
                    fontSize: isSmallDevice ? 12 : 13,
                    lineHeight: isSmallDevice ? 18 : 20,
                    color: COLORS.secondaryText,
                  }}
                >
                  Use your email, username, or login ID with your security PIN.
                </Text>
              </View>

              <Text
                style={{
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLORS.primaryText,
                }}
              >
                Login ID
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: inputMinHeight,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  backgroundColor:
                    focusedField === "login" ? COLORS.white : COLORS.soft,
                  borderWidth: 1.4,
                  borderColor:
                    focusedField === "login" ? COLORS.primary : COLORS.border,
                }}
              >
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={
                    focusedField === "login"
                      ? COLORS.primary
                      : COLORS.secondaryText
                  }
                />

                <TextInput
                  value={loginId}
                  onChangeText={setLoginId}
                  onFocus={() => setFocusedField("login")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter email, username, or login ID"
                  placeholderTextColor={COLORS.labelText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  editable={!loading}
                  onSubmitEditing={() => pinRef.current?.focus()}
                  style={{
                    flex: 1,
                    marginLeft: 10,
                    color: COLORS.primaryText,
                    fontSize: isSmallDevice ? 14 : 15,
                    fontWeight: "500",
                    paddingVertical: 14,
                  }}
                />
              </View>

              <Text
                style={{
                  marginTop: 16,
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLORS.primaryText,
                }}
              >
                Security PIN
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: inputMinHeight,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  backgroundColor:
                    focusedField === "pin" ? COLORS.white : COLORS.soft,
                  borderWidth: 1.4,
                  borderColor:
                    focusedField === "pin" ? COLORS.primary : COLORS.border,
                }}
              >
                <MaterialCommunityIcons
                  name="shield-key-outline"
                  size={20}
                  color={
                    focusedField === "pin"
                      ? COLORS.primary
                      : COLORS.secondaryText
                  }
                />

                <TextInput
                  ref={pinRef}
                  value={pin}
                  onChangeText={(text) => setPin(text.replace(/[^\d]/g, ""))}
                  onFocus={() => setFocusedField("pin")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter PIN"
                  placeholderTextColor={COLORS.labelText}
                  secureTextEntry={!showPin}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={doLogin}
                  editable={!loading}
                  maxLength={6}
                  style={{
                    flex: 1,
                    marginLeft: 10,
                    color: COLORS.primaryText,
                    fontSize: isSmallDevice ? 15 : 16,
                    fontWeight: "600",
                    letterSpacing: 4,
                    paddingVertical: 14,
                  }}
                />

                <Pressable
                  onPress={() => setShowPin((prev) => !prev)}
                  hitSlop={10}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name={showPin ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.secondaryText}
                  />
                </Pressable>
              </View>

              <View
                style={{
                  marginTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={16}
                  color={COLORS.success}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: isSmallDevice ? 11 : 12,
                    color: COLORS.secondaryText,
                    flex: 1,
                  }}
                >
                  Secure access for master admin, subadmin, supervisor, and staff
                  accounts
                </Text>
              </View>

              <Pressable
                onPress={doLogin}
                disabled={loading}
                style={{
                  marginTop: 22,
                  borderRadius: 18,
                  overflow: "hidden",
                  shadowColor: COLORS.primaryDark,
                  shadowOpacity: 0.2,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 6,
                  opacity: loading ? 0.92 : 1,
                }}
              >
                <LinearGradient
                  colors={
                    loading
                      ? [COLORS.primaryLight, COLORS.primary]
                      : [COLORS.primary, COLORS.primaryDark]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    minHeight: isSmallDevice ? 52 : 56,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color={COLORS.white} />
                      <Text
                        style={{
                          marginLeft: 10,
                          color: COLORS.white,
                          fontSize: isSmallDevice ? 14 : 15,
                          fontWeight: "800",
                        }}
                      >
                        Signing in...
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="login"
                        size={20}
                        color={COLORS.white}
                      />
                      <Text
                        style={{
                          marginLeft: 10,
                          color: COLORS.white,
                          fontSize: isSmallDevice ? 14 : 15,
                          fontWeight: "800",
                        }}
                      >
                        Continue
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => router.push("/onboarding")}
                style={{
                  marginTop: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: COLORS.primary,
                  }}
                >
                  Back to welcome
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 20, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: isSmallDevice ? 10.5 : 11.5,
                  color: COLORS.mutedText,
                  textAlign: "center",
                }}
              >
                © 2026 Globo Green Tech System Pvt. Ltd.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}