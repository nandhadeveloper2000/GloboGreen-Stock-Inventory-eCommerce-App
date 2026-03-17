// app/components/Manager/edit.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

type EditManagerParams = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  idProofUrl?: string;
};

type ApiResponse<T = any> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type UploadAvatarResponse = {
  avatarUrl?: string;
};

type UpdateManagerResponse = {
  idProofUrl?: string;
};

const BRAND = COLORS.success;
const BRAND_DARK = COLORS.successDark;

const apiUrl = (path: string) => `${baseURL}${path}`;

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

const toastError = (title: string, msg?: string) =>
  Toast.show({
    type: "error",
    text1: title,
    text2: msg || "",
  });

const toastSuccess = (title: string, msg?: string) =>
  Toast.show({
    type: "success",
    text1: title,
    text2: msg || "",
  });

const toastInfo = (title: string, msg?: string) =>
  Toast.show({
    type: "info",
    text1: title,
    text2: msg || "",
  });

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          color: COLORS.primaryText,
          fontSize: 19,
          fontWeight: "900",
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>

      {!!subtitle && (
        <Text
          style={{
            marginTop: 6,
            color: COLORS.secondaryText,
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        marginBottom: 8,
        color: COLORS.primaryText,
        fontWeight: "800",
        fontSize: 13,
      }}
    >
      {label}
    </Text>
  );
}

function InputField({
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "sentences",
  keyboardType,
  secureTextEntry,
  maxLength,
  right,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        minHeight: 58,
        borderRadius: 18,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: COLORS.heroDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.labelText}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        style={{
          flex: 1,
          color: COLORS.primaryText,
          fontSize: 14,
          paddingVertical: 16,
        }}
      />
      {right}
    </View>
  );
}

function HeaderBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.soft,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginLeft: 10,
        shadowColor: COLORS.heroDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <MaterialCommunityIcons
        name="chevron-left"
        size={24}
        color={COLORS.primaryText}
      />
    </Pressable>
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
        Only Master Admin can edit managers.
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

export default function EditManagerScreen() {
  const { token, user, isReady, loading: authLoading } = useAuth();
  const router = useRouter();

  const currentRole = useMemo(() => {
    return normalizeRole(user?.role || user?.roles?.[0] || null);
  }, [user]);

  const isMasterAdmin = currentRole === ROLES.MASTER_ADMIN;

  const params = useLocalSearchParams<EditManagerParams>();

  const managerId = String(params.id || "");
  const role = String(params.role || "MANAGER").toUpperCase();

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(String(params.name || ""));
  const [username, setUsername] = useState(String(params.username || ""));
  const [email, setEmail] = useState(String(params.email || ""));
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(String(params.avatarUrl || ""));
  const [idProofUrl, setIdProofUrl] = useState(String(params.idProofUrl || ""));

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
        json: JSON.parse(text) as ApiResponse,
      };
    } catch {
      return {
        text,
        json: null as ApiResponse | null,
      };
    }
  }, []);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      toastInfo("Permission Required", "Please allow gallery permission");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled) return null;
    return result.assets?.[0] ?? null;
  }, []);

  const filePart = useCallback(
    (asset: ImagePicker.ImagePickerAsset, prefix: string) => {
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
      } as any;
    },
    []
  );

  const changeAvatar = useCallback(async () => {
    if (!isMasterAdmin) {
      toastError("Access Denied", "Only Master Admin can perform this action");
      return;
    }

    if (!managerId) {
      toastError("Invalid manager", "Manager ID is missing");
      return;
    }

    const asset = await pickImage();
    if (!asset?.uri) return;

    const form = new FormData();
    form.append("avatar", filePart(asset, "avatar"));

    try {
      setSaving(true);

      const res = await fetch(
        apiUrl(SummaryApi.master_subadmin_avatar_upload.url(managerId)),
        {
          method: SummaryApi.master_subadmin_avatar_upload.method,
          headers: headersAuthOnly,
          body: form,
        }
      );

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) {
          console.log("RAW_AVATAR_UPLOAD_RESPONSE:", text);
        }
        toastError("Upload Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      const data = json.data as UploadAvatarResponse | undefined;
      const newUrl = data?.avatarUrl;

      if (typeof newUrl === "string" && newUrl.trim().length > 5) {
        setAvatarUrl(newUrl);
      }

      toastSuccess("Success", "Avatar updated");
    } catch (error) {
      console.log("changeAvatar error:", error);
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  }, [
    filePart,
    headersAuthOnly,
    isMasterAdmin,
    managerId,
    pickImage,
    readResponse,
  ]);

  const changeIdProof = useCallback(async () => {
    if (!isMasterAdmin) {
      toastError("Access Denied", "Only Master Admin can perform this action");
      return;
    }

    if (!managerId) {
      toastError("Invalid manager", "Manager ID is missing");
      return;
    }

    const asset = await pickImage();
    if (!asset?.uri) return;

    const form = new FormData();
    form.append("idproof", filePart(asset, "idproof"));

    try {
      setSaving(true);

      const res = await fetch(
        apiUrl(SummaryApi.master_update_subadmin.url(managerId)),
        {
          method: SummaryApi.master_update_subadmin.method,
          headers: headersAuthOnly,
          body: form,
        }
      );

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) {
          console.log("RAW_IDPROOF_UPLOAD_RESPONSE:", text);
        }
        toastError("Upload Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      const data = json.data as UpdateManagerResponse | undefined;
      const newUrl = data?.idProofUrl;

      if (typeof newUrl === "string" && newUrl.trim().length > 5) {
        setIdProofUrl(newUrl);
      }

      toastSuccess("Success", "ID proof updated");
    } catch (error) {
      console.log("changeIdProof error:", error);
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  }, [
    filePart,
    headersAuthOnly,
    isMasterAdmin,
    managerId,
    pickImage,
    readResponse,
  ]);

  const updateManager = useCallback(async () => {
    if (!isMasterAdmin) {
      toastError("Access Denied", "Only Master Admin can perform this action");
      return;
    }

    if (!managerId) {
      toastError("Invalid manager", "Manager ID is missing");
      return;
    }

    const finalName = name.trim();
    const finalUsername = username.trim().toLowerCase();
    const finalEmail = email.trim().toLowerCase();
    const finalPin = pin.trim();

    if (!finalName || !finalUsername || !finalEmail) {
      toastError("Validation", "Enter name, username, and email");
      return;
    }

    if (!isValidEmail(finalEmail)) {
      toastError("Validation", "Enter valid email");
      return;
    }

    if (finalPin && !isValidPin(finalPin)) {
      toastError("Validation", "PIN must be 4 to 6 digits");
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, string> = {
        name: finalName,
        username: finalUsername,
        email: finalEmail,
      };

      if (finalPin) {
        payload.pin = finalPin;
      }

      const res = await fetch(
        apiUrl(SummaryApi.master_update_subadmin.url(managerId)),
        {
          method: SummaryApi.master_update_subadmin.method,
          headers: headersJson,
          body: JSON.stringify(payload),
        }
      );

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) {
          console.log("RAW_MANAGER_UPDATE_RESPONSE:", text);
        }
        toastError("Update Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess(
        "Updated",
        finalPin ? "Manager and PIN updated" : "Manager updated"
      );
      router.back();
    } catch (error) {
      console.log("updateManager error:", error);
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  }, [
    email,
    headersJson,
    isMasterAdmin,
    managerId,
    name,
    pin,
    readResponse,
    router,
    username,
  ]);

  const showAvatar =
    typeof avatarUrl === "string" && avatarUrl.trim().length > 5;

  const showIdProof =
    typeof idProofUrl === "string" && idProofUrl.trim().length > 5;

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
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Edit Manager",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: COLORS.white,
          },
          headerTitleStyle: {
            color: COLORS.primaryText,
            fontSize: 20,
            fontWeight: "800",
          },
          headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
        }}
      />

      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
        }}
        edges={["bottom"]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 36,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 30,
                borderWidth: 1,
                borderColor: COLORS.border,
                overflow: "hidden",
                shadowColor: COLORS.heroDark,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.06,
                shadowRadius: 18,
                elevation: 4,
              }}
            >
              <View
                style={{
                  backgroundColor: COLORS.successSoft,
                  paddingHorizontal: 18,
                  paddingTop: 22,
                  paddingBottom: 18,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.successLight,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 74,
                      height: 74,
                      borderRadius: 22,
                      backgroundColor: COLORS.white,
                      overflow: "hidden",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    {showAvatar ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: 74, height: 74 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="account"
                        size={32}
                        color={COLORS.mutedText}
                      />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text
                      style={{
                        color: COLORS.primaryText,
                        fontSize: 19,
                        fontWeight: "900",
                      }}
                      numberOfLines={1}
                    >
                      {name || "Unnamed Manager"}
                    </Text>

                    <Text
                      style={{
                        marginTop: 4,
                        color: COLORS.secondaryText,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                      numberOfLines={1}
                    >
                      @{username || "-"}
                    </Text>

                    <View
                      style={{
                        marginTop: 10,
                        alignSelf: "flex-start",
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 999,
                        backgroundColor: COLORS.successSoft,
                        borderWidth: 1,
                        borderColor: COLORS.successLight,
                      }}
                    >
                      <Text
                        style={{
                          color: BRAND_DARK,
                          fontSize: 11,
                          fontWeight: "900",
                          letterSpacing: 0.5,
                        }}
                      >
                        {role}
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 18,
                  }}
                >
                  <Pressable
                    onPress={changeAvatar}
                    disabled={saving}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 16,
                      backgroundColor: saving ? COLORS.successLight : BRAND,
                      borderWidth: 1,
                      borderColor: COLORS.successLight,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: saving ? 0.9 : 1,
                    }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: "800" }}>
                      {saving ? "Uploading..." : "Change Avatar"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={changeIdProof}
                    disabled={saving}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 16,
                      backgroundColor: COLORS.white,
                      borderWidth: 1.2,
                      borderColor: COLORS.border,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: saving ? 0.75 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.primaryText,
                        fontWeight: "800",
                      }}
                    >
                      {saving ? "Uploading..." : "Update ID Proof"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ padding: 18 }}>
                <View
                  style={{
                    backgroundColor: COLORS.soft,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    padding: 14,
                    marginBottom: 18,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 18,
                        backgroundColor: COLORS.white,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {showIdProof ? (
                        <Image
                          source={{ uri: idProofUrl }}
                          style={{ width: 56, height: 56 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="card-account-details-outline"
                          size={24}
                          color={COLORS.mutedText}
                        />
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={{
                          color: COLORS.primaryText,
                          fontWeight: "800",
                          fontSize: 14,
                        }}
                      >
                        ID Proof Status
                      </Text>

                      <Text
                        style={{
                          marginTop: 4,
                          color: showIdProof
                            ? BRAND_DARK
                            : COLORS.secondaryText,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {showIdProof
                          ? "Document uploaded"
                          : "No document uploaded"}
                      </Text>
                    </View>

                    <MaterialCommunityIcons
                      name={showIdProof ? "check-decagram" : "clock-outline"}
                      size={22}
                      color={showIdProof ? BRAND : COLORS.mutedText}
                    />
                  </View>
                </View>

                <SectionTitle
                  title="Basic Information"
                  subtitle="Edit the manager account details below."
                />

                <FieldLabel label="Name" />
                <InputField
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                  autoCapitalize="words"
                />

                <View style={{ height: 14 }} />

                <FieldLabel label="Username" />
                <InputField
                  value={username}
                  onChangeText={(text) =>
                    setUsername(text.replace(/\s+/g, ""))
                  }
                  placeholder="Enter username"
                  autoCapitalize="none"
                />

                <View style={{ height: 14 }} />

                <FieldLabel label="Email" />
                <InputField
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <View style={{ height: 14 }} />

                <FieldLabel label="New PIN" />
                <InputField
                  value={pin}
                  onChangeText={(text) => setPin(text.replace(/[^\d]/g, ""))}
                  placeholder="Enter new PIN (optional)"
                  secureTextEntry={!showPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  right={
                    <Pressable
                      onPress={() => setShowPin((prev) => !prev)}
                      hitSlop={10}
                      style={{
                        marginLeft: 10,
                        width: 34,
                        height: 34,
                        borderRadius: 10,
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
                  }
                />

                <Text
                  style={{
                    marginTop: 8,
                    color: COLORS.secondaryText,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Leave this blank if you do not want to change the current PIN.
                </Text>

                <Pressable
                  onPress={updateManager}
                  disabled={saving}
                  style={{
                    marginTop: 22,
                    minHeight: 56,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: saving ? COLORS.successLight : BRAND,
                    shadowColor: BRAND,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.18,
                    shadowRadius: 16,
                    elevation: 4,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="content-save-outline"
                        size={20}
                        color={COLORS.white}
                      />
                      <Text
                        style={{
                          color: COLORS.white,
                          fontWeight: "900",
                          fontSize: 15,
                        }}
                      >
                        Save Changes
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}