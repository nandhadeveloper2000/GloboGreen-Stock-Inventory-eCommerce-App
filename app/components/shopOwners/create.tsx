import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
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
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../context/auth/AuthProvider";

type PickedDoc = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

type ShopControl = "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE";

const BRAND = COLORS.primary;
const BRAND_DARK = COLORS.primaryDark;
const SURFACE = COLORS.background;
const CARD = COLORS.card;

const DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const SHOPCONTROL_OPTIONS: { label: string; value: ShopControl }[] = [
  { label: "Inventory Only", value: "INVENTORY_ONLY" },
  { label: "All In One Ecommerce", value: "ALL_IN_ONE_ECOMMERCE" },
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

function getShopControlLabel(value: ShopControl) {
  return value === "ALL_IN_ONE_ECOMMERCE"
    ? "All In One Ecommerce"
    : "Inventory Only";
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPin(v: string) {
  return /^\d{4,8}$/.test(v);
}

function isValidPhone(v: string) {
  return /^\d{10}$/.test(v);
}

function buildApiUrl(path: string) {
  return `${baseURL}${path}`;
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

export default function CreateShopOwnerScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [saving, setSaving] = useState(false);
  const [docUploading, setDocUploading] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [mobile, setMobile] = useState("");
  const [additionalNumber, setAdditionalNumber] = useState("");

  const [shopControl, setShopControl] = useState<ShopControl>("INVENTORY_ONLY");
  const [scOpen, setScOpen] = useState(false);

  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [pincode, setPincode] = useState("");

  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(
    null
  );
  const [idProof, setIdProof] = useState<PickedDoc | null>(null);

  const headersJson = useMemo(() => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const pickAvatar = async () => {
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
      const picked = result.assets?.[0];
      if (picked?.uri) setAvatar(picked);
    }
  };

  const pickOwnerDoc = async () => {
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
  };

  const uploadOwnerAvatarById = async (ownerId: string) => {
    if (!avatar?.uri) return null;

    const uri = avatar.uri;
    const isPng = uri.toLowerCase().endsWith(".png");
    const mime =
      (avatar as any).mimeType || (isPng ? "image/png" : "image/jpeg");
    const filename = `owner_${Date.now()}.${isPng ? "png" : "jpg"}`;

    const form = new FormData();
    form.append("avatar", { uri, name: filename, type: mime } as any);

    const res = await fetch(
      buildApiUrl(SummaryApi.shopowner_admin_avatar_upload.url(ownerId)),
      {
        method: SummaryApi.shopowner_admin_avatar_upload.method,
        headers: headersAuthOnly,
        body: form,
      }
    );

    const rr = await readResponse(res);
    const json = rr.json;

    if (!res.ok || !json?.success) {
      toastInfo("Owner created, but avatar upload failed");
      return null;
    }

    return json.data;
  };

  const uploadOwnerDocsById = async (ownerId: string) => {
    if (!idProof) return true;

    try {
      setDocUploading(true);

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
        buildApiUrl(SummaryApi.shopowner_admin_docs_upload.url(ownerId)),
        {
          method: SummaryApi.shopowner_admin_docs_upload.method,
          headers: headersAuthOnly,
          body: form,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastInfo("Owner created, but ID proof upload failed");
        return false;
      }

      return true;
    } catch {
      toastInfo("Owner created, but ID proof upload failed");
      return false;
    } finally {
      setDocUploading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setUsername("");
    setEmail("");
    setPin("");
    setMobile("");
    setAdditionalNumber("");
    setShopControl("INVENTORY_ONLY");
    setStateName("");
    setDistrict("");
    setTaluk("");
    setArea("");
    setStreet("");
    setPincode("");
    setAvatar(null);
    setIdProof(null);
  };

  const submitOwner = async () => {
    const n = name.trim();
    const u = username.trim().toLowerCase();
    const e = email.trim().toLowerCase();
    const p = pin.trim();
    const m = mobile.trim();
    const a2 = additionalNumber.trim();

    if (!n || !u || !e || !p) {
      toastInfo("Enter name, username, email and PIN");
      return;
    }

    if (!isValidEmail(e)) {
      toastInfo("Enter valid email");
      return;
    }

    if (!isValidPin(p)) {
      toastInfo("PIN must be 4 to 8 digits");
      return;
    }

    if (!m) {
      toastInfo("Enter WhatsApp / Mobile number");
      return;
    }

    if (!isValidPhone(m)) {
      toastInfo("Enter valid 10-digit WhatsApp / Mobile number");
      return;
    }

    if (a2 && !isValidPhone(a2)) {
      toastInfo("Enter valid 10-digit Additional Mobile number");
      return;
    }

    if (a2 && a2 === m) {
      toastInfo("WhatsApp number and Additional Mobile cannot be same");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: n,
        username: u,
        email: e,
        pin: p,
        mobile: m,
        additionalNumber: a2 || undefined,
        shopControl,
        state: stateName.trim(),
        district: district.trim(),
        taluk: taluk.trim(),
        area: area.trim(),
        street: street.trim(),
        pincode: pincode.trim(),
      };

      const res = await fetch(buildApiUrl(SummaryApi.shopowner_create.url), {
        method: SummaryApi.shopowner_create.method,
        headers: headersJson,
        body: JSON.stringify(payload),
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastError(
          getApiErrorMessage(
            json,
            res.status === 409
              ? "Duplicate data found"
              : `Create ShopOwner failed (HTTP ${res.status})`
          )
        );
        return;
      }

      const ownerId = json?.data?._id as string | undefined;

      if (!ownerId) {
        toastError("Owner created but missing _id");
        return;
      }

      await uploadOwnerAvatarById(ownerId);
      await uploadOwnerDocsById(ownerId);

      toastSuccess("Shop owner created successfully");
      resetForm();
      router.back();
    } catch (error: any) {
      toastError(error?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SURFACE }} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color="#111827"
          />
        </Pressable>

        <Text style={{ color: "#0F172A", fontSize: 18, fontWeight: "800" }}>
          Create Shop Owner
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={cardStyle}>
            <Text style={{ color: "#0F172A", fontSize: 18, fontWeight: "800" }}>
              Owner Information
            </Text>

            <View style={{ alignItems: "center", marginTop: 16 }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#F1F5F9",
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                }}
              >
                {avatar?.uri ? (
                  <Image
                    source={{ uri: avatar.uri }}
                    style={{ width: 96, height: 96 }}
                  />
                ) : (
                  <LinearGradient
                    colors={["#DCFCE7", "#F0FDF4"]}
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

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <ActionChip
                  label="Choose Avatar"
                  onPress={pickAvatar}
                  disabled={saving}
                  primary
                />
                <ActionChip
                  label="Clear"
                  onPress={() => setAvatar(null)}
                  disabled={saving}
                />
              </View>

              <Text style={{ marginTop: 8, fontSize: 12, color: "#64748B" }}>
                Avatar is optional
              </Text>
            </View>

            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Full name"
            />

            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              autoCapitalize="none"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Input
              label="PIN"
              value={pin}
              onChangeText={setPin}
              placeholder="Set PIN"
              keyboardType="number-pad"
              maxLength={8}
              secureTextEntry
            />

            <Input
              label="WhatsApp / Mobile"
              value={mobile}
              onChangeText={setMobile}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Input
              label="Additional Mobile"
              value={additionalNumber}
              onChangeText={setAdditionalNumber}
              placeholder="optional"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text
              style={{ marginTop: 16, color: "#0F172A", fontWeight: "800" }}
            >
              Shop Control
            </Text>

            <Pressable onPress={() => setScOpen(true)} style={selectStyle}>
              <Text style={{ color: "#0F172A", fontWeight: "800" }}>
                {getShopControlLabel(shopControl)}
              </Text>
            </Pressable>

            <Text
              style={{ marginTop: 16, color: "#0F172A", fontWeight: "800" }}
            >
              Address
            </Text>

            <Input
              label="State"
              value={stateName}
              onChangeText={setStateName}
              placeholder="state"
            />

            <Input
              label="District"
              value={district}
              onChangeText={setDistrict}
              placeholder="district"
            />

            <Input
              label="Taluk"
              value={taluk}
              onChangeText={setTaluk}
              placeholder="taluk"
            />

            <Input
              label="Area"
              value={area}
              onChangeText={setArea}
              placeholder="area"
            />

            <Input
              label="Door No / Street"
              value={street}
              onChangeText={setStreet}
              placeholder="door no, street"
            />

            <Input
              label="Pincode"
              value={pincode}
              onChangeText={setPincode}
              placeholder="pincode"
              keyboardType="number-pad"
              maxLength={6}
            />

            <Text
              style={{ marginTop: 16, color: "#0F172A", fontWeight: "800" }}
            >
              Documents
            </Text>

            <DocPickerCard
              title="ID Proof"
              file={idProof}
              onChoose={pickOwnerDoc}
              onClear={() => setIdProof(null)}
              disabled={saving || docUploading}
            />

            <Pressable
              onPress={submitOwner}
              disabled={saving || docUploading}
              style={{ marginTop: 18, borderRadius: 20, overflow: "hidden" }}
            >
              <LinearGradient
                colors={
                  saving || docUploading
                    ? ["rgba(22,187,5,0.6)", "rgba(11,122,34,0.6)"]
                    : [BRAND, BRAND_DARK]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 15,
                  alignItems: "center",
                  borderRadius: 20,
                }}
              >
                {saving || docUploading ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ActivityIndicator color="#fff" />
                    <Text
                      style={{
                        marginLeft: 10,
                        color: "#fff",
                        fontWeight: "800",
                      }}
                    >
                      {saving ? "Saving..." : "Uploading..."}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Submit
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ShopControlModal
        visible={scOpen}
        value={shopControl}
        onSelect={(v) => {
          setShopControl(v);
          setScOpen(false);
        }}
        onClose={() => setScOpen(false)}
      />
    </SafeAreaView>
  );
}

function ShopControlModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: ShopControl;
  onSelect: (v: ShopControl) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
            Select Shop Control
          </Text>

          {SHOPCONTROL_OPTIONS.map((x) => {
            const selected = value === x.value;

            return (
              <Pressable
                key={x.value}
                onPress={() => onSelect(x.value)}
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: selected ? BRAND : "#E2E8F0",
                  backgroundColor: selected ? "rgba(22,187,5,0.08)" : "#F8FAFC",
                }}
              >
                <Text style={{ color: "#0F172A", fontWeight: "800" }}>
                  {x.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const cardStyle = {
  backgroundColor: CARD,
  borderWidth: 1,
  borderColor: "#E8EDF3",
  borderRadius: 28,
  padding: 16,
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 4,
} as const;

const selectStyle = {
  marginTop: 8,
  backgroundColor: "#F8FAFC",
  borderWidth: 1,
  borderColor: "#E2E8F0",
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 14,
} as const;

function ActionChip({
  label,
  onPress,
  disabled,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: primary
          ? disabled
            ? "rgba(22,187,5,0.6)"
            : BRAND
          : "#E5E7EB",
      }}
    >
      <Text
        style={{
          color: primary ? "#FFFFFF" : "#111827",
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Input(props: any) {
  const { label, ...rest } = props;

  return (
    <>
      <Text
        style={{
          marginTop: 12,
          marginBottom: 8,
          color: "#334155",
          fontWeight: "700",
        }}
      >
        {label}
      </Text>

      <TextInput
        {...rest}
        style={{
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: "#0F172A",
        }}
        placeholderTextColor="#94A3B8"
      />
    </>
  );
}

function DocPickerCard({
  title,
  file,
  onChoose,
  onClear,
  disabled,
}: {
  title: string;
  file: PickedDoc | null;
  onChoose: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        marginTop: 12,
        borderRadius: 18,
        padding: 12,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ color: "#0F172A", fontWeight: "800" }}>{title}</Text>
          <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
            {file ? file.name : "PDF/JPEG/PNG/WEBP"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <ActionChip
            label={file ? "Replace" : "Choose"}
            onPress={onChoose}
            disabled={disabled}
            primary
          />
          <ActionChip label="Clear" onPress={onClear} disabled={disabled} />
        </View>
      </View>
    </View>
  );
}