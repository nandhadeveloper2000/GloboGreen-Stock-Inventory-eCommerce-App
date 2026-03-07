// app/subadmin/(tabs)/shopowners.tsx

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
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";

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

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type CreatedBy = {
  type?: "MASTER" | "MANAGER" | string;
  id?: string | { $oid?: string };
  role?: "MASTER_ADMIN" | "MANAGER" | string;
  ref?: "Master" | "SubAdmin" | string;
};

type ShopRef = {
  _id?: string;
  name?: string;
  isActive?: boolean;
  address?: Address;
  frontImageUrl?: string;
  createdAt?: string;
};

type DocMeta = {
  url?: string;
  publicId?: string;
  mimeType?: string;
  fileName?: string;
  bytes?: number;
};

type Owner = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  role?: "SHOP_OWNER" | string;
  verifyEmail?: boolean;
  address?: Address;
  shopIds?: ShopRef[];
  businessTypes?: string[];
  shopControl?: "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE" | string;
  idProof?: DocMeta;
  gstCertificate?: DocMeta;
  udyamCertificate?: DocMeta;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  createdBy?: CreatedBy;
  createdAt?: string;
  updatedAt?: string;
};

type OwnersResponse =
  | {
      success?: boolean;
      data?: Owner[];
      message?: string;
    }
  | Owner[];

type FilterType = "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED";

function normalizeList(payload: OwnersResponse): Owner[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function toDateSafe(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTimeIST(value?: string | null) {
  const d = toDateSafe(value);
  if (!d) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatDateOnlyIST(value?: string | null) {
  const d = toDateSafe(value);
  if (!d) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

function isExpired(validTo?: string | null) {
  const d = toDateSafe(validTo);
  if (!d) return false;
  return d.getTime() <= Date.now();
}

function isOwnerCurrentlyActive(owner: Owner) {
  return !!owner.isActive && !isExpired(owner.validTo);
}

function isOwnerCurrentlyInactive(owner: Owner) {
  return !owner.isActive && !isExpired(owner.validTo);
}

function getStatus(owner: Owner) {
  const expired = isExpired(owner.validTo);

  if (expired) {
    return {
      label: "Expired",
      bg: "#FEF2F2",
      text: "#B91C1C",
      border: "#FECACA",
      dot: "#DC2626",
      icon: "clock-alert-outline" as const,
    };
  }

  if (owner.isActive) {
    return {
      label: "Active",
      bg: "#F0FDF4",
      text: "#15803D",
      border: "#BBF7D0",
      dot: "#16A34A",
      icon: "check-decagram" as const,
    };
  }

  return {
    label: "Inactive",
    bg: "#F8FAFC",
    text: "#475569",
    border: "#E2E8F0",
    dot: "#64748B",
    icon: "pause-circle-outline" as const,
  };
}

function getShopControlLabel(v?: string) {
  return v === "ALL_IN_ONE_ECOMMERCE"
    ? "All-in-One E-Commerce"
    : "Inventory Only";
}

function formatCreatedBy(c?: CreatedBy) {
  if (!c) return "-";
  const role = c.role || "-";
  const type = c.type || "-";
  return `${role} (${type})`;
}

function getAddressText(address?: Address) {
  if (!address) return "-";
  const parts = [
    address.street,
    address.area,
    address.taluk,
    address.district,
    address.state,
    address.pincode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}

function getDaysLeft(validTo?: string | null) {
  const d = toDateSafe(validTo);
  if (!d) return null;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function ShopOwnersScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string>("");
  const [items, setItems] = useState<Owner[]>([]);
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("ALL");

  const headers = useMemo(() => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadOwners = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const res = await fetch(apiUrl(SummaryApi.master_all_shopowners.url), {
          method: SummaryApi.master_all_shopowners.method || "GET",
          headers,
        });

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok || !json?.success) {
          throw new Error(json?.message || `HTTP ${res.status}`);
        }

        setItems(normalizeList(json));
      } catch (err: any) {
        toastError(err?.message || "Failed to load shop owners");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [headers]
  );

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Shop Owners",
      headerTitleAlign: "center",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: "#FFFFFF",
      },
      headerTitleStyle: {
        color: "#111827",
        fontSize: 20,
        fontWeight: "800",
      },

      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            marginLeft: 10,
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 2,
          }}
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color="#111827"
          />
        </Pressable>
      ),

      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => loadOwners(true)}
            disabled={loading}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F0FDF4",
              borderWidth: 1,
              borderColor: "#BBF7D0",
              opacity: loading ? 0.5 : 1,
              shadowColor: BRAND,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 2,
            }}
            hitSlop={10}
          >
            <MaterialCommunityIcons name="refresh" size={22} color={BRAND} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/subadmin/managers/shopowners/create" as any)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#ECFDF5",
              borderWidth: 1,
              borderColor: "#A7F3D0",
              marginRight: 10,
              shadowColor: "#059669",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 2,
            }}
            hitSlop={10}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#059669" />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, loadOwners, loading]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  const searchedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((x) => {
      const s = [
        x.name,
        x.username,
        x.email,
        x.mobile,
        x.additionalNumber,
        x.shopControl,
        x.createdBy?.role,
        x.createdBy?.type,
        x.address?.state,
        x.address?.district,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");

      return s.includes(q);
    });
  }, [items, query]);

  const filtered = useMemo(() => {
    switch (selectedFilter) {
      case "ACTIVE":
        return searchedItems.filter((x) => isOwnerCurrentlyActive(x));
      case "INACTIVE":
        return searchedItems.filter((x) => isOwnerCurrentlyInactive(x));
      case "EXPIRED":
        return searchedItems.filter((x) => isExpired(x.validTo));
      case "ALL":
      default:
        return searchedItems;
    }
  }, [searchedItems, selectedFilter]);

  const totalCount = items.length;
  const activeCount = items.filter((x) => isOwnerCurrentlyActive(x)).length;
  const inactiveCount = items.filter((x) => isOwnerCurrentlyInactive(x)).length;
  const expiredCount = items.filter((x) => isExpired(x.validTo)).length;

  const onRefresh = useCallback(() => {
    loadOwners(true);
  }, [loadOwners]);

  const toggleActive = useCallback(
    async (owner: Owner) => {
      const nextActive = !owner.isActive;

      Alert.alert(
        nextActive ? "Activate Shop Owner" : "Deactivate Shop Owner",
        nextActive
          ? "This will activate the owner and reset validFrom / validTo from today."
          : "This will deactivate the owner.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: nextActive ? "Activate" : "Deactivate",
            style: nextActive ? "default" : "destructive",
            onPress: async () => {
              try {
                setTogglingId(owner._id);

                const endpoint =
                  SummaryApi.master_toggle_shopowner_active?.url?.(owner._id);
                const method =
                  SummaryApi.master_toggle_shopowner_active?.method || "PATCH";

                if (!endpoint) {
                  return toastError("Missing toggle active endpoint in SummaryApi");
                }

                const res = await fetch(apiUrl(endpoint), {
                  method,
                  headers,
                  body: JSON.stringify({ isActive: nextActive }),
                });

                const text = await res.text();
                const json = text ? JSON.parse(text) : null;

                if (!res.ok || !json?.success) {
                  throw new Error(json?.message || `HTTP ${res.status}`);
                }

                const updated: Owner | undefined = json?.data;

                if (updated?._id) {
                  setItems((prev) =>
                    prev.map((x) => (x._id === updated._id ? updated : x))
                  );
                } else {
                  await loadOwners(true);
                }

                toastSuccess(
                  nextActive
                    ? "Shop owner activated successfully"
                    : "Shop owner deactivated successfully"
                );
              } catch (err: any) {
                toastError(err?.message || "Failed to update status");
              } finally {
                setTogglingId("");
              }
            },
          },
        ]
      );
    },
    [headers, loadOwners]
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <LinearGradient
        colors={["#F8FAFC", "#EEFDF0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="w-24 h-24 rounded-full items-center justify-center"
      >
        <MaterialCommunityIcons
          name="account-group-outline"
          size={42}
          color="#94A3B8"
        />
      </LinearGradient>

      <Text className="mt-5 text-[18px] font-extrabold text-slate-800">
        No shop owners found
      </Text>
      <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
        Try updating your search term or switching the filter tabs above.
      </Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: Owner; index: number }) => {
    const status = getStatus(item);
    const expired = isExpired(item.validTo);
    const daysLeft = getDaysLeft(item.validTo);

    return (
      <View
        className="mx-4 mb-5 rounded-[28px] overflow-hidden"
        style={{
          backgroundColor: CARD,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 5,
          borderWidth: 1,
          borderColor: "#ECF0F4",
        }}
      >
        <LinearGradient
          colors={["#FFFFFF", "#F8FFFA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 16 }}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-row flex-1 pr-3">
              <View
                className="w-[70px] h-[70px] rounded-full overflow-hidden items-center justify-center"
                style={{
                  backgroundColor: "#F1F5F9",
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                }}
              >
                {item.avatarUrl ? (
                  <Image
                    source={{ uri: item.avatarUrl }}
                    style={{ width: 70, height: 70 }}
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
                      name="account"
                      size={30}
                      color={BRAND_DARK}
                    />
                  </LinearGradient>
                )}
              </View>

              <View className="ml-3 flex-1">
                <View className="flex-row items-center flex-wrap">
                  <Text className="text-slate-900 text-[18px] font-extrabold">
                    {item.name || "-"}
                  </Text>

                  {item.verifyEmail ? (
                    <View className="ml-2 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 flex-row items-center">
                      <MaterialCommunityIcons
                        name="check-decagram"
                        size={12}
                        color="#16A34A"
                      />
                      <Text className="ml-1 text-[10px] font-bold text-emerald-700">
                        VERIFIED
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text className="text-slate-500 mt-0.5 font-semibold">
                  @{item.username || "-"}
                </Text>

                {!!item.mobile && (
                  <View className="mt-2 flex-row items-center">
                    <MaterialCommunityIcons
                      name="phone-outline"
                      size={15}
                      color="#64748B"
                    />
                    <Text className="ml-1 text-slate-600 font-medium">
                      {item.mobile}
                    </Text>
                  </View>
                )}

                {!!item.email && (
                  <View className="mt-1 flex-row items-center">
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={15}
                      color="#64748B"
                    />
                    <Text
                      className="ml-1 text-slate-500"
                      numberOfLines={1}
                      style={{ maxWidth: 220 }}
                    >
                      {item.email}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View
              className="px-3 py-2 rounded-full flex-row items-center"
              style={{
                backgroundColor: status.bg,
                borderWidth: 1,
                borderColor: status.border,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  backgroundColor: status.dot,
                  marginRight: 6,
                }}
              />
              <MaterialCommunityIcons
                name={status.icon}
                size={15}
                color={status.text}
              />
              <Text
                className="ml-1 text-[12px] font-extrabold"
                style={{ color: status.text }}
              >
                {status.label}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 10 }}>
            <StatPill
              icon="store-outline"
              label="Control"
              value={getShopControlLabel(item.shopControl)}
            />
            <StatPill
              icon="domain"
              label="Shops"
              value={String(item.shopIds?.length || 0)}
            />
            <StatPill
              icon="badge-account-outline"
              label="Role"
              value={item.role || "SHOP_OWNER"}
            />
          </View>

          <View
            className="mt-4 rounded-[24px] p-4"
            style={{
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-900 font-extrabold text-[15px]">
                Subscription & Meta
              </Text>
              <View className="px-2.5 py-1 rounded-full bg-white border border-slate-200">
                <Text className="text-[11px] font-bold text-slate-600">
                  #{index + 1}
                </Text>
              </View>
            </View>

            <Row
              icon="calendar-start"
              label="Valid From"
              value={item.validFrom ? formatDateTimeIST(item.validFrom) : "-"}
            />
            <Divider />
            <Row
              icon="calendar-end"
              label="Valid To"
              value={item.validTo ? formatDateTimeIST(item.validTo) : "-"}
              valueClassName={
                expired
                  ? "text-red-600 font-extrabold"
                  : "text-slate-800 font-extrabold"
              }
            />
            <Divider />
            <Row
              icon="calendar-clock-outline"
              label="Updated"
              value={item.updatedAt ? formatDateTimeIST(item.updatedAt) : "-"}
            />
            <Divider />
            <Row
              icon="shield-account-outline"
              label="Created By"
              value={formatCreatedBy(item.createdBy)}
            />
            <Divider />
            <Row
              icon="map-marker-outline"
              label="Address"
              value={getAddressText(item.address)}
              valueClassName="text-slate-700 font-semibold"
            />
          </View>

          {item.validTo ? (
            <View
              className="mt-4 rounded-[22px] px-4 py-3 flex-row items-center"
              style={{
                backgroundColor: expired ? "#FEF2F2" : "#F0FDF4",
                borderWidth: 1,
                borderColor: expired ? "#FECACA" : "#BBF7D0",
              }}
            >
              <MaterialCommunityIcons
                name={expired ? "alert-octagon-outline" : "clock-check-outline"}
                size={20}
                color={expired ? "#DC2626" : "#16A34A"}
              />
              <View className="ml-3 flex-1">
                <Text
                  className="font-extrabold"
                  style={{ color: expired ? "#B91C1C" : "#166534" }}
                >
                  {expired
                    ? "Subscription expired"
                    : daysLeft !== null
                    ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`
                    : "Subscription active"}
                </Text>
                <Text
                  className="mt-0.5 text-[12px]"
                  style={{ color: expired ? "#B91C1C" : "#166534" }}
                >
                  Valid till {formatDateOnlyIST(item.validTo)}
                </Text>
              </View>
            </View>
          ) : null}

          {!!expired && (
            <View className="mt-4 rounded-[22px] bg-red-50 border border-red-200 px-4 py-3 flex-row">
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color="#DC2626"
              />
              <Text className="ml-2 text-red-700 font-semibold flex-1 leading-5">
                This shop owner is treated as expired until reactivated or renewed.
              </Text>
            </View>
          )}

          <View className="mt-5 flex-row" style={{ gap: 12 }}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/subadmin/managers/shopowners/edit",
                  params: { id: item._id },
                } as any)
              }
              className="flex-1 rounded-[18px] overflow-hidden"
              style={{
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 18,
                }}
              >
                <View className="flex-row items-center justify-center">
                  <MaterialCommunityIcons
                    name="square-edit-outline"
                    size={20}
                    color={TEXT}
                  />
                  <Text className="ml-2 text-slate-900 font-extrabold text-[15px]">
                    Edit
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => toggleActive(item)}
              disabled={togglingId === item._id}
              className="flex-1 rounded-[18px] overflow-hidden"
              style={{
                shadowColor: item.isActive ? "#EF4444" : BRAND,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.22,
                shadowRadius: 14,
                elevation: 4,
                opacity: togglingId === item._id ? 0.7 : 1,
              }}
            >
              <LinearGradient
                colors={
                  item.isActive ? ["#EF4444", "#DC2626"] : [BRAND, BRAND_DARK]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 18,
                }}
              >
                <View className="flex-row items-center justify-center">
                  {togglingId === item._id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name={
                          item.isActive ? "lock-open-outline" : "lock-outline"
                        }
                        size={20}
                        color="#fff"
                      />
                      <Text className="ml-2 text-white font-extrabold text-[15px]">
                        {item.isActive ? "Deactivate" : "Activate"}
                      </Text>
                    </>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="clock-outline"
                size={15}
                color="#94A3B8"
              />
              <Text className="ml-1 text-[12px] text-slate-400 font-semibold">
                Created {formatDateOnlyIST(item.createdAt)}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                toastInfo(
                  `Owner #${index + 1} • Updated ${formatDateTimeIST(
                    item.updatedAt
                  )}`
                )
              }
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={21}
                color={TEXT}
              />
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: SURFACE }}
      edges={["left", "right", "bottom"]}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: 28,
          flexGrow: !loading && filtered.length === 0 ? 1 : undefined,
        }}
        ListHeaderComponent={
          <View className="px-4 pb-4">
            <LinearGradient
              colors={["#18C10A", "#109203"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 28,
                padding: 18,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: -20,
                  right: -10,
                  width: 110,
                  height: 110,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: -30,
                  left: -15,
                  width: 100,
                  height: 100,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              />

              <Text className="text-white/90 text-[12px] font-semibold">
                Overview
              </Text>
              <Text className="mt-1 text-white text-[26px] font-extrabold">
                {filtered.length}
              </Text>
              <Text className="text-white/90 text-sm font-medium">
                Showing shop owners in current result
              </Text>

              <View className="mt-4 flex-row" style={{ gap: 10 }}>
                <HeaderMetric label="Total" value={String(totalCount)} />
                <HeaderMetric label="Active" value={String(activeCount)} />
                <HeaderMetric label="Expired" value={String(expiredCount)} />
              </View>
            </LinearGradient>

            <View
              className="mt-4 rounded-[24px] px-4 py-3 flex-row items-center"
              style={{
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
                <MaterialCommunityIcons
                  name="magnify"
                  size={22}
                  color="#64748B"
                />
              </View>

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name, username, email, mobile..."
                placeholderTextColor="#94A3B8"
                className="flex-1 text-slate-900 ml-3 py-2"
                style={{ fontSize: 15, fontWeight: "600" }}
              />

              {!!query && (
                <Pressable
                  onPress={() => setQuery("")}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color="#64748B"
                  />
                </Pressable>
              )}
            </View>

            <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
              <FilterChip
                label={`All (${totalCount})`}
                icon="view-grid-outline"
                active={selectedFilter === "ALL"}
                onPress={() => setSelectedFilter("ALL")}
              />
              <FilterChip
                label={`Active (${activeCount})`}
                icon="check-decagram-outline"
                active={selectedFilter === "ACTIVE"}
                onPress={() => setSelectedFilter("ACTIVE")}
              />
              <FilterChip
                label={`Inactive (${inactiveCount})`}
                icon="pause-circle-outline"
                active={selectedFilter === "INACTIVE"}
                onPress={() => setSelectedFilter("INACTIVE")}
              />
              <FilterChip
                label={`Expired (${expiredCount})`}
                icon="clock-alert-outline"
                active={selectedFilter === "EXPIRED"}
                onPress={() => setSelectedFilter("EXPIRED")}
              />
            </View>

            {loading ? (
              <View className="items-center justify-center px-6 py-12">
                <LinearGradient
                  colors={["#F0FDF4", "#DCFCE7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-20 h-20 rounded-full items-center justify-center"
                >
                  <ActivityIndicator size="large" color={BRAND} />
                </LinearGradient>
                <Text className="mt-4 text-slate-700 font-extrabold text-base">
                  Loading shop owners...
                </Text>
                <Text className="mt-1 text-slate-500 text-center">
                  Please wait while we fetch the latest owner records.
                </Text>
              </View>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      />
    </SafeAreaView>
  );
}

function Divider() {
  return <View className="h-[1px] bg-slate-200 my-2.5" />;
}

function Row({
  icon,
  label,
  value,
  valueClassName = "text-slate-800 font-bold",
}: {
  icon: any;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row items-start">
      <View className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center mt-0.5">
        <MaterialCommunityIcons name={icon} size={16} color="#64748B" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-slate-500 text-[11px] font-extrabold uppercase tracking-wide">
          {label}
        </Text>
        <Text className={valueClassName} style={{ lineHeight: 20 }}>
          {value || "-"}
        </Text>
      </View>
    </View>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View
      className="flex-1 rounded-[20px] px-3 py-3"
      style={{
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
      }}
    >
      <View className="flex-row items-center">
        <MaterialCommunityIcons name={icon} size={16} color="#475569" />
        <Text className="ml-1 text-slate-500 text-[11px] font-bold">
          {label}
        </Text>
      </View>
      <Text
        className="text-slate-900 font-extrabold mt-2"
        numberOfLines={1}
        style={{ fontSize: 13 }}
      >
        {value}
      </Text>
    </View>
  );
}

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

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: any;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full overflow-hidden"
      style={{
        shadowColor: active ? BRAND : "#0F172A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: active ? 0.16 : 0.04,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View
        className="px-4 py-2.5 rounded-full flex-row items-center"
        style={{
          backgroundColor: active ? BRAND : "#FFFFFF",
          borderWidth: 1,
          borderColor: active ? BRAND : "#E2E8F0",
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={active ? "#FFFFFF" : "#475569"}
        />
        <Text
          className="ml-1.5 font-extrabold"
          style={{ color: active ? "#FFFFFF" : "#334155" }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}