// app/components/Manager/View.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
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

type ViewManagerParams = {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  idProofUrl?: string;
  isActive?: string;
  mode?: string;
};

type ApiResponse<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type AvatarUploadData = {
  avatarUrl?: string;
};

type UpdateManagerData = {
  idProofUrl?: string;
};

const BRAND = COLORS.success;
const BRAND_DARK = COLORS.successDark;
const MODAL_OVERLAY = "rgba(15, 23, 42, 0.45)";

const apiUrl = (path: string) => `${baseURL}${path}`;

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

const toastError = (title: string, msg?: string) =>
  Toast.show({ type: "error", text1: title, text2: msg || "" });

const toastSuccess = (title: string, msg?: string) =>
  Toast.show({ type: "success", text1: title, text2: msg || "" });

const toastInfo = (title: string, msg?: string) =>
  Toast.show({ type: "info", text1: title, text2: msg || "" });

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: COLORS.primaryText,
          fontSize: 18,
          fontWeight: "900",
        }}
      >
        {title}
      </Text>

      {!!subtitle && (
        <Text
          style={{
            marginTop: 4,
            fontSize: 13,
            lineHeight: 20,
            color: COLORS.secondaryText,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

function InfoCard({
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
          borderRadius: 28,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.card,
          padding: 18,
          shadowColor: COLORS.heroDark,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        marginBottom: 8,
        fontSize: 13,
        fontWeight: "800",
        color: COLORS.primaryText,
      }}
    >
      {label}
    </Text>
  );
}

function Divider() {
  return (
    <View
      style={{
        marginVertical: 4,
        height: 1,
        backgroundColor: COLORS.divider,
      }}
    />
  );
}

function StatusPill({
  label,
  active,
  danger,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
}) {
  const bg = danger
    ? COLORS.inactiveBg
    : active
    ? COLORS.activeBg
    : COLORS.successSoft;

  const borderColor = danger ? "#FECACA" : "#BBF7D0";
  const textColor = danger
    ? COLORS.danger
    : active
    ? COLORS.activeText
    : BRAND_DARK;

  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor,
        backgroundColor: bg,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "900",
          letterSpacing: 0.4,
          color: textColor,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ActionIconButton({
  icon,
  onPress,
  danger = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={{
        width: 40,
        height: 40,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: danger ? "#FECACA" : COLORS.border,
        backgroundColor: danger ? COLORS.inactiveBg : COLORS.soft,
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={danger ? COLORS.danger : COLORS.primaryText}
      />
    </Pressable>
  );
}

function ReadonlyRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          marginRight: 12,
          width: 40,
          height: 40,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: COLORS.soft,
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={COLORS.secondaryText}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            marginBottom: 4,
            fontSize: 12,
            fontWeight: "700",
            color: COLORS.secondaryText,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "800",
            lineHeight: 22,
            color: valueColor || COLORS.primaryText,
          }}
        >
          {value || "-"}
        </Text>
      </View>
    </View>
  );
}

function EditableInput({
  value,
  onChangeText,
  placeholder,
  inputProps,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  inputProps?: TextInputProps;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.labelText}
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.soft,
        color: COLORS.primaryText,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 14,
      }}
      {...inputProps}
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
        Only Master Admin can access manager details.
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

function EnterpriseViewSection({
  name,
  username,
  email,
  role,
  isActive,
  avatarUrl,
  idProofUrl,
}: {
  name: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl: string;
  idProofUrl: string;
}) {
  const showAvatar =
    typeof avatarUrl === "string" && avatarUrl.trim().length > 5;
  const showIdProof =
    typeof idProofUrl === "string" && idProofUrl.trim().length > 5;

  return (
    <>
      <InfoCard style={{ marginTop: 16 }}>
        <View
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: COLORS.successLight,
            backgroundColor: COLORS.successSoft,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.soft,
              }}
            >
              {showAvatar ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 84, height: 84 }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialCommunityIcons
                  name="account"
                  size={34}
                  color={COLORS.mutedText}
                />
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "900",
                  color: COLORS.primaryText,
                }}
                numberOfLines={1}
              >
                {name || "Unnamed Manager"}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLORS.secondaryText,
                }}
                numberOfLines={1}
              >
                @{username || "-"}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: COLORS.secondaryText,
                }}
                numberOfLines={1}
              >
                {email || "-"}
              </Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 16,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <StatusPill label={role || "MANAGER"} />
            <StatusPill
              label={isActive ? "ACTIVE" : "INACTIVE"}
              active={isActive}
              danger={!isActive}
            />
          </View>
        </View>
      </InfoCard>

      <InfoCard style={{ marginTop: 16 }}>
        <SectionTitle
          title="Basic Information"
          subtitle="Read-only manager account details."
        />

        <ReadonlyRow
          icon="account-outline"
          label="Full Name"
          value={name || "-"}
        />
        <Divider />
        <ReadonlyRow
          icon="at"
          label="Username"
          value={username ? `@${username}` : "-"}
        />
        <Divider />
        <ReadonlyRow
          icon="email-outline"
          label="Email Address"
          value={email || "-"}
        />
        <Divider />
        <ReadonlyRow
          icon="shield-account-outline"
          label="Role"
          value={role || "-"}
          valueColor={BRAND_DARK}
        />
        <Divider />
        <ReadonlyRow
          icon={isActive ? "check-decagram-outline" : "close-octagon-outline"}
          label="Account Status"
          value={isActive ? "Active" : "Inactive"}
          valueColor={isActive ? COLORS.activeText : COLORS.danger}
        />
      </InfoCard>

      <InfoCard style={{ marginTop: 16 }}>
        <SectionTitle
          title="Verification Document"
          subtitle="Identity proof availability for this manager."
        />

        <View
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.soft,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.white,
              }}
            >
              {showIdProof ? (
                <Image
                  source={{ uri: idProofUrl }}
                  style={{ width: 64, height: 64 }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={28}
                  color={COLORS.mutedText}
                />
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: COLORS.primaryText,
                }}
              >
                {showIdProof ? "Document Uploaded" : "No Document Uploaded"}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: 20,
                  color: COLORS.secondaryText,
                }}
              >
                {showIdProof
                  ? "Identity proof is available in the profile."
                  : "No Aadhaar, PAN, or license document is available."}
              </Text>
            </View>
          </View>

          <View
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: COLORS.divider,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: COLORS.secondaryText,
              }}
            >
              Verification Status
            </Text>

            <StatusPill
              label={showIdProof ? "AVAILABLE" : "MISSING"}
              active={showIdProof}
              danger={!showIdProof}
            />
          </View>
        </View>
      </InfoCard>
    </>
  );
}

export default function ViewManagerScreen() {
  const { token, user, isReady, loading: authLoading } = useAuth();
  const router = useRouter();

  const currentRole = useMemo(() => {
    return normalizeRole(user?.role || user?.roles?.[0] || null);
  }, [user]);

  const isMasterAdmin = currentRole === ROLES.MASTER_ADMIN;

  const params = useLocalSearchParams<ViewManagerParams>();

  const managerId = String(params.id || "");
  const role = String(params.role || "MANAGER").toUpperCase();
  const isViewMode = String(params.mode || "").toLowerCase() === "view";

  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState(String(params.name || ""));
  const [username, setUsername] = useState(String(params.username || ""));
  const [email, setEmail] = useState(String(params.email || ""));
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(String(params.avatarUrl || ""));
  const [idProofUrl, setIdProofUrl] = useState(String(params.idProofUrl || ""));
  const [isActive, setIsActive] = useState(
    String(params.isActive || "true") !== "false"
  );

  const headersJson = useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const headersAuthOnly = useMemo(() => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
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

  const goEdit = useCallback(() => {
    if (!isMasterAdmin) {
      toastError("Access Denied", "Only Master Admin can perform this action");
      return;
    }

    router.push({
      pathname: "/components/Manager/edit",
      params: {
        id: managerId,
        name,
        username,
        email,
        role,
        avatarUrl,
        idProofUrl,
        isActive: String(isActive),
        mode: "edit",
      },
    });
  }, [
    router,
    isMasterAdmin,
    managerId,
    name,
    username,
    email,
    role,
    avatarUrl,
    idProofUrl,
    isActive,
  ]);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
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

    if (isViewMode) return;

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
        if (!json) console.log("RAW_AVATAR_UPLOAD_RESPONSE:", text);
        toastError("Upload Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      const newUrl = (json.data as AvatarUploadData | undefined)?.avatarUrl;
      if (typeof newUrl === "string" && newUrl.trim().length > 5) {
        setAvatarUrl(newUrl);
      }

      toastSuccess("Success", "Avatar updated");
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  }, [
    filePart,
    headersAuthOnly,
    isMasterAdmin,
    isViewMode,
    managerId,
    pickImage,
    readResponse,
  ]);

  const changeIdProof = useCallback(async () => {
    if (!isMasterAdmin) {
      toastError("Access Denied", "Only Master Admin can perform this action");
      return;
    }

    if (isViewMode) return;

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
        if (!json) console.log("RAW_IDPROOF_UPLOAD_RESPONSE:", text);
        toastError("Upload Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      const newUrl = (json.data as UpdateManagerData | undefined)?.idProofUrl;
      if (typeof newUrl === "string" && newUrl.trim().length > 5) {
        setIdProofUrl(newUrl);
      }

      toastSuccess("Success", "ID proof updated");
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  }, [
    filePart,
    headersAuthOnly,
    isMasterAdmin,
    isViewMode,
    managerId,
    pickImage,
    readResponse,
  ]);

  const updateManager = useCallback(async () => {
    if (!isMasterAdmin) {
      toastError("Access Denied", "Only Master Admin can perform this action");
      return;
    }

    if (isViewMode) return;

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

      const payload: Record<string, string | boolean> = {
        name: finalName,
        username: finalUsername,
        email: finalEmail,
        isActive,
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
        if (!json) console.log("RAW_MANAGER_UPDATE_RESPONSE:", text);
        toastError("Update Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess(
        "Updated",
        finalPin ? "Manager and PIN updated" : "Manager updated"
      );
      router.back();
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  }, [
    email,
    headersJson,
    isActive,
    isMasterAdmin,
    isViewMode,
    managerId,
    name,
    pin,
    readResponse,
    router,
    username,
  ]);

  const toggleStatus = useCallback(
    async (nextValue: boolean) => {
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

      if (!finalName || !finalUsername || !finalEmail) {
        toastError("Validation", "Name, username, and email are required");
        return;
      }

      try {
        setSaving(true);

        const res = await fetch(
          apiUrl(SummaryApi.master_update_subadmin.url(managerId)),
          {
            method: SummaryApi.master_update_subadmin.method,
            headers: headersJson,
            body: JSON.stringify({
              name: finalName,
              username: finalUsername,
              email: finalEmail,
              isActive: nextValue,
            }),
          }
        );

        const { text, json } = await readResponse(res);

        if (!res.ok || !json?.success) {
          if (!json) console.log("RAW_STATUS_UPDATE_RESPONSE:", text);
          toastError(
            "Status Update Failed",
            json?.message || `HTTP ${res.status}`
          );
          return;
        }

        setIsActive(nextValue);
        toastSuccess(
          "Status Updated",
          nextValue ? "Manager activated" : "Manager deactivated"
        );
      } catch {
        toastError("Network Error", "Please check your connection");
      } finally {
        setSaving(false);
      }
    },
    [email, headersJson, isMasterAdmin, managerId, name, readResponse, username]
  );

  const confirmDelete = useCallback(async () => {
    if (!isMasterAdmin) {
      toastError("Access Denied", "Only Master Admin can perform this action");
      return;
    }

    if (!managerId) {
      toastError("Invalid manager", "Manager ID is missing");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        apiUrl(SummaryApi.master_delete_subadmin.url(managerId)),
        {
          method: SummaryApi.master_delete_subadmin.method,
          headers: headersAuthOnly,
        }
      );

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW_DELETE_MANAGER_RESPONSE:", text);
        toastError("Delete Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess("Deleted", "Manager deleted successfully");
      setDeleteOpen(false);
      router.back();
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  }, [headersAuthOnly, isMasterAdmin, managerId, readResponse, router]);

  if (!isReady || authLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["top", "bottom"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
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
        </View>
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
          headerTitle: "View Manager Details",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: COLORS.white,
          },
          headerTitleStyle: {
            color: COLORS.primaryText,
            fontSize: 19,
            fontWeight: "800",
          },
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{
                marginLeft: 8,
                width: 40,
                height: 40,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.soft,
                shadowColor: COLORS.heroDark,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={22}
                color={COLORS.primaryText}
              />
            </Pressable>
          ),
          headerRight: () => (
            <View
              style={{
                marginRight: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ActionIconButton icon="pencil-outline" onPress={goEdit} />
              <ActionIconButton
                icon="trash-can-outline"
                onPress={() => setDeleteOpen(true)}
                danger
              />
            </View>
          ),
        }}
      />

      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["bottom"]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {isViewMode ? (
            <>
              <InfoCard style={{ marginTop: 16 }}>
                <SectionTitle
                  title="Account Status"
                  subtitle="Activate or deactivate this manager account."
                />

                <View
                  style={{
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.soft,
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "800",
                          color: COLORS.primaryText,
                        }}
                      >
                        {isActive ? "Account Active" : "Account Deactivated"}
                      </Text>
                    </View>

                    <Switch
                      value={isActive}
                      onValueChange={toggleStatus}
                      trackColor={{ false: "#FECACA", true: "#BBF7D0" }}
                      thumbColor={isActive ? BRAND : COLORS.danger}
                      disabled={saving}
                    />
                  </View>
                </View>
              </InfoCard>

              <EnterpriseViewSection
                name={name}
                username={username}
                email={email}
                role={role}
                isActive={isActive}
                avatarUrl={avatarUrl}
                idProofUrl={idProofUrl}
              />
            </>
          ) : (
            <>
              <InfoCard style={{ marginTop: 16 }}>
                <View
                  style={{
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: COLORS.successLight,
                    backgroundColor: COLORS.successSoft,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: 24,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        backgroundColor: COLORS.soft,
                      }}
                    >
                      {avatarUrl?.trim() ? (
                        <Image
                          source={{ uri: avatarUrl }}
                          style={{ width: 84, height: 84 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="account"
                          size={34}
                          color={COLORS.mutedText}
                        />
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "900",
                          color: COLORS.primaryText,
                        }}
                        numberOfLines={1}
                      >
                        {name || "Unnamed Manager"}
                      </Text>

                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          fontWeight: "700",
                          color: COLORS.secondaryText,
                        }}
                        numberOfLines={1}
                      >
                        @{username || "-"}
                      </Text>

                      <View
                        style={{
                          marginTop: 12,
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <StatusPill label={role} />
                        <StatusPill
                          label={isActive ? "ACTIVE" : "INACTIVE"}
                          active={isActive}
                          danger={!isActive}
                        />
                      </View>
                    </View>
                  </View>

                  <View
                    style={{
                      marginTop: 16,
                      flexDirection: "row",
                      gap: 12,
                    }}
                  >
                    <Pressable
                      onPress={changeAvatar}
                      disabled={saving}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: COLORS.successLight,
                        backgroundColor: saving ? COLORS.successLight : BRAND,
                        paddingVertical: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "800",
                          color: COLORS.white,
                        }}
                      >
                        {saving ? "Uploading..." : "Change Avatar"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={changeIdProof}
                      disabled={saving}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 16,
                        backgroundColor: BRAND_DARK,
                        paddingVertical: 12,
                        opacity: saving ? 0.8 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "800",
                          color: COLORS.white,
                        }}
                      >
                        {saving ? "Uploading..." : "Update ID Proof"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </InfoCard>

              <InfoCard style={{ marginTop: 16 }}>
                <SectionTitle
                  title="Basic Information"
                  subtitle="Edit manager account information."
                />

                <FieldLabel label="Name" />
                <EditableInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  inputProps={{ autoCapitalize: "words" }}
                />

                <View style={{ height: 16 }} />

                <FieldLabel label="Username" />
                <EditableInput
                  value={username}
                  onChangeText={(text) => setUsername(text.replace(/\s+/g, ""))}
                  placeholder="Username"
                  inputProps={{ autoCapitalize: "none" }}
                />

                <View style={{ height: 16 }} />

                <FieldLabel label="Email" />
                <EditableInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  inputProps={{
                    autoCapitalize: "none",
                    keyboardType: "email-address",
                  }}
                />

                <View style={{ height: 16 }} />

                <FieldLabel label="PIN" />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.soft,
                    paddingHorizontal: 16,
                  }}
                >
                  <TextInput
                    value={pin}
                    onChangeText={(text) => setPin(text.replace(/[^\d]/g, ""))}
                    secureTextEntry={!showPin}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Enter new PIN (optional)"
                    placeholderTextColor={COLORS.labelText}
                    style={{
                      flex: 1,
                      color: COLORS.primaryText,
                      paddingVertical: 14,
                      fontSize: 14,
                    }}
                  />

                  <Pressable
                    onPress={() => setShowPin((prev) => !prev)}
                    hitSlop={10}
                    style={{
                      marginLeft: 8,
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
                </View>

                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: COLORS.secondaryText,
                  }}
                >
                  Leave blank if you do not want to change the current PIN.
                </Text>

                <View
                  style={{
                    marginTop: 16,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.soft,
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "800",
                          color: COLORS.primaryText,
                        }}
                      >
                        {isActive ? "Account Active" : "Account Deactivated"}
                      </Text>

                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          lineHeight: 20,
                          color: COLORS.secondaryText,
                        }}
                      >
                        Enable or disable manager account access.
                      </Text>
                    </View>

                    <Switch
                      value={isActive}
                      onValueChange={setIsActive}
                      trackColor={{ false: "#FECACA", true: "#BBF7D0" }}
                      thumbColor={isActive ? BRAND : COLORS.danger}
                      disabled={saving}
                    />
                  </View>
                </View>

                <Pressable
                  onPress={updateManager}
                  disabled={saving}
                  style={{
                    marginTop: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 18,
                    backgroundColor: saving ? COLORS.successLight : BRAND,
                    paddingVertical: 15,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text
                      style={{
                        fontWeight: "900",
                        color: COLORS.white,
                      }}
                    >
                      Save Changes
                    </Text>
                  )}
                </Pressable>
              </InfoCard>
            </>
          )}
        </ScrollView>

        <Modal
          visible={deleteOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteOpen(false)}
        >
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
              backgroundColor: MODAL_OVERLAY,
            }}
          >
            <View
              style={{
                width: "100%",
                borderRadius: 28,
                backgroundColor: COLORS.white,
                padding: 20,
                shadowColor: COLORS.heroDark,
                shadowOpacity: 0.1,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 10 },
                elevation: 4,
              }}
            >
              <View
                style={{
                  marginBottom: 16,
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#FECACA",
                  backgroundColor: COLORS.inactiveBg,
                }}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={28}
                  color={COLORS.danger}
                />
              </View>

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: COLORS.primaryText,
                }}
              >
                Delete Manager?
              </Text>

              <Text
                style={{
                  marginTop: 8,
                  lineHeight: 20,
                  color: COLORS.secondaryText,
                }}
              >
                Are you sure you want to delete this manager? This action cannot
                be undone.
              </Text>

              <View
                style={{
                  marginTop: 20,
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                <Pressable
                  onPress={() => setDeleteOpen(false)}
                  disabled={saving}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    borderRadius: 18,
                    backgroundColor: "#E5E7EB",
                    paddingVertical: 15,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "800",
                      color: COLORS.primaryText,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={confirmDelete}
                  disabled={saving}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    borderRadius: 18,
                    backgroundColor: saving ? "#FCA5A5" : COLORS.danger,
                    paddingVertical: 15,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "800",
                      color: COLORS.white,
                    }}
                  >
                    {saving ? "Deleting..." : "Delete"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}