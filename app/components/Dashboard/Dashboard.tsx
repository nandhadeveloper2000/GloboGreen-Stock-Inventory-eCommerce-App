import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  fallback: GradientPair = [COLORS.primaryLight, COLORS.primary]
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

function getDashboardTheme(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        badge: "MASTER DASHBOARD",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark] as GradientPair,
      };

    case ROLES.MANAGER:
      return {
        badge: "MANAGER DASHBOARD",
        gradient: [COLORS.heroGreenDark, COLORS.primaryDark] as GradientPair,
      };

    case ROLES.SUPERVISOR:
      return {
        badge: "SUPERVISOR DASHBOARD",
        gradient: [COLORS.primaryDark, COLORS.successDark] as GradientPair,
      };

    case ROLES.STAFF:
      return {
        badge: "STAFF DASHBOARD",
        gradient: [COLORS.primaryDark, COLORS.successDark] as GradientPair,
      };

    default:
      return {
        badge: "DASHBOARD",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark] as GradientPair,
      };
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
    isMasterAdmin: normalized === ROLES.MASTER_ADMIN,
  };
}

function getRoleRoutes(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        shopOwnersList: "/master/(tabs)/shopOwners",
        staffList: "/master/(tabs)/staffs",
        managersList: "/master/(tabs)/managers",
        createManager: "/components/subadmin/create",
        createOwner: "/components/shopOwners/create",
        createStaff: "/components/staff/create",
        shopOwnerDetails: "/components/shopOwners/ShopOwnerDetails",
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
      };
  }
}

function SectionTitle({
  title,
  actionText,
  onAction,
}: {
  title: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          color: COLORS.heading,
          fontSize: 19,
          fontWeight: "800",
        }}
      >
        {title}
      </Text>

      {!!actionText && !!onAction && (
        <Pressable
          onPress={onAction}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: COLORS.soft,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text
            style={{
              color: COLORS.primary,
              fontWeight: "800",
              fontSize: 12,
            }}
          >
            {actionText}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function PremiumShell({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 28,
        shadowColor: COLORS.heroDark,
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function CompactStatCard({
  label,
  value,
  icon,
  gradient,
  onPress,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  gradient: GradientPair;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
      <PremiumShell>
        <View style={{ padding: 16 }}>
          <View
            style={{
              height: 46,
              width: 46,
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name={icon}
                size={22}
                color={COLORS.white}
              />
            </LinearGradient>
          </View>

          <Text
            style={{
              color: COLORS.secondaryText,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {label}
          </Text>

          <Text
            style={{
              color: COLORS.heading,
              fontSize: 28,
              fontWeight: "900",
              marginTop: 4,
            }}
          >
            {value}
          </Text>
        </View>
      </PremiumShell>
    </Pressable>
  );
}

function AirtelActionTile({
  label,
  icon,
  gradient,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  gradient: GradientPair;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <PremiumShell>
        <View
          style={{
            minHeight: 122,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 10,
            paddingVertical: 16,
          }}
        >
          <View
            style={{
              height: 56,
              width: 56,
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name={icon}
                size={25}
                color={COLORS.white}
              />
            </LinearGradient>
          </View>

          <Text
            style={{
              color: COLORS.heading,
              fontSize: 13,
              fontWeight: "800",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            {label}
          </Text>
        </View>
      </PremiumShell>
    </Pressable>
  );
}

function SettingsStyleRow({
  title,
  subtitle,
  icon,
  gradient,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  gradient: GradientPair;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 12 }}>
      <PremiumShell>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              height: 54,
              width: 54,
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name={icon}
                size={25}
                color={COLORS.white}
              />
            </LinearGradient>
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text
              style={{
                color: COLORS.heading,
                fontSize: 16,
                fontWeight: "800",
              }}
            >
              {title}
            </Text>

            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: 12,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              {subtitle}
            </Text>
          </View>

          <View
            style={{
              height: 38,
              width: 38,
              borderRadius: 999,
              backgroundColor: COLORS.soft,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={COLORS.primaryText}
            />
          </View>
        </View>
      </PremiumShell>
    </Pressable>
  );
}

export default function MyDashboard() {
  const router = useRouter();
  const authCtx = useAuth() as unknown as AuthLike;
  const token = authCtx?.accessToken || authCtx?.token || null;

  const rawUser =
    authCtx?.user ||
    (authCtx?.auth && typeof authCtx.auth === "object" && "user" in authCtx.auth
      ? (authCtx.auth as any)?.user
      : authCtx?.auth) ||
    null;

  const currentRole = normalizeRole(rawUser?.role);
  const roleLabel = getRoleLabel(currentRole);
  const theme = getDashboardTheme(currentRole);
  const permissions = getRolePermissions(currentRole);
  const routes = getRoleRoutes(currentRole);

  const [loadingOwners, setLoadingOwners] = useState(false);
  const [owners, setOwners] = useState<ShopOwner[]>([]);

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
    masterCreatedCount,
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

    const masterCreated = safeOwners.filter(
      (o) => o?.createdBy?.role === "MASTER_ADMIN"
    ).length;

    const managerCreated = safeOwners.filter(
      (o) => o?.createdBy?.role === "MANAGER"
    ).length;

    const supervisorCreated = safeOwners.filter(
      (o) => o?.createdBy?.role === "SUPERVISOR"
    ).length;

    const staffCreated = safeOwners.filter(
      (o) => o?.createdBy?.role === "STAFF"
    ).length;

    return {
      totalCount: safeOwners.length,
      activeCount: activeOwners.length,
      inactiveCount: inactiveOwners.length,
      recentOwners: latestOwners,
      masterCreatedCount: masterCreated,
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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={["top"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroDark} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 40,
        }}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 32,
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 20,
            overflow: "hidden",
            marginBottom: 22,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -25,
              right: -18,
              width: 150,
              height: 150,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -36,
              left: -20,
              width: 125,
              height: 125,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.07)",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 86,
              right: 54,
              width: 56,
              height: 56,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.12)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 11,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {theme.badge}
              </Text>
            </View>

            <Pressable
              onPress={fetchOwners}
              style={{
                height: 46,
                width: 46,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.12)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              {loadingOwners ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <MaterialCommunityIcons
                  name="refresh"
                  size={21}
                  color={COLORS.white}
                />
              )}
            </Pressable>
          </View>

          <Text
            style={{
              color: COLORS.white,
              fontSize: 30,
              fontWeight: "900",
              marginTop: 18,
            }}
          >
            Welcome
          </Text>

          <Text
            style={{
              color: "rgba(255,255,255,0.86)",
              fontSize: 14,
              marginTop: 4,
            }}
          >
            {roleLabel}
          </Text>

          <View
            style={{
              marginTop: 22,
              flexDirection: "row",
              backgroundColor: "rgba(255,255,255,0.10)",
              borderRadius: 22,
              padding: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#CFFFE1",
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                Total Owners
              </Text>
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 28,
                  fontWeight: "900",
                  marginTop: 4,
                }}
              >
                {totalCount}
              </Text>
            </View>

            <View
              style={{
                width: 1,
                backgroundColor: "rgba(255,255,255,0.16)",
                marginHorizontal: 14,
              }}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#CFFFE1",
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                Active Owners
              </Text>
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 28,
                  fontWeight: "900",
                  marginTop: 4,
                }}
              >
                {activeCount}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ marginBottom: 22 }}>
          <SectionTitle title="Overview" />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <CompactStatCard
              label="Active"
              value={activeCount}
              icon="check-decagram-outline"
              gradient={safeGradient(COLORS.successLight, COLORS.successDark)}
              onPress={() => router.push(routes.shopOwnersList as any)}
            />
            <CompactStatCard
              label="Inactive"
              value={inactiveCount}
              icon="close-circle-outline"
              gradient={safeGradient(COLORS.warning, COLORS.danger)}
              onPress={() => router.push(routes.shopOwnersList as any)}
            />
          </View>
        </View>

        {permissions.isMasterAdmin ? (
          <View style={{ marginBottom: 22 }}>
            <SectionTitle title="Created By Role Counts" />

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              <CompactStatCard
                label="Master Created"
                value={masterCreatedCount}
                icon="shield-crown-outline"
                gradient={safeGradient(COLORS.primaryLight, COLORS.primary)}
                onPress={() => router.push(routes.shopOwnersList as any)}
              />
              <CompactStatCard
                label="Manager Created"
                value={managerCreatedCount}
                icon="account-tie-outline"
                gradient={safeGradient(COLORS.successLight, COLORS.successDark)}
                onPress={() => router.push(routes.shopOwnersList as any)}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <CompactStatCard
                label="Supervisor Created"
                value={supervisorCreatedCount}
                icon="account-supervisor-outline"
                gradient={safeGradient(COLORS.accentLight, COLORS.accent)}
                onPress={() => router.push(routes.shopOwnersList as any)}
              />
              <CompactStatCard
                label="Staff Created"
                value={staffCreatedCount}
                icon="account-outline"
                gradient={safeGradient(COLORS.warning, COLORS.danger)}
                onPress={() => router.push(routes.shopOwnersList as any)}
              />
            </View>
          </View>
        ) : null}

        <View style={{ marginBottom: 22 }}>
          <SectionTitle title="Quick Actions" />

          <View style={{ flexDirection: "row", gap: 12 }}>
            {permissions.canAddManager && routes.createManager ? (
              <AirtelActionTile
                label="Add Manager"
                icon="account-plus-outline"
                gradient={safeGradient(COLORS.primaryLight, COLORS.primary)}
                onPress={() => router.push(routes.createManager as any)}
              />
            ) : null}

            {permissions.canAddOwner && routes.createOwner ? (
              <AirtelActionTile
                label="Add Owner"
                icon="store-plus-outline"
                gradient={safeGradient(COLORS.successLight, COLORS.successDark)}
                onPress={() => router.push(routes.createOwner as any)}
              />
            ) : null}

            {permissions.canAddStaff && routes.createStaff ? (
              <AirtelActionTile
                label="Add Staff"
                icon="account-tie-outline"
                gradient={safeGradient(COLORS.accentLight, COLORS.accent)}
                onPress={() => router.push(routes.createStaff as any)}
              />
            ) : null}
          </View>
        </View>

        <View style={{ marginBottom: 22 }}>
          <SectionTitle
            title="Recent Shop Owners"
            actionText="View All"
            onAction={() => router.push(routes.shopOwnersList as any)}
          />

          <PremiumShell>
            <View style={{ padding: 14 }}>
              {loadingOwners ? (
                <View
                  style={{
                    paddingVertical: 36,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator size="large" color={COLORS.success} />
                  <Text
                    style={{
                      color: COLORS.secondaryText,
                      marginTop: 12,
                      fontSize: 13,
                    }}
                  >
                    Loading shop owners...
                  </Text>
                </View>
              ) : recentOwners.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 34,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      height: 62,
                      width: 62,
                      borderRadius: 999,
                      backgroundColor: COLORS.soft,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="database-off-outline"
                      size={28}
                      color={COLORS.secondaryText}
                    />
                  </View>

                  <Text
                    style={{
                      color: COLORS.heading,
                      fontWeight: "800",
                      fontSize: 15,
                    }}
                  >
                    No shop owners found
                  </Text>

                  <Text
                    style={{
                      color: COLORS.secondaryText,
                      fontSize: 12,
                      marginTop: 4,
                      textAlign: "center",
                    }}
                  >
                    Pull fresh data or add a new owner.
                  </Text>
                </View>
              ) : (
                recentOwners.map((o, index) => {
                  const name = o?.name || o?.username || "Shop Owner";
                  const active = o?.isActive !== false;

                  return (
                    <Pressable
                      key={o._id}
                      onPress={() => goShopOwnerDetails(o._id)}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth:
                          index !== recentOwners.length - 1 ? 1 : 0,
                        borderBottomColor: COLORS.divider,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            height: 50,
                            width: 50,
                            borderRadius: 18,
                            overflow: "hidden",
                            marginRight: 12,
                          }}
                        >
                          <LinearGradient
                            colors={safeGradient(
                              COLORS.primarySoft,
                              COLORS.primarySoft2
                            )}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              flex: 1,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <MaterialCommunityIcons
                              name="account-circle-outline"
                              size={24}
                              color={COLORS.primary}
                            />
                          </LinearGradient>
                        </View>

                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text
                            style={{
                              color: COLORS.heading,
                              fontWeight: "800",
                              fontSize: 14,
                            }}
                          >
                            {name}
                          </Text>

                          <Text
                            style={{
                              color: COLORS.secondaryText,
                              fontSize: 12,
                              marginTop: 4,
                            }}
                            numberOfLines={1}
                          >
                            {o?.email || "No email available"}
                          </Text>

                          <Text
                            style={{
                              color: COLORS.mutedText,
                              fontSize: 11,
                              marginTop: 4,
                            }}
                          >
                            {formatDate(o?.createdAt)}
                          </Text>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <View
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 999,
                              backgroundColor: active
                                ? COLORS.activeBg
                                : COLORS.inactiveBg,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "800",
                                color: active
                                  ? COLORS.activeText
                                  : COLORS.inactiveText,
                              }}
                            >
                              {active ? "ACTIVE" : "INACTIVE"}
                            </Text>
                          </View>

                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={20}
                            color={COLORS.mutedText}
                            style={{ marginTop: 8 }}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </PremiumShell>
        </View>

        <View style={{ marginBottom: 8 }}>
          <SectionTitle title="Management Modules" />

          {permissions.canSeeManagersModule && routes.managersList ? (
            <SettingsStyleRow
              title="Managers"
              subtitle="Manage manager accounts and permissions."
              icon="account-group-outline"
              gradient={safeGradient(COLORS.primaryLight, COLORS.primary)}
              onPress={() => router.push(routes.managersList as any)}
            />
          ) : null}

          <SettingsStyleRow
            title="Shop Owners"
            subtitle="View all registered shop owners and account status."
            icon="store-outline"
            gradient={safeGradient(COLORS.successLight, COLORS.successDark)}
            onPress={() => router.push(routes.shopOwnersList as any)}
          />

          <SettingsStyleRow
            title="Staff"
            subtitle="Manage staff members and team access."
            icon="account-tie-outline"
            gradient={safeGradient(COLORS.accentLight, COLORS.accent)}
            onPress={() => router.push(routes.staffList as any)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}