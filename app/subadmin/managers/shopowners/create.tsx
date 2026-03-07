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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../../constants/SummaryApi";
import { useAuth } from "../../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

const BRAND = "#16BB05";
const BRAND_DARK = "#119304";
const SURFACE = "#F4F7FB";
const CARD = "#FFFFFF";
const TEXT = "#0F172A";

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const toastInfo = (msg: string) =>
  Toast.show({ type: "info", text1: "Info", text2: msg });

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

const isValidPhone = (value: string) => /^\d{10}$/.test(value.trim());

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
  return s === "ALL_IN_ONE_ECOMMERCE"
    ? "ALL_IN_ONE_ECOMMERCE"
    : "INVENTORY_ONLY";
};

const getShopControlLabel = (v: any) => {
  const sc = normalizeShopControl(v);
  return sc === "ALL_IN_ONE_ECOMMERCE"
    ? "All-in-One E-Commerce"
    : "Inventory Only";
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

  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [pincode, setPincode] = useState("");

  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const [idProof, setIdProof] = useState<PickedDoc | null>(null);
  const [gstCertificate, setGstCertificate] = useState<PickedDoc | null>(null);
  const [udyamCertificate, setUdyamCertificate] = useState<PickedDoc | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  const [shopOpen, setShopOpen] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);

  const [shopName, setShopName] = useState("");
  const [shopState, setShopState] = useState("");
  const [shopDistrict, setShopDistrict] = useState("");
  const [shopTaluk, setShopTaluk] = useState("");
  const [shopArea, setShopArea] = useState("");
  const [shopStreet, setShopStreet] = useState("");
  const [shopPincode, setShopPincode] = useState("");

  const [shopBusinessTypes, setShopBusinessTypes] = useState<string[]>([
    "Retail",
  ]);
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

  const getApiErrorMessage = (
    json: any,
    fallback: string = "Something went wrong"
  ) => {
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
          scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
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
      if (!json) console.log("RAW AVATAR RESPONSE:", rr.text);
      toastInfo("Owner created, but avatar upload failed");
      return null;
    }

    return json.data as Owner;
  };

  const uploadDocsById = async (ownerId: string) => {
    if (!idProof && !gstCertificate && !udyamCertificate) return true;

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
          headers: headersAuthOnly,
          body: form,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW DOC RESPONSE:", rr.text);
        toastInfo("Owner created, but documents upload failed");
        return false;
      }

      toastSuccess("Documents uploaded");
      return true;
    } catch (error) {
      console.log("uploadDocsById error:", error);
      toastInfo("Owner created, but documents upload failed");
      return false;
    } finally {
      setDocUploading(false);
    }
  };

  const submitOwner = async () => {
    const n = name.trim();
    const u = username.trim().toLowerCase();
    const e = email.trim().toLowerCase();
    const p = String(pin || "").trim();
    const mobile = whatsapp.trim();
    const additional = phone2.trim();

    if (!n || !u || !e || !p) {
      return toastInfo("Enter name, username, email and PIN");
    }

    if (!isValidEmail(e)) {
      return toastInfo("Enter valid email");
    }

    if (p.length < 4) {
      return toastInfo("PIN must be at least 4 digits");
    }

    if (!mobile) {
      return toastInfo("Enter WhatsApp / Mobile number");
    }

    if (!isValidPhone(mobile)) {
      return toastInfo("Enter valid 10-digit WhatsApp / Mobile number");
    }

    if (additional && !isValidPhone(additional)) {
      return toastInfo("Enter valid 10-digit Additional Mobile number");
    }

    if (additional && mobile === additional) {
      return toastInfo("WhatsApp number and Additional Mobile cannot be same");
    }

    try {
      setSaving(true);

      const payload = {
        name: n,
        username: u,
        email: e,
        pin: p,
        mobile,
        additionalNumber: additional,
        shopControl,
        state: stateName.trim(),
        district: district.trim(),
        taluk: taluk.trim(),
        area: area.trim(),
        street: street.trim(),
        pincode: pincode.trim(),
      };

      const res = await fetch(apiUrl(SummaryApi.master_create_shopowner.url), {
        method: SummaryApi.master_create_shopowner.method,
        headers: headersJson,
        body: JSON.stringify(payload),
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        const message = getApiErrorMessage(
          json,
          res.status === 409
            ? "Duplicate data found"
            : `Create ShopOwner failed (HTTP ${res.status})`
        );
        return toastError(message);
      }

      const ownerId = json?.data?._id as string | undefined;
      if (!ownerId) {
        return toastError("Owner created but missing _id");
      }

      const avatarOwner = await uploadOwnerAvatarById(ownerId);
      const finalOwner = avatarOwner || json.data;

      await uploadDocsById(ownerId);

      setCreatedOwner(finalOwner);
      setShops([]);
      resetOwnerForm();

      toastSuccess("ShopOwner created. Now add shops below");

      setTimeout(() => {
        scrollToShopSection();
      }, 150);
    } catch (error: any) {
      console.log("submitOwner error:", error);
      toastError(error?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

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
        return toastError(
          getApiErrorMessage(json, `Create Shop failed (HTTP ${res.status})`)
        );
      }

      setShops((prev) => [json.data, ...prev]);
      resetShopForm();
      setShopOpen(false);
      toastSuccess("Shop added");
    } catch (error: any) {
      console.log("submitShop error:", error);
      toastError(error?.message || "Network error");
    } finally {
      setShopSaving(false);
    }
  };

  const finishAndGoList = () => {
    router.replace("/master/shopOwners" as any);
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
          Create ShopOwner
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        style={{ backgroundColor: SURFACE }}
        contentContainerStyle={{ padding: 16, paddingBottom: 34 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
 

        {!createdOwner?._id ? (
          <View
            style={cardStyle}
            className="rounded-[28px] p-4 mb-4"
          >
            <Text className="text-slate-900 text-[18px] font-extrabold">
              Create ShopOwner
            </Text>

            <View className="items-center mt-4">
              <View
                className="w-24 h-24 rounded-full overflow-hidden items-center justify-center"
                style={{
                  backgroundColor: "#F1F5F9",
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                }}
              >
                {avatar?.uri ? (
                  <Image source={{ uri: avatar.uri }} style={{ width: 96, height: 96 }} />
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
                  disabled={saving}
                  primary
                />
                <ActionChip
                  label="Clear"
                  onPress={() => setAvatar(null)}
                  disabled={saving}
                />
              </View>

              <Text className="mt-2 text-[12px] text-slate-500">
                Avatar optional and uploaded after create
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
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            <Input
              label="Additional Mobile"
              value={phone2}
              onChangeText={setPhone2}
              placeholder="optional"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text className="mt-4 text-slate-900 font-extrabold">Shop Control</Text>
            <Pressable
              onPress={() => setScOpen(true)}
              style={selectStyle}
              className="mt-2"
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
            <Input
              label="PIN"
              value={pin}
              onChangeText={setPin}
              placeholder="Set PIN (e.g. 1234)"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />

            <Text className="mt-4 text-slate-900 font-extrabold">
              Documents (Optional)
            </Text>

            <DocPickerCard
              title="ID Proof"
              file={idProof}
              onChoose={() => pickDoc("idProof")}
              onClear={() => setIdProof(null)}
              disabled={saving}
            />

            <DocPickerCard
              title="GST Certificate"
              file={gstCertificate}
              onChoose={() => pickDoc("gstCertificate")}
              onClear={() => setGstCertificate(null)}
              disabled={saving}
            />

            <DocPickerCard
              title="Udyam Certificate"
              file={udyamCertificate}
              onChoose={() => pickDoc("udyamCertificate")}
              onClear={() => setUdyamCertificate(null)}
              disabled={saving}
            />

            <Text className="text-slate-500 text-[12px] mt-2">
              These documents upload after ShopOwner is created.
            </Text>

            <Pressable
              onPress={submitOwner}
              disabled={saving || docUploading}
              className="mt-5 rounded-[20px] overflow-hidden"
            >
              <LinearGradient
                colors={
                  saving || docUploading
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
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={cardStyle} className="rounded-[28px] p-4 mb-4">
            <Text className="text-slate-900 text-[18px] font-extrabold">
              ShopOwner Created
            </Text>

            <View className="flex-row items-center mt-3">
              <View
                className="w-12 h-12 rounded-full overflow-hidden items-center justify-center"
                style={{
                  backgroundColor: "#F1F5F9",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                {createdOwner.avatarUrl ? (
                  <Image
                    source={{ uri: createdOwner.avatarUrl }}
                    style={{ width: 48, height: 48 }}
                  />
                ) : (
                  <MaterialCommunityIcons name="account" size={24} color="#9CA3AF" />
                )}
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-slate-900 font-extrabold">
                  {createdOwner.username}
                </Text>
                <Text className="text-slate-500">{createdOwner.email}</Text>
              </View>
            </View>

            <View className="flex-row mt-4" style={{ gap: 12 }}>
              <Pressable
                onPress={resetAllForNewOwner}
                style={secondaryButtonStyle}
                className="flex-1 items-center"
              >
                <Text className="text-slate-900 font-extrabold">Create New Owner</Text>
              </Pressable>

              <Pressable
                onPress={finishAndGoList}
                className="flex-1 rounded-[18px] overflow-hidden"
              >
                <LinearGradient
                  colors={["#111827", "#0F172A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 14,
                    alignItems: "center",
                    borderRadius: 18,
                  }}
                >
                  <Text className="text-white font-extrabold">Go List</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}

        {!!createdOwner?._id && (
          <View
            ref={shopSectionRef}
            style={cardStyle}
            className="rounded-[28px] p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-900 text-[18px] font-extrabold">Shop</Text>
              <Pressable
                onPress={() => setShopOpen(true)}
                className="rounded-[14px] overflow-hidden"
              >
                <LinearGradient
                  colors={[BRAND, BRAND_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 }}
                >
                  <Text className="text-white font-extrabold">Add Shop</Text>
                </LinearGradient>
              </Pressable>
            </View>

            <Text className="mt-2 text-slate-600">
              Owner:{" "}
              <Text className="text-slate-900 font-extrabold">
                {createdOwner.name}
              </Text>
            </Text>

            <View
              className="mt-4 overflow-hidden rounded-[22px]"
              style={{
                borderWidth: 1,
                borderColor: "#E2E8F0",
                backgroundColor: "#FFFFFF",
              }}
            >
              <View className="flex-row bg-slate-50 border-b border-slate-200">
                <Text className="w-[60px] px-3 py-3 text-slate-700 font-extrabold">
                  S.No
                </Text>
                <Text className="flex-1 px-3 py-3 text-slate-700 font-extrabold">
                  Shop Name
                </Text>
                <Text className="flex-1 px-3 py-3 text-slate-700 font-extrabold">
                  Address
                </Text>
                <Text className="w-[80px] px-3 py-3 text-slate-700 font-extrabold">
                  Action
                </Text>
              </View>

              {shops.length === 0 ? (
                <View className="px-3 py-4">
                  <Text className="text-slate-500">No shops added yet</Text>
                </View>
              ) : (
                shops.map((s, i) => (
                  <View key={s._id} className="flex-row border-t border-slate-100">
                    <Text className="w-[60px] px-3 py-3 text-slate-900 font-extrabold">
                      {i + 1}
                    </Text>

                    <View className="flex-1 px-3 py-3">
                      <Text className="text-slate-900 font-extrabold">{s.name}</Text>
                      {!!s.frontImageUrl && (
                        <Image
                          source={{ uri: s.frontImageUrl }}
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 12,
                            marginTop: 6,
                          }}
                        />
                      )}
                    </View>

                    <View className="flex-1 px-3 py-3">
                      <Text className="text-slate-700">{formatAddress(s.address)}</Text>
                    </View>

                    <View className="w-[80px] px-3 py-3 items-center justify-center">
                      <Pressable
                        onPress={() => toastInfo("Edit/Delete next")}
                        className="bg-slate-100 rounded-xl px-3 py-2"
                      >
                        <Text className="text-slate-900 font-extrabold">...</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={btOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBtOpen(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white w-full rounded-3xl p-4">
            <Text className="text-lg font-extrabold text-slate-900">
              Select Business Types
            </Text>

            {BUSINESS_OPTIONS.map((x) => {
              const on = shopBusinessTypes.includes(x);
              return (
                <Pressable
                  key={x}
                  onPress={() => toggleBusiness(x)}
                  className="mt-3 flex-row items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200"
                >
                  <Text className="text-slate-900 font-bold">{x}</Text>
                  <MaterialCommunityIcons
                    name={on ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={22}
                    color={BRAND}
                  />
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setBtOpen(false)}
              className="mt-4 rounded-[18px] overflow-hidden"
            >
              <LinearGradient
                colors={[BRAND, BRAND_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 14, alignItems: "center", borderRadius: 18 }}
              >
                <Text className="text-white font-extrabold">Done</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                setShopBusinessTypes(["Retail"]);
                setBtOpen(false);
              }}
              style={secondaryButtonStyle}
              className="mt-3 items-center"
            >
              <Text className="text-slate-900 font-extrabold">
                Reset (Retail)
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={scOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScOpen(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white w-full rounded-3xl p-4">
            <Text className="text-lg font-extrabold text-slate-900">
              Select Shop Control
            </Text>

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

      <Modal
        visible={shopOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setShopOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                maxHeight: "88%",
              }}
            >
              <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
                <Text className="text-slate-900 text-lg font-extrabold">Add Shop</Text>
                <Pressable onPress={() => setShopOpen(false)} hitSlop={10}>
                  <MaterialCommunityIcons name="close" size={22} color="#111827" />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Input
                  label="Shop Name"
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="Shop name"
                />

                <Text className="mt-4 text-slate-900 font-extrabold">
                  Business Types
                </Text>
                <Pressable
                  onPress={() => setBtOpen(true)}
                  disabled={shopSaving}
                  style={selectStyle}
                  className="mt-2"
                >
                  <Text className="text-slate-900 font-extrabold">
                    {shopBusinessTypes.length
                      ? shopBusinessTypes.join(", ")
                      : "Select"}
                  </Text>
                  <Text className="text-[12px] text-slate-500 mt-1">
                    Select one or more
                  </Text>
                </Pressable>

                <Text className="mt-3 text-slate-900 font-extrabold">Shop Address</Text>
                <Input
                  label="State"
                  value={shopState}
                  onChangeText={setShopState}
                  placeholder="state"
                />
                <Input
                  label="District"
                  value={shopDistrict}
                  onChangeText={setShopDistrict}
                  placeholder="district"
                />
                <Input
                  label="Taluk"
                  value={shopTaluk}
                  onChangeText={setShopTaluk}
                  placeholder="taluk"
                />
                <Input
                  label="Area"
                  value={shopArea}
                  onChangeText={setShopArea}
                  placeholder="area"
                />
                <Input
                  label="Door No / Street"
                  value={shopStreet}
                  onChangeText={setShopStreet}
                  placeholder="door no, street"
                />
                <Input
                  label="Pincode"
                  value={shopPincode}
                  onChangeText={setShopPincode}
                  placeholder="pincode"
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <View className="items-center mt-3">
                  <View
                    className="w-24 h-24 rounded-[22px] overflow-hidden items-center justify-center"
                    style={{
                      backgroundColor: "#F1F5F9",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    {frontImage?.uri ? (
                      <Image source={{ uri: frontImage.uri }} style={{ width: 96, height: 96 }} />
                    ) : (
                      <MaterialCommunityIcons name="image" size={34} color="#9CA3AF" />
                    )}
                  </View>

                  <View className="flex-row mt-3" style={{ gap: 10 }}>
                    <ActionChip
                      label="Shop Photo"
                      onPress={pickShopFrontImage}
                      disabled={shopSaving}
                      primary
                    />
                    <ActionChip
                      label="Clear"
                      onPress={() => setFrontImage(null)}
                      disabled={shopSaving}
                    />
                  </View>

                  <Text className="mt-2 text-[12px] text-slate-500">
                    Shop front view photo optional
                  </Text>
                </View>

                <Pressable
                  onPress={submitShop}
                  disabled={shopSaving}
                  className="mt-4 rounded-[20px] overflow-hidden"
                >
                  <LinearGradient
                    colors={
                      shopSaving
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
                    {shopSaving ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator color="#fff" />
                        <Text className="ml-3 text-white font-extrabold">
                          Submitting...
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-white font-extrabold">Submit</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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

const selectStyle = {
  backgroundColor: "#F8FAFC",
  borderWidth: 1,
  borderColor: "#E2E8F0",
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 14,
} as const;

const secondaryButtonStyle = {
  backgroundColor: "#F1F5F9",
  borderWidth: 1,
  borderColor: "#E2E8F0",
  borderRadius: 18,
  paddingVertical: 14,
  paddingHorizontal: 16,
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
      <Text className="mt-1 text-white text-[18px] font-extrabold">
        {value}
      </Text>
    </View>
  );
}

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
      className="mt-3 rounded-[18px] p-3"
      style={{
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-slate-900 font-extrabold">{title}</Text>
          <Text className="text-slate-500 text-xs mt-1">
            {file ? file.name : "PDF/JPEG/PNG/WEBP"}
          </Text>
        </View>

        <View className="flex-row" style={{ gap: 10 }}>
          <ActionChip
            label={file ? "Replace" : "Choose"}
            onPress={onChoose}
            disabled={disabled}
            primary
          />
          <ActionChip
            label="Clear"
            onPress={onClear}
            disabled={disabled}
          />
        </View>
      </View>
    </View>
  );
}