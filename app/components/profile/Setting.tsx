import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

type MongoId =
  | string
  | {
      $oid?: string;
    };

type RawUser = {
  _id?: MongoId;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  isActive?: boolean;
};

type AppUser = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  isActive?: boolean;
};

type AuthLike = {
  user?: any;
  auth?: any;
  token?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  setAuth?: (
    user: any,
    token: string | null,
    refreshToken: string | null
  ) => Promise<void> | void;
  logout?: () => Promise<void> | void;
};

type MeApiResponse = {
  success?: boolean;
  message?: string;
  user?: RawUser;
  data?: any;
};

type ApiConfig = {
  url: string;
  method?: string;
};

type SettingsTheme = {
  badge: string;
  title: string;
  gradient: readonly [string, string, ...string[]];
};

type SettingsApis = {
  me: ApiConfig | null;
  logout: ApiConfig | null;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getStringId(value?: MongoId) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.$oid) return value.$oid;
  return undefined;
}

function normalizeUser(raw: RawUser | null | undefined): AppUser | null {
  if (!raw) return null;

  return {
    _id: getStringId(raw._id),
    id: raw.id,
    name: raw.name?.trim() || "",
    username: raw.username?.trim() || "",
    email: raw.email?.trim() || "",
    role: raw.role?.trim() || "",
    avatarUrl: raw.avatarUrl?.trim() || "",
    avatarPublicId: raw.avatarPublicId?.trim() || "",
    isActive: Boolean(raw.isActive),
  };
}

function extractRawUser(payload: MeApiResponse): RawUser | null {
  if (!payload) return null;
  if (payload.user) return payload.user;
  if (payload.data?.user) return payload.data.user;
  if (payload.data && typeof payload.data === "object") return payload.data;
  return null;
}

function getInitials(user?: AppUser | null) {
  const source =
    user?.name?.trim() ||
    user?.username?.trim() ||
    user?.email?.trim() ||
    "US";

  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
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

function getRoleBadge(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return "MASTER ADMIN";
    case ROLES.MANAGER:
      return "MANAGER";
    case ROLES.SUPERVISOR:
      return "SUPERVISOR";
    case ROLES.STAFF:
      return "STAFF";
    default:
      return "ACCOUNT";
  }
}

function getSettingsTheme(role?: string | null): SettingsTheme {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        badge: "MASTER ACCOUNT",
        title: "My Settings",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };

    case ROLES.MANAGER:
      return {
        badge: "MANAGER ACCOUNT",
        title: "My Settings",
        gradient: [COLORS.heroGreenDark, COLORS.primaryDark, COLORS.primary],
      };

    case ROLES.SUPERVISOR:
      return {
        badge: "SUPERVISOR ACCOUNT",
        title: "My Settings",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    case ROLES.STAFF:
      return {
        badge: "STAFF ACCOUNT",
        title: "My Settings",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    default:
      return {
        badge: "ACCOUNT",
        title: "My Settings",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };
  }
}

function getSettingsApis(role?: string | null): SettingsApis {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        me: SummaryApi.master_me,
        logout: SummaryApi.master_logout,
      };

    case ROLES.MANAGER:
      return {
        me: SummaryApi.subadmin_me,
        logout: SummaryApi.subadmin_logout,
      };

    case ROLES.SUPERVISOR:
      return {
        me: SummaryApi.staff_me,
        logout: SummaryApi.staff_logout,
      };

    case ROLES.STAFF:
      return {
        me: SummaryApi.staff_me,
        logout: SummaryApi.staff_logout,
      };

    default:
      return {
        me: null,
        logout: null,
      };
  }
}

function getRoleRoutes(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        myProfile: "/master/MyProfile",
        changePin: "/master/change-pin",
        forgotPin: "/master/forgot-pin",
      };

    case ROLES.MANAGER:
      return {
        myProfile: "/subadmin/MyProfile",
        changePin: "/subadmin/change-pin",
        forgotPin: "/subadmin/forgot-pin",
      };

    case ROLES.SUPERVISOR:
      return {
        myProfile: "/supervisor/MyProfile",
        changePin: "/supervisor/change-pin",
        forgotPin: "/supervisor/forgot-pin",
      };

    case ROLES.STAFF:
      return {
        myProfile: "/staff/MyProfile",
        changePin: "/staff/change-pin",
        forgotPin: "/staff/forgot-pin",
      };

    default:
      return {
        myProfile: "/Login",
        changePin: "/Login",
        forgotPin: "/Login",
      };
  }
}

function toastSuccess(message: string) {
  Toast.show({
    type: "success",
    text1: "Success",
    text2: message,
    position: "top",
    visibilityTime: 2500,
  });
}

function toastError(message: string) {
  Toast.show({
    type: "error",
    text1: "Error",
    text2: message,
    position: "top",
    visibilityTime: 3000,
  });
}

function SectionDivider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: COLORS.divider,
        marginVertical: 10,
      }}
    />
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  iconBg,
  iconColor,
  titleColor,
  chevronColor,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
  titleColor?: string;
  chevronColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          height: 44,
          width: 44,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconBg,
        }}
      >
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>

      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "800",
            color: titleColor || COLORS.heading,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontSize: 12,
            color: COLORS.secondaryText,
          }}
        >
          {subtitle}
        </Text>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={chevronColor || COLORS.mutedText}
      />
    </Pressable>
  );
}

export default function MySettings() {
  const router = useRouter();
  const authCtx = useAuth() as unknown as AuthLike;
  const hasFetchedRef = useRef(false);

  const setAuth = authCtx?.setAuth;
  const logout = authCtx?.logout;

  const rawAuthUser =
    authCtx?.user ||
    (authCtx?.auth && typeof authCtx.auth === "object" && "user" in authCtx.auth
      ? (authCtx.auth as any)?.user
      : authCtx?.auth) ||
    null;

  const authUser = useMemo(
    () => normalizeUser(rawAuthUser as RawUser | null),
    [rawAuthUser]
  );

  const accessToken = authCtx?.accessToken || authCtx?.token || null;
  const refreshToken = authCtx?.refreshToken || null;

  const currentRole = normalizeRole(authUser?.role);
  const roleLabel = getRoleLabel(currentRole);
  const roleBadge = getRoleBadge(currentRole);
  const theme = getSettingsTheme(currentRole);
  const apis = getSettingsApis(currentRole);
  const routes = getRoleRoutes(currentRole);

  const [profile, setProfile] = useState<AppUser | null>(authUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const user = profile || authUser || null;

  const displayName = useMemo(() => {
    return user?.name || user?.username || user?.email || roleLabel;
  }, [user, roleLabel]);

  const displayEmail = useMemo(() => {
    return user?.email || "No email available";
  }, [user]);

  const displayRole = useMemo(() => {
    return roleBadge;
  }, [roleBadge]);

  const avatarUri = useMemo(() => {
    return user?.avatarUrl?.trim() ? user.avatarUrl : null;
  }, [user]);

  const initials = useMemo(() => getInitials(user), [user]);

  const fetchMyProfile = useCallback(
    async (isPullToRefresh = false) => {
      try {
        if (isPullToRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        if (!accessToken) {
          throw new Error("Missing access token. Please login again.");
        }

        if (!apis.me?.url) {
          throw new Error(`${roleLabel} profile API is not configured`);
        }

        const endpoint = `${baseURL}${apis.me.url}`;

        const res = await fetch(endpoint, {
          method: apis.me.method || "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const json: MeApiResponse = await readJsonSafe(res);

        if (!res.ok) {
          throw new Error((json as any)?.message || "Failed to fetch profile");
        }

        const extracted = extractRawUser(json);
        const nextUser = normalizeUser(extracted);

        if (!nextUser) {
          throw new Error("Profile data was empty or invalid");
        }

        setProfile(nextUser);
      } catch (error: any) {
        toastError(error?.message || "Unable to load profile. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, apis.me, roleLabel]
  );

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchMyProfile();
  }, [fetchMyProfile]);

  const goMyProfile = useCallback(() => {
    router.push(routes.myProfile as any);
  }, [router, routes.myProfile]);

  const goChangePin = useCallback(() => {
    router.push(routes.changePin as any);
  }, [router, routes.changePin]);

  const goForgotPin = useCallback(() => {
    router.push(routes.forgotPin as any);
  }, [router, routes.forgotPin]);

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true);

      if (refreshToken && apis.logout?.url) {
        await fetch(`${baseURL}${apis.logout.url}`, {
          method: apis.logout.method || "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => null);
      }

      if (typeof logout === "function") {
        await logout();
      } else if (typeof setAuth === "function") {
        await setAuth(null, null, null);
      }

      setLogoutModalVisible(false);
      toastSuccess("Logged out successfully");

      setTimeout(() => {
        router.replace("/Login" as any);
      }, 300);
    } catch {
      if (typeof logout === "function") {
        await logout();
      } else if (typeof setAuth === "function") {
        await setAuth(null, null, null);
      }

      setLogoutModalVisible(false);

      setTimeout(() => {
        router.replace("/Login" as any);
      }, 200);
    } finally {
      setLoggingOut(false);
    }
  }, [accessToken, apis.logout, logout, refreshToken, router, setAuth]);

  const confirmLogout = useCallback(() => {
    setLogoutModalVisible(true);
  }, []);

  if (loading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
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
              marginTop: 12,
              fontSize: 14,
              fontWeight: "600",
              color: COLORS.secondaryText,
            }}
          >
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMyProfile(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 18,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {theme.badge}
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 30,
                    fontWeight: "900",
                    color: COLORS.white,
                  }}
                >
                  {theme.title}
                </Text>
              </View>

              <Pressable
                onPress={() => fetchMyProfile(true)}
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.15)",
                }}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={18}
                  color={COLORS.white}
                />
              </Pressable>
            </View>

            <View
              style={{
                marginTop: 20,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  resizeMode="cover"
                  style={{
                    height: 82,
                    width: 82,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: COLORS.white,
                  }}
                />
              ) : (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: 82,
                    width: 82,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: COLORS.white,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "900",
                      color: COLORS.white,
                    }}
                  >
                    {initials}
                  </Text>
                </LinearGradient>
              )}

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 24,
                    fontWeight: "900",
                    color: COLORS.white,
                  }}
                >
                  {displayName}
                </Text>

                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {displayEmail}
                </Text>

                <View
                  style={{
                    marginTop: 12,
                    alignSelf: "flex-start",
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
                    }}
                  >
                    {displayRole}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View
            style={{
              marginTop: 16,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: COLORS.card,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: COLORS.heading,
              }}
            >
              Workspace
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 12,
                color: COLORS.secondaryText,
              }}
            >
              Manage your account and security settings
            </Text>

            <View style={{ marginTop: 12 }}>
              <MenuItem
                icon="account-circle-outline"
                iconBg={COLORS.primaryLight}
                iconColor={COLORS.primary}
                title="My Profile"
                subtitle="View and manage your profile information"
                onPress={goMyProfile}
              />

              <SectionDivider />

              <MenuItem
                icon="shield-key-outline"
                iconBg={COLORS.activeBg}
                iconColor={COLORS.successDark}
                title="Change PIN"
                subtitle="Change your PIN securely"
                onPress={goChangePin}
              />

              <SectionDivider />

              <MenuItem
                icon="key-outline"
                iconBg={COLORS.successSoft}
                iconColor={COLORS.successDark}
                title="Forgot PIN"
                subtitle="Reset your PIN with email OTP"
                onPress={goForgotPin}
              />
            </View>
          </View>

          <View
            style={{
              marginTop: 16,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: COLORS.card,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: COLORS.heading,
              }}
            >
              Session
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 12,
                color: COLORS.secondaryText,
              }}
            >
              Account access and logout
            </Text>

            <View style={{ marginTop: 12 }}>
              <MenuItem
                icon="logout"
                iconBg={COLORS.inactiveBg}
                iconColor={COLORS.danger}
                titleColor={COLORS.danger}
                chevronColor={COLORS.danger}
                title="Logout"
                subtitle="Securely sign out from this device"
                onPress={confirmLogout}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loggingOut) setLogoutModalVisible(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 26,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 52,
                height: 5,
                borderRadius: 999,
                backgroundColor: COLORS.border,
                marginBottom: 16,
              }}
            />

            <View
              style={{
                alignSelf: "center",
                height: 64,
                width: 64,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: COLORS.inactiveBg,
              }}
            >
              <MaterialCommunityIcons
                name="logout"
                size={28}
                color={COLORS.danger}
              />
            </View>

            <Text
              style={{
                marginTop: 16,
                fontSize: 20,
                fontWeight: "900",
                color: COLORS.heading,
                textAlign: "center",
              }}
            >
              Confirm Logout
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontSize: 13,
                lineHeight: 20,
                color: COLORS.secondaryText,
                textAlign: "center",
              }}
            >
              Are you sure you want to logout from this device?
            </Text>

            <View
              style={{
                marginTop: 20,
                flexDirection: "row",
                gap: 12,
              }}
            >
              <Pressable
                onPress={() => {
                  if (!loggingOut) setLogoutModalVisible(false);
                }}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.background,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    color: COLORS.heading,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleLogout}
                disabled={loggingOut}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.danger,
                  opacity: loggingOut ? 0.7 : 1,
                }}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: COLORS.white,
                    }}
                  >
                    Logout
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}