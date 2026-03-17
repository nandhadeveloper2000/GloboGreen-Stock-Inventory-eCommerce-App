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
      return SummaryApi.staffChangePin;

    case ROLES.STAFF:
      return SummaryApi.staffChangePin;

    default:
      return null;
  }
}

function PasswordField({
  label,
  placeholder,
  value,
  onChangeText,
  secure,
  onToggleSecure,
  icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secure: boolean;
  onToggleSecure: () => void;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-extrabold text-heading">{label}</Text>

      <View className="min-h-14 flex-row items-center rounded-[20px] border border-border bg-soft px-4">
        <View className="w-7 items-start justify-center">
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={COLORS.secondaryText}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^\d]/g, "").slice(0, 6))}
          placeholder={placeholder}
          placeholderTextColor={COLORS.labelText}
          secureTextEntry={secure}
          keyboardType="number-pad"
          maxLength={6}
          className="flex-1 py-4 text-[15px] font-extrabold text-primaryText"
        />

        <Pressable
          onPress={onToggleSecure}
          hitSlop={10}
          className="w-8 items-end justify-center"
        >
          <MaterialCommunityIcons
            name={secure ? "eye-off-outline" : "eye-outline"}
            size={20}
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
        className={`mr-2 h-[18px] w-[18px] items-center justify-center rounded-full ${
          active ? "bg-primary" : "bg-soft"
        }`}
      >
        <MaterialCommunityIcons
          name={active ? "check" : "minus"}
          size={12}
          color={active ? COLORS.white : COLORS.secondaryText}
        />
      </View>
      <Text
        className={`text-[12px] font-semibold ${
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
  const pinDifferent = useMemo(
    () => !!currentPin.trim() && !!newPin.trim() && currentPin.trim() !== newPin.trim(),
    [currentPin, newPin]
  );
  const pinMatched = useMemo(
    () =>
      !!confirmPin.trim() &&
      !!newPin.trim() &&
      confirmPin.trim() === newPin.trim() &&
      /^\d{4,6}$/.test(confirmPin.trim()),
    [confirmPin, newPin]
  );

  const canSubmit = useMemo(() => {
    return (
      currentPin.trim().length >= 4 &&
      newPin.trim().length >= 4 &&
      confirmPin.trim().length >= 4 &&
      !loading
    );
  }, [confirmPin, currentPin, loading, newPin]);

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
  }, [logout, router, setAuth]);

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
    accessToken,
    apiConfig,
    confirmPin,
    currentPin,
    isValidPin,
    logoutAndGoLogin,
    newPin,
    normalizedRole,
    roleLabel,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroDark} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 34 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="min-h-[255px] overflow-hidden rounded-b-[34px] px-5 pb-7 pt-3"
          >
            <View className="absolute right-[-20px] top-[-30px] h-[180px] w-[180px] rounded-full bg-white/10" />
            <View className="absolute bottom-6 left-[-20px] h-[130px] w-[130px] rounded-full bg-white/10" />
            <View className="absolute right-10 top-20 h-[80px] w-[80px] rounded-full bg-white/5" />

            <Pressable
              onPress={() => router.back()}
              className="mb-5 h-[44px] w-[44px] items-center justify-center rounded-2xl border border-white/15 bg-white/10"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={COLORS.white}
              />
            </Pressable>

            <View className="self-start rounded-full bg-white/15 px-3 py-1.5">
              <Text className="text-[11px] font-extrabold tracking-wide text-white">
                {theme.badge}
              </Text>
            </View>

            <Text className="mt-4 text-[30px] font-black text-white">
              Change PIN
            </Text>

            <Text className="mt-2 max-w-[92%] text-[14px] leading-[22px] text-white/85">
              {theme.subtitle}
            </Text>

            <View className="mt-5 flex-row items-center self-start rounded-2xl bg-white/10 px-3 py-2">
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={16}
                color={COLORS.white}
              />
              <Text className="ml-2 text-[12px] font-bold text-white">
                Role: {roleLabel}
              </Text>
            </View>
          </LinearGradient>

          <View className="-mt-6 px-4">
            <View
              className="rounded-[28px] border border-border bg-card p-4"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 4,
              }}
            >
              <View className="mb-5">
                <Text className="mb-1 text-[18px] font-black text-heading">
                  PIN Details
                </Text>
                <Text className="text-[13px] font-medium leading-[20px] text-secondaryText">
                  Enter your current PIN and set a new secure PIN for your{" "}
                  {roleLabel.toLowerCase()} account.
                </Text>
              </View>

              <PasswordField
                label="Current PIN"
                placeholder="Enter current PIN"
                value={currentPin}
                onChangeText={setCurrentPin}
                secure={secureCurrent}
                onToggleSecure={() => setSecureCurrent((prev) => !prev)}
                icon="shield-key-outline"
              />

              <PasswordField
                label="New PIN"
                placeholder="Enter new PIN"
                value={newPin}
                onChangeText={setNewPin}
                secure={secureNew}
                onToggleSecure={() => setSecureNew((prev) => !prev)}
                icon="lock-outline"
              />

              <PasswordField
                label="Confirm New PIN"
                placeholder="Re-enter new PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                secure={secureConfirm}
                onToggleSecure={() => setSecureConfirm((prev) => !prev)}
                icon="lock-check-outline"
              />

              <View className="mb-4 rounded-[22px] border border-border bg-soft p-4">
                <View className="mb-3 flex-row items-start">
                  <View className="mr-3 mt-0.5">
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={18}
                      color={COLORS.primaryDark}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="mb-1 text-sm font-extrabold text-heading">
                      PIN Rules
                    </Text>
                    <Text className="text-[12.5px] font-semibold leading-[18px] text-secondaryText">
                      Use a 4 to 6 digit PIN that is easy for you to remember
                      and difficult for others to guess.
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
                className={`h-[56px] flex-row items-center justify-center rounded-[20px] ${
                  canSubmit ? "bg-primary active:opacity-90" : "bg-primary/60"
                }`}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="shield-lock-outline"
                      size={18}
                      color={COLORS.white}
                    />
                    <Text className="ml-2 text-[15px] font-extrabold text-white">
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