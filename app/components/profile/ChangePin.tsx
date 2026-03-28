import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

type AuthLike = {
  user?: any;
  auth?: any;
  token?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  setAuth?: (
    userOrAuth: any,
    accessToken?: string | null,
    refreshToken?: string | null
  ) => Promise<void> | void;
  logout?: () => Promise<void> | void;
};

type ApiConfig = {
  url: string;
  method?: string;
};

type GradientColors = readonly [string, string, ...string[]];

type RoleTheme = {
  badge: string;
  subtitle: string;
  gradient: GradientColors;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

const toastError = (message: string) => {
  Toast.show({
    type: "error",
    text1: "Error",
    text2: message,
    position: "top",
    visibilityTime: 2600,
  });
};

const toastSuccess = (message: string) => {
  Toast.show({
    type: "success",
    text1: "Success",
    text2: message,
    position: "top",
    visibilityTime: 2200,
  });
};

function getRoleLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return "Master Admin";
    case ROLES.MANAGER:
      return "Manager";
    case ROLES.SUPERVISOR:
      return "Supervisor";
    case ROLES.STAFF:
      return "Staff";
    default:
      return "User";
  }
}

function getRoleTheme(role?: string | null): RoleTheme {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        badge: "MASTER ADMIN",
        subtitle: "Update your master account PIN securely.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };

    case ROLES.MANAGER:
      return {
        badge: "MANAGER",
        subtitle: "Update your manager account PIN securely.",
        gradient: [COLORS.heroGreenDark, COLORS.primaryDark, COLORS.primary],
      };

    case ROLES.SUPERVISOR:
      return {
        badge: "SUPERVISOR",
        subtitle: "Update your supervisor account PIN securely.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    case ROLES.STAFF:
      return {
        badge: "STAFF",
        subtitle: "Update your staff account PIN securely.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    default:
      return {
        badge: "ACCOUNT",
        subtitle: "Update your account PIN securely.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };
  }
}

function getChangePinApi(role?: string | null): ApiConfig | null {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return SummaryApi.master_change_pin;
    case ROLES.MANAGER:
      return SummaryApi.subadmin_change_pin;
    case ROLES.SUPERVISOR:
      return SummaryApi.staff_change_pin;
    case ROLES.STAFF:
      return SummaryApi.staff_change_pin;
    default:
      return null;
  }
}

function PinInput({
  label,
  placeholder,
  value,
  onChangeText,
  secure,
  onToggleSecure,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secure: boolean;
  onToggleSecure: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-[13px] font-semibold text-heading">
        {label}
      </Text>

      <View className="h-[48px] flex-row items-center rounded-[14px] border border-border bg-soft px-3">
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^\d]/g, "").slice(0, 6))}
          placeholder={placeholder}
          placeholderTextColor={COLORS.labelText}
          secureTextEntry={secure}
          keyboardType="number-pad"
          maxLength={6}
          className="flex-1 text-[14px] font-semibold text-primaryText"
        />

        <Pressable
          onPress={onToggleSecure}
          hitSlop={10}
          className="ml-2 h-8 w-8 items-center justify-center"
        >
          <MaterialCommunityIcons
            name={secure ? "eye-off-outline" : "eye-outline"}
            size={18}
            color={COLORS.secondaryText}
          />
        </Pressable>
      </View>
    </View>
  );
}

function PinRule({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <View className="mb-2 flex-row items-center">
      <View
        className={`mr-2 h-4 w-4 items-center justify-center rounded-full ${
          active ? "bg-primary" : "bg-soft"
        }`}
      >
        <MaterialCommunityIcons
          name={active ? "check" : "minus"}
          size={10}
          color={active ? COLORS.white : COLORS.secondaryText}
        />
      </View>

      <Text
        className={`text-[12px] font-medium ${
          active ? "text-primaryText" : "text-secondaryText"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function ChangePinScreen() {
  const router = useRouter();
  const authCtx = useAuth() as unknown as AuthLike;

  const accessToken = authCtx?.accessToken || authCtx?.token || null;
  const logout = authCtx?.logout;
  const setAuth = authCtx?.setAuth;

  const rawUser =
    authCtx?.user ||
    (authCtx?.auth && typeof authCtx.auth === "object" && "user" in authCtx.auth
      ? (authCtx.auth as any)?.user
      : authCtx?.auth) ||
    null;

  const role = rawUser?.role || null;
  const normalizedRole = normalizeRole(role);
  const roleLabel = getRoleLabel(role);
  const theme = getRoleTheme(role);
  const apiConfig = getChangePinApi(role);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const [loading, setLoading] = useState(false);

  const isValidPin = useCallback((pin: string) => /^\d{4,6}$/.test(pin.trim()), []);

  const pinHasLength = useMemo(() => /^\d{4,6}$/.test(newPin.trim()), [newPin]);

  const pinDifferent = useMemo(() => {
    return !!currentPin.trim() && !!newPin.trim() && currentPin.trim() !== newPin.trim();
  }, [currentPin, newPin]);

  const pinMatched = useMemo(() => {
    return (
      !!confirmPin.trim() &&
      !!newPin.trim() &&
      confirmPin.trim() === newPin.trim() &&
      /^\d{4,6}$/.test(confirmPin.trim())
    );
  }, [confirmPin, newPin]);

  const canSubmit = useMemo(() => {
    return (
      currentPin.trim().length >= 4 &&
      newPin.trim().length >= 4 &&
      confirmPin.trim().length >= 4 &&
      !loading
    );
  }, [currentPin, newPin, confirmPin, loading]);

  const logoutAndGoLogin = useCallback(async () => {
    try {
      if (typeof logout === "function") {
        await logout();
      } else if (typeof setAuth === "function") {
        await setAuth(null, null, null);
      }
    } catch {
      if (typeof setAuth === "function") {
        await setAuth(null, null, null);
      }
    } finally {
      router.replace("/Login" as any);
    }
  }, [logout, setAuth, router]);

  const handleChangePin = useCallback(async () => {
    try {
      if (!normalizedRole) {
        toastError("Invalid user role");
        return;
      }

      if (!apiConfig?.url) {
        toastError(`${roleLabel} change PIN API is not configured`);
        return;
      }

      if (!accessToken) {
        toastError("Session expired. Please login again.");
        return;
      }

      if (!isValidPin(currentPin)) {
        toastError("Current PIN must be 4 to 6 digits");
        return;
      }

      if (!isValidPin(newPin)) {
        toastError("New PIN must be 4 to 6 digits");
        return;
      }

      if (!isValidPin(confirmPin)) {
        toastError("Confirm PIN must be 4 to 6 digits");
        return;
      }

      if (newPin !== confirmPin) {
        toastError("Confirm PIN does not match");
        return;
      }

      if (currentPin === newPin) {
        toastError("New PIN must be different from current PIN");
        return;
      }

      setLoading(true);

      const res = await fetch(`${baseURL}${apiConfig.url}`, {
        method: apiConfig.method || "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          currentPin: currentPin.trim(),
          newPin: newPin.trim(),
        }),
      });

      const json: any = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.message || "Failed to change PIN");
      }

      toastSuccess(json?.message || "PIN changed successfully");

      Alert.alert(
        "PIN Changed",
        json?.message || "PIN changed successfully. Please login again.",
        [
          {
            text: "OK",
            onPress: logoutAndGoLogin,
          },
        ]
      );
    } catch (error: any) {
      toastError(error?.message || "Unable to change PIN");
    } finally {
      setLoading(false);
    }
  }, [
    normalizedRole,
    apiConfig,
    roleLabel,
    accessToken,
    isValidPin,
    currentPin,
    newPin,
    confirmPin,
    logoutAndGoLogin,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroDark} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="min-h-[210px] overflow-hidden rounded-b-[26px] px-4 pb-6 pt-3"
          >
            <View className="absolute right-[-20px] top-[-20px] h-[140px] w-[140px] rounded-full bg-white/10" />
            <View className="absolute bottom-5 left-[-20px] h-[100px] w-[100px] rounded-full bg-white/10" />

            <Pressable
              onPress={() => router.back()}
              className="mb-4 h-[40px] w-[40px] items-center justify-center rounded-[12px] border border-white/15 bg-white/10"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={COLORS.white}
              />
            </Pressable>

            <View className="self-start rounded-full bg-white/15 px-3 py-1.5">
              <Text className="text-[10px] font-extrabold tracking-wide text-white">
                {theme.badge}
              </Text>
            </View>

            <Text className="mt-3 text-[26px] font-black text-white">
              Change PIN
            </Text>

            <Text className="mt-2 text-[13px] leading-5 text-white/85">
              {theme.subtitle}
            </Text>

            <View className="mt-4 flex-row items-center self-start rounded-[12px] bg-white/10 px-3 py-2">
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={15}
                color={COLORS.white}
              />
              <Text className="ml-2 text-[12px] font-semibold text-white">
                Role: {roleLabel}
              </Text>
            </View>
          </LinearGradient>

          <View className="-mt-5 px-4">
            <View
              className="rounded-[16px] border border-border bg-card p-4"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}
            >
              <View className="mb-5">
                <Text className="mb-1 text-[18px] font-bold text-heading">
                  PIN Details
                </Text>
                <Text className="text-[13px] leading-5 text-secondaryText">
                  Enter your current PIN and set a new secure PIN for your{" "}
                  {roleLabel.toLowerCase()} account.
                </Text>
              </View>

              <PinInput
                label="Current PIN"
                placeholder="Enter current PIN"
                value={currentPin}
                onChangeText={setCurrentPin}
                secure={secureCurrent}
                onToggleSecure={() => setSecureCurrent((prev) => !prev)}
              />

              <PinInput
                label="New PIN"
                placeholder="Enter new PIN"
                value={newPin}
                onChangeText={setNewPin}
                secure={secureNew}
                onToggleSecure={() => setSecureNew((prev) => !prev)}
              />

              <PinInput
                label="Confirm New PIN"
                placeholder="Re-enter new PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                secure={secureConfirm}
                onToggleSecure={() => setSecureConfirm((prev) => !prev)}
              />

              <View className="mb-4 rounded-[14px] border border-border bg-soft p-3">
                <View className="mb-3 flex-row items-start">
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={16}
                    color={COLORS.primaryDark}
                    style={{ marginTop: 1, marginRight: 8 }}
                  />

                  <View className="flex-1">
                    <Text className="mb-1 text-[13px] font-semibold text-heading">
                      PIN Rules
                    </Text>
                    <Text className="text-[12px] leading-[18px] text-secondaryText">
                      Use a 4 to 6 digit PIN that is easy for you to remember and
                      difficult for others to guess.
                    </Text>
                  </View>
                </View>

                <PinRule label="PIN must be 4 to 6 digits" active={pinHasLength} />
                <PinRule
                  label="New PIN must be different from current PIN"
                  active={pinDifferent}
                />
                <PinRule
                  label="Confirm PIN must match new PIN"
                  active={pinMatched}
                />
              </View>

              <Pressable
                onPress={handleChangePin}
                disabled={!canSubmit}
                className={`h-[50px] flex-row items-center justify-center rounded-[14px] ${
                  canSubmit ? "bg-primary active:opacity-90" : "bg-primary/60"
                }`}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="shield-lock-outline"
                      size={17}
                      color={COLORS.white}
                    />
                    <Text className="ml-2 text-[14px] font-semibold text-white">
                      Update PIN
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}