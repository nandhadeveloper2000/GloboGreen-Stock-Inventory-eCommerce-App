// app/components/Manager/managers.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

type SubAdmin = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  roles?: string[];
  avatarUrl?: string;
  idProofUrl?: string;
  isActive?: boolean;
};

type ApiSuccessResponse = {
  success?: boolean;
  message?: string;
  data?: SubAdmin[];
};

const BRAND = COLORS.success;
const BRAND_DARK = COLORS.successDark;

const VIEW_ROUTE = "/components/Manager/View";
const CREATE_ROUTE = "/components/Manager/create";

const apiUrl = (path: string) => `${baseURL}${path}`;

const UI = {
  radius: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
  },
  font: {
    xs: 11,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 16,
    xxl: 18,
  },
  height: {
    headerBtn: 36,
    searchBar: 46,
    iconBox: 30,
    actionBtn: 32,
    avatar: 38,
  },
  spacing: {
    xs: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 14,
    xxl: 16,
  },
};

const toastError = (title: string, msg?: string) =>
  Toast.show({
    type: "error",
    text1: title,
    text2: msg || "",
  });

function HeaderIconButton({
  icon,
  onPress,
  disabled,
  bgColor,
  borderColor,
  iconColor,
  style,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={[
        {
          width: UI.height.headerBtn,
          height: UI.height.headerBtn,
          borderRadius: UI.radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bgColor,
          borderWidth: 1,
          borderColor,
          opacity: disabled ? 0.55 : 1,
          shadowColor: COLORS.heroDark,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
    </Pressable>
  );
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
      edges={["top", "bottom"]}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 20,
          backgroundColor: COLORS.inactiveBg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={32}
          color={COLORS.danger}
        />
      </View>

      <Text
        style={{
          marginTop: 14,
          color: COLORS.primaryText,
          fontSize: UI.font.xxl,
          fontWeight: "900",
        }}
      >
        Access Denied
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: COLORS.secondaryText,
          textAlign: "center",
          lineHeight: 20,
          fontSize: UI.font.md,
          maxWidth: 290,
        }}
      >
        Only Master Admin can access the Managers module.
      </Text>

      <Pressable
        onPress={onBack}
        style={{
          marginTop: 16,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: UI.radius.md,
          backgroundColor: COLORS.card,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text
          style={{
            color: COLORS.primaryText,
            fontWeight: "800",
            fontSize: UI.font.md,
          }}
        >
          Go Back
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

function EmptyState({
  onRefresh,
  hasSearch,
}: {
  onRefresh: () => void;
  hasSearch: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        marginTop: 18,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: UI.radius.lg,
        paddingVertical: 24,
        paddingHorizontal: 18,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: COLORS.successSoft,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: COLORS.successLight,
        }}
      >
        <MaterialCommunityIcons
          name="account-group-outline"
          size={26}
          color={BRAND}
        />
      </View>

      <Text
        style={{
          marginTop: 14,
          color: COLORS.primaryText,
          fontSize: UI.font.lg,
          fontWeight: "900",
        }}
      >
        {hasSearch ? "No managers found" : "No managers available"}
      </Text>

      <Text
        style={{
          marginTop: 6,
          color: COLORS.secondaryText,
          fontSize: UI.font.sm,
          textAlign: "center",
          lineHeight: 18,
          maxWidth: 300,
        }}
      >
        {hasSearch
          ? "No matching managers are available right now. Try another search keyword."
          : "There are no managers in the list right now. Refresh to load the latest data."}
      </Text>

      <Pressable
        onPress={onRefresh}
        style={{
          marginTop: 16,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: UI.radius.md,
          backgroundColor: COLORS.successSoft,
          borderWidth: 1,
          borderColor: COLORS.successLight,
        }}
      >
        <Text
          style={{
            color: BRAND_DARK,
            fontWeight: "800",
            fontSize: UI.font.md,
          }}
        >
          Refresh List
        </Text>
      </Pressable>
    </View>
  );
}

function SearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <View
      style={{
        marginBottom: 12,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: UI.radius.lg,
        minHeight: UI.height.searchBar,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: COLORS.heroDark,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: UI.height.iconBox,
          height: UI.height.iconBox,
          borderRadius: UI.radius.sm,
          backgroundColor: COLORS.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={17}
          color={COLORS.secondaryText}
        />
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search managers by name, username, email, or role"
        placeholderTextColor={COLORS.labelText}
        style={{
          flex: 1,
          marginLeft: 10,
          color: COLORS.primaryText,
          fontSize: UI.font.md,
          fontWeight: "500",
          paddingVertical: 0,
        }}
      />

      {!!value && (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={18}
            color={COLORS.labelText}
          />
        </Pressable>
      )}
    </View>
  );
}

function SectionSummary({
  total,
  filtered,
}: {
  total: number;
  filtered: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          color: COLORS.primaryText,
          fontSize: UI.font.lg,
          fontWeight: "900",
        }}
      >
        Managers
      </Text>

      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: COLORS.successSoft,
          borderWidth: 1,
          borderColor: COLORS.successLight,
        }}
      >
        <Text
          style={{
            color: BRAND_DARK,
            fontSize: UI.font.sm,
            fontWeight: "800",
          }}
        >
          {filtered}/{total}
        </Text>
      </View>
    </View>
  );
}

export default function Managers() {
  const { token, user, isReady, loading: authLoading } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<SubAdmin[]>([]);
  const [search, setSearch] = useState("");

  const currentRole = useMemo(() => {
    return normalizeRole(user?.role || user?.roles?.[0] || null);
  }, [user]);

  const isMasterAdmin = currentRole === ROLES.MASTER_ADMIN;

  const headersAuthOnly = useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }, [token]);

  const readResponse = useCallback(async (res: Response) => {
    const text = await res.text();

    try {
      return {
        text,
        json: JSON.parse(text) as ApiSuccessResponse,
      };
    } catch {
      return {
        text,
        json: null,
      };
    }
  }, []);

  const loadManagers = useCallback(async () => {
    if (!isMasterAdmin) return;

    try {
      setLoading(true);

      const res = await fetch(apiUrl(SummaryApi.master_all_subadmin.url), {
        method: SummaryApi.master_all_subadmin.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) {
          console.log("RAW_MANAGERS_RESPONSE:", text);
        }

        toastError("Failed to load", json?.message || `HTTP ${res.status}`);
        return;
      }

      setList(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      console.log("loadManagers error:", error);
      toastError("Network Error", "Please check your connection");
    } finally {
      setLoading(false);
    }
  }, [headersAuthOnly, isMasterAdmin, readResponse]);

  const goToCreate = useCallback(() => {
    router.push(CREATE_ROUTE as never);
  }, [router]);

  const goToView = useCallback(
    (item: SubAdmin) => {
      router.push({
        pathname: VIEW_ROUTE as never,
        params: {
          id: item._id,
          name: item.name || "",
          username: item.username || "",
          email: item.email || "",
          role: item.role || item.roles?.[0] || "MANAGER",
          avatarUrl: item.avatarUrl || "",
          idProofUrl: item.idProofUrl || "",
          isActive: item.isActive ? "true" : "false",
          mode: "view",
        },
      });
    },
    [router]
  );

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerShown: true,
      headerTitle: "Managers",
      headerTitleAlign: "center",
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: COLORS.white,
      },
      headerTitleStyle: {
        color: COLORS.primaryText,
        fontSize: 18,
        fontWeight: "800",
      },
      headerLeft: () => (
        <HeaderIconButton
          icon="chevron-left"
          onPress={() => router.back()}
          bgColor={COLORS.soft}
          borderColor={COLORS.border}
          iconColor={COLORS.primaryText}
          style={{ marginLeft: 10 }}
        />
      ),
      headerRight: () =>
        isMasterAdmin ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 10,
            }}
          >
            <HeaderIconButton
              icon="refresh"
              onPress={loadManagers}
              disabled={loading}
              bgColor={COLORS.successSoft}
              borderColor={COLORS.successLight}
              iconColor={BRAND}
              style={{ marginRight: 8 }}
            />

            <HeaderIconButton
              icon="plus"
              onPress={goToCreate}
              bgColor={COLORS.successSoft}
              borderColor={COLORS.successLight}
              iconColor={BRAND_DARK}
            />
          </View>
        ) : null,
    });
  }, [navigation, router, isMasterAdmin, loadManagers, loading, goToCreate]);

  useFocusEffect(
    useCallback(() => {
      if (isReady && !authLoading && isMasterAdmin) {
        loadManagers();
      }
    }, [isReady, authLoading, isMasterAdmin, loadManagers])
  );

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return list;

    return list.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const username = String(item.username || "").toLowerCase();
      const email = String(item.email || "").toLowerCase();
      const role = String(item.role || item.roles?.[0] || "").toLowerCase();

      return (
        name.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        role.includes(q)
      );
    });
  }, [list, search]);

  const renderTableHeader = useCallback(() => {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderTopLeftRadius: UI.radius.lg,
          borderTopRightRadius: UI.radius.lg,
          paddingVertical: 9,
          paddingHorizontal: 10,
        }}
      >
        <Text
          style={{
            width: 44,
            color: COLORS.secondaryText,
            fontSize: UI.font.xs,
            fontWeight: "800",
          }}
        >
          S.No
        </Text>

        <Text
          style={{
            width: 58,
            color: COLORS.secondaryText,
            fontSize: UI.font.xs,
            fontWeight: "800",
          }}
        >
          Avatar
        </Text>

        <Text
          style={{
            flex: 1.25,
            color: COLORS.secondaryText,
            fontSize: UI.font.xs,
            fontWeight: "800",
          }}
        >
          Name
        </Text>

        <Text
          style={{
            flex: 1.1,
            color: COLORS.secondaryText,
            fontSize: UI.font.xs,
            fontWeight: "800",
          }}
        >
          Username
        </Text>

        <Text
          style={{
            width: 60,
            textAlign: "center",
            color: COLORS.secondaryText,
            fontSize: UI.font.xs,
            fontWeight: "800",
          }}
        >
          Action
        </Text>
      </View>
    );
  }, []);

  const renderRow: ListRenderItem<SubAdmin> = useCallback(
    ({ item, index }) => {
      const showAvatar =
        typeof item.avatarUrl === "string" && item.avatarUrl.trim().length > 5;

      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderColor: COLORS.border,
            paddingVertical: 9,
            paddingHorizontal: 10,
          }}
        >
          <Text
            style={{
              width: 44,
              color: COLORS.primaryText,
              fontSize: UI.font.sm,
              fontWeight: "700",
            }}
          >
            {index + 1}
          </Text>

          <View
            style={{
              width: 58,
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: UI.height.avatar,
                height: UI.height.avatar,
                borderRadius: 11,
                backgroundColor: COLORS.soft,
                borderWidth: 1,
                borderColor: COLORS.border,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {showAvatar ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={{
                    width: UI.height.avatar,
                    height: UI.height.avatar,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialCommunityIcons
                  name="account"
                  size={18}
                  color={COLORS.mutedText}
                />
              )}
            </View>
          </View>

          <View
            style={{
              flex: 1.25,
              paddingRight: 8,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: COLORS.primaryText,
                fontSize: UI.font.sm,
                fontWeight: "800",
              }}
            >
              {item.name || "-"}
            </Text>

            {!!item.email && (
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 2,
                  color: COLORS.secondaryText,
                  fontSize: UI.font.xs,
                  fontWeight: "500",
                }}
              >
                {item.email}
              </Text>
            )}
          </View>

          <Text
            numberOfLines={1}
            style={{
              flex: 1.1,
              color: COLORS.secondaryText,
              fontSize: UI.font.sm,
              fontWeight: "700",
              paddingRight: 8,
            }}
          >
            {item.username || "-"}
          </Text>

          <View
            style={{
              width: 60,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pressable
              onPress={() => goToView(item)}
              style={{
                width: UI.height.actionBtn,
                height: UI.height.actionBtn,
                borderRadius: UI.radius.sm,
                backgroundColor: COLORS.successSoft,
                borderWidth: 1,
                borderColor: COLORS.successLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="eye-outline"
                size={16}
                color={BRAND}
              />
            </Pressable>
          </View>
        </View>
      );
    },
    [goToView]
  );

  if (!isReady || authLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: "center",
          justifyContent: "center",
        }}
        edges={["top", "bottom"]}
      >
        <ActivityIndicator size="large" color={BRAND} />
        <Text
          style={{
            marginTop: 12,
            color: COLORS.secondaryText,
            fontWeight: "700",
            fontSize: UI.font.md,
          }}
        >
          Loading authentication...
        </Text>
      </SafeAreaView>
    );
  }

  if (!isMasterAdmin) {
    return <AccessDenied onBack={() => router.back()} />;
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingHorizontal: 14,
      }}
      edges={["top"]}
    >
      <SearchBar
        value={search}
        onChange={setSearch}
        onClear={() => setSearch("")}
      />

      <SectionSummary total={list.length} filtered={filteredList.length} />

      {loading && list.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              backgroundColor: COLORS.successSoft,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: COLORS.successLight,
            }}
          >
            <ActivityIndicator color={BRAND} />
          </View>

          <Text
            style={{
              marginTop: 14,
              color: COLORS.primaryText,
              fontWeight: "800",
              fontSize: UI.font.lg,
            }}
          >
            Loading managers...
          </Text>

          <Text
            style={{
              marginTop: 4,
              color: COLORS.secondaryText,
              fontSize: UI.font.sm,
            }}
          >
            Please wait while we fetch the latest list
          </Text>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            borderRadius: UI.radius.lg,
            overflow: "hidden",
          }}
        >
          {filteredList.length > 0 && renderTableHeader()}

          <FlatList
            data={filteredList}
            keyExtractor={(item) => item._id}
            renderItem={renderRow}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadManagers}
                tintColor={BRAND}
              />
            }
            contentContainerStyle={{
              paddingBottom: 24,
              flexGrow: filteredList.length === 0 ? 1 : 0,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                onRefresh={loadManagers}
                hasSearch={search.trim().length > 0}
              />
            }
            ListFooterComponent={
              filteredList.length > 0 ? (
                <View
                  style={{
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: COLORS.border,
                    borderBottomLeftRadius: UI.radius.lg,
                    borderBottomRightRadius: UI.radius.lg,
                    height: 1,
                    overflow: "hidden",
                    backgroundColor: COLORS.card,
                  }}
                />
              ) : null
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}