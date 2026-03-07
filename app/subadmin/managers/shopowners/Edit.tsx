// app/master/managers/shopowners/Edit.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import SummaryApi, { baseURL } from "../../../constants/SummaryApi";
import { useAuth } from "../../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

const BRAND = "#16BB05";
const BRAND_DARK = "#119304";
const SURFACE = "#F4F7FB";
const CARD = "#FFFFFF";

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const toastInfo = (msg: string) =>
  Toast.show({ type: "info", text1: "Info", text2: msg });

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

type DocKey = "idProof" | "gstCertificate" | "udyamCertificate";

type PickedDoc = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type DocInfo = {
  url?: string;
  publicId?: string;
  mimeType?: string;
  fileName?: string;
  bytes?: number;
};

type ShopOwner = {
  _id: string;
  name: string;
  username: string;
  email: string;
  mobile?: string;
  additionalNumber?: string;
  shopControl?: "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE";
  businessTypes?: string[];
  avatarUrl?: string;
  address?: Address;
  idProof?: DocInfo;
  gstCertificate?: DocInfo;
  udyamCertificate?: DocInfo;
};

type ShopControl = "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE";

const SHOPCONTROL_OPTIONS: { label: string; value: ShopControl }[] = [
  { label: "Inventory Only", value: "INVENTORY_ONLY" },
  { label: "All-in-One E-Commerce", value: "ALL_IN_ONE_ECOMMERCE" },
];

const normalizeShopControl = (v: any): ShopControl => {
  const s = String(v ?? "INVENTORY_ONLY").trim().toUpperCase();
  return s === "ALL_IN_ONE_ECOMMERCE" ? "ALL_IN_ONE_ECOMMERCE" : "INVENTORY_ONLY";
};

const getShopControlLabel = (v: any) => {
  const sc = normalizeShopControl(v);
  return sc === "ALL_IN_ONE_ECOMMERCE" ? "All-in-One E-Commerce" : "Inventory Only";
};

const DOC_TYPES = ["application/pdf", "image/*"];

const cardStyle = {
  backgroundColor: CARD,
  borderWidth: 1,
  borderColor: "#E8EDF3",
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.06,
  shadowRadius: 14,
  elevation: 4,
} as const;

function HeaderMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      className="flex-1 rounded-[18px] px-3 py-3"
      style={{
        backgroundColor: "rgba(255,255,255,0.14)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
      }}
    >
      <Text className="text-white/80 text-[11px] font-semibold">{label}</Text>
      <Text className="mt-1 text-white text-[16px] font-extrabold" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Input(props: any) {
  const { label, ...rest } = props;
  return (
    <>
      <Text className="mt-3 text-slate-700 font-semibold mb-2">{label}</Text>
      <TextInput
        {...rest}
        className="text-slate-900"
        style={{
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
        placeholderTextColor="#94A3B8"
      />
    </>
  );
}

function ActionChip({
  label,
  onPress,
  disabled,
  primary = false,
  dark = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  dark?: boolean;
  danger?: boolean;
}) {
  let backgroundColor = "#E5E7EB";
  let textColor = "#111827";

  if (primary) {
    backgroundColor = disabled ? "rgba(22,187,5,0.6)" : BRAND;
    textColor = "#FFFFFF";
  }

  if (dark) {
    backgroundColor = disabled ? "rgba(17,24,39,0.5)" : "#111827";
    textColor = "#FFFFFF";
  }

  if (danger) {
    backgroundColor = disabled ? "rgba(220,38,38,0.6)" : "#DC2626";
    textColor = "#FFFFFF";
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor,
      }}
    >
      <Text style={{ color: textColor, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  return `${Math.round(bytes / 1024)} KB`;
}

export default function ShopOwnerEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const scrollRef = useRef<ScrollView>(null);

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

  const [shopControl, setShopControl] = useState<ShopControl>("INVENTORY_ONLY");
  const [scOpen, setScOpen] = useState(false);

  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [pincode, setPincode] = useState("");

  const [newAvatar, setNewAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [idProof, setIdProof] = useState<PickedDoc | null>(null);
  const [gstCertificate, setGstCertificate] = useState<PickedDoc | null>(null);
  const [udyamCertificate, setUdyamCertificate] = useState<PickedDoc | null>(null);

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

  const readResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return { text, json: JSON.parse(text) };
    } catch {
      return { text, json: null };
    }
  };

  const setFormFromData = (d: ShopOwner) => {
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
  };

  const fetchDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const url = SummaryApi.master_get_shopowner.url(String(id));
      const res = await fetch(apiUrl(url), {
        method: SummaryApi.master_get_shopowner.method,
        headers: headersAuthOnly,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        toastError(json?.message || `HTTP ${res.status}`);
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
  }, [id, headersAuthOnly]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toastInfo("Allow gallery permission");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled) {
      const a = result.assets?.[0];
      if (a?.uri) setNewAvatar(a);
    }
  };

  const pickDoc = async (key: DocKey) => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: DOC_TYPES as any,
    });

    if (result.canceled) return;

    const a = result.assets?.[0];
    if (!a?.uri) return toastError("File not selected");

    const doc: PickedDoc = {
      uri: a.uri,
      name: a.name || `${key}_${Date.now()}`,
      mimeType: a.mimeType || "application/octet-stream",
      size: a.size,
    };

    if (key === "idProof") setIdProof(doc);
    if (key === "gstCertificate") setGstCertificate(doc);
    if (key === "udyamCertificate") setUdyamCertificate(doc);
  };

  const clearPickedDocs = () => {
    setIdProof(null);
    setGstCertificate(null);
    setUdyamCertificate(null);
  };

  const submitUpdate = async () => {
    if (!id) return;

    const n = name.trim();
    const u = username.trim().toLowerCase();
    const e = email.trim().toLowerCase();

    if (!n || !u || !e) return toastInfo("Enter name, username, email");
    if (!isValidEmail(e)) return toastInfo("Enter valid email");

    try {
      setSaving(true);

      const res = await fetch(apiUrl(SummaryApi.master_update_shopowner.url(String(id))), {
        method: SummaryApi.master_update_shopowner.method,
        headers: headersJson,
        body: JSON.stringify({
          name: n,
          username: u,
          email: e,
          mobile: mobile.trim(),
          additionalNumber: additionalNumber.trim(),
          shopControl,
          state: stateName.trim(),
          district: district.trim(),
          taluk: taluk.trim(),
          area: area.trim(),
          street: street.trim(),
          pincode: pincode.trim(),
        }),
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || `HTTP ${res.status}`);
      }

      toastSuccess("Updated ✅");
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async () => {
    if (!id) return;
    if (!newAvatar?.uri) return toastInfo("Choose avatar first");

    try {
      setAvatarUploading(true);

      const uri = newAvatar.uri;
      const isPng = uri.toLowerCase().endsWith(".png");
      const mime = (newAvatar as any).mimeType || (isPng ? "image/png" : "image/jpeg");
      const filename = `owner_${Date.now()}.${isPng ? "png" : "jpg"}`;

      const form = new FormData();
      form.append("avatar", { uri, name: filename, type: mime } as any);

      const res = await fetch(apiUrl(SummaryApi.master_shopowner_avatar_upload.url(String(id))), {
        method: SummaryApi.master_shopowner_avatar_upload.method,
        headers: headersAuthOnly,
        body: form,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || "Avatar upload failed");
      }

      toastSuccess("Avatar updated ✅");
      setNewAvatar(null);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!id) return;

    try {
      setAvatarUploading(true);

      const res = await fetch(apiUrl(SummaryApi.master_shopowner_avatar_remove.url(String(id))), {
        method: SummaryApi.master_shopowner_avatar_remove.method,
        headers: headersAuthOnly,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || "Remove failed");
      }

      toastSuccess("Avatar removed ✅");
      setNewAvatar(null);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadDocs = async () => {
    if (!id) return;

    if (!SummaryApi.master_shopowner_docs_upload?.url) {
      return toastError("Docs API missing in SummaryApi (master_shopowner_docs_upload)");
    }

    if (!idProof && !gstCertificate && !udyamCertificate) {
      return toastInfo("Select at least one document");
    }

    try {
      setDocsUploading(true);

      const form = new FormData();

      if (idProof?.uri) {
        form.append(
          "idProof",
          { uri: idProof.uri, name: idProof.name, type: idProof.mimeType } as any
        );
      }
      if (gstCertificate?.uri) {
        form.append(
          "gstCertificate",
          { uri: gstCertificate.uri, name: gstCertificate.name, type: gstCertificate.mimeType } as any
        );
      }
      if (udyamCertificate?.uri) {
        form.append(
          "udyamCertificate",
          { uri: udyamCertificate.uri, name: udyamCertificate.name, type: udyamCertificate.mimeType } as any
        );
      }

      const res = await fetch(apiUrl(SummaryApi.master_shopowner_docs_upload.url(String(id))), {
        method: SummaryApi.master_shopowner_docs_upload.method,
        headers: headersAuthOnly,
        body: form,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || "Docs upload failed");
      }

      toastSuccess("Documents updated ✅");
      clearPickedDocs();
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setDocsUploading(false);
    }
  };

  const removeDoc = async (key: DocKey) => {
    if (!id) return;

    if (!SummaryApi.master_shopowner_docs_remove?.url) {
      return toastError("Remove-doc API missing in SummaryApi (master_shopowner_docs_remove)");
    }

    try {
      setDocsUploading(true);

      const res = await fetch(
        apiUrl(SummaryApi.master_shopowner_docs_remove.url(String(id), key)),
        {
          method: SummaryApi.master_shopowner_docs_remove.method,
          headers: headersAuthOnly,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || "Remove failed");
      }

      toastSuccess(`${key} removed ✅`);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setDocsUploading(false);
    }
  };

  const DocRow = ({
    title,
    current,
    picked,
    onPick,
    onClearPick,
    onRemoveServer,
  }: {
    title: string;
    current?: DocInfo;
    picked?: PickedDoc | null;
    onPick: () => void;
    onClearPick: () => void;
    onRemoveServer: () => void;
  }) => {
    const hasServer = !!current?.url;

    return (
      <View
        className="mt-3 rounded-[18px] p-3"
        style={{
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-slate-900 font-extrabold">{title}</Text>

            {picked ? (
              <Text className="text-slate-500 text-xs mt-1">Selected: {picked.name}</Text>
            ) : hasServer ? (
              <Text className="text-slate-500 text-xs mt-1">
                Uploaded: {current?.fileName || "document"}
              </Text>
            ) : (
              <Text className="text-slate-500 text-xs mt-1">No document</Text>
            )}

            {hasServer ? (
              <Text className="text-slate-400 text-[11px] mt-1">
                {current?.mimeType || ""}
                {current?.bytes ? ` • ${formatBytes(current.bytes)}` : ""}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 10 }}>
            <ActionChip
              label={picked ? "Replace" : "Choose"}
              onPress={onPick}
              disabled={saving || docsUploading}
              primary
            />

            {!!picked && (
              <ActionChip
                label="Clear"
                onPress={onClearPick}
                disabled={saving || docsUploading}
              />
            )}

            {hasServer && (
              <ActionChip
                label="Remove"
                onPress={onRemoveServer}
                disabled={saving || docsUploading}
                danger
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: SURFACE }} edges={["top"]}>
      <View
        className="flex-row items-center justify-between px-4 py-2"
        style={{ backgroundColor: "#FFFFFF" }}
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
          <MaterialCommunityIcons name="chevron-left" size={24} color="#111827" />
        </Pressable>

        <Text className="text-slate-900 text-[18px] font-extrabold">
          Edit ShopOwner
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BRAND} />
          <Text className="mt-2 text-slate-600">Loading...</Text>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500">No data found</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          style={{ backgroundColor: SURFACE }}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#18C10A", "#109203"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 28,
              padding: 18,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                position: "absolute",
                top: -20,
                right: -10,
                width: 110,
                height: 110,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.12)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -30,
                left: -15,
                width: 100,
                height: 100,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />

            <Text className="text-white/90 text-[12px] font-semibold">
              Edit Flow
            </Text>
            <Text className="mt-1 text-white text-[26px] font-extrabold">
              {data?.name || "Shop Owner"}
            </Text>
            <Text className="text-white/90 text-sm font-medium">
              Update profile, avatar and documents
            </Text>

            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <HeaderMetric label="Username" value={data?.username || "-"} />
              <HeaderMetric
                label="Control"
                value={shopControl === "ALL_IN_ONE_ECOMMERCE" ? "E-Com" : "Inventory"}
              />
              <HeaderMetric
                label="Docs"
                value={[
                  data?.idProof?.url,
                  data?.gstCertificate?.url,
                  data?.udyamCertificate?.url,
                ]
                  .filter(Boolean)
                  .length.toString()}
              />
            </View>
          </LinearGradient>

          <View style={cardStyle} className="rounded-[28px] p-4 mb-4">
            <Text className="text-slate-900 text-[18px] font-extrabold">Profile</Text>

            <View className="items-center mt-4">
              <View
                className="w-24 h-24 rounded-full overflow-hidden items-center justify-center"
                style={{
                  backgroundColor: "#F1F5F9",
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                }}
              >
                {newAvatar?.uri ? (
                  <Image source={{ uri: newAvatar.uri }} style={{ width: 96, height: 96 }} />
                ) : data.avatarUrl ? (
                  <Image source={{ uri: data.avatarUrl }} style={{ width: 96, height: 96 }} />
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
                    <MaterialCommunityIcons name="account" size={42} color={BRAND_DARK} />
                  </LinearGradient>
                )}
              </View>

              <View className="flex-row mt-3" style={{ gap: 10 }}>
                <ActionChip
                  label="Choose Avatar"
                  onPress={pickAvatar}
                  disabled={avatarUploading || saving}
                  primary
                />

                <ActionChip
                  label={avatarUploading ? "Uploading" : "Upload"}
                  onPress={uploadAvatar}
                  disabled={avatarUploading || saving || !newAvatar?.uri}
                  dark
                />

                <ActionChip
                  label="Remove"
                  onPress={removeAvatar}
                  disabled={avatarUploading || saving}
                  danger
                />
              </View>

              <Text className="mt-2 text-[12px] text-slate-500">
                Upload or remove avatar via admin endpoints
              </Text>
            </View>

            <Input label="Name" value={name} onChangeText={setName} placeholder="Full name" />
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
              label="WhatsApp / Mobile"
              value={mobile}
              onChangeText={setMobile}
              placeholder="mobile"
              keyboardType="phone-pad"
            />
            <Input
              label="Additional Mobile"
              value={additionalNumber}
              onChangeText={setAdditionalNumber}
              placeholder="optional"
              keyboardType="phone-pad"
            />

            <Text className="mt-4 text-slate-900 font-extrabold">Shop Control</Text>
            <Pressable
              onPress={() => setScOpen(true)}
              className="mt-2"
              style={{
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: 18,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <Text className="text-slate-900 font-extrabold">
                {getShopControlLabel(shopControl)}
              </Text>
            </Pressable>

            <Text className="mt-4 text-slate-900 font-extrabold">Address</Text>
            <Input label="State" value={stateName} onChangeText={setStateName} placeholder="state" />
            <Input label="District" value={district} onChangeText={setDistrict} placeholder="district" />
            <Input label="Taluk" value={taluk} onChangeText={setTaluk} placeholder="taluk" />
            <Input label="Area" value={area} onChangeText={setArea} placeholder="area" />
            <Input label="Door No / Street" value={street} onChangeText={setStreet} placeholder="door no, street" />
            <Input
              label="Pincode"
              value={pincode}
              onChangeText={setPincode}
              placeholder="pincode"
              keyboardType="number-pad"
            />

            <Pressable
              onPress={submitUpdate}
              disabled={saving || docsUploading || avatarUploading}
              className="mt-5 rounded-[20px] overflow-hidden"
            >
              <LinearGradient
                colors={
                  saving || docsUploading || avatarUploading
                    ? ["rgba(22,187,5,0.6)", "rgba(17,147,4,0.6)"]
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
                {saving ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#fff" />
                    <Text className="ml-3 text-white font-extrabold">Saving...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-extrabold">Save Changes</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={cardStyle} className="rounded-[28px] p-4">
            <Text className="text-slate-900 text-[18px] font-extrabold">
              Documents
            </Text>
            <Text className="text-slate-500 text-[12px] mt-1">
              Upload PDF/JPEG/PNG/WEBP. Upload is optional and can be done anytime.
            </Text>

            <DocRow
              title="ID Proof"
              current={data.idProof}
              picked={idProof}
              onPick={() => pickDoc("idProof")}
              onClearPick={() => setIdProof(null)}
              onRemoveServer={() => removeDoc("idProof")}
            />

            <DocRow
              title="GST Certificate"
              current={data.gstCertificate}
              picked={gstCertificate}
              onPick={() => pickDoc("gstCertificate")}
              onClearPick={() => setGstCertificate(null)}
              onRemoveServer={() => removeDoc("gstCertificate")}
            />

            <DocRow
              title="Udyam Certificate"
              current={data.udyamCertificate}
              picked={udyamCertificate}
              onPick={() => pickDoc("udyamCertificate")}
              onClearPick={() => setUdyamCertificate(null)}
              onRemoveServer={() => removeDoc("udyamCertificate")}
            />

            <Pressable
              onPress={uploadDocs}
              disabled={docsUploading || saving || avatarUploading}
              className="mt-5 rounded-[20px] overflow-hidden"
            >
              <LinearGradient
                colors={
                  docsUploading || saving || avatarUploading
                    ? ["rgba(17,24,39,0.5)", "rgba(15,23,42,0.5)"]
                    : ["#111827", "#0F172A"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 15,
                  alignItems: "center",
                  borderRadius: 20,
                }}
              >
                {docsUploading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#fff" />
                    <Text className="ml-3 text-white font-extrabold">Uploading...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-extrabold">Upload Selected Docs</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={clearPickedDocs}
              disabled={docsUploading || saving || avatarUploading}
              style={{
                backgroundColor: "#F1F5F9",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginTop: 12,
                alignItems: "center",
              }}
            >
              <Text className="text-slate-900 font-extrabold">Clear Selected</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      <Modal visible={scOpen} transparent animationType="fade" onRequestClose={() => setScOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white w-full rounded-3xl p-4">
            <Text className="text-lg font-extrabold text-slate-900">Select Shop Control</Text>

            {SHOPCONTROL_OPTIONS.map((x) => {
              const on = shopControl === x.value;
              return (
                <Pressable
                  key={x.value}
                  onPress={() => {
                    setShopControl(x.value);
                    setScOpen(false);
                  }}
                  className="mt-3 p-3 rounded-2xl border"
                  style={{
                    backgroundColor: on ? "rgba(22,187,5,0.10)" : "#F8FAFC",
                    borderColor: on ? BRAND : "#E2E8F0",
                  }}
                >
                  <Text className="text-slate-900 font-extrabold">{x.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}