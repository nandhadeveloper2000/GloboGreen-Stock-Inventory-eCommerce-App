// app/master/managers/shops/edit.tsx
import  { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";
import { COLORS } from "../../constants/colors";

const apiUrl = (path: string) => `${baseURL}${path}`;

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const toastInfo = (msg: string) =>
  Toast.show({ type: "info", text1: "Info", text2: msg });

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

type PickedDoc = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

type ShopDocKey = "gstCertificate" | "udyamCertificate";

type ShopData = {
  _id: string;
  name?: string;
  businessType?: string;
  shopAddress?: Address;
  frontImageUrl?: string;
  frontImagePublicId?: string;
  gstCertificate?: DocInfo;
  udyamCertificate?: DocInfo;
  isActive?: boolean;
  shopOwnerAccountId?:
    | string
    | {
        _id?: string;
        name?: string;
        email?: string;
      };
  createdAt?: string;
  updatedAt?: string;
};

const DOC_TYPES = ["application/pdf", "image/*"];

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        marginTop: 16,
        backgroundColor: COLORS.card,
        borderRadius: 28,
        padding: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 18,
        elevation: 3,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.heading,
              fontSize: 18,
              fontWeight: "900",
            }}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: 12,
                marginTop: 2,
                fontWeight: "500",
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {children}
    </View>
  );
}

function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          color: COLORS.secondaryText,
          fontWeight: "800",
          fontSize: 12,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 56,
          borderRadius: 18,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          paddingHorizontal: 14,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.labelText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={{
            flex: 1,
            marginLeft: 12,
            color: COLORS.primaryText,
            fontSize: 15,
            fontWeight: "600",
            paddingVertical: 14,
          }}
        />
      </View>
    </View>
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
  current?: DocInfo;
  picked?: PickedDoc | null;
  onPick: () => void;
  onClearPick: () => void;
  onRemoveServer: () => void;
  saving: boolean;
  docsUploading: boolean;
}) {
  const hasServer = !!current?.url;
  const fileKb = current?.bytes
    ? `${Math.round((current.bytes || 0) / 1024)} KB`
    : "";

  return (
    <View
      style={{
        marginTop: 14,
        borderRadius: 22,
        backgroundColor: COLORS.soft,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={
              picked
                ? "file-check-outline"
                : hasServer
                ? "file-document-outline"
                : "file-outline"
            }
            size={24}
            color={picked ? COLORS.success : COLORS.primary}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: COLORS.heading,
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>

          {picked ? (
            <Text
              style={{
                color: COLORS.primaryText,
                fontSize: 13,
                marginTop: 4,
                fontWeight: "600",
              }}
            >
              Selected: {picked.name}
            </Text>
          ) : hasServer ? (
            <Text
              style={{
                color: COLORS.primaryText,
                fontSize: 13,
                marginTop: 4,
                fontWeight: "600",
              }}
            >
              Uploaded: {current?.fileName || "document"}
            </Text>
          ) : (
            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: 13,
                marginTop: 4,
                fontWeight: "500",
              }}
            >
              No document uploaded
            </Text>
          )}

          {!!hasServer && (
            <Text
              style={{
                color: COLORS.mutedText,
                fontSize: 11,
                marginTop: 4,
                fontWeight: "600",
              }}
            >
              {current?.mimeType || ""}
              {fileKb ? ` • ${fileKb}` : ""}
            </Text>
          )}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        <Pressable
          onPress={onPick}
          disabled={saving || docsUploading}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderRadius: 14,
            backgroundColor: COLORS.primary,
            opacity: saving || docsUploading ? 0.65 : 1,
          }}
        >
          <Text style={{ color: COLORS.white, fontWeight: "900", fontSize: 12 }}>
            {picked ? "Replace" : "Choose"}
          </Text>
        </Pressable>

        {!!picked && (
          <Pressable
            onPress={onClearPick}
            disabled={saving || docsUploading}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderRadius: 14,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.border,
              opacity: saving || docsUploading ? 0.65 : 1,
            }}
          >
            <Text
              style={{
                color: COLORS.primaryText,
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              Clear
            </Text>
          </Pressable>
        )}

        {hasServer && (
          <Pressable
            onPress={onRemoveServer}
            disabled={saving || docsUploading}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderRadius: 14,
              backgroundColor: COLORS.danger,
              opacity: saving || docsUploading ? 0.65 : 1,
            }}
          >
            <Text style={{ color: COLORS.white, fontWeight: "900", fontSize: 12 }}>
              Remove
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function ShopEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [frontUploading, setFrontUploading] = useState(false);
  const [docsUploading, setDocsUploading] = useState(false);

  const [data, setData] = useState<ShopData | null>(null);

  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [pincode, setPincode] = useState("");

  const [newFrontImage, setNewFrontImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

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

  const setFormFromData = (d: ShopData) => {
    setName(d?.name ?? "");
    setBusinessType(d?.businessType ?? "");
    setStateName(d?.shopAddress?.state ?? "");
    setDistrict(d?.shopAddress?.district ?? "");
    setTaluk(d?.shopAddress?.taluk ?? "");
    setArea(d?.shopAddress?.area ?? "");
    setStreet(d?.shopAddress?.street ?? "");
    setPincode(d?.shopAddress?.pincode ?? "");
  };

  const fetchDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const res = await fetch(apiUrl(SummaryApi.master_get_shop.url(String(id))), {
        method: SummaryApi.master_get_shop.method,
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

      const d = (json.data || null) as ShopData | null;
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

  const pickFrontImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toastInfo("Allow gallery permission");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.85,
    });

    if (!result.canceled) {
      const a = result.assets?.[0];
      if (a?.uri) setNewFrontImage(a);
    }
  };

  const pickDoc = async (key: ShopDocKey) => {
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

    if (key === "gstCertificate") setGstCertificate(doc);
    if (key === "udyamCertificate") setUdyamCertificate(doc);
  };

  const clearPickedDocs = () => {
    setGstCertificate(null);
    setUdyamCertificate(null);
  };

  const submitUpdate = async () => {
    if (!id) return;

    const shopName = name.trim();
    if (!shopName) return toastInfo("Enter shop name");

    try {
      setSaving(true);

      const res = await fetch(apiUrl(SummaryApi.master_update_shop.url(String(id))), {
        method: SummaryApi.master_update_shop.method,
        headers: headersJson,
        body: JSON.stringify({
          name: shopName,
          businessType: businessType.trim(),
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

      toastSuccess("Shop updated successfully");
      await fetchDetails();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch {
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const uploadFrontImage = async () => {
    if (!id) return;
    if (!newFrontImage?.uri) return toastInfo("Choose front image first");

    try {
      setFrontUploading(true);

      const uri = newFrontImage.uri;
      const isPng = uri.toLowerCase().endsWith(".png");
      const mime =
        (newFrontImage as any).mimeType || (isPng ? "image/png" : "image/jpeg");
      const filename = `shop_front_${Date.now()}.${isPng ? "png" : "jpg"}`;

      const form = new FormData();
      form.append("front", { uri, name: filename, type: mime } as any);

      const res = await fetch(
        apiUrl(SummaryApi.shop_front_upload_admin.url(String(id))),
        {
          method: SummaryApi.shop_front_upload_admin.method,
          headers: headersAuthOnly,
          body: form,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || "Front image upload failed");
      }

      toastSuccess("Front image updated");
      setNewFrontImage(null);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setFrontUploading(false);
    }
  };

  const removeFrontImage = async () => {
    if (!id) return;

    try {
      setFrontUploading(true);

      const res = await fetch(
        apiUrl(SummaryApi.shop_front_remove_admin.url(String(id))),
        {
          method: SummaryApi.shop_front_remove_admin.method,
          headers: headersAuthOnly,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || "Remove failed");
      }

      toastSuccess("Front image removed");
      setNewFrontImage(null);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setFrontUploading(false);
    }
  };

  const uploadDocs = async () => {
    if (!id) return;

    if (!gstCertificate && !udyamCertificate) {
      return toastInfo("Select at least one document");
    }

    try {
      setDocsUploading(true);

      const form = new FormData();

      if (gstCertificate) {
        form.append(
          "gstCertificate",
          {
            uri: gstCertificate.uri,
            name: gstCertificate.name,
            type: gstCertificate.mimeType,
          } as any
        );
      }

      if (udyamCertificate) {
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
        apiUrl(SummaryApi.shop_docs_upload_admin.url(String(id))),
        {
          method: SummaryApi.shop_docs_upload_admin.method,
          headers: headersAuthOnly,
          body: form,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || "Document upload failed");
      }

      toastSuccess("Shop documents updated");
      clearPickedDocs();
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setDocsUploading(false);
    }
  };

  const removeDoc = async (key: ShopDocKey) => {
    if (!id) return;

    try {
      setDocsUploading(true);

      const res = await fetch(
        apiUrl(SummaryApi.shop_docs_remove_admin.url(String(id), key)),
        {
          method: SummaryApi.shop_docs_remove_admin.method,
          headers: headersAuthOnly,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        return toastError(json?.message || "Remove failed");
      }

      toastSuccess(`${key} removed`);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setDocsUploading(false);
    }
  };

  const heroFrontImage = newFrontImage?.uri || data?.frontImageUrl || "";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={["top"]}
    >
      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 999,
              backgroundColor: COLORS.card,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <ActivityIndicator color={COLORS.primary} />
          </View>
          <Text
            style={{
              marginTop: 14,
              color: COLORS.secondaryText,
              fontWeight: "700",
            }}
          >
            Loading shop details...
          </Text>
        </View>
      ) : !data ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 999,
              backgroundColor: COLORS.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="store-remove-outline"
              size={38}
              color={COLORS.mutedText}
            />
          </View>
          <Text
            style={{
              marginTop: 14,
              fontSize: 19,
              fontWeight: "900",
              color: COLORS.heading,
            }}
          >
            No data found
          </Text>
          <Text
            style={{
              marginTop: 6,
              textAlign: "center",
              color: COLORS.secondaryText,
            }}
          >
            This shop record is unavailable or may have been removed.
          </Text>
        </View>
      ) : (
        <>
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: "center",
                justifyContent: "center",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={26}
                color={COLORS.heading}
              />
            </Pressable>

            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 12 }}>
              <Text
                style={{
                  color: COLORS.heading,
                  fontSize: 18,
                  fontWeight: "900",
                }}
              >
                Edit Shop
              </Text>
              <Text
                style={{
                  color: COLORS.secondaryText,
                  fontSize: 12,
                  marginTop: 2,
                  fontWeight: "600",
                }}
              >
                Admin shop editor
              </Text>
            </View>

            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: COLORS.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="store-edit-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 34,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <SectionCard
              title="Front Image Management"
              subtitle="Choose, upload, or remove the shop front image"
              icon="image-outline"
            >
              <View style={{ alignItems: "center", marginTop: 6 }}>
                <View
                  style={{
                    width: "100%",
                    height: 180,
                    borderRadius: 24,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: COLORS.soft,
                    borderWidth: 2,
                    borderColor: COLORS.border,
                  }}
                >
                  {heroFrontImage ? (
                    <Image
                      source={{ uri: heroFrontImage }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="storefront-outline"
                      size={56}
                      color={COLORS.mutedText}
                    />
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 18,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <Pressable
                    onPress={pickFrontImage}
                    disabled={frontUploading || saving}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: COLORS.primary,
                      opacity: frontUploading || saving ? 0.65 : 1,
                    }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: "900" }}>
                      Choose Front Image
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={uploadFrontImage}
                    disabled={frontUploading || saving || !newFrontImage?.uri}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: COLORS.heading,
                      opacity:
                        frontUploading || saving || !newFrontImage?.uri ? 0.45 : 1,
                    }}
                  >
                    {frontUploading ? (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <ActivityIndicator color={COLORS.white} />
                        <Text
                          style={{
                            marginLeft: 8,
                            color: COLORS.white,
                            fontWeight: "900",
                          }}
                        >
                          Uploading
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: COLORS.white, fontWeight: "900" }}>
                        Upload Front Image
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={removeFrontImage}
                    disabled={frontUploading || saving}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: COLORS.danger,
                      opacity: frontUploading || saving ? 0.65 : 1,
                    }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: "900" }}>
                      Remove
                    </Text>
                  </Pressable>
                </View>

                <Text
                  style={{
                    marginTop: 12,
                    color: COLORS.secondaryText,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  Uses admin front-image endpoints: /shops/:id/front/admin
                </Text>
              </View>
            </SectionCard>

            <SectionCard
              title="Basic Information"
              subtitle="Core shop details used in admin and owner views"
              icon="form-select"
            >
              <AppInput
                label="Shop Name"
                value={name}
                onChangeText={setName}
                placeholder="Shop name"
                icon="store-outline"
              />

              <AppInput
                label="Business Type"
                value={businessType}
                onChangeText={setBusinessType}
                placeholder="Bike service, grocery, pharmacy..."
                icon="briefcase-outline"
              />
            </SectionCard>

            <SectionCard
              title="Address Information"
              subtitle="Operational location and service area details"
              icon="map-marker-outline"
            >
              <AppInput
                label="State"
                value={stateName}
                onChangeText={setStateName}
                placeholder="state"
                icon="map-outline"
              />

              <AppInput
                label="District"
                value={district}
                onChangeText={setDistrict}
                placeholder="district"
                icon="office-building-marker-outline"
              />

              <AppInput
                label="Taluk"
                value={taluk}
                onChangeText={setTaluk}
                placeholder="taluk"
                icon="city-variant-outline"
              />

              <AppInput
                label="Area"
                value={area}
                onChangeText={setArea}
                placeholder="area"
                icon="map-marker-radius-outline"
              />

              <AppInput
                label="Door No / Street"
                value={street}
                onChangeText={setStreet}
                placeholder="door no, street"
                icon="road-variant"
              />

              <AppInput
                label="Pincode"
                value={pincode}
                onChangeText={setPincode}
                placeholder="pincode"
                icon="mailbox-outline"
                keyboardType="number-pad"
              />

              <Pressable
                onPress={submitUpdate}
                disabled={saving || docsUploading || frontUploading}
                style={{
                  marginTop: 22,
                  minHeight: 56,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.success,
                  opacity: saving || docsUploading || frontUploading ? 0.65 : 1,
                  flexDirection: "row",
                }}
              >
                {saving ? (
                  <>
                    <ActivityIndicator color={COLORS.white} />
                    <Text
                      style={{
                        marginLeft: 10,
                        color: COLORS.white,
                        fontWeight: "900",
                        fontSize: 15,
                      }}
                    >
                      Saving Changes...
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="content-save-outline"
                      size={20}
                      color={COLORS.white}
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: COLORS.white,
                        fontWeight: "900",
                        fontSize: 15,
                      }}
                    >
                      Save Changes
                    </Text>
                  </>
                )}
              </Pressable>
            </SectionCard>

            <SectionCard
              title="Shop Documents"
              subtitle="Admin-managed GST and Udyam documents"
              icon="file-document-multiple-outline"
            >
              <DocCard
                title="GST Certificate"
                current={data.gstCertificate}
                picked={gstCertificate}
                onPick={() => pickDoc("gstCertificate")}
                onClearPick={() => setGstCertificate(null)}
                onRemoveServer={() => removeDoc("gstCertificate")}
                saving={saving}
                docsUploading={docsUploading}
              />

              <DocCard
                title="Udyam Certificate"
                current={data.udyamCertificate}
                picked={udyamCertificate}
                onPick={() => pickDoc("udyamCertificate")}
                onClearPick={() => setUdyamCertificate(null)}
                onRemoveServer={() => removeDoc("udyamCertificate")}
                saving={saving}
                docsUploading={docsUploading}
              />

              <Pressable
                onPress={uploadDocs}
                disabled={docsUploading || saving || frontUploading}
                style={{
                  marginTop: 20,
                  minHeight: 54,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.heading,
                  opacity: docsUploading || saving || frontUploading ? 0.6 : 1,
                  flexDirection: "row",
                }}
              >
                {docsUploading ? (
                  <>
                    <ActivityIndicator color={COLORS.white} />
                    <Text
                      style={{
                        marginLeft: 10,
                        color: COLORS.white,
                        fontWeight: "900",
                      }}
                    >
                      Uploading...
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="cloud-upload-outline"
                      size={20}
                      color={COLORS.white}
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: COLORS.white,
                        fontWeight: "900",
                      }}
                    >
                      Upload Selected Docs
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={clearPickedDocs}
                disabled={docsUploading || saving || frontUploading}
                style={{
                  marginTop: 12,
                  minHeight: 50,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.soft,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  opacity: docsUploading || saving || frontUploading ? 0.65 : 1,
                }}
              >
                <Text
                  style={{
                    color: COLORS.primaryText,
                    fontWeight: "900",
                  }}
                >
                  Clear Selected
                </Text>
              </Pressable>
            </SectionCard>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}