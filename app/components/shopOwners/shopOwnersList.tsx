import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

type AuthLike = {
  user?: any;
  auth?: any;
  token?: string | null;
  accessToken?: string | null;
};

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type CreatedBy = {
  type?: "MASTER" | "MANAGER" | "SUPERVISOR" | "STAFF" | string;
  id?: string | { $oid?: string };
  role?: "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF" | string;
  ref?: "Master" | "SubAdmin" | "Supervisor" | "Staff" | string;
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

type OwnersPayload = {
  success?: boolean;
  data?: Owner[];
  message?: string;
  error?: string;
};

type OwnersResponse = OwnersPayload | Owner[];

type FilterType = "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED";

type ApiConfig = {
  url: string;
  method?: string;
};

type RoleTheme = {
  badge: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string, ...string[]];
};

const apiUrl = (path: string) => `${baseURL}${path}`;

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

function formatDate(value?: string | null) {
  const d = toDateSafe(value);
  if (!d) return "-";

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
      dot: COLORS.danger,
    };
  }

  if (owner.isActive) {
    return {
      label: "Active",
      bg: "#F0FDF4",
      text: COLORS.successDark,
      border: "#BBF7D0",
      dot: COLORS.success,
    };
  }

  return {
    label: "Inactive",
    bg: COLORS.soft,
    text: COLORS.secondaryText,
    border: COLORS.border,
    dot: COLORS.secondaryText,
  };
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getApiErrorMessage(json: any, fallback = "Something went wrong") {
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

function toastError(message: string) {
  Toast.show({
    type: "error",
    text1: "Error",
    text2: message,
  });
}

function getRoleLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return "Master Admin";
    case ROLES.MANAGER:
      return "Manager";
    case ROLES.SUPERVISOR:
      return "Supervisor";
    case ROLES.STAFF:
      return "Staff";
    default:
      return "User";
  }
}

function getRoleTheme(role?: string | null): RoleTheme {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        badge: "MASTER ADMIN",
        title: "Shop Owners",
        subtitle:
          "Manage all registered shop owners and monitor activity, access state, and record validity.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };

    case ROLES.MANAGER:
      return {
        badge: "MANAGER",
        title: "Shop Owners",
        subtitle:
          "View and manage shop owner records within your assigned operational flow.",
        gradient: [COLORS.heroGreenDark, COLORS.primaryDark, COLORS.primary],
      };

    case ROLES.SUPERVISOR:
      return {
        badge: "SUPERVISOR",
        title: "Shop Owners",
        subtitle:
          "Track shop owner records, account status, and verification details clearly.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    case ROLES.STAFF:
      return {
        badge: "STAFF",
        title: "Shop Owners",
        subtitle:
          "Browse shop owner details and review their current account status.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    default:
      return {
        badge: "ACCOUNT",
        title: "Shop Owners",
        subtitle: "Browse shop owner records.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };
  }
}

function getShopOwnerApis(role?: string | null): { list: ApiConfig | null } {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
    case ROLES.MANAGER:
    case ROLES.SUPERVISOR:
    case ROLES.STAFF:
      return {
        list: SummaryApi.shopowner_list,
      };
    default:
      return {
        list: null,
      };
  }
}

function getInitials(name?: string, username?: string) {
  const value = (name || username || "SO").trim();
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getOwnerMetaLine(item: Owner) {
  const values = [item.email, item.mobile || item.additionalNumber].filter(Boolean);
  return values.length ? values.join(" • ") : "-";
}

export default function ShopOwnersList() {
  const router = useRouter();
  const navigation = useNavigation();
  const authCtx = useAuth() as unknown as AuthLike;
  const { width } = useWindowDimensions();

  const isSmall = width < 380;
  const isTablet = width >= 768;

  const token = authCtx?.accessToken || authCtx?.token || null;

  const rawUser =
    authCtx?.user ||
    (authCtx?.auth && typeof authCtx.auth === "object" && "user" in authCtx.auth
      ? (authCtx.auth as any)?.user
      : authCtx?.auth) ||
    null;

  const role = rawUser?.role || null;
  const roleLabel = getRoleLabel(role);
  const theme = getRoleTheme(role);
  const apis = getShopOwnerApis(role);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        if (!apis.list?.url) {
          throw new Error(`${roleLabel} shop owner list API is not configured`);
        }

        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const res = await fetch(apiUrl(apis.list.url), {
          method: apis.list.method || "GET",
          headers,
        });

        const json: any = await readJsonSafe(res);

        if (!res.ok || !json?.success) {
          throw new Error(getApiErrorMessage(json, `HTTP ${res.status}`));
        }

        setItems(normalizeList(json));
      } catch (err: any) {
        toastError(err?.message || "Failed to load shop owners");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apis.list, headers, roleLabel]
  );

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

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
        ...(x.businessTypes || []),
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

  const renderEmpty = () => (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 64,
      }}
    >
      <LinearGradient
        colors={[COLORS.soft, "#EEFDF0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 96,
          height: 96,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
        }}
      >
        <MaterialCommunityIcons
          name="account-group-outline"
          size={42}
          color={COLORS.mutedText}
        />
      </LinearGradient>

      <Text
        style={{
          marginTop: 20,
          fontSize: 18,
          fontWeight: "800",
          color: COLORS.primaryText,
        }}
      >
        No shop owners found
      </Text>

      <Text
        style={{
          marginTop: 8,
          textAlign: "center",
          fontSize: 14,
          lineHeight: 22,
          color: COLORS.secondaryText,
        }}
      >
        Try changing the search text or switch the filter tabs to view other records.
      </Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: Owner; index: number }) => {
    const status = getStatus(item);
    const shopCount = item.shopIds?.length || 0;
    const initials = getInitials(item.name, item.username);

    return (
      <View style={{ paddingHorizontal: isTablet ? 20 : 12 }}>
        <View
          style={{
            backgroundColor: COLORS.card,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: isSmall ? 8 : 10,
            paddingVertical: 2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: isSmall ? 88 : 96,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                width: isSmall ? 42 : 52,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  minWidth: 32,
                  height: 32,
                  paddingHorizontal: 8,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.primarySoft || COLORS.soft,
                }}
              >
                <Text
                  style={{
                    color: COLORS.primaryText,
                    fontWeight: "900",
                    fontSize: 11,
                  }}
                >
                  {index + 1}
                </Text>
              </View>
            </View>

            <View style={{ flex: 1.6, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <LinearGradient
                  colors={[COLORS.primaryDark, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: isSmall ? 38 : 42,
                    height: isSmall ? 38 : 42,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontSize: 12,
                      fontWeight: "900",
                    }}
                  >
                    {initials}
                  </Text>
                </LinearGradient>

                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: COLORS.primaryText,
                      fontWeight: "800",
                      fontSize: isSmall ? 13 : 14,
                    }}
                  >
                    {item.name || "-"}
                  </Text>

                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 4,
                      color: COLORS.secondaryText,
                      fontWeight: "600",
                      fontSize: isSmall ? 11 : 12,
                    }}
                  >
                    {getOwnerMetaLine(item)}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginTop: 8,
                  gap: 6,
                }}
              >
                <InfoPill
                  icon="storefront-outline"
                  label={`${shopCount} Shop${shopCount === 1 ? "" : "s"}`}
                />
                {!!item.verifyEmail && (
                  <InfoPill icon="email-check-outline" label="Email Verified" />
                )}
              </View>
            </View>

            <View style={{ flex: 1.2, paddingHorizontal: 4 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: COLORS.primaryText,
                  fontWeight: "700",
                  fontSize: isSmall ? 12 : 13,
                }}
              >
                @{item.username || "-"}
              </Text>

              <View
                style={{
                  alignSelf: "flex-start",
                  marginTop: 7,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: status.bg,
                  borderWidth: 1,
                  borderColor: status.border,
                  flexDirection: "row",
                  alignItems: "center",
                  maxWidth: "100%",
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    backgroundColor: status.dot,
                    marginRight: 6,
                  }}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color: status.text,
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  {status.label}
                </Text>
              </View>

              <Text
                numberOfLines={1}
                style={{
                  marginTop: 7,
                  color: COLORS.secondaryText,
                  fontSize: 10.5,
                  fontWeight: "700",
                }}
              >
                Valid till: {formatDate(item.validTo)}
              </Text>
            </View>

            <View
              style={{
                width: isSmall ? 58 : 70,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/components/shopOwners/ShopOwnerDetails",
                    params: { id: item._id },
                  } as any)
                }
                style={({ pressed }) => ({
                  width: isSmall ? 40 : 44,
                  height: isSmall ? 40 : 44,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed
                    ? COLORS.primarySoft || COLORS.soft
                    : COLORS.soft,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <MaterialCommunityIcons
                  name="eye-outline"
                  size={isSmall ? 18 : 20}
                  color={COLORS.primaryText}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const listHeader = (
    <>
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minHeight: isSmall ? 220 : 238,
          borderBottomLeftRadius: 34,
          borderBottomRightRadius: 34,
          overflow: "hidden",
          paddingHorizontal: isTablet ? 28 : 20,
          paddingTop: 12,
          paddingBottom: 26,
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -26,
            top: -32,
            width: 190,
            height: 190,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.10)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: -24,
            bottom: 10,
            width: 136,
            height: 136,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.10)",
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: isSmall ? 42 : 46,
              height: isSmall ? 42 : 46,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.10)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color={COLORS.white}
            />
          </Pressable>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => loadOwners(true)}
              disabled={loading}
              style={({ pressed }) => ({
                width: isSmall ? 42 : 46,
                height: isSmall ? 42 : 46,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.10)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                opacity: loading ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={22}
                color={COLORS.white}
              />
            </Pressable>

            <Pressable
              onPress={() => router.push("/components/shopOwners/create" as any)}
              style={({ pressed }) => ({
                width: isSmall ? 42 : 46,
                height: isSmall ? 42 : 46,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.15)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <MaterialCommunityIcons
                name="plus"
                size={22}
                color={COLORS.white}
              />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            marginTop: 22,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: COLORS.white,
                letterSpacing: 0.7,
                textAlign: "center",
              }}
            >
              {theme.badge}
            </Text>
          </View>

          <Text
            style={{
              marginTop: 14,
              fontSize: isSmall ? 26 : 30,
              fontWeight: "900",
              color: COLORS.white,
              textAlign: "center",
            }}
          >
            {theme.title}
          </Text>

          <Text
            style={{
              marginTop: 8,
              maxWidth: "92%",
              fontSize: isSmall ? 13 : 14,
              lineHeight: 22,
              color: "rgba(255,255,255,0.88)",
              textAlign: "center",
            }}
          >
            {theme.subtitle}
          </Text>

          <View
            style={{
              marginTop: 16,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.10)",
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: COLORS.white,
                fontSize: 12,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Role: {roleLabel}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ marginTop: -18, paddingHorizontal: isTablet ? 20 : 16 }}>
        <View
          style={{
            borderRadius: 28,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: isSmall ? 14 : 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 22,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: COLORS.white,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: COLORS.soft,
              }}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={22}
                color={COLORS.secondaryText}
              />
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, username, email, mobile..."
              placeholderTextColor={COLORS.labelText}
              style={{
                marginLeft: 12,
                flex: 1,
                paddingVertical: Platform.OS === "ios" ? 10 : 8,
                fontSize: isSmall ? 14 : 15,
                fontWeight: "600",
                color: COLORS.primaryText,
              }}
            />

            {!!query && (
              <Pressable
                onPress={() => setQuery("")}
                style={{
                  width: 32,
                  height: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: COLORS.soft,
                }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={COLORS.secondaryText}
                />
              </Pressable>
            )}
          </View>

          <View
            style={{
              marginTop: 16,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
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
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 22,
                paddingBottom: 8,
              }}
            >
              <LinearGradient
                colors={["#F0FDF4", "#DCFCE7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 82,
                  height: 82,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                }}
              >
                <ActivityIndicator size="large" color={COLORS.primary} />
              </LinearGradient>

              <Text
                style={{
                  marginTop: 16,
                  fontSize: 16,
                  fontWeight: "800",
                  color: COLORS.primaryText,
                }}
              >
                Loading shop owners...
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  textAlign: "center",
                  color: COLORS.secondaryText,
                }}
              >
                Please wait while the latest owner records are fetched.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {!loading && filtered.length > 0 ? (
        <View style={{ paddingHorizontal: isTablet ? 20 : 12, marginTop: 18 }}>
          <View
            style={{
              backgroundColor: "#EEF2F7",
              borderWidth: 1,
              borderColor: COLORS.border,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: isSmall ? 8 : 10,
              paddingVertical: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TableHead width={isSmall ? 42 : 52} label="S.No" center />
              <TableHead flex={1.6} label="Owner Details" />
              <TableHead flex={1.2} label="Username / Status" />
              <TableHead width={isSmall ? 58 : 70} label="View" center />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={["left", "right", "bottom"]}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => item._id || String(index)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 28,
          flexGrow: !loading && filtered.length === 0 ? 1 : undefined,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

function TableHead({
  label,
  width,
  flex,
  center,
}: {
  label: string;
  width?: number;
  flex?: number;
  center?: boolean;
}) {
  return (
    <View
      style={{
        width,
        flex,
        alignItems: center ? "center" : "flex-start",
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: COLORS.secondaryText,
          fontSize: 12,
          fontWeight: "800",
        }}
      >
        {label}
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
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        shadowColor: active ? COLORS.primary : COLORS.heroDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: active ? 0.12 : 0.03,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: active ? COLORS.primary : COLORS.white,
          borderWidth: 1,
          borderColor: active ? COLORS.primary : COLORS.border,
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={14}
          color={active ? COLORS.white : COLORS.secondaryText}
        />
        <Text
          style={{
            marginLeft: 5,
            fontSize: 12,
            fontWeight: "800",
            color: active ? COLORS.white : COLORS.primaryText,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function InfoPill({
  icon,
  label,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.soft,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={12}
        color={COLORS.secondaryText}
      />
      <Text
        style={{
          marginLeft: 4,
          color: COLORS.secondaryText,
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </View>
  );
}