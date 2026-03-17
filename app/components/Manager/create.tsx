// app/components/Manager/create.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

const BRAND = COLORS.success;
const BRAND_DARK = COLORS.successDark;

const apiUrl = (path: string) => `${baseURL}${path}`;

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

type CreateManagerResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

type PickerAsset = ImagePicker.ImagePickerAsset | null;

function showToast(type: "success" | "error", text1: string, text2?: string) {
  Toast.show({
    type,
    text1,
    text2: text2 || "",
  });
}

function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: COLORS.border,
      }}
    />
  );
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
      }}
      edges={["top", "bottom"]}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 24,
          backgroundColor: COLORS.inactiveBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={40}
          color={COLORS.danger}
        />
      </View>

      <Text
        style={{
          marginTop: 16,
          color: COLORS.primaryText,
          fontSize: 22,
          fontWeight: "900",
        }}
      >
        Access Denied
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: COLORS.secondaryText,
          textAlign: "center",
          lineHeight: 22,
        }}
      >
        Only Master Admin can create managers.
      </Text>

      <Pressable
        onPress={onBack}
        style={{
          marginTop: 18,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 16,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text
          style={{
            color: COLORS.primaryText,
            fontWeight: "800",
          }}
        >
          Go Back
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.card,
          borderRadius: 30,
          padding: 18,
          borderWidth: 1,
          borderColor: COLORS.border,
          shadowColor: COLORS.heroDark,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 5,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function InputRow({
  label,
  icon,
  value,
  onChangeText,
  inputProps,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  inputProps?: TextInputProps;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text
        style={{
          color: COLORS.primaryText,
          fontWeight: "700",
          marginBottom: 8,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 18,
          paddingHorizontal: 14,
          height: 54,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={COLORS.secondaryText}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={{
            flex: 1,
            marginLeft: 12,
            color: COLORS.primaryText,
            fontSize: 15,
            fontWeight: "600",
          }}
          placeholderTextColor={COLORS.labelText}
          autoCorrect={false}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  filled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  filled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: filled ? BRAND : COLORS.soft,
        borderWidth: 1,
        borderColor: filled ? COLORS.successLight : COLORS.border,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          color: filled ? COLORS.white : COLORS.primaryText,
          fontWeight: "900",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function CreateManager() {
  const { token, user, isReady, loading: authLoading } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const currentRole = useMemo(() => {
    return normalizeRole(user?.role || user?.roles?.[0] || null);
  }, [user]);

  const isMasterAdmin = currentRole === ROLES.MASTER_ADMIN;

  const [saving, setSaving] = useState(false);

  const [cName, setCName] = useState("");
  const [cUsername, setCUsername] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPin, setCPin] = useState("");
  const [cAvatar, setCAvatar] = useState<PickerAsset>(null);
  const [cIdProof, setCIdProof] = useState<PickerAsset>(null);

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: true,
      headerTitle: "Create Manager",
      headerTitleAlign: "center",
      headerBackVisible: true,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: COLORS.white,
      },
      headerTintColor: COLORS.primaryText,
      headerTitleStyle: {
        color: COLORS.primaryText,
        fontSize: 20,
        fontWeight: "800",
      },
    });
  }, [navigation]);

  const headersJson = useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }, [token]);

  const headersAuthOnly = useMemo(() => {
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }, [token]);

  const readResponse = useCallback(async (res: Response) => {
    const text = await res.text();

    try {
      return {
        text,
        json: JSON.parse(text) as CreateManagerResponse,
      };
    } catch {
      return {
        text,
        json: null as CreateManagerResponse | null,
      };
    }
  }, []);

  const resetCreate = useCallback(() => {
    setCName("");
    setCUsername("");
    setCEmail("");
    setCPin("");
    setCAvatar(null);
    setCIdProof(null);
  }, []);

  const requestGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showToast(
        "error",
        "Permission Required",
        "Please allow gallery permission"
      );
      return false;
    }

    return true;
  }, []);

  const pickImage = useCallback(async (): Promise<PickerAsset> => {
    const ok = await requestGallery();
    if (!ok) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled) return null;
    return result.assets?.[0] ?? null;
  }, [requestGallery]);

  const pickAvatar = useCallback(async () => {
    const asset = await pickImage();
    if (!asset?.uri) return;
    setCAvatar(asset);
  }, [pickImage]);

  const pickIdProof = useCallback(async () => {
    const asset = await pickImage();
    if (!asset?.uri) return;
    setCIdProof(asset);
  }, [pickImage]);

  const filePart = useCallback(
    (asset: NonNullable<PickerAsset>, prefix: string) => {
      const uri = asset.uri;
      const mimeType =
        asset.mimeType ||
        (uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");

      const extension = mimeType.includes("png") ? "png" : "jpg";
      const filename = `${prefix}_${Date.now()}.${extension}`;

      return {
        uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob;
    },
    []
  );

  const createManager = useCallback(async () => {
    if (!isMasterAdmin) {
      showToast(
        "error",
        "Access Denied",
        "Only Master Admin can create managers"
      );
      return;
    }

    const name = cName.trim();
    const username = cUsername.trim().toLowerCase();
    const email = cEmail.trim().toLowerCase();
    const pin = String(cPin || "").trim();

    if (!name || !username || !email || !pin) {
      showToast(
        "error",
        "Validation Error",
        "Enter name, username, email and PIN"
      );
      return;
    }

    if (!isValidEmail(email)) {
      showToast("error", "Invalid Email", "Enter a valid email address");
      return;
    }

    if (!/^\d{4,}$/.test(pin)) {
      showToast("error", "Invalid PIN", "PIN must be at least 4 digits");
      return;
    }

    try {
      setSaving(true);

      const hasFiles = Boolean(cAvatar?.uri || cIdProof?.uri);

      if (hasFiles) {
        const form = new FormData();
        form.append("name", name);
        form.append("username", username);
        form.append("email", email);
        form.append("pin", pin);

        if (cAvatar?.uri) {
          form.append("avatar", filePart(cAvatar, "avatar"));
        }

        if (cIdProof?.uri) {
          form.append("idproof", filePart(cIdProof, "idproof"));
        }

        const res = await fetch(apiUrl(SummaryApi.master_create_subadmin.url), {
          method: SummaryApi.master_create_subadmin.method,
          headers: headersAuthOnly,
          body: form,
        });

        const { text, json } = await readResponse(res);

        if (!res.ok || !json?.success) {
          if (!json) {
            console.log("RAW_CREATE_MANAGER_RESPONSE:", text);
          }

          showToast(
            "error",
            "Create Failed",
            json?.message || `HTTP ${res.status}`
          );
          return;
        }
      } else {
        const res = await fetch(apiUrl(SummaryApi.master_create_subadmin.url), {
          method: SummaryApi.master_create_subadmin.method,
          headers: headersJson,
          body: JSON.stringify({
            name,
            username,
            email,
            pin,
          }),
        });

        const { text, json } = await readResponse(res);

        if (!res.ok || !json?.success) {
          if (!json) {
            console.log("RAW_CREATE_MANAGER_RESPONSE:", text);
          }

          showToast(
            "error",
            "Create Failed",
            json?.message || `HTTP ${res.status}`
          );
          return;
        }
      }

      resetCreate();

      showToast("success", "Success", "Manager created successfully");
      router.back();
    } catch (error) {
      console.log("createManager error:", error);
      showToast("error", "Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  }, [
    isMasterAdmin,
    cName,
    cUsername,
    cEmail,
    cPin,
    cAvatar,
    cIdProof,
    filePart,
    headersAuthOnly,
    headersJson,
    readResponse,
    resetCreate,
    router,
  ]);

  if (!isReady || authLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: "center",
          justifyContent: "center",
        }}
        edges={["top", "bottom"]}
      >
        <ActivityIndicator size="large" color={BRAND} />
        <Text
          style={{
            marginTop: 12,
            color: COLORS.secondaryText,
            fontWeight: "700",
          }}
        >
          Loading authentication...
        </Text>
      </SafeAreaView>
    );
  }

  if (!isMasterAdmin) {
    return <AccessDenied onBack={() => router.back()} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={{ flex: 1, backgroundColor: COLORS.background }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 28,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionCard>
            <Text
              style={{
                color: COLORS.primaryText,
                fontSize: 22,
                fontWeight: "900",
              }}
            >
              Create Manager
            </Text>

            <Text
              style={{
                marginTop: 4,
                color: COLORS.secondaryText,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              Fill in the account details below. Avatar and ID proof are optional.
            </Text>

            <View style={{ alignItems: "center", marginTop: 22 }}>
              <View style={{ position: "relative" }}>
                <View
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 999,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: COLORS.soft,
                    borderWidth: 2,
                    borderColor: COLORS.border,
                  }}
                >
                  {cAvatar?.uri ? (
                    <Image
                      source={{ uri: cAvatar.uri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.activeBg, COLORS.successSoft]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="account"
                        size={68}
                        color={BRAND_DARK}
                      />
                    </LinearGradient>
                  )}
                </View>

                <Pressable
                  onPress={pickAvatar}
                  disabled={saving}
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 4,
                    borderColor: COLORS.white,
                    backgroundColor: BRAND,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <MaterialCommunityIcons
                    name="camera"
                    size={18}
                    color={COLORS.white}
                  />
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <ActionButton
                  label="Choose Avatar"
                  onPress={pickAvatar}
                  disabled={saving}
                  filled
                />

                <ActionButton
                  label="Clear"
                  onPress={() => setCAvatar(null)}
                  disabled={saving}
                />
              </View>

              <Text
                style={{
                  marginTop: 10,
                  color: COLORS.secondaryText,
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                Avatar is optional
              </Text>
            </View>

            <View
              style={{
                marginTop: 20,
                backgroundColor: COLORS.soft,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 22,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: COLORS.primaryText,
                  fontWeight: "900",
                  fontSize: 15,
                }}
              >
                ID Proof
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  color: COLORS.secondaryText,
                  fontSize: 12,
                }}
              >
                Optional supporting document for identity verification
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 14,
                }}
              >
                <View
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 18,
                    backgroundColor: COLORS.white,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {cIdProof?.uri ? (
                    <Image
                      source={{ uri: cIdProof.uri }}
                      style={{ width: 62, height: 62 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="card-account-details"
                      size={28}
                      color={COLORS.mutedText}
                    />
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      color: COLORS.primaryText,
                      fontWeight: "700",
                    }}
                  >
                    {cIdProof?.uri ? "Selected successfully" : "Not selected"}
                  </Text>
                  <Text
                    style={{
                      color: COLORS.secondaryText,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Upload Aadhaar / PAN / License photo
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
                  onPress={pickIdProof}
                  disabled={saving}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: COLORS.heroDark,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "900",
                    }}
                  >
                    Choose ID Proof
                  </Text>
                </Pressable>

                <ActionButton
                  label="Clear"
                  onPress={() => setCIdProof(null)}
                  disabled={saving}
                />
              </View>
            </View>

            <View
              style={{
                marginTop: 20,
                backgroundColor: COLORS.soft,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 22,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  ACCOUNT TYPE
                </Text>
                <Text
                  style={{
                    color: BRAND_DARK,
                    fontWeight: "900",
                  }}
                >
                  MANAGER
                </Text>
              </View>

              <Divider />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  PIN RULE
                </Text>
                <Text
                  style={{
                    color: COLORS.primaryText,
                    fontWeight: "800",
                  }}
                >
                  Minimum 4 digits
                </Text>
              </View>
            </View>

            <InputRow
              label="Name"
              icon="account-outline"
              value={cName}
              onChangeText={setCName}
              inputProps={{
                placeholder: "Full name",
                returnKeyType: "next",
              }}
            />

            <InputRow
              label="Username"
              icon="at"
              value={cUsername}
              onChangeText={(text) => setCUsername(text.replace(/\s+/g, ""))}
              inputProps={{
                placeholder: "username",
                autoCapitalize: "none",
                returnKeyType: "next",
              }}
            />

            <InputRow
              label="Email"
              icon="email-outline"
              value={cEmail}
              onChangeText={setCEmail}
              inputProps={{
                placeholder: "email@example.com",
                autoCapitalize: "none",
                keyboardType: "email-address",
                returnKeyType: "next",
              }}
            />

            <InputRow
              label="PIN"
              icon="shield-key-outline"
              value={cPin}
              onChangeText={(text) => setCPin(text.replace(/[^\d]/g, ""))}
              inputProps={{
                placeholder: "Set PIN (e.g. 1234)",
                keyboardType: "number-pad",
                returnKeyType: "done",
                secureTextEntry: false,
                maxLength: 8,
              }}
            />

            <Pressable
              onPress={createManager}
              disabled={saving}
              style={{
                marginTop: 24,
                borderRadius: 20,
                paddingVertical: 16,
                alignItems: "center",
                backgroundColor: saving ? COLORS.successLight : BRAND,
                opacity: saving ? 0.95 : 1,
              }}
            >
              {saving ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator color={COLORS.white} />
                  <Text
                    style={{
                      marginLeft: 10,
                      color: COLORS.white,
                      fontWeight: "900",
                    }}
                  >
                    Saving...
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: COLORS.white,
                      fontWeight: "900",
                    }}
                  >
                    Create Manager
                  </Text>
                </View>
              )}
            </Pressable>
          </SectionCard>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}