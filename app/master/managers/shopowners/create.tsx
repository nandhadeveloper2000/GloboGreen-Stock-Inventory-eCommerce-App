// app/master/managers/shopowners/create.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

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

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type Shop = {
  _id: string;
  name: string;
  address?: Address;
  frontImageUrl?: string;
};

type Owner = {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
};

type ShopControl = "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE";

const BUSINESS_OPTIONS = ["Retail", "Wholesale"] as const;

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

type DocKey = "idProof" | "gstCertificate" | "udyamCertificate";

type PickedDoc = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

const DOC_TYPES = ["application/pdf", "image/*"];

export default function ShopOwnerCreateScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const scrollRef = useRef<ScrollView>(null);
  const shopSectionRef = useRef<View>(null);

  const [saving, setSaving] = useState(false);

  const [createdOwner, setCreatedOwner] = useState<Owner | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);

  // owner
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const [whatsapp, setWhatsapp] = useState("");
  const [phone2, setPhone2] = useState("");

  const [shopControl, setShopControl] = useState<ShopControl>(() =>
    normalizeShopControl("INVENTORY_ONLY")
  );
  const [scOpen, setScOpen] = useState(false);

  // owner address
  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [pincode, setPincode] = useState("");

  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // ✅ docs
  const [idProof, setIdProof] = useState<PickedDoc | null>(null);
  const [gstCertificate, setGstCertificate] = useState<PickedDoc | null>(null);
  const [udyamCertificate, setUdyamCertificate] = useState<PickedDoc | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  // Shop modal + fields
  const [shopOpen, setShopOpen] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);

  const [shopName, setShopName] = useState("");
  const [shopState, setShopState] = useState("");
  const [shopDistrict, setShopDistrict] = useState("");
  const [shopTaluk, setShopTaluk] = useState("");
  const [shopArea, setShopArea] = useState("");
  const [shopStreet, setShopStreet] = useState("");
  const [shopPincode, setShopPincode] = useState("");

  // shop-level businessTypes
  const [shopBusinessTypes, setShopBusinessTypes] = useState<string[]>(["Retail"]);
  const [btOpen, setBtOpen] = useState(false);

  const [frontImage, setFrontImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

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

  const formatAddress = (a?: Address) => {
    if (!a) return "";
    return [a.street, a.area, a.taluk, a.district, a.state, a.pincode]
      .filter(Boolean)
      .join(", ");
  };

  const scrollToShopSection = () => {
    requestAnimationFrame(() => {
      if (!shopSectionRef.current || !scrollRef.current) return;
      shopSectionRef.current.measureLayout(
        scrollRef.current as any,
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(y - 10, 0), animated: true });
        },
        () => {}
      );
    });
  };

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
      if (a?.uri) setAvatar(a);
    }
  };

  const pickShopFrontImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toastInfo("Allow gallery permission");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled) {
      const a = result.assets?.[0];
      if (a?.uri) setFrontImage(a);
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

  const resetOwnerForm = () => {
    setName("");
    setUsername("");
    setEmail("");
    setPin("");
    setWhatsapp("");
    setPhone2("");
    setShopControl("INVENTORY_ONLY");
    setStateName("");
    setDistrict("");
    setTaluk("");
    setArea("");
    setStreet("");
    setPincode("");
    setAvatar(null);

    // ✅ docs reset
    setIdProof(null);
    setGstCertificate(null);
    setUdyamCertificate(null);
  };

  const resetShopForm = () => {
    setShopName("");
    setShopState("");
    setShopDistrict("");
    setShopTaluk("");
    setShopArea("");
    setShopStreet("");
    setShopPincode("");
    setFrontImage(null);
    setShopBusinessTypes(["Retail"]);
  };

  const resetAllForNewOwner = () => {
    setCreatedOwner(null);
    setShops([]);
    resetOwnerForm();
    resetShopForm();
    setShopOpen(false);
  };

  const toggleBusiness = (x: string) => {
    setShopBusinessTypes((prev) =>
      prev.includes(x) ? prev.filter((v) => v !== x) : [...prev, x]
    );
  };

  const uploadOwnerAvatarById = async (ownerId: string) => {
    if (!avatar?.uri) return null;

    const uri = avatar.uri;
    const isPng = uri.toLowerCase().endsWith(".png");
    const mime = (avatar as any).mimeType || (isPng ? "image/png" : "image/jpeg");
    const filename = `owner_${Date.now()}.${isPng ? "png" : "jpg"}`;

    const form = new FormData();
    form.append("avatar", { uri, name: filename, type: mime } as any);

    const res = await fetch(
      apiUrl(SummaryApi.master_shopowner_avatar_upload.url(ownerId)),
      {
        method: SummaryApi.master_shopowner_avatar_upload.method,
        headers: headersAuthOnly,
        body: form,
      }
    );

    const rr = await readResponse(res);
    const json = rr.json;

    if (!res.ok || !json?.success) {
      if (!json) console.log("RAW:", rr.text);
      toastInfo("Owner created, but avatar upload failed");
      return null;
    }

    return json.data as Owner;
  };

  const uploadDocsById = async (ownerId: string) => {
    // nothing selected -> skip
    if (!idProof && !gstCertificate && !udyamCertificate) return true;

    // ensure API exists
    if (!SummaryApi.master_shopowner_docs_upload?.url) {
      toastInfo("Docs endpoint missing in SummaryApi");
      return false;
    }

    try {
      setDocUploading(true);

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
          {
            uri: gstCertificate.uri,
            name: gstCertificate.name,
            type: gstCertificate.mimeType,
          } as any
        );
      }
      if (udyamCertificate?.uri) {
        form.append(
          "udyamCertificate",
          {
            uri: udyamCertificate.uri,
            name: udyamCertificate.name,
            type: udyamCertificate.mimeType,
          } as any
        );
      }

      const res = await fetch(
        apiUrl(SummaryApi.master_shopowner_docs_upload.url(ownerId)),
        {
          method: SummaryApi.master_shopowner_docs_upload.method,
          headers: headersAuthOnly, // ✅ DO NOT set Content-Type
          body: form,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        toastInfo("Owner created, but documents upload failed");
        return false;
      }

      toastSuccess("Documents uploaded ✅");
      return true;
    } catch {
      toastInfo("Owner created, but documents upload failed");
      return false;
    } finally {
      setDocUploading(false);
    }
  };

  // ✅ Create Owner
  const submitOwner = async () => {
    const n = name.trim();
    const u = username.trim().toLowerCase();
    const e = email.trim().toLowerCase();
    const p = String(pin || "").trim();

    if (!n || !u || !e || !p) return toastInfo("Enter name, username, email and PIN");
    if (!isValidEmail(e)) return toastInfo("Enter valid email");
    if (p.length < 4) return toastInfo("PIN must be at least 4 digits");

    try {
      setSaving(true);

      const res = await fetch(apiUrl(SummaryApi.master_create_shopowner.url), {
        method: SummaryApi.master_create_shopowner.method,
        headers: headersJson,
        body: JSON.stringify({
          name: n,
          username: u,
          email: e,
          pin: p,

          mobile: whatsapp.trim(),
          additionalNumber: phone2.trim(),

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

      const ownerId = json?.data?._id as string | undefined;
      if (!ownerId) return toastError("Owner created but missing _id");

      const avatarOwner = await uploadOwnerAvatarById(ownerId);
      const finalOwner = avatarOwner || json.data;

      // ✅ upload docs (optional)
      await uploadDocsById(ownerId);

      setCreatedOwner(finalOwner);
      setShops([]);
      resetOwnerForm();

      toastSuccess("ShopOwner created. Now add shops below ✅");

      setTimeout(() => {
        scrollToShopSection();
      }, 150);
    } catch {
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Add Shop
  const submitShop = async () => {
    if (!createdOwner?._id) return toastError("Create ShopOwner first");

    const nm = shopName.trim();
    if (!nm) return toastInfo("Enter shop name");

    try {
      setShopSaving(true);

      const form = new FormData();
      form.append("ownerId", createdOwner._id);
      form.append("shopName", nm);

      form.append("businessTypes", JSON.stringify(shopBusinessTypes));

      form.append("state", shopState.trim());
      form.append("district", shopDistrict.trim());
      form.append("taluk", shopTaluk.trim());
      form.append("area", shopArea.trim());
      form.append("street", shopStreet.trim());
      form.append("pincode", shopPincode.trim());

      if (frontImage?.uri) {
        const uri = frontImage.uri;
        const isPng = uri.toLowerCase().endsWith(".png");
        const mime =
          (frontImage as any).mimeType ?? (isPng ? "image/png" : "image/jpeg");
        const filename = `shop_${Date.now()}.${isPng ? "png" : "jpg"}`;
        form.append("frontImage", { uri, name: filename, type: mime } as any);
      }

      const res = await fetch(apiUrl(SummaryApi.master_create_shop.url), {
        method: SummaryApi.master_create_shop.method,
        headers: headersAuthOnly,
        body: form,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || `HTTP ${res.status}`);
      }

      setShops((prev) => [json.data, ...prev]);

      resetShopForm();
      setShopOpen(false);

      toastSuccess("Shop added ✅");
    } catch {
      toastError("Network error");
    } finally {
      setShopSaving(false);
    }
  };

  // ✅ Finish button -> go back to list
  const finishAndGoList = () => {
    router.replace("/master/(tabs)/shopOwners");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB]" edges={["top"]}>
      {/* ✅ Top bar */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="p-2">
          <MaterialCommunityIcons name="chevron-left" size={30} color="#111827" />
        </Pressable>

        <Text className="text-gray-900 text-lg font-extrabold">
          Create ShopOwner
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-[#F7F8FB]"
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* OWNER AREA */}
        {!createdOwner?._id ? (
          <View className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
            <Text className="text-gray-900 text-lg font-extrabold">
              Create ShopOwner
            </Text>

            {/* Avatar */}
            <View className="items-center mt-4">
              <View className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden items-center justify-center border border-gray-200">
                {avatar?.uri ? (
                  <Image source={{ uri: avatar.uri }} style={{ width: 80, height: 80 }} />
                ) : (
                  <MaterialCommunityIcons name="account" size={40} color="#9CA3AF" />
                )}
              </View>

              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={pickAvatar}
                  disabled={saving}
                  className={`px-4 py-2 rounded-xl ${
                    saving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
                  }`}
                >
                  <Text className="text-white font-extrabold">Choose Avatar</Text>
                </Pressable>

                <Pressable
                  onPress={() => setAvatar(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-gray-200"
                >
                  <Text className="text-gray-900 font-extrabold">Clear</Text>
                </Pressable>
              </View>

              <Text className="mt-2 text-[12px] text-gray-500">
                Avatar optional (uploaded after create)
              </Text>
            </View>

            <Input label="Name" value={name} onChangeText={setName} placeholder="Full name" />
            <Input label="Username" value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="email@example.com" autoCapitalize="none" keyboardType="email-address" />
            <Input label="WhatsApp / Mobile" value={whatsapp} onChangeText={setWhatsapp} placeholder="whatsapp number" keyboardType="phone-pad" />
            <Input label="Additional Mobile" value={phone2} onChangeText={setPhone2} placeholder="optional" keyboardType="phone-pad" />

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
            <Input label="PIN" value={pin} onChangeText={setPin} placeholder="Set PIN (e.g. 1234)" keyboardType="number-pad" />

            {/* ✅ Documents */}
            <Text className="mt-4 text-gray-900 font-extrabold">Documents (Optional)</Text>

            {/* ID Proof */}
            <View className="mt-2 border border-gray-200 rounded-2xl p-3 bg-gray-50">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-gray-900 font-extrabold">ID Proof</Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    {idProof ? idProof.name : "PDF/JPEG/PNG/WEBP"}
                  </Text>
                </View>
                <View className="flex-row" style={{ gap: 10 }}>
                  <Pressable
                    onPress={() => pickDoc("idProof")}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl bg-[#16BB05]"
                  >
                    <Text className="text-white font-extrabold text-xs">
                      {idProof ? "Replace" : "Choose"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIdProof(null)}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl bg-gray-200"
                  >
                    <Text className="text-gray-900 font-extrabold text-xs">Clear</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* GST */}
            <View className="mt-3 border border-gray-200 rounded-2xl p-3 bg-gray-50">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-gray-900 font-extrabold">GST Certificate</Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    {gstCertificate ? gstCertificate.name : "PDF/JPEG/PNG/WEBP"}
                  </Text>
                </View>
                <View className="flex-row" style={{ gap: 10 }}>
                  <Pressable
                    onPress={() => pickDoc("gstCertificate")}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl bg-[#16BB05]"
                  >
                    <Text className="text-white font-extrabold text-xs">
                      {gstCertificate ? "Replace" : "Choose"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setGstCertificate(null)}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl bg-gray-200"
                  >
                    <Text className="text-gray-900 font-extrabold text-xs">Clear</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Udyam */}
            <View className="mt-3 border border-gray-200 rounded-2xl p-3 bg-gray-50">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-gray-900 font-extrabold">Udyam Certificate</Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    {udyamCertificate ? udyamCertificate.name : "PDF/JPEG/PNG/WEBP"}
                  </Text>
                </View>
                <View className="flex-row" style={{ gap: 10 }}>
                  <Pressable
                    onPress={() => pickDoc("udyamCertificate")}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl bg-[#16BB05]"
                  >
                    <Text className="text-white font-extrabold text-xs">
                      {udyamCertificate ? "Replace" : "Choose"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setUdyamCertificate(null)}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl bg-gray-200"
                  >
                    <Text className="text-gray-900 font-extrabold text-xs">Clear</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text className="text-gray-500 text-[12px] mt-2">
              These documents upload after ShopOwner is created.
            </Text>

            <Pressable
              onPress={submitOwner}
              disabled={saving || docUploading}
              className={`mt-5 rounded-2xl py-4 items-center ${
                saving || docUploading ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
              }`}
            >
              {saving || docUploading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#fff" />
                  <Text className="ml-3 text-white font-extrabold">
                    {saving ? "Saving..." : "Uploading docs..."}
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-extrabold">Submit</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
            <Text className="text-gray-900 text-lg font-extrabold">ShopOwner</Text>

            <View className="flex-row items-center mt-3">
              <View className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden items-center justify-center border border-gray-200">
                {createdOwner.avatarUrl ? (
                  <Image source={{ uri: createdOwner.avatarUrl }} style={{ width: 48, height: 48 }} />
                ) : (
                  <MaterialCommunityIcons name="account" size={24} color="#9CA3AF" />
                )}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-gray-900 font-extrabold">{createdOwner.username}</Text>
                <Text className="text-gray-500">{createdOwner.email}</Text>
              </View>
            </View>

            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={resetAllForNewOwner}
                className="mt-4 flex-1 px-4 py-3 rounded-2xl bg-gray-200 items-center"
              >
                <Text className="text-gray-900 font-extrabold">Create New Owner</Text>
              </Pressable>

              <Pressable
                onPress={finishAndGoList}
                className="mt-4 flex-1 px-4 py-3 rounded-2xl bg-[#111827] items-center"
              >
                <Text className="text-white font-extrabold">Go List</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* SHOP SECTION */}
        {!!createdOwner?._id && (
          <View
            ref={shopSectionRef}
            className="mt-4 bg-white rounded-3xl p-4 border border-gray-100 shadow-sm"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-900 text-lg font-extrabold">Shop</Text>
              <Pressable
                onPress={() => setShopOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#16BB05]"
              >
                <Text className="text-white font-extrabold">Add Shop</Text>
              </Pressable>
            </View>

            <Text className="mt-2 text-gray-600">
              Owner: <Text className="text-gray-900 font-extrabold">{createdOwner.name}</Text>
            </Text>

            <View className="mt-4 border border-gray-200 rounded-2xl overflow-hidden">
              <View className="flex-row bg-gray-50 border-b border-gray-200">
                <Text className="w-[60px] px-3 py-3 text-gray-700 font-extrabold">
                  S.No
                </Text>
                <Text className="flex-1 px-3 py-3 text-gray-700 font-extrabold">
                  Shop Name
                </Text>
                <Text className="flex-1 px-3 py-3 text-gray-700 font-extrabold">
                  Address
                </Text>
                <Text className="w-[80px] px-3 py-3 text-gray-700 font-extrabold">
                  Action
                </Text>
              </View>

              {shops.length === 0 ? (
                <View className="px-3 py-4">
                  <Text className="text-gray-500">No shops added yet</Text>
                </View>
              ) : (
                shops.map((s, i) => (
                  <View key={s._id} className="flex-row border-t border-gray-100">
                    <Text className="w-[60px] px-3 py-3 text-gray-900 font-extrabold">
                      {i + 1}
                    </Text>

                    <View className="flex-1 px-3 py-3">
                      <Text className="text-gray-900 font-extrabold">{s.name}</Text>
                      {!!s.frontImageUrl && (
                        <Image
                          source={{ uri: s.frontImageUrl }}
                          style={{ width: 54, height: 54, borderRadius: 12, marginTop: 6 }}
                        />
                      )}
                    </View>

                    <View className="flex-1 px-3 py-3">
                      <Text className="text-gray-700">{formatAddress(s.address)}</Text>
                    </View>

                    <View className="w-[80px] px-3 py-3 items-center justify-center">
                      <Pressable
                        onPress={() => toastInfo("Edit/Delete next")}
                        className="bg-gray-200 rounded-xl px-3 py-2"
                      >
                        <Text className="text-gray-900 font-extrabold">...</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* BUSINESS TYPES MODAL */}
        <Modal visible={btOpen} transparent animationType="fade" onRequestClose={() => setBtOpen(false)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-6">
            <View className="bg-white w-full rounded-3xl p-4">
              <Text className="text-lg font-extrabold text-gray-900">Select Business Types</Text>

              {BUSINESS_OPTIONS.map((x) => {
                const on = shopBusinessTypes.includes(x);
                return (
                  <Pressable
                    key={x}
                    onPress={() => toggleBusiness(x)}
                    className="mt-3 flex-row items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200"
                  >
                    <Text className="text-gray-900 font-bold">{x}</Text>
                    <MaterialCommunityIcons
                      name={on ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={22}
                      color="#16BB05"
                    />
                  </Pressable>
                );
              })}

              <Pressable onPress={() => setBtOpen(false)} className="mt-4 rounded-2xl py-3 bg-[#16BB05] items-center">
                <Text className="text-white font-extrabold">Done</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShopBusinessTypes(["Retail"]);
                  setBtOpen(false);
                }}
                className="mt-3 rounded-2xl py-3 bg-gray-200 items-center"
              >
                <Text className="text-gray-900 font-extrabold">Reset (Retail)</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* SHOP CONTROL MODAL */}
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

        {/* SHOP ADD MODAL */}
        <Modal visible={shopOpen} transparent animationType="slide" onRequestClose={() => setShopOpen(false)}>
          <View className="flex-1 bg-black/40 justify-end">
            <View className="bg-white rounded-t-3xl p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-900 text-lg font-extrabold">Add Shop</Text>
                <Pressable onPress={() => setShopOpen(false)} hitSlop={10}>
                  <MaterialCommunityIcons name="close" size={22} color="#111827" />
                </Pressable>
              </View>

              <Input label="Shop Name" value={shopName} onChangeText={setShopName} placeholder="Shop name" />

              <Text className="mt-4 text-gray-900 font-extrabold">Business Types</Text>
              <Pressable
                onPress={() => setBtOpen(true)}
                disabled={shopSaving}
                className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"
              >
                <Text className="text-gray-900 font-extrabold">
                  {shopBusinessTypes.length ? shopBusinessTypes.join(", ") : "Select"}
                </Text>
                <Text className="text-[12px] text-gray-500 mt-1">Select one or more</Text>
              </Pressable>

              <Text className="mt-3 text-gray-900 font-extrabold">Shop Address</Text>
              <Input label="State" value={shopState} onChangeText={setShopState} placeholder="state" />
              <Input label="District" value={shopDistrict} onChangeText={setShopDistrict} placeholder="district" />
              <Input label="Taluk" value={shopTaluk} onChangeText={setShopTaluk} placeholder="taluk" />
              <Input label="Area" value={shopArea} onChangeText={setShopArea} placeholder="area" />
              <Input label="Door No / Street" value={shopStreet} onChangeText={setShopStreet} placeholder="door no, street" />
              <Input label="Pincode" value={shopPincode} onChangeText={setShopPincode} placeholder="pincode" keyboardType="number-pad" />

              <View className="items-center mt-3">
                <View className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden items-center justify-center border border-gray-200">
                  {frontImage?.uri ? (
                    <Image source={{ uri: frontImage.uri }} style={{ width: 96, height: 96 }} />
                  ) : (
                    <MaterialCommunityIcons name="image" size={34} color="#9CA3AF" />
                  )}
                </View>

                <View className="flex-row gap-3 mt-3">
                  <Pressable
                    onPress={pickShopFrontImage}
                    disabled={shopSaving}
                    className={`px-4 py-2 rounded-xl ${
                      shopSaving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
                    }`}
                  >
                    <Text className="text-white font-extrabold">Shop Photo</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setFrontImage(null)}
                    disabled={shopSaving}
                    className="px-4 py-2 rounded-xl bg-gray-200"
                  >
                    <Text className="text-gray-900 font-extrabold">Clear</Text>
                  </Pressable>
                </View>

                <Text className="mt-2 text-[12px] text-gray-500">Shop front view photo optional</Text>
              </View>

              <Pressable
                onPress={submitShop}
                disabled={shopSaving}
                className={`mt-4 rounded-2xl py-4 items-center ${
                  shopSaving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
                }`}
              >
                {shopSaving ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#fff" />
                    <Text className="ml-3 text-white font-extrabold">Submitting...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-extrabold">Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
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