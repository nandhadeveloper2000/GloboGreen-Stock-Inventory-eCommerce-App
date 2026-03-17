// app/master/managers/shops/create.tsx
import  React,{ useMemo, useRef, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation, useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";
import { COLORS } from "../../constants/colors";

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
            name={picked ? "file-check-outline" : "file-outline"}
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
          ) : (
            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: 13,
                marginTop: 4,
                fontWeight: "500",
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
          gap: 10,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        <Pressable
          onPress={onPick}
          disabled={disabled}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderRadius: 14,
            backgroundColor: COLORS.primary,
            opacity: disabled ? 0.65 : 1,
          }}
        >
          <Text style={{ color: COLORS.white, fontWeight: "900", fontSize: 12 }}>
            {picked ? "Replace" : "Choose"}
          </Text>
        </Pressable>

        {!!picked && (
          <Pressable
            onPress={onClearPick}
            disabled={disabled}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderRadius: 14,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.border,
              opacity: disabled ? 0.65 : 1,
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
  const [udyamCertificate, setUdyamCertificate] = useState<PickedDoc | null>(null);

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
        fontSize: 18,
        fontWeight: "900",
      },
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
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
            size={24}
            color={COLORS.heading}
          />
        </Pressable>
      ),
      headerRight: () => (
        <View
          style={{
            width: 40,
            height: 40,
            marginRight: 10,
            borderRadius: 14,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name="store-plus-outline"
            size={21}
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
    setGstCertificate(null);
    setUdyamCertificate(null);
    setCreatedShopId("");
  };

  const clearPickedDocs = () => {
    setGstCertificate(null);
    setUdyamCertificate(null);
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

  const createShop = async () => {
    const shopName = name.trim();
    if (!shopName) return toastInfo("Enter shop name");

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
        return toastError(json?.message || `HTTP ${res.status}`);
      }

      const newId = getCreatedIdFromJson(json);
      if (!newId) {
        toastSuccess("Shop created successfully");
        return;
      }

      setCreatedShopId(String(newId));
      toastSuccess("Shop created successfully");

      if (newFrontImage?.uri) {
        await uploadFrontImageInternal(String(newId), true);
      }

      if (gstCertificate || udyamCertificate) {
        await uploadDocsInternal(String(newId), true);
      }

      // router.replace(`/master/managers/shops/view?id=${String(newId)}`);
    } catch {
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const uploadFrontImageInternal = async (shopId: string, silent = false) => {
    if (!shopId) return;
    if (!newFrontImage?.uri) return;

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
    if (!shopId) return;
    if (!gstCertificate && !udyamCertificate) return;

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

  const uploadFrontImageManual = async () => {
    if (!createdShopId) {
      return toastInfo("Create the shop first, then upload front image");
    }
    await uploadFrontImageInternal(createdShopId);
  };

  const uploadDocsManual = async () => {
    if (!createdShopId) {
      return toastInfo("Create the shop first, then upload documents");
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
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 34,
        }}
        keyboardShouldPersistTaps="handled"
      >


        <SectionCard
          title="Front Image"
          subtitle="Select the shop front image for preview and listing cards"
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
                  name="camera-plus-outline"
                  size={52}
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
                disabled={busy}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: COLORS.primary,
                  opacity: busy ? 0.65 : 1,
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: "900" }}>
                  Choose Front Image
                </Text>
              </Pressable>

              <Pressable
                onPress={uploadFrontImageManual}
                disabled={busy || !newFrontImage?.uri}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: COLORS.heading,
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

              {!!newFrontImage?.uri && (
                <Pressable
                  onPress={() => setNewFrontImage(null)}
                  disabled={busy}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: COLORS.danger,
                    opacity: busy ? 0.65 : 1,
                  }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: "900" }}>
                    Clear
                  </Text>
                </Pressable>
              )}
            </View>

            <Text
              style={{
                marginTop: 12,
                color: COLORS.secondaryText,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              You can create the shop first and upload the front image after shop ID is generated.
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
              marginTop: 20,
              minHeight: 54,
              borderRadius: 18,
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
            disabled={busy}
            style={{
              marginTop: 12,
              minHeight: 50,
              borderRadius: 16,
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
                fontWeight: "900",
              }}
            >
              Clear Selected
            </Text>
          </Pressable>
        </SectionCard>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
          <Pressable
            onPress={clearAll}
            disabled={busy}
            style={{
              flex: 1,
              minHeight: 56,
              borderRadius: 18,
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
                fontWeight: "900",
                fontSize: 15,
              }}
            >
              Clear Form
            </Text>
          </Pressable>

          <Pressable
            onPress={createShop}
            disabled={busy}
            style={{
              flex: 1.4,
              minHeight: 56,
              borderRadius: 18,
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
                    marginLeft: 10,
                    color: COLORS.white,
                    fontWeight: "900",
                    fontSize: 15,
                  }}
                >
                  Creating...
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