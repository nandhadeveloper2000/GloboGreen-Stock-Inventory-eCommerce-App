// app/components/shopOwners/create.tsx

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
  name?: string;
  shopName?: string;
  businessType?: string | string[];
  shopAddress?: Address;
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
type ShopDocKey = "gstCertificate" | "udyamCertificate";

const BRAND = COLORS.primary || "#16BB05";
const BRAND_DARK = COLORS.primaryDark || "#119304";
const SURFACE = COLORS.background || "#F4F7FB";
const CARD = COLORS.card || "#FFFFFF";
const BORDER = COLORS.border || "#E2E8F0";
const HEADING = COLORS.heading || "#0F172A";
const TEXT = COLORS.primaryText || "#111827";
const SUBTEXT = COLORS.secondaryText || "#64748B";
const SOFT = COLORS.soft || "#F8FAFC";
const WHITE = COLORS.white || "#FFFFFF";
const SUCCESS = COLORS.success || "#16A34A";
const MUTED = COLORS.mutedText || "#94A3B8";

const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const BUSINESS_OPTIONS = ["Retail", "Wholesale"] as const;

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

function buildApiUrl(path?: string) {
  if (!path) return "";
  return `${baseURL}${path}`;
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

function getShopControlLabel(value: ShopControl) {
  return value === "ALL_IN_ONE_ECOMMERCE"
    ? "All In One Ecommerce"
    : "Inventory Only";
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

function formatAddress(a?: Address) {
  if (!a) return "";
  return [a.street, a.area, a.taluk, a.district, a.state, a.pincode]
    .filter(Boolean)
    .join(", ");
}

function getOwnerFromResponse(json: any): Owner | null {
  const owner = json?.data || json?.owner || null;
  if (!owner?._id) return null;
  return owner as Owner;
}

function getShopFromResponse(json: any): Shop | null {
  const shop = json?.data || json?.shop || json?.result || null;
  if (!shop?._id) return null;
  return shop as Shop;
}

function getShopDisplayName(shop?: Shop | null) {
  if (!shop) return "Shop";
  return shop.name || shop.shopName || "Shop";
}

function getImageFileMeta(
  asset: { uri: string; mimeType?: string | null },
  prefix: string
) {
  const uri = asset.uri;
  const isPng = uri.toLowerCase().endsWith(".png");
  const type = asset.mimeType || (isPng ? "image/png" : "image/jpeg");
  const name = `${prefix}_${Date.now()}.${isPng ? "png" : "jpg"}`;

  return { uri, type, name };
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  maxLength,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
  editable?: boolean;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text
        style={{
          color: HEADING,
          fontSize: 12,
          fontWeight: "700",
          marginBottom: 5,
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        editable={editable}
        style={{
          height: 44,
          borderRadius: 12,
          backgroundColor: SOFT,
          borderWidth: 1,
          borderColor: BORDER,
          paddingHorizontal: 12,
          paddingVertical: 8,
          color: TEXT,
          fontSize: 14,
          fontWeight: "500",
        }}
      />
    </View>
  );
}

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        marginTop: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ color: HEADING, fontSize: 13, fontWeight: "800" }}>
        {title}
      </Text>
      {action}
    </View>
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
        marginTop: 10,
        borderRadius: 14,
        backgroundColor: SOFT,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 12,
      }}
    >
      <Text style={{ color: HEADING, fontSize: 13, fontWeight: "800" }}>
        {title}
      </Text>

      <Text
        style={{
          marginTop: 5,
          color: file ? TEXT : SUBTEXT,
          fontSize: 12,
          fontWeight: file ? "700" : "500",
        }}
        numberOfLines={2}
      >
        {file ? file.name : "No file selected"}
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <Pressable
          onPress={onChoose}
          disabled={disabled}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: BRAND,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Text style={{ color: WHITE, fontWeight: "800", fontSize: 13 }}>
            {file ? "Replace" : "Choose"}
          </Text>
        </Pressable>

        {!!file && (
          <Pressable
            onPress={onClear}
            disabled={disabled}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: WHITE,
              borderWidth: 1,
              borderColor: BORDER,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <Text style={{ color: TEXT, fontWeight: "800", fontSize: 13 }}>
              Clear
            </Text>
          </Pressable>
        )}
      </View>
    </View>
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
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(2,6,23,0.35)",
          justifyContent: "center",
          padding: 18,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: WHITE,
            borderRadius: 18,
            padding: 16,
          }}
        >
          <Text style={{ color: HEADING, fontSize: 17, fontWeight: "900" }}>
            Select Shop Control
          </Text>

          {SHOPCONTROL_OPTIONS.map((x) => {
            const active = x.value === value;

            return (
              <Pressable
                key={x.value}
                onPress={() => onSelect(x.value)}
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: active ? BRAND : BORDER,
                  backgroundColor: active ? "rgba(22,187,5,0.08)" : SOFT,
                }}
              >
                <Text
                  style={{
                    color: HEADING,
                    fontWeight: active ? "800" : "700",
                    fontSize: 13,
                  }}
                >
                  {x.label}
                </Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BusinessChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? BRAND : BORDER,
        backgroundColor: active ? "rgba(22,187,5,0.08)" : WHITE,
      }}
    >
      <Text
        style={{
          color: active ? BRAND_DARK : TEXT,
          fontSize: 12,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <View style={{ marginTop: 6 }}>
      <Text style={{ color: SUBTEXT, fontSize: 11, fontWeight: "700" }}>
        {label}
      </Text>
      <Text
        style={{
          color: TEXT,
          fontSize: 13,
          fontWeight: "600",
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function CreateShopOwnerScreen() {
  const router = useRouter();
  const authCtx = useAuth();

  const token = authCtx?.accessToken || authCtx?.token || "";

  const scrollRef = useRef<ScrollView>(null);
  const shopSectionRef = useRef<View>(null);

  const [saving, setSaving] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);

  const [createdOwner, setCreatedOwner] = useState<Owner | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);

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

  const [shopOpen, setShopOpen] = useState(false);
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

  const [frontImage, setFrontImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [shopGstCertificate, setShopGstCertificate] =
    useState<PickedDoc | null>(null);
  const [shopUdyamCertificate, setShopUdyamCertificate] =
    useState<PickedDoc | null>(null);

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

  const busyOwner = saving || docUploading;
  const busyShop = shopSaving;

  const scrollToShopSection = () => {
    setTimeout(() => {
      shopSectionRef.current?.measureLayout(
        scrollRef.current as any,
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: true });
        },
        () => {}
      );
    }, 120);
  };

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

  const pickShopFrontImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      toastInfo("Allow gallery permission");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled) {
      const picked = result.assets?.[0];
      if (picked?.uri) setFrontImage(picked);
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

  const pickShopDoc = async (key: ShopDocKey) => {
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

    const doc: PickedDoc = {
      uri: asset.uri,
      name: asset.name || `${key}_${Date.now()}`,
      mimeType: asset.mimeType || "application/octet-stream",
      size: asset.size,
    };

    if (key === "gstCertificate") setShopGstCertificate(doc);
    if (key === "udyamCertificate") setShopUdyamCertificate(doc);
  };

  const resetOwnerForm = () => {
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

  const resetShopForm = () => {
    setShopName("");
    setShopState("");
    setShopDistrict("");
    setShopTaluk("");
    setShopArea("");
    setShopStreet("");
    setShopPincode("");
    setShopBusinessTypes(["Retail"]);
    setFrontImage(null);
    setShopGstCertificate(null);
    setShopUdyamCertificate(null);
  };

  const resetAllForNewOwner = () => {
    setCreatedOwner(null);
    setShops([]);
    resetOwnerForm();
    resetShopForm();
    setShopOpen(false);
  };

  const toggleBusiness = (value: string) => {
    setShopBusinessTypes((prev) => {
      if (prev.includes(value)) {
        const next = prev.filter((v) => v !== value);
        return next.length ? next : [value];
      }
      return [...prev, value];
    });
  };

  const uploadOwnerAvatarById = async (ownerId: string) => {
    const endpoint = SummaryApi?.shopowner_admin_avatar_upload?.url?.(ownerId);
    const method = SummaryApi?.shopowner_admin_avatar_upload?.method || "POST";

    if (!avatar?.uri || !endpoint) return null;

    try {
      const fileMeta = getImageFileMeta(avatar, "owner");
      const form = new FormData();
      form.append("avatar", fileMeta as any);

      const res = await fetch(buildApiUrl(endpoint), {
        method,
        headers: headersAuthOnly,
        body: form,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastInfo("Owner created, but avatar upload failed");
        return null;
      }

      return json?.data || json?.owner || null;
    } catch {
      toastInfo("Owner created, but avatar upload failed");
      return null;
    }
  };

  const uploadOwnerDocsById = async (ownerId: string) => {
    const endpoint = SummaryApi?.shopowner_admin_docs_upload?.url?.(ownerId);
    const method = SummaryApi?.shopowner_admin_docs_upload?.method || "POST";

    if (!idProof) return true;
    if (!endpoint) {
      toastInfo("Owner docs upload API missing");
      return false;
    }

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

      const res = await fetch(buildApiUrl(endpoint), {
        method,
        headers: headersAuthOnly,
        body: form,
      });

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

  const uploadShopDocsById = async (shopId: string) => {
    const endpoint = SummaryApi?.shop_docs_upload_admin?.url?.(shopId);
    const method = SummaryApi?.shop_docs_upload_admin?.method || "POST";

    if (!shopGstCertificate && !shopUdyamCertificate) return true;
    if (!endpoint) {
      toastInfo("Shop docs upload API missing");
      return false;
    }

    try {
      const form = new FormData();

      if (shopGstCertificate) {
        form.append(
          "gstCertificate",
          {
            uri: shopGstCertificate.uri,
            name: shopGstCertificate.name,
            type: shopGstCertificate.mimeType,
          } as any
        );
      }

      if (shopUdyamCertificate) {
        form.append(
          "udyamCertificate",
          {
            uri: shopUdyamCertificate.uri,
            name: shopUdyamCertificate.name,
            type: shopUdyamCertificate.mimeType,
          } as any
        );
      }

      const res = await fetch(buildApiUrl(endpoint), {
        method,
        headers: headersAuthOnly,
        body: form,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastInfo("Shop created, but GST/Udyam upload failed");
        return false;
      }

      return true;
    } catch {
      toastInfo("Shop created, but GST/Udyam upload failed");
      return false;
    }
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

    const ownerCreateUrl = SummaryApi?.shopowner_create?.url;
    const ownerCreateMethod = SummaryApi?.shopowner_create?.method || "POST";

    if (!ownerCreateUrl) {
      toastError("ShopOwner create API missing in SummaryApi");
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
        state: stateName.trim() || undefined,
        district: district.trim() || undefined,
        taluk: taluk.trim() || undefined,
        area: area.trim() || undefined,
        street: street.trim() || undefined,
        pincode: pincode.trim() || undefined,
      };

      const res = await fetch(buildApiUrl(ownerCreateUrl), {
        method: ownerCreateMethod,
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

      const created = getOwnerFromResponse(json);

      if (!created?._id) {
        toastError("Owner created but missing _id");
        return;
      }

      const avatarOwner = await uploadOwnerAvatarById(created._id);
      const finalOwner = (avatarOwner || created) as Owner;

      await uploadOwnerDocsById(created._id);

      setCreatedOwner(finalOwner);
      setShops([]);
      resetOwnerForm();
      toastSuccess("Shop owner created. Now add shop below");

      scrollToShopSection();
    } catch (error: any) {
      toastError(error?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const submitShop = async () => {
    if (!createdOwner?._id) {
      toastError("Create ShopOwner first");
      return;
    }

    const nm = shopName.trim();

    if (!nm) {
      toastInfo("Enter shop name");
      return;
    }

    const endpoint = SummaryApi?.master_create_shop?.url;
    const method = SummaryApi?.master_create_shop?.method || "POST";

    if (!endpoint) {
      toastError("Shop create API missing in SummaryApi");
      return;
    }

    try {
      setShopSaving(true);

      const form = new FormData();

      form.append("name", nm);
      form.append("shopName", nm);
      form.append("ownerId", createdOwner._id);
      form.append("shopOwnerId", createdOwner._id);

      const businessValue =
        shopBusinessTypes.length === 1
          ? shopBusinessTypes[0]
          : JSON.stringify(shopBusinessTypes);

      form.append("businessType", businessValue);

      if (shopState.trim()) form.append("state", shopState.trim());
      if (shopDistrict.trim()) form.append("district", shopDistrict.trim());
      if (shopTaluk.trim()) form.append("taluk", shopTaluk.trim());
      if (shopArea.trim()) form.append("area", shopArea.trim());
      if (shopStreet.trim()) form.append("street", shopStreet.trim());
      if (shopPincode.trim()) form.append("pincode", shopPincode.trim());

      if (frontImage?.uri) {
        const fileMeta = getImageFileMeta(frontImage, "shop");
        form.append("frontImage", fileMeta as any);
      }

      const res = await fetch(buildApiUrl(endpoint), {
        method,
        headers: headersAuthOnly,
        body: form,
      });

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        toastError(
          getApiErrorMessage(json, `Create Shop failed (HTTP ${res.status})`)
        );
        return;
      }

      const createdShop = getShopFromResponse(json);

      if (!createdShop?._id) {
        toastError("Shop created but missing _id");
        return;
      }

      await uploadShopDocsById(String(createdShop._id));

      setShops((prev) => [createdShop, ...prev]);
      resetShopForm();
      setShopOpen(false);
      toastSuccess("Shop created successfully");
    } catch (error: any) {
      toastError(error?.message || "Network error");
    } finally {
      setShopSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SURFACE }} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      <View
        style={{
          backgroundColor: WHITE,
          paddingHorizontal: 14,
          paddingVertical: 9,
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
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color="#111827"
          />
        </Pressable>

        <Text style={{ color: HEADING, fontSize: 17, fontWeight: "800" }}>
          Create Shop Owner
        </Text>

        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!createdOwner?._id ? (
            <View
              style={{
                backgroundColor: CARD,
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: BORDER,
              }}
            >
              <Text style={{ color: HEADING, fontSize: 17, fontWeight: "800" }}>
                Owner Information
              </Text>

              <View style={{ alignItems: "center", marginTop: 14 }}>
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
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
                      style={{ width: 88, height: 88 }}
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
                        name="account-outline"
                        size={32}
                        color={BRAND}
                      />
                    </LinearGradient>
                  )}
                </View>

                <Pressable
                  onPress={pickAvatar}
                  disabled={busyOwner}
                  style={{
                    marginTop: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderRadius: 12,
                    backgroundColor: SOFT,
                    borderWidth: 1,
                    borderColor: BORDER,
                    opacity: busyOwner ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{ color: TEXT, fontWeight: "700", fontSize: 13 }}
                  >
                    {avatar?.uri ? "Change Photo" : "Upload Photo"}
                  </Text>
                </Pressable>
              </View>

              <Input
                label="Owner Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter owner name"
              />

              <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                autoCapitalize="none"
              />

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="PIN"
                value={pin}
                onChangeText={setPin}
                placeholder="4 to 8 digit PIN"
                keyboardType="number-pad"
                maxLength={8}
              />

              <Input
                label="WhatsApp / Mobile"
                value={mobile}
                onChangeText={setMobile}
                placeholder="10 digit number"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Input
                label="Additional Mobile"
                value={additionalNumber}
                onChangeText={setAdditionalNumber}
                placeholder="Optional"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text
                style={{
                  marginTop: 10,
                  color: HEADING,
                  fontSize: 12,
                  fontWeight: "700",
                  marginBottom: 5,
                }}
              >
                Shop Control
              </Text>

              <Pressable
                onPress={() => setScOpen(true)}
                disabled={busyOwner}
                style={{
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: SOFT,
                  borderWidth: 1,
                  borderColor: BORDER,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: busyOwner ? 0.6 : 1,
                }}
              >
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: "500" }}>
                  {getShopControlLabel(shopControl)}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={18}
                  color={SUBTEXT}
                />
              </Pressable>

              <Input
                label="State"
                value={stateName}
                onChangeText={setStateName}
                placeholder="State"
              />

              <Input
                label="District"
                value={district}
                onChangeText={setDistrict}
                placeholder="District"
              />

              <Input
                label="Taluk"
                value={taluk}
                onChangeText={setTaluk}
                placeholder="Taluk"
              />

              <Input
                label="Area"
                value={area}
                onChangeText={setArea}
                placeholder="Area"
              />

              <Input
                label="Door No / Street"
                value={street}
                onChangeText={setStreet}
                placeholder="Door no, street"
              />

              <Input
                label="Pincode"
                value={pincode}
                onChangeText={setPincode}
                placeholder="Pincode"
                keyboardType="number-pad"
                maxLength={6}
              />

              <SectionTitle title="Documents" />

              <DocPickerCard
                title="ID Proof"
                file={idProof}
                onChoose={pickOwnerDoc}
                onClear={() => setIdProof(null)}
                disabled={busyOwner}
              />

              <Pressable
                onPress={submitOwner}
                disabled={busyOwner}
                style={{
                  marginTop: 16,
                  borderRadius: 14,
                  overflow: "hidden",
                  opacity: busyOwner ? 0.8 : 1,
                }}
              >
                <LinearGradient
                  colors={
                    busyOwner
                      ? ["rgba(22,187,5,0.6)", "rgba(11,122,34,0.6)"]
                      : [BRAND, BRAND_DARK]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    minHeight: 46,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {busyOwner ? (
                    <>
                      <ActivityIndicator color={WHITE} size="small" />
                      <Text
                        style={{
                          color: WHITE,
                          fontWeight: "800",
                          fontSize: 14,
                          marginLeft: 8,
                        }}
                      >
                        Saving...
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="check-circle-outline"
                        size={18}
                        color={WHITE}
                      />
                      <Text
                        style={{
                          color: WHITE,
                          fontWeight: "800",
                          fontSize: 14,
                          marginLeft: 8,
                        }}
                      >
                        Create Shop Owner
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: CARD,
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: BORDER,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text
                    style={{ color: HEADING, fontSize: 16, fontWeight: "800" }}
                  >
                    Owner Created
                  </Text>
                  <SummaryRow label="Name" value={createdOwner.name} />
                  <SummaryRow label="Username" value={createdOwner.username} />
                  <SummaryRow label="Email" value={createdOwner.email} />
                </View>

                <Pressable
                  onPress={resetAllForNewOwner}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: SOFT,
                  }}
                >
                  <Text
                    style={{ color: TEXT, fontSize: 12, fontWeight: "700" }}
                  >
                    New Owner
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {!!createdOwner?._id && (
            <View
              ref={shopSectionRef}
              style={{
                marginTop: 14,
                backgroundColor: CARD,
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: BORDER,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: HEADING, fontSize: 17, fontWeight: "800" }}>
                  Shop Information
                </Text>

                {!shopOpen ? (
                  <Pressable
                    onPress={() => setShopOpen(true)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: SOFT,
                      borderWidth: 1,
                      borderColor: BORDER,
                    }}
                  >
                    <Text
                      style={{ color: TEXT, fontSize: 12, fontWeight: "700" }}
                    >
                      Add Shop
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {shopOpen ? (
                <>
                  <Input
                    label="Shop Name"
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder="Enter shop name"
                  />

                  <Input
                    label="State"
                    value={shopState}
                    onChangeText={setShopState}
                    placeholder="State"
                  />

                  <Input
                    label="District"
                    value={shopDistrict}
                    onChangeText={setShopDistrict}
                    placeholder="District"
                  />

                  <Input
                    label="Taluk"
                    value={shopTaluk}
                    onChangeText={setShopTaluk}
                    placeholder="Taluk"
                  />

                  <Input
                    label="Area"
                    value={shopArea}
                    onChangeText={setShopArea}
                    placeholder="Area"
                  />

                  <Input
                    label="Door No / Street"
                    value={shopStreet}
                    onChangeText={setShopStreet}
                    placeholder="Door no, street"
                  />

                  <Input
                    label="Pincode"
                    value={shopPincode}
                    onChangeText={setShopPincode}
                    placeholder="Pincode"
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  <SectionTitle title="Business Type" />
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    {BUSINESS_OPTIONS.map((item) => (
                      <BusinessChip
                        key={item}
                        label={item}
                        active={shopBusinessTypes.includes(item)}
                        onPress={() => toggleBusiness(item)}
                      />
                    ))}
                  </View>

                  <SectionTitle title="Shop Front Image" />
                  <Pressable
                    onPress={pickShopFrontImage}
                    disabled={busyShop}
                    style={{
                      marginTop: 10,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: BORDER,
                      backgroundColor: SOFT,
                      padding: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {frontImage?.uri ? (
                      <>
                        <Image
                          source={{ uri: frontImage.uri }}
                          style={{
                            width: "100%",
                            height: 140,
                            borderRadius: 12,
                            backgroundColor: "#E5E7EB",
                          }}
                          resizeMode="cover"
                        />
                        <Text
                          style={{
                            marginTop: 8,
                            color: TEXT,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Change Front Image
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="image-plus-outline"
                          size={28}
                          color={SUBTEXT}
                        />
                        <Text
                          style={{
                            marginTop: 6,
                            color: TEXT,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          Upload Front Image
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <SectionTitle title="Shop Documents" />

                  <DocPickerCard
                    title="GST Certificate"
                    file={shopGstCertificate}
                    onChoose={() => pickShopDoc("gstCertificate")}
                    onClear={() => setShopGstCertificate(null)}
                    disabled={busyShop}
                  />

                  <DocPickerCard
                    title="Udyam Certificate"
                    file={shopUdyamCertificate}
                    onChoose={() => pickShopDoc("udyamCertificate")}
                    onClear={() => setShopUdyamCertificate(null)}
                    disabled={busyShop}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 16,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        resetShopForm();
                        setShopOpen(false);
                      }}
                      disabled={busyShop}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: BORDER,
                        backgroundColor: WHITE,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: busyShop ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{ color: TEXT, fontWeight: "700", fontSize: 13 }}
                      >
                        Cancel
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={submitShop}
                      disabled={busyShop}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        borderRadius: 12,
                        overflow: "hidden",
                        opacity: busyShop ? 0.8 : 1,
                      }}
                    >
                      <LinearGradient
                        colors={
                          busyShop
                            ? ["rgba(22,187,5,0.6)", "rgba(11,122,34,0.6)"]
                            : [BRAND, BRAND_DARK]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                        }}
                      >
                        {busyShop ? (
                          <>
                            <ActivityIndicator color={WHITE} size="small" />
                            <Text
                              style={{
                                color: WHITE,
                                fontSize: 13,
                                fontWeight: "800",
                                marginLeft: 8,
                              }}
                            >
                              Saving...
                            </Text>
                          </>
                        ) : (
                          <>
                            <MaterialCommunityIcons
                              name="store-plus-outline"
                              size={18}
                              color={WHITE}
                            />
                            <Text
                              style={{
                                color: WHITE,
                                fontSize: 13,
                                fontWeight: "800",
                                marginLeft: 8,
                              }}
                            >
                              Create Shop
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text
                  style={{
                    marginTop: 10,
                    color: SUBTEXT,
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  Add one or more shops for this owner.
                </Text>
              )}
            </View>
          )}

          {!!shops.length && (
            <View
              style={{
                marginTop: 14,
                backgroundColor: CARD,
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: BORDER,
              }}
            >
              <Text style={{ color: HEADING, fontSize: 17, fontWeight: "800" }}>
                Added Shops
              </Text>

              {shops.map((shop, index) => (
                <View
                  key={shop._id || `${shop.shopName}-${index}`}
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: SOFT,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{ color: HEADING, fontSize: 14, fontWeight: "800" }}
                  >
                    {index + 1}. {getShopDisplayName(shop)}
                  </Text>

                  <SummaryRow
                    label="Business Type"
                    value={
                      Array.isArray(shop.businessType)
                        ? shop.businessType.join(", ")
                        : shop.businessType
                    }
                  />

                  <SummaryRow
                    label="Address"
                    value={formatAddress(shop.shopAddress || shop.address)}
                  />
                </View>
              ))}
            </View>
          )}
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