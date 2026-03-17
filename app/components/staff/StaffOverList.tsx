// app/components/staff/StaffOverList.tsx
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
  Image,
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

const apiUrl = (path: string) => `${baseURL}${path}`;

type StaffRole = "STAFF" | "SUPERVISOR" | string;
type CreatorType = "MASTER" | "MANAGER" | "SUPERVISOR" | string;
type CreatorRole = "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | string;

type StaffItem = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  roles?: StaffRole[];
  isActive?: boolean;
  createdAt?: string;
  createdBy?: {
    _id?: string;
    id?: string;
    name?: string;
    type?: CreatorType;
    role?: CreatorRole;
  };
};

type StaffPayload = {
  success?: boolean;
  data?: StaffItem[];
  message?: string;
};

type FilterType = "ALL" | "ACTIVE" | "INACTIVE" | "STAFF" | "SUPERVISOR";

type RoleTheme = {
  badge: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string, ...string[]];
};

function toastError(message: string) {
  Toast.show({
    type: "error",
    text1: "Error",
    text2: message,
  });
}

async function readResponse<T = unknown>(res: Response): Promise<{
  text: string;
  json: T | null;
}> {
  const text = await res.text();

  try {
    return { text, json: JSON.parse(text) as T };
  } catch {
    return { text, json: null };
  }
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
        title: "Staff Management",
        subtitle:
          "Manage supervisors and staff accounts with complete administrative control.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };

    case ROLES.MANAGER:
      return {
        badge: "MANAGER",
        title: "Staff Management",
        subtitle:
          "Manage records created under your own operational hierarchy.",
        gradient: [COLORS.heroGreenDark, COLORS.primaryDark, COLORS.primary],
      };

    case ROLES.SUPERVISOR:
      return {
        badge: "SUPERVISOR",
        title: "Staff Team",
        subtitle:
          "Manage staff members created under your supervision with restricted role access.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    case ROLES.STAFF:
      return {
        badge: "STAFF",
        title: "Staff Directory",
        subtitle:
          "Browse the current staff directory and review available team information.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    default:
      return {
        badge: "ACCOUNT",
        title: "Staff",
        subtitle: "Browse staff records.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };
  }
}

function getInitials(name?: string, username?: string) {
  const value = (name || username || "ST").trim();
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function getPrimaryStaffRole(item?: StaffItem) {
  if (item?.roles?.includes("SUPERVISOR")) return "SUPERVISOR";
  if (item?.roles?.includes("STAFF")) return "STAFF";
  return "-";
}

function getStatusConfig(item: StaffItem) {
  if (item.isActive) {
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
    bg: "#FEF2F2",
    text: "#B91C1C",
    border: "#FECACA",
    dot: COLORS.danger,
  };
}

function canViewDetails(currentRole?: string | null) {
  const role = normalizeRole(currentRole);

  return (
    role === ROLES.MASTER_ADMIN ||
    role === ROLES.MANAGER ||
    role === ROLES.SUPERVISOR
  );
}

function canCreate(currentRole?: string | null) {
  const role = normalizeRole(currentRole);

  return (
    role === ROLES.MASTER_ADMIN ||
    role === ROLES.MANAGER ||
    role === ROLES.SUPERVISOR
  );
}

function getCreateAllowedRoles(currentRole?: string | null) {
  const role = normalizeRole(currentRole);

  if (role === ROLES.MASTER_ADMIN || role === ROLES.MANAGER) {
    return ["STAFF", "SUPERVISOR"];
  }

  if (role === ROLES.SUPERVISOR) {
    return ["STAFF"];
  }

  return [];
}

function getCreatorId(item?: StaffItem) {
  return item?.createdBy?._id || item?.createdBy?.id || null;
}

function canSeeItemByCreator(
  currentRole?: string | null,
  currentUserId?: string | null,
  item?: StaffItem
) {
  const role = normalizeRole(currentRole);
  const creatorId = getCreatorId(item);

  if (role === ROLES.MASTER_ADMIN) return true;

  if (role === ROLES.MANAGER || role === ROLES.SUPERVISOR) {
    if (!currentUserId) return false;
    return creatorId === currentUserId;
  }

  return false;
}

function AvatarCell({
  avatarUrl,
  name,
  username,
  size = 46,
}: {
  avatarUrl?: string;
  name?: string;
  username?: string;
  size?: number;
}) {
  const initials = getInitials(name, username);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.soft,
      }}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: COLORS.white,
              fontWeight: "900",
              fontSize: size < 44 ? 12 : 13,
            }}
          >
            {initials}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

export default function StaffOverList() {
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { token, user, isReady, loading: authLoading } = useAuth();

  const isSmallScreen = width < 380;
  const isTablet = width >= 768;

  const currentRole = useMemo(() => {
    const rawRole = user?.role || user?.roles?.[0] || null;
    return normalizeRole(rawRole);
  }, [user]);

  const currentUserId = useMemo(() => {
    return user?._id || user?.id || null;
  }, [user]);

  const roleLabel = getRoleLabel(currentRole);
  const theme = getRoleTheme(currentRole);
  const allowedCreateRoles = getCreateAllowedRoles(currentRole);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<StaffItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("ALL");

  const headers = useMemo(() => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      h.Authorization = `Bearer ${token}`;
    }

    return h;
  }, [token]);

  const loadStaff = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const res = await fetch(apiUrl(SummaryApi.staff_list.url), {
          method: SummaryApi.staff_list.method || "GET",
          headers,
        });

        const { text, json } = await readResponse<StaffPayload>(res);

        if (!res.ok || !json?.success) {
          if (!json) {
            console.log("RAW_STAFF_LIST_RESPONSE:", text);
          }
          throw new Error(json?.message || `HTTP ${res.status}`);
        }

        setItems(Array.isArray(json.data) ? json.data : []);
      } catch (err: any) {
        toastError(err?.message || "Failed to load staff list");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [headers]
  );

  useEffect(() => {
    if (isReady && !authLoading) {
      loadStaff();
    }
  }, [isReady, authLoading, loadStaff]);

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  const visibleItems = useMemo(() => {
    return items.filter((item) =>
      canSeeItemByCreator(currentRole, currentUserId, item)
    );
  }, [items, currentRole, currentUserId]);

  const searchedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleItems;

    return visibleItems.filter((item) => {
      const blob = [
        item.name,
        item.username,
        item.email,
        item.mobile,
        item.additionalNumber,
        ...(item.roles || []),
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return blob.includes(q);
    });
  }, [visibleItems, query]);

  const filtered = useMemo(() => {
    switch (selectedFilter) {
      case "ACTIVE":
        return searchedItems.filter((item) => !!item.isActive);
      case "INACTIVE":
        return searchedItems.filter((item) => !item.isActive);
      case "STAFF":
        return searchedItems.filter(
          (item) => getPrimaryStaffRole(item) === "STAFF"
        );
      case "SUPERVISOR":
        return searchedItems.filter(
          (item) => getPrimaryStaffRole(item) === "SUPERVISOR"
        );
      case "ALL":
      default:
        return searchedItems;
    }
  }, [searchedItems, selectedFilter]);

  const totalCount = visibleItems.length;
  const activeCount = visibleItems.filter((item) => !!item.isActive).length;
  const inactiveCount = visibleItems.filter((item) => !item.isActive).length;
  const staffCount = visibleItems.filter(
    (item) => getPrimaryStaffRole(item) === "STAFF"
  ).length;
  const supervisorCount = visibleItems.filter(
    (item) => getPrimaryStaffRole(item) === "SUPERVISOR"
  ).length;

  const onRefresh = useCallback(() => {
    loadStaff(true);
  }, [loadStaff]);

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
        colors={[COLORS.soft, COLORS.successSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 96,
          height: 96,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
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
          marginTop: 18,
          fontSize: 18,
          fontWeight: "900",
          color: COLORS.primaryText,
        }}
      >
        No staff found
      </Text>

      <Text
        style={{
          marginTop: 8,
          textAlign: "center",
          color: COLORS.secondaryText,
          lineHeight: 22,
        }}
      >
        Try changing your search or filter selection to view matching staff
        records.
      </Text>
    </View>
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: StaffItem;
    index: number;
  }) => {
    const status = getStatusConfig(item);
    const allowDetails =
      canViewDetails(currentRole) &&
      normalizeRole(currentRole) !== ROLES.STAFF;

    return (
      <View style={{ paddingHorizontal: isTablet ? 20 : 14 }}>
        <View
          style={{
            backgroundColor: COLORS.card,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: isSmallScreen ? 8 : 10,
            paddingVertical: 2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: isSmallScreen ? 82 : 88,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                width: isSmallScreen ? 40 : 50,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  minWidth: isSmallScreen ? 30 : 34,
                  height: isSmallScreen ? 30 : 34,
                  paddingHorizontal: 8,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.primarySoft || COLORS.soft,
                }}
              >
                <Text
                  style={{
                    fontSize: isSmallScreen ? 11 : 12,
                    fontWeight: "900",
                    color: COLORS.primaryText,
                  }}
                >
                  {index + 1}
                </Text>
              </View>
            </View>

            <View style={{ flex: 1.8, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <AvatarCell
                  avatarUrl={item.avatarUrl}
                  name={item.name}
                  username={item.username}
                  size={isSmallScreen ? 40 : 46}
                />

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: COLORS.primaryText,
                      fontWeight: "800",
                      fontSize: isSmallScreen ? 13 : 14,
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
                      fontSize: isSmallScreen ? 11 : 12,
                    }}
                  >
                    {getPrimaryStaffRole(item)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1.15, paddingHorizontal: 4 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: COLORS.primaryText,
                  fontWeight: "700",
                  fontSize: isSmallScreen ? 12 : 13,
                }}
              >
                @{item.username || "-"}
              </Text>

              <View
                style={{
                  alignSelf: "flex-start",
                  marginTop: 7,
                  paddingHorizontal: isSmallScreen ? 8 : 10,
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
                    fontSize: isSmallScreen ? 10 : 11,
                    fontWeight: "800",
                  }}
                >
                  {status.label}
                </Text>
              </View>
            </View>

            <View
              style={{
                width: isSmallScreen ? 52 : 70,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {allowDetails ? (
                <ActionButton
                  icon="eye-outline"
                  color="#2563EB"
                  bg="#EFF6FF"
                  border="#BFDBFE"
                  size={isSmallScreen ? 34 : 36}
                  iconSize={isSmallScreen ? 17 : 18}
                  onPress={() =>
                    router.push({
                      pathname: "/components/staff/staffDetails",
                      params: { id: item._id },
                    } as never)
                  }
                />
              ) : (
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  -
                </Text>
              )}
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
          minHeight: isSmallScreen ? 220 : 240,
          borderBottomLeftRadius: 34,
          borderBottomRightRadius: 34,
          overflow: "hidden",
          paddingHorizontal: isTablet ? 24 : 20,
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
              width: 46,
              height: 46,
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

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Pressable
              onPress={() => loadStaff(true)}
              disabled={loading}
              style={({ pressed }) => ({
                width: 46,
                height: 46,
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

            {canCreate(currentRole) ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/components/staff/create",
                    params: {
                      allowedRoles: JSON.stringify(allowedCreateRoles),
                    },
                  } as never)
                }
                style={({ pressed }) => ({
                  width: 46,
                  height: 46,
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
            ) : null}
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
              fontSize: isSmallScreen ? 24 : 30,
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
              fontSize: isSmallScreen ? 13 : 14,
              lineHeight: isSmallScreen ? 20 : 22,
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

      <View
        style={{
          marginTop: -18,
          paddingHorizontal: isTablet ? 20 : 16,
        }}
      >
        <View
          style={{
            borderRadius: 28,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: isSmallScreen ? 12 : 16,
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
                fontSize: isSmallScreen ? 14 : 15,
                fontWeight: "600",
                color: COLORS.primaryText,
              }}
            />

            {query.trim().length > 0 ? (
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
            ) : null}
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
              small={isSmallScreen}
            />
            <FilterChip
              label={`Active (${activeCount})`}
              icon="check-decagram-outline"
              active={selectedFilter === "ACTIVE"}
              onPress={() => setSelectedFilter("ACTIVE")}
              small={isSmallScreen}
            />
            <FilterChip
              label={`Inactive (${inactiveCount})`}
              icon="pause-circle-outline"
              active={selectedFilter === "INACTIVE"}
              onPress={() => setSelectedFilter("INACTIVE")}
              small={isSmallScreen}
            />
            <FilterChip
              label={`Staff (${staffCount})`}
              icon="account-badge-outline"
              active={selectedFilter === "STAFF"}
              onPress={() => setSelectedFilter("STAFF")}
              small={isSmallScreen}
            />
            <FilterChip
              label={`Supervisor (${supervisorCount})`}
              icon="shield-account-outline"
              active={selectedFilter === "SUPERVISOR"}
              onPress={() => setSelectedFilter("SUPERVISOR")}
              small={isSmallScreen}
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
                Loading staff records...
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  textAlign: "center",
                  color: COLORS.secondaryText,
                }}
              >
                Please wait while the latest staff records are fetched.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {!loading && filtered.length > 0 ? (
        <View
          style={{
            paddingHorizontal: isTablet ? 20 : 14,
            marginTop: 18,
          }}
        >
          <View
            style={{
              backgroundColor: "#EEF2F7",
              borderWidth: 1,
              borderColor: COLORS.border,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: isSmallScreen ? 8 : 10,
              paddingVertical: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TableHead width={isSmallScreen ? 40 : 50} label="S.No" center />
              <TableHead flex={1.8} label="Staff" />
              <TableHead flex={1.15} label="Username / Status" />
              <TableHead width={isSmallScreen ? 52 : 70} label="Action" center />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );

  if (!isReady || authLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["left", "right", "bottom"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text
            style={{
              marginTop: 14,
              color: COLORS.secondaryText,
              fontWeight: "600",
            }}
          >
            Loading authentication...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
  small,
}: {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  active: boolean;
  onPress: () => void;
  small?: boolean;
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
          paddingHorizontal: small ? 10 : 12,
          paddingVertical: small ? 7 : 8,
          backgroundColor: active ? COLORS.primary : COLORS.white,
          borderWidth: 1,
          borderColor: active ? COLORS.primary : COLORS.border,
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={small ? 13 : 14}
          color={active ? COLORS.white : COLORS.secondaryText}
        />

        <Text
          style={{
            marginLeft: 5,
            fontSize: small ? 11 : 12,
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

function ActionButton({
  icon,
  color,
  bg,
  border,
  onPress,
  disabled,
  size = 36,
  iconSize = 18,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  bg: string;
  border: string;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  iconSize?: number;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <MaterialCommunityIcons name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}