import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

type Step = 1 | 2 | 3;
type GradientColors = readonly [string, string, ...string[]];

type AuthLike = {
  user?: any;
  auth?: any;
  token?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
};

type ApiConfig = {
  url: string;
  method?: string;
};

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

const toastSuccess = (message: string) => {
  Toast.show({
    type: "success",
    text1: "Success",
    text2: message,
    position: "top",
    visibilityTime: 2400,
  });
};

const toastError = (message: string) => {
  Toast.show({
    type: "error",
    text1: "Error",
    text2: message,
    position: "top",
    visibilityTime: 2600,
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
        subtitle: "Recover your master account PIN securely with OTP verification.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };

    case ROLES.MANAGER:
      return {
        badge: "MANAGER",
        subtitle: "Recover your manager account PIN securely with OTP verification.",
        gradient: [COLORS.heroGreenDark, COLORS.primaryDark, COLORS.primary],
      };

    case ROLES.SUPERVISOR:
      return {
        badge: "SUPERVISOR",
        subtitle: "Recover your supervisor account PIN securely with OTP verification.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    case ROLES.STAFF:
      return {
        badge: "STAFF",
        subtitle: "Recover your staff account PIN securely with OTP verification.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    default:
      return {
        badge: "ACCOUNT",
        subtitle: "Recover your account PIN securely with OTP verification.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };
  }
}

function getForgotPinApi(role?: string | null): ApiConfig | null {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return SummaryApi.master_forgot_pin;
    case ROLES.MANAGER:
      return SummaryApi.subadmin_forgot_pin;
    case ROLES.SUPERVISOR:
      return SummaryApi.staff_forgot_pin;
    case ROLES.STAFF:
      return SummaryApi.staff_forgot_pin;
    default:
      return null;
  }
}

function getResetPinApi(role?: string | null): ApiConfig | null {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return SummaryApi.master_reset_pin;
    case ROLES.MANAGER:
      return SummaryApi.subadmin_reset_pin;
    case ROLES.SUPERVISOR:
      return SummaryApi.staff_reset_pin;
    case ROLES.STAFF:
      return SummaryApi.staff_reset_pin;
    default:
      return null;
  }
}

function OtpBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<TextInput | null>(null);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  return (
    <Pressable onPress={() => inputRef.current?.focus()} className="mb-3 mt-1">
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^\d]/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        className="absolute h-[1px] w-[1px] opacity-0"
      />

      <View className="flex-row justify-between">
        {digits.map((digit, index) => (
          <View
            key={index}
            className="h-[46px] w-[15%] items-center justify-center rounded-[12px] border border-border bg-soft"
          >
            <Text className="text-[18px] font-bold text-heading">{digit}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = "none",
  secure = false,
  onToggleSecure,
  keyboardType = "default",
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secure?: boolean;
  onToggleSecure?: () => void;
  keyboardType?: "default" | "number-pad" | "email-address";
  maxLength?: number;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-[13px] font-semibold text-heading">
        {label}
      </Text>

      <View className="h-[48px] flex-row items-center rounded-[14px] border border-border bg-soft px-3">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.labelText}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          maxLength={maxLength}
          className="flex-1 text-[14px] font-semibold text-primaryText"
        />

        {onToggleSecure ? (
          <Pressable onPress={onToggleSecure} hitSlop={10}>
            <MaterialCommunityIcons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={COLORS.secondaryText}
            />
          </Pressable>
        ) : null}
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

export default function ForgotPinScreen() {
  const router = useRouter();
  const authCtx = useAuth() as unknown as AuthLike;

  const rawUser =
    authCtx?.user ||
    (authCtx?.auth && typeof authCtx.auth === "object" && "user" in authCtx.auth
      ? (authCtx.auth as any)?.user
      : authCtx?.auth) ||
    null;

  const role = rawUser?.role || null;
  const roleLabel = getRoleLabel(role);
  const theme = getRoleTheme(role);

  const forgotApi = getForgotPinApi(role);
  const resetApi = getResetPinApi(role);

  const [step, setStep] = useState<Step>(1);
  const [login, setLogin] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);

  const isValidPin = useCallback((pin: string) => /^\d{4,6}$/.test(pin.trim()), []);

  const pinHasLength = useMemo(() => /^\d{4,6}$/.test(newPin.trim()), [newPin]);

  const pinMatched = useMemo(() => {
    return (
      !!newPin.trim() &&
      !!confirmPin.trim() &&
      newPin.trim() === confirmPin.trim() &&
      /^\d{4,6}$/.test(confirmPin.trim())
    );
  }, [newPin, confirmPin]);

  const stepTitle = useMemo(() => {
    if (step === 1) return "Forgot PIN";
    if (step === 2) return "Verify OTP";
    return "Reset PIN";
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === 1) {
      return `Enter your registered email or username to recover your ${roleLabel.toLowerCase()} account PIN.`;
    }
    if (step === 2) {
      return "Enter the 6-digit OTP sent to your registered email address.";
    }
    return `Create a new secure PIN for your ${roleLabel.toLowerCase()} account and confirm it below.`;
  }, [roleLabel, step]);

  const stepProgress = useMemo(() => {
    if (step === 1) return 34;
    if (step === 2) return 67;
    return 100;
  }, [step]);

  const handleSendOtp = useCallback(async () => {
    try {
      if (!forgotApi?.url) {
        toastError(`${roleLabel} forgot PIN API is not configured`);
        return;
      }

      if (!login.trim()) {
        toastError("Please enter email or username");
        return;
      }

      setLoading(true);

      const res = await fetch(`${baseURL}${forgotApi.url}`, {
        method: forgotApi.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim().toLowerCase(),
        }),
      });

      const json: any = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.message || "Failed to send OTP");
      }

      toastSuccess(json?.message || "OTP sent successfully");
      setStep(2);
    } catch (error: any) {
      toastError(error?.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  }, [forgotApi, login, roleLabel]);

  const handleOtpNext = useCallback(() => {
    if (otp.trim().length !== 6) {
      toastError("Please enter the 6-digit OTP");
      return;
    }
    setStep(3);
  }, [otp]);

  const handleResetPin = useCallback(async () => {
    try {
      if (!resetApi?.url) {
        toastError(`${roleLabel} reset PIN API is not configured`);
        return;
      }

      if (!login.trim()) {
        toastError("Email or username is required");
        return;
      }

      if (otp.trim().length !== 6) {
        toastError("Please enter the 6-digit OTP");
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

      setLoading(true);

      const res = await fetch(`${baseURL}${resetApi.url}`, {
        method: resetApi.method || "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim().toLowerCase(),
          otp: otp.trim(),
          newPin: newPin.trim(),
        }),
      });

      const json: any = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.message || "Failed to reset PIN");
      }

      toastSuccess(json?.message || "PIN reset successful");
      router.replace("/Login" as any);
    } catch (error: any) {
      toastError(error?.message || "Unable to reset PIN");
    } finally {
      setLoading(false);
    }
  }, [confirmPin, isValidPin, login, newPin, otp, resetApi, roleLabel, router]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroDark} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="min-h-[250px] overflow-hidden rounded-b-[26px] px-4 pb-6 pt-3"
          >
            <View className="absolute right-[-20px] top-[-30px] h-[150px] w-[150px] rounded-full bg-white/10" />
            <View className="absolute bottom-5 left-[-20px] h-[100px] w-[100px] rounded-full bg-white/10" />
            <View className="absolute right-8 top-20 h-[70px] w-[70px] rounded-full bg-white/5" />

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

            <Text className="mt-3 text-[24px] font-black text-white">
              {stepTitle}
            </Text>

            <Text className="mt-2 max-w-[95%] text-[13px] leading-[20px] text-white/85">
              {stepSubtitle}
            </Text>

            <View className="mt-4 h-[7px] w-full overflow-hidden rounded-full bg-white/15">
              <View
                className="h-full rounded-full bg-white"
                style={{ width: `${stepProgress}%`, opacity: 0.95 }}
              />
            </View>

            <View className="mt-4 flex-row items-center">
              {[1, 2, 3].map((n) => {
                const isActive = step >= (n as Step);

                return (
                  <View key={n} className="mr-4 items-center">
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full border ${
                        isActive
                          ? "border-white bg-white"
                          : "border-white/20 bg-white/10"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          isActive ? "text-heading" : "text-white"
                        }`}
                      >
                        {n}
                      </Text>
                    </View>

                    <Text
                      className={`mt-1 text-[10px] font-semibold ${
                        isActive ? "text-white" : "text-white/70"
                      }`}
                    >
                      {n === 1 ? "Account" : n === 2 ? "OTP" : "PIN"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>

          <View className="-mt-5 px-4">
            <View
              className="rounded-[18px] border border-border bg-card p-4"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }}
            >
              {step === 1 && (
                <>
                  <View className="mb-4">
                    <Text className="mb-1 text-[17px] font-bold text-heading">
                      Identify Your Account
                    </Text>
                    <Text className="text-[12.5px] leading-[18px] text-secondaryText">
                      Enter your registered email or username to receive a secure one-time password.
                    </Text>
                  </View>

                  <InputField
                    label="Email or Username"
                    placeholder="Enter email or username"
                    value={login}
                    onChangeText={setLogin}
                    autoCapitalize="none"
                  />

                  <View className="mb-3 rounded-[14px] border border-border bg-soft p-3">
                    <View className="flex-row items-start">
                      <MaterialCommunityIcons
                        name="email-fast-outline"
                        size={16}
                        color={COLORS.primaryDark}
                      />
                      <View className="ml-2 flex-1">
                        <Text className="mb-1 text-[13px] font-semibold text-heading">
                          OTP Verification
                        </Text>
                        <Text className="text-[12px] leading-[17px] text-secondaryText">
                          A one-time verification code will be sent to your registered email address.
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleSendOtp}
                    disabled={loading}
                    className={`h-[48px] flex-row items-center justify-center rounded-[14px] ${
                      loading ? "bg-primary/70" : "bg-primary active:opacity-90"
                    }`}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="send-outline"
                          size={16}
                          color={COLORS.white}
                        />
                        <Text className="ml-2 text-[14px] font-semibold text-white">
                          Send OTP
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {step === 2 && (
                <>
                  <View className="mb-4">
                    <Text className="mb-1 text-[17px] font-bold text-heading">
                      Enter Verification Code
                    </Text>
                    <Text className="text-[12.5px] leading-[18px] text-secondaryText">
                      Check your email and enter the 6-digit verification code below.
                    </Text>
                  </View>

                  <Text className="mb-1.5 text-[13px] font-semibold text-heading">
                    OTP Code
                  </Text>

                  <OtpBox value={otp} onChange={setOtp} />

                  <View className="mb-3 rounded-[14px] border border-border bg-soft p-3">
                    <View className="flex-row items-start">
                      <MaterialCommunityIcons
                        name="shield-key-outline"
                        size={16}
                        color={COLORS.primaryDark}
                      />
                      <View className="ml-2 flex-1">
                        <Text className="mb-1 text-[13px] font-semibold text-heading">
                          Secure Verification
                        </Text>
                        <Text className="text-[12px] leading-[17px] text-secondaryText">
                          Enter the exact OTP from your email to continue the recovery flow.
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleOtpNext}
                    disabled={loading}
                    className="h-[48px] flex-row items-center justify-center rounded-[14px] bg-primary active:opacity-90"
                  >
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={16}
                      color={COLORS.white}
                    />
                    <Text className="ml-2 text-[14px] font-semibold text-white">
                      Continue
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSendOtp}
                    disabled={loading}
                    className="mt-3 h-[46px] flex-row items-center justify-center rounded-[14px] border border-border bg-soft active:opacity-90"
                  >
                    <MaterialCommunityIcons
                      name="refresh"
                      size={16}
                      color={COLORS.primaryText}
                    />
                    <Text className="ml-2 text-[13px] font-semibold text-primaryText">
                      Resend OTP
                    </Text>
                  </Pressable>
                </>
              )}

              {step === 3 && (
                <>
                  <View className="mb-4">
                    <Text className="mb-1 text-[17px] font-bold text-heading">
                      Create New PIN
                    </Text>
                    <Text className="text-[12.5px] leading-[18px] text-secondaryText">
                      Set a new secure PIN and confirm it to complete the reset process.
                    </Text>
                  </View>

                  <InputField
                    label="New PIN"
                    placeholder="Enter new PIN"
                    value={newPin}
                    onChangeText={(t) =>
                      setNewPin(t.replace(/[^\d]/g, "").slice(0, 6))
                    }
                    keyboardType="number-pad"
                    secure={secureNew}
                    onToggleSecure={() => setSecureNew((prev) => !prev)}
                    maxLength={6}
                  />

                  <InputField
                    label="Confirm PIN"
                    placeholder="Re-enter new PIN"
                    value={confirmPin}
                    onChangeText={(t) =>
                      setConfirmPin(t.replace(/[^\d]/g, "").slice(0, 6))
                    }
                    keyboardType="number-pad"
                    secure={secureConfirm}
                    onToggleSecure={() => setSecureConfirm((prev) => !prev)}
                    maxLength={6}
                  />

                  <View className="mb-3 rounded-[14px] border border-border bg-soft p-3">
                    <View className="mb-2 flex-row items-start">
                      <MaterialCommunityIcons
                        name="information-outline"
                        size={16}
                        color={COLORS.primaryDark}
                      />
                      <View className="ml-2 flex-1">
                        <Text className="mb-1 text-[13px] font-semibold text-heading">
                          PIN Guidelines
                        </Text>
                        <Text className="text-[12px] leading-[17px] text-secondaryText">
                          Your new PIN must be 4 to 6 digits and should not be easy to guess.
                        </Text>
                      </View>
                    </View>

                    <PinRule label="PIN must be 4 to 6 digits" active={pinHasLength} />
                    <PinRule label="Confirm PIN must match new PIN" active={pinMatched} />
                  </View>

                  <Pressable
                    onPress={handleResetPin}
                    disabled={loading}
                    className={`h-[48px] flex-row items-center justify-center rounded-[14px] ${
                      loading ? "bg-primary/70" : "bg-primary active:opacity-90"
                    }`}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="check-circle-outline"
                          size={16}
                          color={COLORS.white}
                        />
                        <Text className="ml-2 text-[14px] font-semibold text-white">
                          Reset PIN
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}