// app/master/managers/shops/view.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
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
        marginTop: 16,
        backgroundColor: COLORS.card,
        borderRadius: 26,
        padding: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        // shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 18,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
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
              fontSize: 17,
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

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value?: string;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: COLORS.secondaryText,
            fontSize: 11,
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            marginTop: 4,
            color: valueColor || COLORS.primaryText,
            fontSize: 15,
            fontWeight: "700",
            lineHeight: 22,
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
        marginTop: 14,
        borderRadius: 20,
        padding: 14,
        backgroundColor: COLORS.soft,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={hasDoc ? "file-document-check-outline" : "file-remove-outline"}
            size={24}
            color={hasDoc ? COLORS.success : COLORS.mutedText}
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

          <Text
            style={{
              marginTop: 4,
              color: hasDoc ? COLORS.primaryText : COLORS.secondaryText,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {hasDoc ? doc?.fileName || "Document uploaded" : "No document uploaded"}
          </Text>

          {!!hasDoc && (
            <Text
              style={{
                marginTop: 4,
                color: COLORS.mutedText,
                fontSize: 11,
                fontWeight: "600",
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
            marginTop: 14,
            minHeight: 46,
            borderRadius: 14,
            backgroundColor: COLORS.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          }}
        >
          <MaterialCommunityIcons name="open-in-new" size={18} color={COLORS.white} />
          <Text
            style={{
              marginLeft: 8,
              color: COLORS.white,
              fontWeight: "900",
              fontSize: 13,
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
  const { token } = useAuth();

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
        toastError(json?.message || `HTTP ${res.status}`);
        setData(null);
        return;
      }

      setData((json.data || null) as ShopData | null);
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

  const goEdit = useCallback(() => {
    if (!id) return;
    // router.push(`/master/managers/shops/edit?id=${String(id)}`);
  }, [router, id]);

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
                return toastError(json?.message || `HTTP ${res.status}`);
              }

              toastSuccess("Shop deleted successfully");
              router.back();
            } catch {
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
        <View style={{ flexDirection: "row", alignItems: "center", marginRight: 10 }}>
          <Pressable
            onPress={goEdit}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.primarySoft,
              marginRight: 8,
            }}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={21}
              color={COLORS.primary}
            />
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            hitSlop={10}
            disabled={deleting}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
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
                size={21}
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

  const openUrl = async (url?: string) => {
    if (!url) return toastInfo("No file available");
    const can = await Linking.canOpenURL(url);
    if (!can) return toastError("Unable to open file");
    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={["bottom"]}>
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
              width: 88,
              height: 88,
              borderRadius: 999,
              backgroundColor: COLORS.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="store-remove-outline"
              size={40}
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
            Shop not found
          </Text>

          <Text
            style={{
              marginTop: 6,
              color: COLORS.secondaryText,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            This shop record is unavailable or may have been removed.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 34,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 30,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: COLORS.border,
              // shadowColor: COLORS.black,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.05,
              shadowRadius: 18,
              elevation: 3,
            }}
          >
            <View
              style={{
                height: 210,
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
                  size={58}
                  color={COLORS.mutedText}
                />
              )}
            </View>

            <View style={{ padding: 18 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: data?.isActive ? "#EAF8EE" : "#FFF1F0",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: data?.isActive ? COLORS.success : COLORS.danger,
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  {data?.isActive ? "ACTIVE SHOP" : "INACTIVE SHOP"}
                </Text>
              </View>

              <Text
                style={{
                  color: COLORS.heading,
                  fontSize: 22,
                  fontWeight: "900",
                }}
              >
                {data?.name || "Unnamed Shop"}
              </Text>

              <Text
                style={{
                  marginTop: 6,
                  color: COLORS.secondaryText,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {data?.businessType || "Business type not added"}
              </Text>

              <View
                style={{
                  marginTop: 16,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: COLORS.soft,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Text style={{ color: COLORS.secondaryText, fontSize: 11, fontWeight: "800" }}>
                    CREATED
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: COLORS.primaryText,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {formatDate(data?.createdAt)}
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: COLORS.soft,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Text style={{ color: COLORS.secondaryText, fontSize: 11, fontWeight: "800" }}>
                    UPDATED
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: COLORS.primaryText,
                      fontSize: 13,
                      fontWeight: "700",
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

          <View style={{ marginTop: 18, flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={goEdit}
              style={{
                flex: 1,
                minHeight: 54,
                borderRadius: 18,
                backgroundColor: COLORS.primary,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
              }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.white} />
              <Text
                style={{
                  marginLeft: 8,
                  color: COLORS.white,
                  fontWeight: "900",
                  fontSize: 15,
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
                minHeight: 54,
                borderRadius: 18,
                backgroundColor: COLORS.danger,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                opacity: deleting ? 0.65 : 1,
              }}
            >
              {deleting ? (
                <>
                  <ActivityIndicator color={COLORS.white} />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: COLORS.white,
                      fontWeight: "900",
                      fontSize: 15,
                    }}
                  >
                    Deleting...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="trash-can-outline"
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
                    Delete Shop
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}