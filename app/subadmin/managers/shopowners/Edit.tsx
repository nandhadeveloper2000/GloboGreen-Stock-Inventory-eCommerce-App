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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import SummaryApi, { baseURL } from "../../../constants/SummaryApi";
import { useAuth } from "../../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

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

  // form fields
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

  // pickers
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

          // address fields (your backend maps these into address object)
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
        headers: headersAuthOnly, // ✅ DON'T set Content-Type
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
    keyName,
    current,
    picked,
    onPick,
    onClearPick,
    onRemoveServer,
  }: {
    title: string;
    keyName: DocKey;
    current?: DocInfo;
    picked?: PickedDoc | null;
    onPick: () => void;
    onClearPick: () => void;
    onRemoveServer: () => void;
  }) => {
    const hasServer = !!current?.url;
    return (
      <View className="mt-3 border border-gray-200 rounded-2xl p-3 bg-gray-50">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-gray-900 font-extrabold">{title}</Text>

            {picked ? (
              <Text className="text-gray-500 text-xs mt-1">Selected: {picked.name}</Text>
            ) : hasServer ? (
              <Text className="text-gray-500 text-xs mt-1">
                Uploaded: {current?.fileName || "document"}
              </Text>
            ) : (
              <Text className="text-gray-500 text-xs mt-1">No document</Text>
            )}

            {hasServer ? (
              <Text className="text-gray-400 text-[11px] mt-1">
                {current?.mimeType ? current.mimeType : ""}{current?.bytes ? ` • ${Math.round((current.bytes || 0) / 1024)} KB` : ""}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 10 }}>
            <Pressable
              onPress={onPick}
              disabled={saving || docsUploading}
              className="px-3 py-2 rounded-xl bg-[#16BB05]"
            >
              <Text className="text-white font-extrabold text-xs">
                {picked ? "Replace" : "Choose"}
              </Text>
            </Pressable>

            {!!picked && (
              <Pressable
                onPress={onClearPick}
                disabled={saving || docsUploading}
                className="px-3 py-2 rounded-xl bg-gray-200"
              >
                <Text className="text-gray-900 font-extrabold text-xs">Clear</Text>
              </Pressable>
            )}

            {hasServer && (
              <Pressable
                onPress={onRemoveServer}
                disabled={saving || docsUploading}
                className="px-3 py-2 rounded-xl bg-red-600"
              >
                <Text className="text-white font-extrabold text-xs">Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB]" edges={["top"]}>
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="p-2">
          <MaterialCommunityIcons name="chevron-left" size={30} color="#111827" />
        </Pressable>
        <Text className="text-gray-900 text-lg font-extrabold">Edit ShopOwner</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-gray-600">Loading...</Text>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">No data found</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          className="flex-1 bg-[#F7F8FB]"
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile */}
          <View className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
            <Text className="text-gray-900 text-lg font-extrabold">Profile</Text>

            <View className="items-center mt-4">
              <View className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden items-center justify-center border border-gray-200">
                {newAvatar?.uri ? (
                  <Image source={{ uri: newAvatar.uri }} style={{ width: 80, height: 80 }} />
                ) : data.avatarUrl ? (
                  <Image source={{ uri: data.avatarUrl }} style={{ width: 80, height: 80 }} />
                ) : (
                  <MaterialCommunityIcons name="account" size={40} color="#9CA3AF" />
                )}
              </View>

              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={pickAvatar}
                  disabled={avatarUploading || saving}
                  className={`px-4 py-2 rounded-xl ${
                    avatarUploading || saving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
                  }`}
                >
                  <Text className="text-white font-extrabold">Choose Avatar</Text>
                </Pressable>

                <Pressable
                  onPress={uploadAvatar}
                  disabled={avatarUploading || saving || !newAvatar?.uri}
                  className={`px-4 py-2 rounded-xl ${
                    avatarUploading || saving || !newAvatar?.uri ? "bg-[#111827]/50" : "bg-[#111827]"
                  }`}
                >
                  {avatarUploading ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator color="#fff" />
                      <Text className="ml-2 text-white font-extrabold">Uploading</Text>
                    </View>
                  ) : (
                    <Text className="text-white font-extrabold">Upload</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={removeAvatar}
                  disabled={avatarUploading || saving}
                  className={`px-4 py-2 rounded-xl ${
                    avatarUploading || saving ? "bg-red-600/60" : "bg-red-600"
                  }`}
                >
                  <Text className="text-white font-extrabold">Remove</Text>
                </Pressable>
              </View>

              <Text className="mt-2 text-[12px] text-gray-500">
                Upload/Remove avatar via admin endpoints.
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

            <Text className="mt-4 text-gray-900 font-extrabold">Shop Control</Text>
            <Pressable
              onPress={() => setScOpen(true)}
              className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"
            >
              <Text className="text-gray-900 font-extrabold">
                {getShopControlLabel(shopControl)}
              </Text>
            </Pressable>

            <Text className="mt-4 text-gray-900 font-extrabold">Address</Text>
            <Input label="State" value={stateName} onChangeText={setStateName} placeholder="state" />
            <Input label="District" value={district} onChangeText={setDistrict} placeholder="district" />
            <Input label="Taluk" value={taluk} onChangeText={setTaluk} placeholder="taluk" />
            <Input label="Area" value={area} onChangeText={setArea} placeholder="area" />
            <Input label="Door No / Street" value={street} onChangeText={setStreet} placeholder="door no, street" />
            <Input label="Pincode" value={pincode} onChangeText={setPincode} placeholder="pincode" keyboardType="number-pad" />

            <Pressable
              onPress={submitUpdate}
              disabled={saving || docsUploading || avatarUploading}
              className={`mt-5 rounded-2xl py-4 items-center ${
                saving || docsUploading || avatarUploading ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
              }`}
            >
              {saving ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#fff" />
                  <Text className="ml-3 text-white font-extrabold">Saving...</Text>
                </View>
              ) : (
                <Text className="text-white font-extrabold">Save Changes</Text>
              )}
            </Pressable>
          </View>

          {/* Documents */}
          <View className="mt-4 bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
            <Text className="text-gray-900 text-lg font-extrabold">Documents</Text>
            <Text className="text-gray-500 text-[12px] mt-1">
              Upload PDF/JPEG/PNG/WEBP. Upload is optional and can be done anytime.
            </Text>

            <DocRow
              title="ID Proof"
              keyName="idProof"
              current={data.idProof}
              picked={idProof}
              onPick={() => pickDoc("idProof")}
              onClearPick={() => setIdProof(null)}
              onRemoveServer={() => removeDoc("idProof")}
            />

            <DocRow
              title="GST Certificate"
              keyName="gstCertificate"
              current={data.gstCertificate}
              picked={gstCertificate}
              onPick={() => pickDoc("gstCertificate")}
              onClearPick={() => setGstCertificate(null)}
              onRemoveServer={() => removeDoc("gstCertificate")}
            />

            <DocRow
              title="Udyam Certificate"
              keyName="udyamCertificate"
              current={data.udyamCertificate}
              picked={udyamCertificate}
              onPick={() => pickDoc("udyamCertificate")}
              onClearPick={() => setUdyamCertificate(null)}
              onRemoveServer={() => removeDoc("udyamCertificate")}
            />

            <Pressable
              onPress={uploadDocs}
              disabled={docsUploading || saving || avatarUploading}
              className={`mt-5 rounded-2xl py-4 items-center ${
                docsUploading || saving || avatarUploading ? "bg-[#111827]/60" : "bg-[#111827]"
              }`}
            >
              {docsUploading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#fff" />
                  <Text className="ml-3 text-white font-extrabold">Uploading...</Text>
                </View>
              ) : (
                <Text className="text-white font-extrabold">Upload Selected Docs</Text>
              )}
            </Pressable>

            <Pressable
              onPress={clearPickedDocs}
              disabled={docsUploading || saving || avatarUploading}
              className="mt-3 rounded-2xl py-3 items-center bg-gray-200"
            >
              <Text className="text-gray-900 font-extrabold">Clear Selected</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Shop Control Modal */}
      <Modal visible={scOpen} transparent animationType="fade" onRequestClose={() => setScOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white w-full rounded-3xl p-4">
            <Text className="text-lg font-extrabold text-gray-900">Select Shop Control</Text>

            {SHOPCONTROL_OPTIONS.map((x) => {
              const on = shopControl === x.value;
              return (
                <Pressable
                  key={x.value}
                  onPress={() => {
                    setShopControl(x.value);
                    setScOpen(false);
                  }}
                  className={`mt-3 p-3 rounded-2xl border ${
                    on ? "bg-[#16BB05]/10 border-[#16BB05]" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Text className="text-gray-900 font-extrabold">{x.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Input(props: any) {
  const { label, ...rest } = props;
  return (
    <>
      <Text className="mt-3 text-gray-700 font-semibold mb-2">{label}</Text>
      <TextInput
        {...rest}
        className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
        placeholderTextColor="#9CA3AF"
      />
    </>
  );
}