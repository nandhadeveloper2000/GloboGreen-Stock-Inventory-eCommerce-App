// app/master/managers/shops/edit.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Toast from "react-native-toast-message";

import { COLORS } from "../../constants/colors";
import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";

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
        marginTop: 10,
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <MaterialCommunityIcons name={icon} size={17} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.heading,
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: 11,
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
    <View style={{ marginTop: 10 }}>
      <Text
        style={{
          color: COLORS.secondaryText,
          fontWeight: "600",
          fontSize: 10,
          marginBottom: 4,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 42,
          borderRadius: 10,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          paddingHorizontal: 10,
        }}
      >
        <MaterialCommunityIcons name={icon} size={16} color={COLORS.primary} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.labelText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={{
            flex: 1,
            marginLeft: 8,
            color: COLORS.primaryText,
            fontSize: 13,
            fontWeight: "500",
            paddingVertical: 0,
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

  const disabled = saving || docsUploading;

  return (
    <View
      style={{
        marginTop: 10,
        borderRadius: 12,
        backgroundColor: COLORS.soft,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
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
            size={18}
            color={picked ? COLORS.success : COLORS.primary}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={{
              color: COLORS.heading,
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            {title}
          </Text>

          {picked ? (
            <Text
              style={{
                color: COLORS.primaryText,
                fontSize: 11,
                marginTop: 4,
                fontWeight: "500",
              }}
            >
              Selected: {picked.name}
            </Text>
          ) : hasServer ? (
            <Text
              style={{
                color: COLORS.primaryText,
                fontSize: 11,
                marginTop: 4,
                fontWeight: "500",
              }}
            >
              Uploaded: {current?.fileName || "document"}
            </Text>
          ) : (
            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: 11,
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
                fontSize: 10,
                marginTop: 3,
                fontWeight: "500",
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
          flexWrap: "wrap",
          gap: 8,
          marginTop: 10,
        }}
      >
        <Pressable
          onPress={onPick}
          disabled={disabled}
          style={{
            minHeight: 36,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: COLORS.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.65 : 1,
          }}
        >
          <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>
            {picked ? "Replace" : "Choose"}
          </Text>
        </Pressable>

        {!!picked && (
          <Pressable
            onPress={onClearPick}
            disabled={disabled}
            style={{
              minHeight: 36,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: disabled ? 0.65 : 1,
            }}
          >
            <Text
              style={{
                color: COLORS.primaryText,
                fontWeight: "800",
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
            disabled={disabled}
            style={{
              minHeight: 36,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: COLORS.danger,
              alignItems: "center",
              justifyContent: "center",
              opacity: disabled ? 0.65 : 1,
            }}
          >
            <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>
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
      const asset = result.assets?.[0];
      if (asset?.uri) setNewFrontImage(asset);
    }
  };

  const pickDoc = async (key: ShopDocKey) => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: DOC_TYPES as any,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return toastError("File not selected");

    const doc: PickedDoc = {
      uri: asset.uri,
      name: asset.name || `${key}_${Date.now()}`,
      mimeType: asset.mimeType || "application/octet-stream",
      size: asset.size,
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

      toastSuccess(
        key === "gstCertificate"
          ? "GST Certificate removed"
          : "Udyam Certificate removed"
      );

      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setDocsUploading(false);
    }
  };

  const heroFrontImage = newFrontImage?.uri || data?.frontImageUrl || "";
  const actionDisabled = saving || docsUploading || frontUploading;

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
              width: 48,
              height: 48,
              borderRadius: 24,
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
              marginTop: 10,
              color: COLORS.secondaryText,
              fontWeight: "600",
              fontSize: 12,
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
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: COLORS.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="store-remove-outline"
              size={30}
              color={COLORS.mutedText}
            />
          </View>

          <Text
            style={{
              marginTop: 10,
              fontSize: 16,
              fontWeight: "800",
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
              fontSize: 12,
            }}
          >
            This shop record is unavailable or may have been removed.
          </Text>
        </View>
      ) : (
        <>
          <View
            style={{
              paddingHorizontal: 14,
              paddingTop: 6,
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
                width: 38,
                height: 38,
                borderRadius: 10,
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

            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 10 }}>
              <Text
                style={{
                  color: COLORS.heading,
                  fontSize: 16,
                  fontWeight: "800",
                }}
              >
                Edit Shop
              </Text>
              <Text
                style={{
                  color: COLORS.secondaryText,
                  fontSize: 10,
                  marginTop: 2,
                  fontWeight: "500",
                }}
              >
                Admin shop editor
              </Text>
            </View>

            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: COLORS.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="store-edit-outline"
                size={18}
                color={COLORS.primary}
              />
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 14,
              paddingBottom: 24,
            }}
          >
            <SectionCard
              title="Front Image Management"
              subtitle="Choose, upload, or remove the shop front image"
              icon="image-outline"
            >
              <View style={{ alignItems: "center", marginTop: 4 }}>
                <View
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 14,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: COLORS.soft,
                    borderWidth: 1,
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
                      size={40}
                      color={COLORS.mutedText}
                    />
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 10,
                    justifyContent: "center",
                  }}
                >
                  <Pressable
                    onPress={pickFrontImage}
                    disabled={frontUploading || saving}
                    style={{
                      minHeight: 38,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: COLORS.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: frontUploading || saving ? 0.65 : 1,
                    }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>
                      Choose Image
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={uploadFrontImage}
                    disabled={frontUploading || saving || !newFrontImage?.uri}
                    style={{
                      minHeight: 38,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: COLORS.heading,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity:
                        frontUploading || saving || !newFrontImage?.uri ? 0.45 : 1,
                    }}
                  >
                    {frontUploading ? (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <ActivityIndicator color={COLORS.white} size="small" />
                        <Text
                          style={{
                            marginLeft: 8,
                            color: COLORS.white,
                            fontWeight: "800",
                            fontSize: 12,
                          }}
                        >
                          Uploading
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>
                        Upload Image
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={removeFrontImage}
                    disabled={frontUploading || saving}
                    style={{
                      minHeight: 38,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: COLORS.danger,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: frontUploading || saving ? 0.65 : 1,
                    }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 12 }}>
                      Remove
                    </Text>
                  </Pressable>
                </View>

                <Text
                  style={{
                    marginTop: 8,
                    color: COLORS.secondaryText,
                    fontSize: 10,
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
                placeholder="State"
                icon="map-outline"
              />

              <AppInput
                label="District"
                value={district}
                onChangeText={setDistrict}
                placeholder="District"
                icon="office-building-marker-outline"
              />

              <AppInput
                label="Taluk"
                value={taluk}
                onChangeText={setTaluk}
                placeholder="Taluk"
                icon="city-variant-outline"
              />

              <AppInput
                label="Area"
                value={area}
                onChangeText={setArea}
                placeholder="Area"
                icon="map-marker-radius-outline"
              />

              <AppInput
                label="Door No / Street"
                value={street}
                onChangeText={setStreet}
                placeholder="Door no, street"
                icon="road-variant"
              />

              <AppInput
                label="Pincode"
                value={pincode}
                onChangeText={setPincode}
                placeholder="Pincode"
                icon="mailbox-outline"
                keyboardType="number-pad"
              />

              <Pressable
                onPress={submitUpdate}
                disabled={actionDisabled}
                style={{
                  marginTop: 14,
                  height: 42,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.success,
                  opacity: actionDisabled ? 0.65 : 1,
                  flexDirection: "row",
                }}
              >
                {saving ? (
                  <>
                    <ActivityIndicator color={COLORS.white} size="small" />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: COLORS.white,
                        fontWeight: "800",
                        fontSize: 13,
                      }}
                    >
                      Saving Changes...
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="content-save-outline"
                      size={17}
                      color={COLORS.white}
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: COLORS.white,
                        fontWeight: "800",
                        fontSize: 13,
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
                  marginTop: 12,
                  height: 42,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.heading,
                  opacity: docsUploading || saving || frontUploading ? 0.6 : 1,
                  flexDirection: "row",
                }}
              >
                {docsUploading ? (
                  <>
                    <ActivityIndicator color={COLORS.white} size="small" />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: COLORS.white,
                        fontWeight: "800",
                        fontSize: 13,
                      }}
                    >
                      Uploading...
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="cloud-upload-outline"
                      size={17}
                      color={COLORS.white}
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: COLORS.white,
                        fontWeight: "800",
                        fontSize: 13,
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
                  marginTop: 10,
                  height: 40,
                  borderRadius: 10,
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
                    fontWeight: "800",
                    fontSize: 12,
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