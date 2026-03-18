import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

const apiUrl = (path: string) => `${baseURL}${path}`;

type ShopOwner = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: {
    type?: "MASTER" | "MANAGER" | "SUPERVISOR" | "STAFF" | string;
    id?: string | { $oid?: string };
    role?: "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF" | string;
    ref?: "Master" | "SubAdmin" | "Supervisor" | "Staff" | string;
  };
};

type GradientPair = readonly [string, string];

type AuthLike = {
  user?: any;
  auth?: any;
  token?: string | null;
  accessToken?: string | null;
};

type ActionItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  gradient: GradientPair;
  onPress: () => void;
  hidden?: boolean;
};

const PAGE_BG = "#EEF3F8";
const GLASS_BG = "rgba(255,255,255,0.12)";
const GLASS_BORDER = "rgba(255,255,255,0.18)";
const DARK_TEXT = COLORS.primaryText;
const MUTED_TEXT = COLORS.secondaryText;

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

function formatDate(date?: string) {
  if (!date) return "Recently added";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Recently added";

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeGradient(
  first?: string,
  second?: string,
  fallback: GradientPair = [COLORS.accent, COLORS.blue]
): GradientPair {
  const c1 = typeof first === "string" && first.trim() ? first : fallback[0];
  const c2 = typeof second === "string" && second.trim() ? second : fallback[1];
  return [c1, c2];
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

function getRolePermissions(role?: string | null) {
  const normalized = normalizeRole(role);

  return {
    canAddManager: normalized === ROLES.MASTER_ADMIN,
    canAddOwner: [
      ROLES.MASTER_ADMIN,
      ROLES.MANAGER,
      ROLES.SUPERVISOR,
      ROLES.STAFF,
    ].includes(normalized as any),
    canAddStaff: [
      ROLES.MASTER_ADMIN,
      ROLES.MANAGER,
      ROLES.SUPERVISOR,
    ].includes(normalized as any),
    canSeeManagersModule: normalized === ROLES.MASTER_ADMIN,
  };
}

function getRoleRoutes(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        shopOwnersList: "/master/(tabs)/shopOwners",
        staffList: "/master/(tabs)/staffs",
        managersList: "/master/(tabs)/Manager",
        createManager: "/components/Manager/create",
        createOwner: "/components/shopOwners/create",
        createStaff: "/components/staff/create",
        shopOwnerDetails: "/components/shopOwners/ShopOwnerDetails",
        settings: "/master/(tabs)/MySettings",
      };

    case ROLES.MANAGER:
      return {
        shopOwnersList: "/subadmin/(tabs)/shopOwners",
        staffList: "/subadmin/(tabs)/staffs",
        managersList: null,
        createManager: null,
        createOwner: "/components/shopOwners/create",
        createStaff: "/components/staff/create",
        shopOwnerDetails: "/components/shopOwners/ShopOwnerDetails",
        settings: "/subadmin/(tabs)/MySettings",
      };

    case ROLES.SUPERVISOR:
      return {
        shopOwnersList: "/supervisor/(tabs)/shopOwners",
        staffList: "/supervisor/(tabs)/staffs",
        managersList: null,
        createManager: null,
        createOwner: "/components/shopOwners/create",
        createStaff: "/components/staff/create",
        shopOwnerDetails: "/components/shopOwners/ShopOwnerDetails",
        settings: "/supervisor/(tabs)/MySettings",
      };

    case ROLES.STAFF:
      return {
        shopOwnersList: "/staff/(tabs)/shopOwners",
        staffList: "/staff/(tabs)/staffs",
        managersList: null,
        createManager: null,
        createOwner: "/components/shopOwners/create",
        createStaff: null,
        shopOwnerDetails: "/components/shopOwners/ShopOwnerDetails",
        settings: "/staff/(tabs)/MySettings",
      };

    default:
      return {
        shopOwnersList: "/Login",
        staffList: "/Login",
        managersList: null,
        createManager: null,
        createOwner: null,
        createStaff: null,
        shopOwnerDetails: "/Login",
        settings: "/Login",
      };
  }
}

function PremiumGlassCard({
  children,
  style,
  dark = false,
}: {
  children: React.ReactNode;
  style?: any;
  dark?: boolean;
}) {
  return (
    <View
      style={[
        styles.glassCard,
        dark ? styles.glassCardDark : styles.glassCardLight,
        style,
      ]}
    >
      {children}
    </View>
  );
}

function AnimatedEntrance({
  children,
  delay = 0,
  translateY = 16,
}: {
  children: React.ReactNode;
  delay?: number;
  translateY?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const moveY = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(moveY, {
        toValue: 0,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, moveY, opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY: moveY }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function PremiumActionTile({
  label,
  icon,
  gradient,
  onPress,
  itemWidth,
  iconSize,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  gradient: GradientPair;
  onPress: () => void;
  itemWidth: number;
  iconSize: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          styles.actionItem,
          {
            width: itemWidth,
            transform: [{ scale }],
          },
        ]}
      >
        <View
          style={[
            styles.actionIconShell,
            {
              width: iconSize,
              height: iconSize,
            },
          ]}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionIconGradient}
          >
            <MaterialCommunityIcons
              name={icon}
              size={iconSize < 58 ? 22 : 24}
              color={COLORS.white}
            />
          </LinearGradient>
        </View>

        <Text numberOfLines={2} style={styles.actionLabel}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function PremiumLightStat({
  label,
  value,
  icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  gradient: GradientPair;
}) {
  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.96)", "rgba(255,255,255,0.88)"]}
      style={styles.lightStatCard}
    >
      <LinearGradient colors={gradient} style={styles.lightStatIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={COLORS.white} />
      </LinearGradient>

      <Text style={styles.lightStatValue}>{value}</Text>
      <Text numberOfLines={2} style={styles.lightStatLabel}>
        {label}
      </Text>
    </LinearGradient>
  );
}

function PremiumGradientStat({
  label,
  value,
  icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  gradient: GradientPair;
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.premiumStatCard}
    >
      <View style={styles.premiumStatGlow1} />
      <View style={styles.premiumStatGlow2} />

      <View style={styles.premiumStatIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={COLORS.white} />
      </View>

      <Text style={styles.premiumStatValue}>{value}</Text>
      <Text numberOfLines={2} style={styles.premiumStatLabel}>
        {label}
      </Text>
    </LinearGradient>
  );
}

function PremiumOwnerRow({
  owner,
  onPress,
  showDivider,
}: {
  owner: ShopOwner;
  onPress: () => void;
  showDivider: boolean;
}) {
  const active = owner?.isActive !== false;
  const name = owner?.name || owner?.username || "Shop Owner";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.ownerRow,
        showDivider ? styles.ownerRowDivider : null,
      ]}
    >
      <LinearGradient
        colors={["#EEF4FF", "#E7EDFF"]}
        style={styles.ownerAvatar}
      >
        <MaterialCommunityIcons
          name="store-outline"
          size={20}
          color={COLORS.blue}
        />
      </LinearGradient>

      <View style={styles.ownerInfo}>
        <Text numberOfLines={1} style={styles.ownerName}>
          {name}
        </Text>

        <Text numberOfLines={1} style={styles.ownerEmail}>
          {owner?.email || "No email available"}
        </Text>

        <Text style={styles.ownerDate}>{formatDate(owner?.createdAt)}</Text>
      </View>

      <View
        style={[
          styles.ownerStatusWrap,
          {
            backgroundColor: active ? COLORS.activeBg : COLORS.inactiveBg,
          },
        ]}
      >
        <Text
          style={[
            styles.ownerStatusText,
            {
              color: active ? COLORS.activeText : COLORS.inactiveText,
            },
          ]}
        >
          {active ? "ACTIVE" : "INACTIVE"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MyDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const authCtx = useAuth() as unknown as AuthLike;
  const token = authCtx?.accessToken || authCtx?.token || null;

  const rawUser =
    authCtx?.user ||
    (authCtx?.auth &&
    typeof authCtx.auth === "object" &&
    "user" in authCtx.auth
      ? (authCtx.auth as any)?.user
      : authCtx?.auth) ||
    null;

  const currentRole = normalizeRole(rawUser?.role);
  const roleLabel = getRoleLabel(currentRole);
  const permissions = getRolePermissions(currentRole);
  const routes = getRoleRoutes(currentRole);

  const [loadingOwners, setLoadingOwners] = useState(false);
  const [owners, setOwners] = useState<ShopOwner[]>([]);

  const isSmallPhone = width < 350;
  const horizontalPadding = 16;
  const actionCardPadding = 14;
  const availableActionWidth =
    width - horizontalPadding * 1.5 - actionCardPadding * 3;
  const actionItemWidth = Math.floor(availableActionWidth / 3);
  const actionIconSize = isSmallPhone ? 60 : 60;
  const topPadding = Math.max(insets.top, 0);

  const fetchOwners = useCallback(async () => {
    if (!token) return;

    setLoadingOwners(true);

    try {
      const res = await fetch(apiUrl(SummaryApi.shopowner_list.url), {
        method: SummaryApi.shopowner_list.method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        toastError(data?.message || `Failed (${res.status})`);
        setOwners([]);
        return;
      }

      const list: ShopOwner[] =
        data?.data || data?.shopowners || data?.items || [];

      setOwners(Array.isArray(list) ? list : []);
    } catch (error: any) {
      toastError(error?.message || "Network error");
      setOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const {
    totalCount,
    activeCount,
    inactiveCount,
    recentOwners,
    managerCreatedCount,
    supervisorCreatedCount,
    staffCreatedCount,
  } = useMemo(() => {
    const safeOwners = Array.isArray(owners) ? owners : [];

    const activeOwners = safeOwners.filter((o) => o?.isActive !== false);
    const inactiveOwners = safeOwners.filter((o) => o?.isActive === false);

    const latestOwners = [...safeOwners]
      .sort((a, b) => {
        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5);

    const managerCreated = safeOwners.filter(
      (o) => normalizeRole(o?.createdBy?.role) === ROLES.MANAGER
    ).length;

    const supervisorCreated = safeOwners.filter(
      (o) => normalizeRole(o?.createdBy?.role) === ROLES.SUPERVISOR
    ).length;

    const staffCreated = safeOwners.filter(
      (o) => normalizeRole(o?.createdBy?.role) === ROLES.STAFF
    ).length;

    return {
      totalCount: safeOwners.length,
      activeCount: activeOwners.length,
      inactiveCount: inactiveOwners.length,
      recentOwners: latestOwners,
      managerCreatedCount: managerCreated,
      supervisorCreatedCount: supervisorCreated,
      staffCreatedCount: staffCreated,
    };
  }, [owners]);

  const goShopOwnerDetails = useCallback(
    (id: string) => {
      router.push({
        pathname: routes.shopOwnerDetails as any,
        params: { id },
      });
    },
    [router, routes.shopOwnerDetails]
  );

  const actionItems: ActionItem[] = [
    permissions.canAddManager && routes.createManager
      ? {
          key: "add-manager",
          label: "Add Manager",
          icon: "account-plus-outline",
          gradient: safeGradient("#7C3AED", "#4F46E5"),
          onPress: () => router.push(routes.createManager as any),
        }
      : null,

    permissions.canAddOwner && routes.createOwner
      ? {
          key: "add-owner",
          label: "Add Owner",
          icon: "store-plus-outline",
          gradient: safeGradient("#22C55E", "#15803D"),
          onPress: () => router.push(routes.createOwner as any),
        }
      : null,

    permissions.canAddStaff && routes.createStaff
      ? {
          key: "add-staff",
          label: "Add Staff",
          icon: "account-tie-outline",
          gradient: safeGradient("#F59E0B", "#EA580C"),
          onPress: () => router.push(routes.createStaff as any),
        }
      : null,

    {
      key: "owners-list",
      label: "Owners List",
      icon: "format-list-bulleted",
      gradient: safeGradient("#06B6D4", "#2563EB"),
      onPress: () => router.push(routes.shopOwnersList as any),
    },

    {
      key: "staff-list",
      label: "Staff List",
      icon: "account-group-outline",
      gradient: safeGradient("#EC4899", "#8B5CF6"),
      onPress: () => router.push(routes.staffList as any),
    },

    permissions.canSeeManagersModule && routes.managersList
      ? {
          key: "managers",
          label: "Managers",
          icon: "badge-account-outline",
          gradient: safeGradient("#10B981", "#0F766E"),
          onPress: () => router.push(routes.managersList as any),
        }
      : null,

    {
      key: "refresh",
      label: "Refresh",
      icon: "refresh",
      gradient: safeGradient("#0EA5E9", "#1D4ED8"),
      onPress: fetchOwners,
    },

    {
      key: "inactive",
      label: "Inactive",
      icon: "close-circle-outline",
      gradient: safeGradient("#EF4444", "#B91C1C"),
      onPress: () => router.push(routes.shopOwnersList as any),
    },

    {
      key: "settings",
      label: "Settings",
      icon: "cog-outline",
      gradient: safeGradient("#64748B", "#334155"),
      onPress: () => router.push(routes.settings as any),
    },
  ].filter(Boolean) as ActionItem[];

  const filledActionItems = [...actionItems];

  while (filledActionItems.length < 9) {
    filledActionItems.push({
      key: `empty-${filledActionItems.length}`,
      label: "",
      icon: "circle-outline",
      gradient: ["transparent", "transparent"],
      onPress: () => {},
      hidden: true,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AnimatedEntrance delay={0} translateY={12}>
          <LinearGradient
            colors={["#0F172A", "#111827", "#172554"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroHeader,
              {
                paddingHorizontal: horizontalPadding,
                paddingTop: topPadding,
              },
            ]}
          >
            <View style={styles.heroGlowPurple} />
            <View style={styles.heroGlowGreen} />
            <View style={styles.heroGlowBlue} />

            <View style={styles.headerTopRow}>
              <View style={styles.headerLeft}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.10)"]}
                  style={[
                    styles.headerAvatar,
                    {
                      width: isSmallPhone ? 40 : 40,
                      height: isSmallPhone ? 40 : 40,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={isSmallPhone ? 20 : 22}
                    color={COLORS.white}
                  />
                </LinearGradient>

                <View style={styles.headerTextWrap}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.headerTitle,
                      {
                        fontSize: isSmallPhone ? 20 : 26,
                      },
                    ]}
                  >
                    Dashboard
                  </Text>
                  <Text style={styles.headerSubtitle}>{roleLabel}</Text>
                </View>
              </View>

              <Pressable onPress={fetchOwners} style={styles.refreshBtn}>
                {loadingOwners ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <MaterialCommunityIcons
                    name="refresh"
                    size={20}
                    color={COLORS.white}
                  />
                )}
              </Pressable>
            </View>

            <PremiumGlassCard dark style={styles.heroSummaryCard}>
              <View style={styles.headerSummaryIcon}>
                <MaterialCommunityIcons
                  name="store-outline"
                  size={19}
                  color={COLORS.white}
                />
              </View>

              <View style={styles.headerSummaryTextWrap}>
                <Text style={styles.headerSummaryTitle}>Shop Owners</Text>
                <Text style={styles.headerSummarySubtitle}>
                  {activeCount} active · {inactiveCount} inactive
                </Text>
              </View>

              <Text style={styles.headerSummaryCount}>{totalCount}</Text>
            </PremiumGlassCard>
          </LinearGradient>
        </AnimatedEntrance>

        <AnimatedEntrance delay={80}>
          <View style={[styles.sectionWrap, { paddingHorizontal: horizontalPadding }]}>
            <View style={styles.rowGap12}>
              <PremiumLightStat
                label="Total Owners"
                value={totalCount}
                icon="store-outline"
                gradient={["#4F46E5", "#2563EB"]}
              />
              <PremiumLightStat
                label="Active Owners"
                value={activeCount}
                icon="check-decagram-outline"
                gradient={["#16A34A", "#22C55E"]}
              />
            </View>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance delay={140}>
          <View style={[styles.sectionOuter, { marginHorizontal: horizontalPadding }]}>
            <PremiumGlassCard style={styles.actionsCard}>
              <View style={styles.actionsHeaderRow}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>

              <View style={styles.quickGrid}>
                {filledActionItems.map((item) =>
                  item.hidden ? (
                    <View
                      key={item.key}
                      style={{ width: actionItemWidth, marginBottom: 18 }}
                    />
                  ) : (
                    <PremiumActionTile
                      key={item.key}
                      label={item.label}
                      icon={item.icon}
                      gradient={item.gradient}
                      onPress={item.onPress}
                      itemWidth={actionItemWidth}
                      iconSize={actionIconSize}
                    />
                  )
                )}
              </View>
            </PremiumGlassCard>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance delay={220}>
          <View style={[styles.sectionWrap, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.rowGap12, styles.mb12]}>
              <PremiumGradientStat
                label="Manager Created"
                value={managerCreatedCount}
                icon="account-tie-outline"
                gradient={["#7C3AED", "#5B21B6"]}
              />
              <PremiumGradientStat
                label="Supervisor Created"
                value={supervisorCreatedCount}
                icon="account-supervisor-outline"
                gradient={["#F59E0B", "#EA580C"]}
              />
            </View>

            <View style={styles.rowGap12}>
              <PremiumGradientStat
                label="Staff Created"
                value={staffCreatedCount}
                icon="account-outline"
                gradient={["#EC4899", "#BE185D"]}
              />
              <PremiumGradientStat
                label="Inactive Owners"
                value={inactiveCount}
                icon="close-circle-outline"
                gradient={["#EF4444", "#B91C1C"]}
              />
            </View>
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance delay={300}>
          <View style={[styles.sectionOuter, { marginHorizontal: horizontalPadding }]}>
            <PremiumGlassCard style={styles.listCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Shop Owners</Text>

                <Pressable onPress={() => router.push(routes.shopOwnersList as any)}>
                  <Text style={styles.viewAllText}>View All</Text>
                </Pressable>
              </View>

              {loadingOwners ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={COLORS.blue} />
                  <Text style={styles.loadingText}>Loading shop owners...</Text>
                </View>
              ) : recentOwners.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <MaterialCommunityIcons
                    name="database-off-outline"
                    size={30}
                    color="#98A0B3"
                  />
                  <Text style={styles.emptyTitle}>No shop owners found</Text>
                  <Text style={styles.emptySubtitle}>
                    Add a new owner or refresh the data
                  </Text>
                </View>
              ) : (
                recentOwners.map((owner, index) => (
                  <PremiumOwnerRow
                    key={owner._id}
                    owner={owner}
                    onPress={() => goShopOwnerDetails(owner._id)}
                    showDivider={index !== recentOwners.length - 1}
                  />
                ))
              )}
            </PremiumGlassCard>
          </View>
        </AnimatedEntrance>
      </ScrollView>
    </SafeAreaView>
  );
}

const shadowCard = Platform.select({
  ios: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  android: {
    elevation: 8,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },

  scrollContent: {
    paddingBottom: 36,
  },

  heroHeader: {
    paddingBottom: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },

  heroGlowPurple: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
    top: -60,
    right: -40,
  },

  heroGlowGreen: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.14)",
    bottom: -60,
    left: -30,
  },

  heroGlowBlue: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.14)",
    top: 90,
    right: 90,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },

  headerAvatar: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },

  headerTextWrap: {
    flex: 1,
  },

  headerTitle: {
    color: COLORS.white,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },

  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },

  glassCard: {
    borderWidth: 1,
    ...shadowCard,
  },

  glassCardLight: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,255,255,0.85)",
  },

  glassCardDark: {
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
  },

  heroSummaryCard: {
    marginTop: 18,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  headerSummaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerSummaryTextWrap: {
    flex: 1,
  },

  headerSummaryTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },

  headerSummarySubtitle: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    marginTop: 2,
  },

  headerSummaryCount: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "900",
  },

  sectionWrap: {
    marginTop: 16,
  },

  sectionOuter: {
    marginTop: 16,
  },

  rowGap12: {
    flexDirection: "row",
    gap: 12,
  },

  mb12: {
    marginBottom: 12,
  },

  lightStatCard: {
    flex: 1,
    minHeight: 98,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    ...shadowCard,
  },

  lightStatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  lightStatValue: {
    fontSize: 23,
    fontWeight: "900",
    color: DARK_TEXT,
    lineHeight: 28,
  },

  lightStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MUTED_TEXT,
    marginTop: 2,
    lineHeight: 15,
  },

  actionsCard: {
    borderRadius: 24,
    padding: 16,
  },

  actionsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DARK_TEXT,
  },

  sectionHint: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.labelText,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  actionItem: {
    alignItems: "center",
    marginBottom: 18,
  },

  actionIconShell: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 9,
    ...shadowCard,
  },

  actionIconGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#31343C",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 4,
    minHeight: 32,
  },

  premiumStatCard: {
    flex: 1,
    minHeight: 102,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: "hidden",
    ...shadowCard,
  },

  premiumStatGlow1: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    top: -20,
    right: -20,
  },

  premiumStatGlow2: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    bottom: -15,
    left: -10,
  },

  premiumStatIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  premiumStatValue: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
  },

  premiumStatLabel: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    lineHeight: 15,
  },

  listCard: {
    borderRadius: 24,
    padding: 16,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  viewAllText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.blue,
  },

  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: MUTED_TEXT,
    fontSize: 12,
  },

  emptyWrap: {
    paddingVertical: 26,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "800",
    color: DARK_TEXT,
  },

  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: MUTED_TEXT,
  },

  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  ownerRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#EFF3F8",
  },

  ownerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  ownerInfo: {
    flex: 1,
  },

  ownerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#161A23",
  },

  ownerEmail: {
    fontSize: 12,
    color: "#707585",
    marginTop: 3,
  },

  ownerDate: {
    fontSize: 11,
    color: "#9AA0AE",
    marginTop: 3,
  },

  ownerStatusWrap: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginLeft: 10,
  },

  ownerStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
});