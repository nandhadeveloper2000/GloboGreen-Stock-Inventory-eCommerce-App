// app/master/managers/shops/create.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
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
const DOC_TYPES = ["application/pdf", "image/*"];

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const toastInfo = (msg: string) =>
  Toast.show({ type: "info", text1: "Info", text2: msg });

type PickedDoc = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

type ShopDocKey = "gstCertificate" | "udyamCertificate";

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
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={17}
            color={COLORS.primary}
          />
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
          fontWeight: "700",
          fontSize: 11,
          marginBottom: 5,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 40,
          borderRadius: 10,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          paddingHorizontal: 10,
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={COLORS.primary}
        />

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
  picked,
  onPick,
  onClearPick,
  disabled,
}: {
  title: string;
  picked?: PickedDoc | null;
  onPick: () => void;
  onClearPick: () => void;
  disabled?: boolean;
}) {
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
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={picked ? "file-check-outline" : "file-outline"}
            size={18}
            color={picked ? COLORS.success : COLORS.primary}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 8 }}>
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
                marginTop: 2,
              }}
              numberOfLines={2}
            >
              Selected: {picked.name}
            </Text>
          ) : (
            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              No document selected
            </Text>
          )}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 6,
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        <Pressable
          onPress={onPick}
          disabled={disabled}
          style={{
            minWidth: 90,
            height: 38,
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
              minWidth: 80,
              height: 38,
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
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Clear
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function ShopCreateScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuth();

  const scrollRef = useRef<ScrollView>(null);

  const [saving, setSaving] = useState(false);
  const [frontUploading, setFrontUploading] = useState(false);
  const [docsUploading, setDocsUploading] = useState(false);

  const [createdShopId, setCreatedShopId] = useState<string>("");

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
  const [udyamCertificate, setUdyamCertificate] = useState<PickedDoc | null>(
    null
  );

  React.useLayoutEffect(() => {
    navigation.setOptions?.({
      headerShown: true,
      headerTitle: "Create Shop",
      headerTitleAlign: "center",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: COLORS.background,
      },
      headerTitleStyle: {
        color: COLORS.heading,
        fontSize: 16,
        fontWeight: "800",
      },
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginLeft: 10,
          }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={20}
            color={COLORS.heading}
          />
        </Pressable>
      ),
      headerRight: () => (
        <View
          style={{
            width: 34,
            height: 34,
            marginRight: 10,
            borderRadius: 10,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name="store-plus-outline"
            size={17}
            color={COLORS.primary}
          />
        </View>
      ),
    });
  }, [navigation, router]);

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

  const pickFrontImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toastInfo("Allow gallery permission");
      return;
    }

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

    if (key === "gstCertificate") setGstCertificate(doc);
    if (key === "udyamCertificate") setUdyamCertificate(doc);
  };

  const clearPickedDocs = () => {
    setGstCertificate(null);
    setUdyamCertificate(null);
  };

  const clearAll = () => {
    setName("");
    setBusinessType("");
    setStateName("");
    setDistrict("");
    setTaluk("");
    setArea("");
    setStreet("");
    setPincode("");
    setNewFrontImage(null);
    clearPickedDocs();
    setCreatedShopId("");
  };

  const getCreatedIdFromJson = (json: any) => {
    return (
      json?.data?._id ||
      json?.data?.id ||
      json?.shop?._id ||
      json?.shop?.id ||
      json?._id ||
      json?.id ||
      ""
    );
  };

  const uploadFrontImageInternal = async (shopId: string, silent = false) => {
    if (!shopId || !newFrontImage?.uri) return;

    try {
      setFrontUploading(true);

      const uri = newFrontImage.uri;
      const isPng = uri.toLowerCase().endsWith(".png");
      const mime =
        (newFrontImage as any).mimeType || (isPng ? "image/png" : "image/jpeg");
      const filename = `shop_front_${Date.now()}.${isPng ? "png" : "jpg"}`;

      const form = new FormData();
      form.append("front", {
        uri,
        name: filename,
        type: mime,
      } as any);

      const res = await fetch(
        apiUrl(SummaryApi.shop_front_upload_admin.url(String(shopId))),
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
        if (!silent) toastError(json?.message || "Front image upload failed");
        return;
      }

      setNewFrontImage(null);
      if (!silent) toastSuccess("Front image uploaded");
    } catch {
      if (!silent) toastError("Network error");
    } finally {
      setFrontUploading(false);
    }
  };

  const uploadDocsInternal = async (shopId: string, silent = false) => {
    if (!shopId || (!gstCertificate && !udyamCertificate)) return;

    try {
      setDocsUploading(true);

      const form = new FormData();

      if (gstCertificate) {
        form.append("gstCertificate", {
          uri: gstCertificate.uri,
          name: gstCertificate.name,
          type: gstCertificate.mimeType,
        } as any);
      }

      if (udyamCertificate) {
        form.append("udyamCertificate", {
          uri: udyamCertificate.uri,
          name: udyamCertificate.name,
          type: udyamCertificate.mimeType,
        } as any);
      }

      const res = await fetch(
        apiUrl(SummaryApi.shop_docs_upload_admin.url(String(shopId))),
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
        if (!silent) toastError(json?.message || "Document upload failed");
        return;
      }

      clearPickedDocs();
      if (!silent) toastSuccess("Shop documents uploaded");
    } catch {
      if (!silent) toastError("Network error");
    } finally {
      setDocsUploading(false);
    }
  };

  const createShop = async () => {
    const shopName = name.trim();

    if (!shopName) {
      toastInfo("Enter shop name");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(apiUrl(SummaryApi.master_create_shop.url), {
        method: SummaryApi.master_create_shop.method,
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
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      const newId = String(getCreatedIdFromJson(json) || "");
      setCreatedShopId(newId);
      toastSuccess("Shop created successfully");

      if (newId && newFrontImage?.uri) {
        await uploadFrontImageInternal(newId, true);
      }

      if (newId && (gstCertificate || udyamCertificate)) {
        await uploadDocsInternal(newId, true);
      }
    } catch {
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const uploadFrontImageManual = async () => {
    if (!createdShopId) {
      toastInfo("Create the shop first, then upload front image");
      return;
    }
    await uploadFrontImageInternal(createdShopId);
  };

  const uploadDocsManual = async () => {
    if (!createdShopId) {
      toastInfo("Create the shop first, then upload documents");
      return;
    }
    await uploadDocsInternal(createdShopId);
  };

  const heroFrontImage = newFrontImage?.uri || "";
  const busy = saving || frontUploading || docsUploading;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={["bottom"]}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 20,
        }}
      >
        <SectionCard
          title="Front Image"
          subtitle="Select the shop front image for preview and listing cards"
          icon="image-outline"
        >
          <View style={{ alignItems: "center", marginTop: 2 }}>
            <View
              style={{
                width: "100%",
                height: 150,
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
                  name="camera-plus-outline"
                  size={34}
                  color={COLORS.mutedText}
                />
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 6,
                marginTop: 12,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Pressable
                onPress={pickFrontImage}
                disabled={busy}
                style={{
                  paddingHorizontal: 12,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: COLORS.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: busy ? 0.65 : 1,
                }}
              >
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "800",
                    fontSize: 12,
                  }}
                >
                  Choose Front Image
                </Text>
              </Pressable>

              <Pressable
                onPress={uploadFrontImageManual}
                disabled={busy || !newFrontImage?.uri}
                style={{
                  paddingHorizontal: 12,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: COLORS.heading,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: busy || !newFrontImage?.uri ? 0.45 : 1,
                }}
              >
                {frontUploading ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ActivityIndicator color={COLORS.white} />
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
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "800",
                      fontSize: 12,
                    }}
                  >
                    Upload Front Image
                  </Text>
                )}
              </Pressable>

              {!!newFrontImage?.uri && (
                <Pressable
                  onPress={() => setNewFrontImage(null)}
                  disabled={busy}
                  style={{
                    paddingHorizontal: 12,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: COLORS.danger,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: busy ? 0.65 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontWeight: "800",
                      fontSize: 12,
                    }}
                  >
                    Clear
                  </Text>
                </Pressable>
              )}
            </View>

            <Text
              style={{
                marginTop: 8,
                color: COLORS.secondaryText,
                fontSize: 11,
                textAlign: "center",
                lineHeight: 15,
              }}
            >
              You can create the shop first and upload the front image after shop
              ID is generated.
            </Text>
          </View>
        </SectionCard>

        <SectionCard
          title="Basic Information"
          subtitle="Main shop details"
          icon="store-outline"
        >
          <AppInput
            label="Shop Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter shop name"
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
          subtitle="Operational location and service area"
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
        </SectionCard>

        <SectionCard
          title="Shop Documents"
          subtitle="GST and Udyam certificate selection"
          icon="file-document-multiple-outline"
        >
          <DocCard
            title="GST Certificate"
            picked={gstCertificate}
            onPick={() => pickDoc("gstCertificate")}
            onClearPick={() => setGstCertificate(null)}
            disabled={busy}
          />

          <DocCard
            title="Udyam Certificate"
            picked={udyamCertificate}
            onPick={() => pickDoc("udyamCertificate")}
            onClearPick={() => setUdyamCertificate(null)}
            disabled={busy}
          />

          <Pressable
            onPress={uploadDocsManual}
            disabled={busy || (!gstCertificate && !udyamCertificate)}
            style={{
              marginTop: 14,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.heading,
              opacity: busy || (!gstCertificate && !udyamCertificate) ? 0.6 : 1,
              flexDirection: "row",
            }}
          >
            {docsUploading ? (
              <>
                <ActivityIndicator color={COLORS.white} />
                <Text
                  style={{
                    marginLeft: 8,
                    color: COLORS.white,
                    fontWeight: "800",
                    fontSize: 12,
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
                    fontSize: 12,
                  }}
                >
                  Upload Selected Docs
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={clearPickedDocs}
            disabled={busy}
            style={{
              marginTop: 8,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.soft,
              borderWidth: 1,
              borderColor: COLORS.border,
              opacity: busy ? 0.65 : 1,
            }}
          >
            <Text
              style={{
                color: COLORS.primaryText,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Clear Selected
            </Text>
          </Pressable>
        </SectionCard>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <Pressable
            onPress={clearAll}
            disabled={busy}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.soft,
              borderWidth: 1,
              borderColor: COLORS.border,
              opacity: busy ? 0.65 : 1,
            }}
          >
            <Text
              style={{
                color: COLORS.primaryText,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              Clear Form
            </Text>
          </Pressable>

          <Pressable
            onPress={createShop}
            disabled={busy}
            style={{
              flex: 1.3,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.success,
              opacity: busy ? 0.65 : 1,
              flexDirection: "row",
            }}
          >
            {saving ? (
              <>
                <ActivityIndicator color={COLORS.white} />
                <Text
                  style={{
                    marginLeft: 8,
                    color: COLORS.white,
                    fontWeight: "800",
                    fontSize: 13,
                  }}
                >
                  Creating...
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
                  Create Shop
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}