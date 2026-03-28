// app/master/managers/shops/view.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
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

type ShopOwnerRef =
  | string
  | {
      _id?: string;
      name?: string;
      email?: string;
    };

type ShopData = {
  _id: string;
  name?: string;
  businessType?: string;
  shopAddress?: Address;
  address?: Address;
  frontImageUrl?: string;
  frontImagePublicId?: string;
  gstCertificate?: DocInfo;
  udyamCertificate?: DocInfo;
  isActive?: boolean;
  shopOwnerAccountId?: ShopOwnerRef;
  createdAt?: string;
  updatedAt?: string;
};

const UI = {
  screenPaddingX: 14,
  screenPaddingTop: 10,
  screenPaddingBottom: 22,

  cardRadius: 18,
  sectionRadius: 16,
  innerRadius: 12,
  pillRadius: 999,

  heroHeight: 160,

  cardPadding: 14,
  sectionPadding: 14,
  rowVertical: 8,

  iconBox: 34,
  iconBoxLarge: 38,

  title: 19,
  sectionTitle: 15,
  body: 13,
  bodySmall: 12,
  tiny: 11,

  buttonHeight: 46,
};

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddress(address?: Address) {
  if (!address) return "-";

  const parts = [
    address.street,
    address.area,
    address.taluk,
    address.district,
    address.state,
    address.pincode,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  return parts.length ? parts.join(", ") : "-";
}

function getOwnerName(owner?: ShopOwnerRef) {
  if (!owner) return "-";
  if (typeof owner === "string") return owner;
  return owner.name || "-";
}

function getOwnerEmail(owner?: ShopOwnerRef) {
  if (!owner || typeof owner === "string") return "-";
  return owner.email || "-";
}

function bytesToText(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
        marginTop: 12,
        backgroundColor: COLORS.card,
        borderRadius: UI.sectionRadius,
        padding: UI.sectionPadding,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <View
          style={{
            width: UI.iconBoxLarge,
            height: UI.iconBoxLarge,
            borderRadius: 12,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.heading,
              fontSize: UI.sectionTitle,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: UI.bodySmall,
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

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  noBorder = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value?: string;
  valueColor?: string;
  noBorder?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: UI.rowVertical,
        borderBottomWidth: noBorder ? 0 : 1,
        borderBottomColor: COLORS.border,
      }}
    >
      <View
        style={{
          width: UI.iconBox,
          height: UI.iconBox,
          borderRadius: 10,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
          marginTop: 1,
        }}
      >
        <MaterialCommunityIcons name={icon} size={16} color={COLORS.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: COLORS.secondaryText,
            fontSize: UI.tiny,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            marginTop: 3,
            color: valueColor || COLORS.primaryText,
            fontSize: UI.body,
            fontWeight: "600",
            lineHeight: 18,
          }}
        >
          {value || "-"}
        </Text>
      </View>
    </View>
  );
}

function DocViewCard({
  title,
  doc,
  onOpen,
}: {
  title: string;
  doc?: DocInfo;
  onOpen: () => void;
}) {
  const hasDoc = !!doc?.url;

  return (
    <View
      style={{
        marginTop: 10,
        borderRadius: 14,
        padding: 12,
        backgroundColor: COLORS.soft,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={hasDoc ? "file-document-check-outline" : "file-remove-outline"}
            size={20}
            color={hasDoc ? COLORS.success : COLORS.mutedText}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={{
              color: COLORS.heading,
              fontSize: UI.body,
              fontWeight: "700",
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              marginTop: 3,
              color: hasDoc ? COLORS.primaryText : COLORS.secondaryText,
              fontSize: UI.bodySmall,
              fontWeight: "500",
            }}
          >
            {hasDoc ? doc?.fileName || "Document uploaded" : "No document uploaded"}
          </Text>

          {!!hasDoc && (
            <Text
              style={{
                marginTop: 3,
                color: COLORS.mutedText,
                fontSize: UI.tiny,
                fontWeight: "500",
              }}
            >
              {[doc?.mimeType, bytesToText(doc?.bytes)].filter(Boolean).join(" • ")}
            </Text>
          )}
        </View>
      </View>

      {hasDoc && (
        <Pressable
          onPress={onOpen}
          style={{
            marginTop: 10,
            minHeight: 40,
            borderRadius: 12,
            backgroundColor: COLORS.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          }}
        >
          <MaterialCommunityIcons name="open-in-new" size={16} color={COLORS.white} />
          <Text
            style={{
              marginLeft: 6,
              color: COLORS.white,
              fontWeight: "800",
              fontSize: UI.bodySmall,
            }}
          >
            Open Document
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ShopViewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authCtx = useAuth();
  const token = authCtx?.token || authCtx?.accessToken || "";

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [data, setData] = useState<ShopData | null>(null);

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
        setData(null);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      setData((json.data || null) as ShopData | null);
    } catch (error) {
      console.log("fetchDetails error:", error);
      setData(null);
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [id, headersAuthOnly]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const goEdit = useCallback(() => {
    if (!id) return;
    // router.push(`/master/managers/shops/edit?id=${String(id)}`);
  }, [id]);

  const confirmDelete = useCallback(() => {
    if (!id) return;

    Alert.alert(
      "Delete Shop",
      "Are you sure you want to delete this shop? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);

              const res = await fetch(
                apiUrl(SummaryApi.master_delete_shop.url(String(id))),
                {
                  method: SummaryApi.master_delete_shop.method,
                  headers: headersAuthOnly,
                }
              );

              const rr = await readResponse(res);
              const json = rr.json;

              if (!res.ok || !json?.success) {
                if (!json) console.log("RAW:", rr.text);
                toastError(json?.message || `HTTP ${res.status}`);
                return;
              }

              toastSuccess("Shop deleted successfully");
              router.back();
            } catch (error) {
              console.log("delete error:", error);
              toastError("Network error");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [id, headersAuthOnly, router]);

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerShown: true,
      headerTitle: "Shop Details",
      headerTitleAlign: "center",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: COLORS.background,
      },
      headerTitleStyle: {
        color: COLORS.heading,
        fontSize: 17,
        fontWeight: "800",
      },
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
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
            size={22}
            color={COLORS.heading}
          />
        </Pressable>
      ),
      headerRight: () => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginRight: 10,
          }}
        >
          <Pressable
            onPress={goEdit}
            hitSlop={10}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.primarySoft,
              marginRight: 8,
            }}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color={COLORS.primary}
            />
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            hitSlop={10}
            disabled={deleting}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FDECEC",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? (
              <ActivityIndicator color={COLORS.danger} size="small" />
            ) : (
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={18}
                color={COLORS.danger}
              />
            )}
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, goEdit, confirmDelete, deleting]);

  const shopAddress = data?.shopAddress || data?.address;
  const frontImage = data?.frontImageUrl || "";

  const openUrl = useCallback(async (url?: string) => {
    try {
      if (!url?.trim()) {
        toastInfo("No file available");
        return;
      }

      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        toastError("Unable to open file");
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log("openUrl error:", error);
      toastError("Failed to open file");
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["bottom"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
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
              marginTop: 12,
              color: COLORS.secondaryText,
              fontSize: UI.body,
              fontWeight: "600",
            }}
          >
            Loading shop details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["bottom"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 22,
          }}
        >
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 999,
              backgroundColor: COLORS.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="store-remove-outline"
              size={34}
              color={COLORS.mutedText}
            />
          </View>

          <Text
            style={{
              marginTop: 12,
              fontSize: 18,
              fontWeight: "800",
              color: COLORS.heading,
            }}
          >
            Shop not found
          </Text>

          <Text
            style={{
              marginTop: 5,
              color: COLORS.secondaryText,
              textAlign: "center",
              lineHeight: 19,
              fontSize: UI.body,
            }}
          >
            This shop record is unavailable or may have been removed.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={["bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: UI.screenPaddingX,
          paddingTop: UI.screenPaddingTop,
          paddingBottom: UI.screenPaddingBottom,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: UI.cardRadius,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: COLORS.border,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View
            style={{
              height: UI.heroHeight,
              backgroundColor: COLORS.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {frontImage ? (
              <Image
                source={{ uri: frontImage }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <MaterialCommunityIcons
                name="storefront-outline"
                size={46}
                color={COLORS.mutedText}
              />
            )}
          </View>

          <View style={{ padding: UI.cardPadding }}>
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: UI.pillRadius,
                backgroundColor: data?.isActive ? "#EAF8EE" : "#FFF1F0",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: data?.isActive ? COLORS.success : COLORS.danger,
                  fontSize: UI.tiny,
                  fontWeight: "800",
                }}
              >
                {data?.isActive ? "ACTIVE SHOP" : "INACTIVE SHOP"}
              </Text>
            </View>

            <Text
              style={{
                color: COLORS.heading,
                fontSize: UI.title,
                fontWeight: "800",
              }}
            >
              {data?.name || "Unnamed Shop"}
            </Text>

            <Text
              style={{
                marginTop: 4,
                color: COLORS.secondaryText,
                fontSize: UI.body,
                fontWeight: "500",
              }}
            >
              {data?.businessType || "Business type not added"}
            </Text>

            <View
              style={{
                marginTop: 12,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: COLORS.soft,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    fontSize: UI.tiny,
                    fontWeight: "800",
                  }}
                >
                  CREATED
                </Text>
                <Text
                  style={{
                    marginTop: 3,
                    color: COLORS.primaryText,
                    fontSize: UI.bodySmall,
                    fontWeight: "600",
                  }}
                >
                  {formatDate(data?.createdAt)}
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: COLORS.soft,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    fontSize: UI.tiny,
                    fontWeight: "800",
                  }}
                >
                  UPDATED
                </Text>
                <Text
                  style={{
                    marginTop: 3,
                    color: COLORS.primaryText,
                    fontSize: UI.bodySmall,
                    fontWeight: "600",
                  }}
                >
                  {formatDate(data?.updatedAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <SectionCard
          title="Basic Information"
          subtitle="Main shop profile information"
          icon="information-outline"
        >
          <InfoRow icon="store-outline" label="Shop Name" value={data?.name || "-"} />
          <InfoRow
            icon="briefcase-outline"
            label="Business Type"
            value={data?.businessType || "-"}
          />
          <InfoRow
            icon="check-decagram-outline"
            label="Status"
            value={data?.isActive ? "Active" : "Inactive"}
            valueColor={data?.isActive ? COLORS.success : COLORS.danger}
            noBorder
          />
        </SectionCard>

        <SectionCard
          title="Owner Information"
          subtitle="Linked owner account details"
          icon="account-tie-outline"
        >
          <InfoRow
            icon="account-outline"
            label="Owner Name"
            value={getOwnerName(data?.shopOwnerAccountId)}
          />
          <InfoRow
            icon="email-outline"
            label="Owner Email"
            value={getOwnerEmail(data?.shopOwnerAccountId)}
            noBorder
          />
        </SectionCard>

        <SectionCard
          title="Address Information"
          subtitle="Shop location and service area details"
          icon="map-marker-outline"
        >
          <InfoRow icon="map-outline" label="State" value={shopAddress?.state || "-"} />
          <InfoRow
            icon="office-building-marker-outline"
            label="District"
            value={shopAddress?.district || "-"}
          />
          <InfoRow
            icon="city-variant-outline"
            label="Taluk"
            value={shopAddress?.taluk || "-"}
          />
          <InfoRow
            icon="map-marker-radius-outline"
            label="Area"
            value={shopAddress?.area || "-"}
          />
          <InfoRow
            icon="road-variant"
            label="Street / Door No"
            value={shopAddress?.street || "-"}
          />
          <InfoRow
            icon="mailbox-outline"
            label="Pincode"
            value={shopAddress?.pincode || "-"}
          />
          <InfoRow
            icon="map-marker-path"
            label="Full Address"
            value={formatAddress(shopAddress)}
            noBorder
          />
        </SectionCard>

        <SectionCard
          title="Shop Documents"
          subtitle="Uploaded compliance documents"
          icon="file-document-multiple-outline"
        >
          <DocViewCard
            title="GST Certificate"
            doc={data?.gstCertificate}
            onOpen={() => openUrl(data?.gstCertificate?.url)}
          />

          <DocViewCard
            title="Udyam Certificate"
            doc={data?.udyamCertificate}
            onOpen={() => openUrl(data?.udyamCertificate?.url)}
          />
        </SectionCard>

        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Pressable
            onPress={goEdit}
            style={{
              flex: 1,
              minHeight: UI.buttonHeight,
              borderRadius: 14,
              backgroundColor: COLORS.primary,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color={COLORS.white}
            />
            <Text
              style={{
                marginLeft: 6,
                color: COLORS.white,
                fontWeight: "800",
                fontSize: UI.body,
              }}
            >
              Edit Shop
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            style={{
              flex: 1,
              minHeight: UI.buttonHeight,
              borderRadius: 14,
              backgroundColor: COLORS.danger,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              opacity: deleting ? 0.65 : 1,
            }}
          >
            {deleting ? (
              <>
                <ActivityIndicator color={COLORS.white} size="small" />
                <Text
                  style={{
                    marginLeft: 6,
                    color: COLORS.white,
                    fontWeight: "800",
                    fontSize: UI.body,
                  }}
                >
                  Deleting...
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color={COLORS.white}
                />
                <Text
                  style={{
                    marginLeft: 6,
                    color: COLORS.white,
                    fontWeight: "800",
                    fontSize: UI.body,
                  }}
                >
                  Delete Shop
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}