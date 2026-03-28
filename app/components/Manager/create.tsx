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

const UI = {
  screenPaddingX: 14,
  screenPaddingTop: 10,
  screenPaddingBottom: 20,

  cardRadius: 18,
  cardPadding: 14,

  sectionGap: 12,
  inputGap: 10,

  inputHeight: 44,
  inputRadius: 12,
  inputPaddingX: 12,

  inputFontSize: 14,
  inputLabelSize: 13,

  avatarSize: 76,
  avatarCameraBtn: 32,

  docPreviewSize: 50,
  docPreviewRadius: 12,

  smallBtnRadius: 10,
  smallBtnPaddingY: 10,
  smallBtnPaddingX: 14,
  smallBtnFontSize: 13,

  submitRadius: 12,
  submitPaddingY: 13,

  titleSize: 18,
  bodySize: 12,
  metaSize: 11,
};

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
          width: 72,
          height: 72,
          borderRadius: 18,
          backgroundColor: COLORS.inactiveBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={34}
          color={COLORS.danger}
        />
      </View>

      <Text
        style={{
          marginTop: 14,
          color: COLORS.primaryText,
          fontSize: 20,
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
          lineHeight: 20,
          fontSize: 14,
        }}
      >
        Only Master Admin can create managers.
      </Text>

      <Pressable
        onPress={onBack}
        style={{
          marginTop: 16,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text
          style={{
            color: COLORS.primaryText,
            fontWeight: "800",
            fontSize: 14,
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
          borderRadius: UI.cardRadius,
          padding: UI.cardPadding,
          borderWidth: 1,
          borderColor: COLORS.border,
          shadowColor: COLORS.heroDark,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
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
  value,
  onChangeText,
  inputProps,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  inputProps?: TextInputProps;
}) {
  return (
    <View style={{ marginTop: UI.inputGap }}>
      <Text
        style={{
          color: COLORS.primaryText,
          fontWeight: "700",
          marginBottom: 6,
          fontSize: UI.inputLabelSize,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          justifyContent: "center",
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: UI.inputRadius,
          paddingHorizontal: UI.inputPaddingX,
          height: UI.inputHeight,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={{
            color: COLORS.primaryText,
            fontSize: UI.inputFontSize,
            fontWeight: "600",
            paddingVertical: 0,
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
        paddingHorizontal: UI.smallBtnPaddingX,
        paddingVertical: UI.smallBtnPaddingY,
        borderRadius: UI.smallBtnRadius,
        backgroundColor: filled ? BRAND : COLORS.soft,
        borderWidth: 1,
        borderColor: filled ? COLORS.successLight : COLORS.border,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          color: filled ? COLORS.white : COLORS.primaryText,
          fontWeight: "800",
          fontSize: UI.smallBtnFontSize,
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
        fontSize: 18,
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
            fontSize: 14,
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
            paddingHorizontal: UI.screenPaddingX,
            paddingTop: UI.screenPaddingTop,
            paddingBottom: UI.screenPaddingBottom,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionCard>
            <Text
              style={{
                color: COLORS.primaryText,
                fontSize: UI.titleSize,
                fontWeight: "900",
              }}
            >
              Create Manager
            </Text>

            <Text
              style={{
                marginTop: 4,
                color: COLORS.secondaryText,
                fontSize: UI.bodySize,
                lineHeight: 18,
              }}
            >
              Fill in the account details below. Avatar and ID proof are optional.
            </Text>

            <View style={{ alignItems: "center", marginTop: 14 }}>
              <View style={{ position: "relative" }}>
                <View
                  style={{
                    width: UI.avatarSize,
                    height: UI.avatarSize,
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
                        size={42}
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
                    bottom: 0,
                    right: 0,
                    width: UI.avatarCameraBtn,
                    height: UI.avatarCameraBtn,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: COLORS.white,
                    backgroundColor: BRAND,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <MaterialCommunityIcons
                    name="camera"
                    size={15}
                    color={COLORS.white}
                  />
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
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
                  marginTop: 6,
                  color: COLORS.secondaryText,
                  fontSize: UI.metaSize,
                  textAlign: "center",
                }}
              >
                Avatar is optional
              </Text>
            </View>

            <View
              style={{
                marginTop: UI.sectionGap,
                backgroundColor: COLORS.soft,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 14,
                padding: 12,
              }}
            >
              <Text
                style={{
                  color: COLORS.primaryText,
                  fontWeight: "900",
                  fontSize: 14,
                }}
              >
                ID Proof
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  color: COLORS.secondaryText,
                  fontSize: UI.metaSize,
                }}
              >
                Optional supporting document for identity verification
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    width: UI.docPreviewSize,
                    height: UI.docPreviewSize,
                    borderRadius: UI.docPreviewRadius,
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
                      style={{
                        width: UI.docPreviewSize,
                        height: UI.docPreviewSize,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="card-account-details"
                      size={22}
                      color={COLORS.mutedText}
                    />
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={{
                      color: COLORS.primaryText,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {cIdProof?.uri ? "Selected successfully" : "Not selected"}
                  </Text>
                  <Text
                    style={{
                      color: COLORS.secondaryText,
                      fontSize: UI.metaSize,
                      marginTop: 2,
                    }}
                  >
                    Upload Aadhaar / PAN / License photo
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Pressable
                  onPress={pickIdProof}
                  disabled={saving}
                  style={{
                    paddingHorizontal: UI.smallBtnPaddingX,
                    paddingVertical: UI.smallBtnPaddingY,
                    borderRadius: UI.smallBtnRadius,
                    backgroundColor: COLORS.heroDark,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "800",
                      fontSize: UI.smallBtnFontSize,
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
                marginTop: UI.sectionGap,
                backgroundColor: COLORS.soft,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    fontSize: UI.metaSize,
                    fontWeight: "800",
                  }}
                >
                  ACCOUNT TYPE
                </Text>
                <Text
                  style={{
                    color: BRAND_DARK,
                    fontWeight: "900",
                    fontSize: 13,
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
                  paddingVertical: 7,
                }}
              >
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    fontSize: UI.metaSize,
                    fontWeight: "800",
                  }}
                >
                  PIN RULE
                </Text>
                <Text
                  style={{
                    color: COLORS.primaryText,
                    fontWeight: "800",
                    fontSize: 13,
                  }}
                >
                  Minimum 4 digits
                </Text>
              </View>
            </View>

            <InputRow
              label="Name"
              value={cName}
              onChangeText={setCName}
              inputProps={{
                placeholder: "Full name",
                returnKeyType: "next",
              }}
            />

            <InputRow
              label="Username"
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
                marginTop: 16,
                borderRadius: UI.submitRadius,
                paddingVertical: UI.submitPaddingY,
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
                      marginLeft: 8,
                      color: COLORS.white,
                      fontWeight: "900",
                      fontSize: 14,
                    }}
                  >
                    Saving...
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={18}
                    color={COLORS.white}
                  />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: COLORS.white,
                      fontWeight: "900",
                      fontSize: 14,
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