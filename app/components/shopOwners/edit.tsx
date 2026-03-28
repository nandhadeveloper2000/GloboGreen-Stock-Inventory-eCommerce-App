import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../context/auth/AuthProvider";

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type DocMeta = {
  url?: string;
  publicId?: string;
  mimeType?: string;
  fileName?: string;
  bytes?: number;
};

type ShopOwner = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  shopControl?: "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE" | string;
  address?: Address;
  idProof?: DocMeta;
  isActive?: boolean;
};

type PickedDoc = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

type ShopControl = "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE";

const DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const SHOPCONTROL_OPTIONS: {
  label: string;
  value: ShopControl;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}[] = [
  {
    label: "Inventory Only",
    value: "INVENTORY_ONLY",
    icon: "warehouse",
  },
  {
    label: "All In One Ecommerce",
    value: "ALL_IN_ONE_ECOMMERCE",
    icon: "shopping-outline",
  },
];

function toastSuccess(message: string) {
  Toast.show({ type: "success", text1: "Success", text2: message });
}

function toastError(message: string) {
  Toast.show({ type: "error", text1: "Error", text2: message });
}

function toastInfo(message: string) {
  Toast.show({ type: "info", text1: "Info", text2: message });
}

function apiUrl(path: string) {
  return `${baseURL}${path}`;
}

function normalizeShopControl(value?: string | null): ShopControl {
  return value === "ALL_IN_ONE_ECOMMERCE"
    ? "ALL_IN_ONE_ECOMMERCE"
    : "INVENTORY_ONLY";
}

function getShopControlLabel(value: ShopControl) {
  return value === "ALL_IN_ONE_ECOMMERCE"
    ? "All In One Ecommerce"
    : "Inventory Only";
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPhone(v: string) {
  return /^\d{10}$/.test(v);
}

async function readResponse(res: Response) {
  const text = await res.text();

  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function getApiErrorMessage(
  json: any,
  fallback: string = "Something went wrong"
) {
  if (!json) return fallback;

  if (typeof json?.message === "string" && json.message.trim()) {
    return json.message;
  }

  if (typeof json?.error === "string" && json.error.trim()) {
    return json.error;
  }

  if (Array.isArray(json?.errors) && json.errors.length > 0) {
    const first = json.errors[0];
    if (typeof first === "string") return first;
    if (typeof first?.message === "string") return first.message;
  }

  if (json?.keyPattern) {
    const field = Object.keys(json.keyPattern)[0];
    if (field) return `${field} already exists`;
  }

  if (json?.code === 11000 && json?.keyValue) {
    const field = Object.keys(json.keyValue)[0];
    if (field) return `${field} already exists`;
  }

  return fallback;
}

export default function EditShopOwnerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [docsUploading, setDocsUploading] = useState(false);

  const [data, setData] = useState<ShopOwner | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [additionalNumber, setAdditionalNumber] = useState("");

  const [shopControl, setShopControl] =
    useState<ShopControl>("INVENTORY_ONLY");
  const [scOpen, setScOpen] = useState(false);

  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [pincode, setPincode] = useState("");

  const [newAvatar, setNewAvatar] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [idProof, setIdProof] = useState<PickedDoc | null>(null);

  const headersJson = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const setFormFromData = useCallback((d: ShopOwner) => {
    setName(d?.name ?? "");
    setUsername(d?.username ?? "");
    setEmail(d?.email ?? "");
    setMobile(d?.mobile ?? "");
    setAdditionalNumber(d?.additionalNumber ?? "");
    setShopControl(normalizeShopControl(d?.shopControl));
    setStateName(d?.address?.state ?? "");
    setDistrict(d?.address?.district ?? "");
    setTaluk(d?.address?.taluk ?? "");
    setArea(d?.address?.area ?? "");
    setStreet(d?.address?.street ?? "");
    setPincode(d?.address?.pincode ?? "");
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const res = await fetch(apiUrl(SummaryApi.shopowner_get.url(String(id))), {
        method: SummaryApi.shopowner_get.method,
        headers: headersAuthOnly,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastError(getApiErrorMessage(json, `HTTP ${res.status}`));
        setData(null);
        return;
      }

      const d = (json.data || null) as ShopOwner | null;
      setData(d);
      if (d) setFormFromData(d);
    } catch {
      toastError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, headersAuthOnly, setFormFromData]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const pickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      toastInfo("Allow gallery permission");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled) {
      const asset = result.assets?.[0];
      if (asset?.uri) setNewAvatar(asset);
    }
  }, []);

  const pickDoc = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: DOC_TYPES as any,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      toastError("File not selected");
      return;
    }

    setIdProof({
      uri: asset.uri,
      name: asset.name || `idProof_${Date.now()}`,
      mimeType: asset.mimeType || "application/octet-stream",
      size: asset.size,
    });
  }, []);

  const submitUpdate = useCallback(async () => {
    if (!id) return;

    const n = name.trim();
    const u = username.trim().toLowerCase();
    const e = email.trim().toLowerCase();
    const m = mobile.trim();
    const a2 = additionalNumber.trim();

    if (!n || !u || !e) {
      toastInfo("Enter name, username, email");
      return;
    }

    if (!isValidEmail(e)) {
      toastInfo("Enter valid email");
      return;
    }

    if (m && !isValidPhone(m)) {
      toastInfo("Enter valid 10-digit mobile number");
      return;
    }

    if (a2 && !isValidPhone(a2)) {
      toastInfo("Enter valid 10-digit additional mobile number");
      return;
    }

    if (m && a2 && m === a2) {
      toastInfo("Mobile and Additional Mobile cannot be same");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        apiUrl(SummaryApi.shopowner_update.url(String(id))),
        {
          method: SummaryApi.shopowner_update.method,
          headers: headersJson,
          body: JSON.stringify({
            name: n,
            username: u,
            email: e,
            mobile: m || undefined,
            additionalNumber: a2 || undefined,
            shopControl,
            state: stateName.trim(),
            district: district.trim(),
            taluk: taluk.trim(),
            area: area.trim(),
            street: street.trim(),
            pincode: pincode.trim(),
          }),
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastError(getApiErrorMessage(json, `HTTP ${res.status}`));
        return;
      }

      toastSuccess("Updated successfully");
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  }, [
    id,
    name,
    username,
    email,
    mobile,
    additionalNumber,
    shopControl,
    stateName,
    district,
    taluk,
    area,
    street,
    pincode,
    headersJson,
    fetchDetails,
  ]);

  const uploadAvatar = useCallback(async () => {
    if (!id) return;

    if (!newAvatar?.uri) {
      toastInfo("Choose avatar first");
      return;
    }

    try {
      setAvatarUploading(true);

      const uri = newAvatar.uri;
      const isPng = uri.toLowerCase().endsWith(".png");
      const mime =
        (newAvatar as any).mimeType || (isPng ? "image/png" : "image/jpeg");
      const filename = `owner_${Date.now()}.${isPng ? "png" : "jpg"}`;

      const form = new FormData();
      form.append("avatar", { uri, name: filename, type: mime } as any);

      const res = await fetch(
        apiUrl(SummaryApi.shopowner_admin_avatar_upload.url(String(id))),
        {
          method: SummaryApi.shopowner_admin_avatar_upload.method,
          headers: headersAuthOnly,
          body: form,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastError(getApiErrorMessage(json, "Avatar upload failed"));
        return;
      }

      toastSuccess("Avatar updated");
      setNewAvatar(null);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setAvatarUploading(false);
    }
  }, [id, newAvatar, headersAuthOnly, fetchDetails]);

  const removeAvatar = useCallback(async () => {
    if (!id) return;

    try {
      setAvatarUploading(true);

      const res = await fetch(
        apiUrl(SummaryApi.shopowner_admin_avatar_remove.url(String(id))),
        {
          method: SummaryApi.shopowner_admin_avatar_remove.method,
          headers: headersAuthOnly,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastError(getApiErrorMessage(json, "Remove failed"));
        return;
      }

      toastSuccess("Avatar removed");
      setNewAvatar(null);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setAvatarUploading(false);
    }
  }, [id, headersAuthOnly, fetchDetails]);

  const uploadDocs = useCallback(async () => {
    if (!id) return;

    if (!idProof) {
      toastInfo("Select ID proof first");
      return;
    }

    try {
      setDocsUploading(true);

      const form = new FormData();
      form.append(
        "idProof",
        {
          uri: idProof.uri,
          name: idProof.name,
          type: idProof.mimeType,
        } as any
      );

      const res = await fetch(
        apiUrl(SummaryApi.shopowner_admin_docs_upload.url(String(id))),
        {
          method: SummaryApi.shopowner_admin_docs_upload.method,
          headers: headersAuthOnly,
          body: form,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastError(getApiErrorMessage(json, "ID proof upload failed"));
        return;
      }

      toastSuccess("ID proof updated");
      setIdProof(null);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setDocsUploading(false);
    }
  }, [id, idProof, headersAuthOnly, fetchDetails]);

  const removeDoc = useCallback(async () => {
    if (!id) return;

    try {
      setDocsUploading(true);

      const res = await fetch(
        apiUrl(SummaryApi.shopowner_admin_docs_remove.url(String(id), "idProof")),
        {
          method: SummaryApi.shopowner_admin_docs_remove.method,
          headers: headersAuthOnly,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastError(getApiErrorMessage(json, "Remove failed"));
        return;
      }

      toastSuccess("ID proof removed");
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setDocsUploading(false);
    }
  }, [id, headersAuthOnly, fetchDetails]);

  const heroAvatar = newAvatar?.uri || data?.avatarUrl || "";
  const busy = saving || avatarUploading || docsUploading;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.secondaryText }}>
            Loading shop owner details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text
            style={{ fontSize: 18, fontWeight: "800", color: COLORS.heading }}
          >
            No data found
          </Text>
          <Text
            style={{
              marginTop: 8,
              textAlign: "center",
              color: COLORS.secondaryText,
            }}
          >
            This shop owner record is unavailable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={COLORS.heading}
          />
        </Pressable>

        <Text
          style={{ color: COLORS.heading, fontSize: 17, fontWeight: "900" }}
        >
          Edit Shop Owner
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <SectionCard title="Avatar" subtitle="Upload or remove avatar">
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 46,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.soft,
                  borderWidth: 1.5,
                  borderColor: COLORS.border,
                }}
              >
                {heroAvatar ? (
                  <Image
                    source={{ uri: heroAvatar }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="account"
                    size={38}
                    color={COLORS.mutedText}
                  />
                )}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginTop: 14,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <ActionButton
                  title="Choose"
                  onPress={pickAvatar}
                  icon="image-outline"
                  compact
                  disabled={busy}
                />
                <ActionButton
                  title="Upload"
                  onPress={uploadAvatar}
                  icon="cloud-upload-outline"
                  compact
                  loading={avatarUploading}
                  disabled={!newAvatar?.uri || saving || docsUploading}
                  backgroundColor={COLORS.heading}
                />
                <ActionButton
                  title="Remove"
                  onPress={removeAvatar}
                  icon="delete-outline"
                  compact
                  disabled={busy}
                  backgroundColor={COLORS.danger}
                />
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Basic Information" subtitle="Update owner details">
            <AppInput label="Name" value={name} onChangeText={setName} />
            <AppInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <AppInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <AppInput
              label="Mobile"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />
            <AppInput
              label="Additional Mobile"
              value={additionalNumber}
              onChangeText={setAdditionalNumber}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text
              style={{
                color: COLORS.secondaryText,
                fontWeight: "700",
                fontSize: 11,
                marginTop: 8,
                marginBottom: 5,
                textTransform: "uppercase",
              }}
            >
              Shop Control
            </Text>

            <Pressable
              onPress={() => setScOpen(true)}
              style={{
                height: 44,
                borderRadius: 12,
                backgroundColor: COLORS.soft,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: COLORS.primaryText,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                {getShopControlLabel(shopControl)}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color={COLORS.secondaryText}
              />
            </Pressable>
          </SectionCard>

          <SectionCard title="Address" subtitle="Update address">
            <AppInput label="State" value={stateName} onChangeText={setStateName} />
            <AppInput
              label="District"
              value={district}
              onChangeText={setDistrict}
            />
            <AppInput label="Taluk" value={taluk} onChangeText={setTaluk} />
            <AppInput label="Area" value={area} onChangeText={setArea} />
            <AppInput label="Street" value={street} onChangeText={setStreet} />
            <AppInput
              label="Pincode"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <View style={{ marginTop: 12 }}>
              <ActionButton
                title="Save Changes"
                onPress={submitUpdate}
                icon="content-save-outline"
                loading={saving}
                disabled={avatarUploading || docsUploading}
                backgroundColor={COLORS.success}
              />
            </View>
          </SectionCard>

          <SectionCard title="ID Proof" subtitle="Upload or remove ID proof">
            <DocCard
              title="ID Proof"
              current={data.idProof}
              picked={idProof}
              onPick={pickDoc}
              onClearPick={() => setIdProof(null)}
              onRemoveServer={removeDoc}
              saving={saving}
              docsUploading={docsUploading}
            />

            <View style={{ marginTop: 12 }}>
              <ActionButton
                title="Upload Selected Doc"
                onPress={uploadDocs}
                icon="cloud-upload-outline"
                loading={docsUploading}
                disabled={saving || avatarUploading || !idProof}
                backgroundColor={COLORS.heading}
              />
            </View>
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={scOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.38)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: COLORS.card,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.heading,
                fontSize: 17,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              Select Shop Control
            </Text>

            {SHOPCONTROL_OPTIONS.map((item) => {
              const selected = shopControl === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setShopControl(item.value);
                    setScOpen(false);
                  }}
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: selected ? COLORS.primary : COLORS.border,
                    backgroundColor: selected ? COLORS.primarySoft : COLORS.soft,
                    padding: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: selected ? COLORS.primary : COLORS.white,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: selected ? 0 : 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={18}
                      color={selected ? COLORS.white : COLORS.primary}
                    />
                  </View>

                  <Text
                    style={{
                      marginLeft: 10,
                      color: COLORS.heading,
                      fontWeight: "700",
                      fontSize: 14,
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </Text>

                  {selected ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={COLORS.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}

            <View style={{ marginTop: 12 }}>
              <ActionButton
                title="Close"
                onPress={() => setScOpen(false)}
                outline
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 18,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ color: COLORS.heading, fontSize: 15, fontWeight: "800" }}>
        {title}
      </Text>

      {!!subtitle && (
        <Text
          style={{
            marginTop: 3,
            color: COLORS.secondaryText,
            fontSize: 11,
          }}
        >
          {subtitle}
        </Text>
      )}

      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

function AppInput({
  label,
  ...rest
}: {
  label: string;
  [key: string]: any;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text
        style={{
          color: COLORS.secondaryText,
          fontWeight: "700",
          fontSize: 11,
          marginBottom: 4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>

      <TextInput
        {...rest}
        style={{
          height: 44,
          borderRadius: 12,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          paddingHorizontal: 12,
          fontSize: 14,
          color: COLORS.primaryText,
          fontWeight: "500",
        }}
        placeholderTextColor={COLORS.labelText}
      />
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  icon,
  loading,
  disabled,
  outline,
  backgroundColor,
  compact,
}: {
  title: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  loading?: boolean;
  disabled?: boolean;
  outline?: boolean;
  backgroundColor?: string;
  compact?: boolean;
}) {
  const bg = outline ? COLORS.white : backgroundColor || COLORS.primary;
  const textColor = outline ? COLORS.heading : COLORS.white;
  const borderColor = outline ? COLORS.border : bg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        height: compact ? 40 : 44,
        paddingHorizontal: compact ? 14 : 16,
        borderRadius: 12,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        opacity: disabled || loading ? 0.65 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {!!icon && (
            <MaterialCommunityIcons
              name={icon}
              size={16}
              color={textColor}
            />
          )}
          <Text
            style={{
              marginLeft: icon ? 6 : 0,
              color: textColor,
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function DocCard({
  title,
  current,
  picked,
  onPick,
  onClearPick,
  onRemoveServer,
  saving,
  docsUploading,
}: {
  title: string;
  current?: DocMeta;
  picked?: PickedDoc | null;
  onPick: () => void;
  onClearPick: () => void;
  onRemoveServer: () => void;
  saving?: boolean;
  docsUploading?: boolean;
}) {
  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: COLORS.soft,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
      }}
    >
      <Text style={{ color: COLORS.heading, fontWeight: "800", fontSize: 14 }}>
        {title}
      </Text>

      <Text
        style={{
          marginTop: 6,
          color: COLORS.secondaryText,
          fontSize: 12,
        }}
      >
        {picked?.name || current?.fileName || "No file selected"}
      </Text>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <ActionButton
          title={picked ? "Replace" : "Choose"}
          onPress={onPick}
          icon="file-upload-outline"
          compact
          disabled={saving || docsUploading}
        />

        <ActionButton
          title="Clear Selected"
          onPress={onClearPick}
          compact
          outline
          disabled={saving || docsUploading}
        />

        <ActionButton
          title="Remove Server File"
          onPress={onRemoveServer}
          icon="delete-outline"
          compact
          backgroundColor={COLORS.danger}
          disabled={saving || docsUploading}
        />
      </View>
    </View>
  );
}