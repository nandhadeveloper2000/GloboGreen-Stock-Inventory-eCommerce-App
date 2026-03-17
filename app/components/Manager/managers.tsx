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
          width: 40,
          height: 40,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bgColor,
          borderWidth: 1,
          borderColor,
          opacity: disabled ? 0.55 : 1,
          shadowColor: COLORS.heroDark,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
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
          width: 86,
          height: 86,
          borderRadius: 24,
          backgroundColor: COLORS.inactiveBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={40}
          color={COLORS.danger}
        />
      </View>

      <Text
        style={{
          marginTop: 18,
          color: COLORS.primaryText,
          fontSize: 22,
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
          lineHeight: 22,
          fontSize: 14,
        }}
      >
        Only Master Admin can access the Managers module.
      </Text>

      <Pressable
        onPress={onBack}
        style={{
          marginTop: 18,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 16,
          backgroundColor: COLORS.soft,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text
          style={{
            color: COLORS.primaryText,
            fontWeight: "800",
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
        marginTop: 30,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 24,
        paddingVertical: 34,
        paddingHorizontal: 20,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 22,
          backgroundColor: COLORS.successSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons
          name="account-group-outline"
          size={32}
          color={BRAND}
        />
      </View>

      <Text
        style={{
          marginTop: 16,
          color: COLORS.primaryText,
          fontSize: 17,
          fontWeight: "900",
        }}
      >
        {hasSearch ? "No managers found" : "No managers available"}
      </Text>

      <Text
        style={{
          marginTop: 6,
          color: COLORS.secondaryText,
          fontSize: 13,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {hasSearch
          ? "No matching managers are available right now. Try changing the search keyword."
          : "There are no managers in the list right now. Try refreshing to load the latest data."}
      </Text>

      <Pressable
        onPress={onRefresh}
        style={{
          marginTop: 18,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 16,
          backgroundColor: COLORS.successSoft,
          borderWidth: 1,
          borderColor: COLORS.successLight,
        }}
      >
        <Text
          style={{
            color: BRAND_DARK,
            fontWeight: "800",
          }}
        >
          Refresh List
        </Text>
      </Pressable>
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

        toastError(
          "Failed to load",
          json?.message || `HTTP ${res.status}`
        );
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
        fontSize: 20,
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
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          paddingVertical: 12,
          paddingHorizontal: 10,
        }}
      >
        <Text
          style={{
            width: 46,
            color: COLORS.secondaryText,
            fontSize: 12,
            fontWeight: "800",
          }}
        >
          S.No
        </Text>

        <Text
          style={{
            width: 64,
            color: COLORS.secondaryText,
            fontSize: 12,
            fontWeight: "800",
          }}
        >
          Avatar
        </Text>

        <Text
          style={{
            flex: 1.25,
            color: COLORS.secondaryText,
            fontSize: 12,
            fontWeight: "800",
          }}
        >
          Name
        </Text>

        <Text
          style={{
            flex: 1.1,
            color: COLORS.secondaryText,
            fontSize: 12,
            fontWeight: "800",
          }}
        >
          Username
        </Text>

        <Text
          style={{
            width: 68,
            textAlign: "center",
            color: COLORS.secondaryText,
            fontSize: 12,
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
            paddingVertical: 12,
            paddingHorizontal: 10,
          }}
        >
          <Text
            style={{
              width: 46,
              color: COLORS.primaryText,
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            {index + 1}
          </Text>

          <View
            style={{
              width: 64,
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
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
                  style={{ width: 42, height: 42 }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={COLORS.mutedText}
                />
              )}
            </View>
          </View>

          <Text
            numberOfLines={1}
            style={{
              flex: 1.25,
              color: COLORS.primaryText,
              fontSize: 13,
              fontWeight: "800",
              paddingRight: 8,
            }}
          >
            {item.name || "-"}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              flex: 1.1,
              color: COLORS.secondaryText,
              fontSize: 13,
              fontWeight: "700",
              paddingRight: 8,
            }}
          >
            {item.username || "-"}
          </Text>

          <View
            style={{
              width: 68,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pressable
              onPress={() => goToView(item)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: COLORS.successSoft,
                borderWidth: 1,
                borderColor: COLORS.successLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="eye-outline"
                size={18}
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
        paddingHorizontal: 16,
      }}
      edges={["top"]}
    >
      <View
        style={{
          marginBottom: 14,
          backgroundColor: COLORS.card,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 22,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: COLORS.heroDark,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: COLORS.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={COLORS.secondaryText}
          />
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search managers by name, username, email, or role"
          placeholderTextColor={COLORS.labelText}
          style={{
            flex: 1,
            marginLeft: 10,
            color: COLORS.primaryText,
            fontSize: 14,
            fontWeight: "500",
          }}
        />

        {!!search && (
          <Pressable
            onPress={() => setSearch("")}
            hitSlop={10}
            style={{
              width: 30,
              height: 30,
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
              width: 64,
              height: 64,
              borderRadius: 22,
              backgroundColor: COLORS.successSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator color={BRAND} />
          </View>

          <Text
            style={{
              marginTop: 14,
              color: COLORS.primaryText,
              fontWeight: "800",
              fontSize: 16,
            }}
          >
            Loading managers...
          </Text>

          <Text
            style={{
              marginTop: 4,
              color: COLORS.secondaryText,
              fontSize: 13,
            }}
          >
            Please wait while we fetch the latest list
          </Text>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.card,
            borderRadius: 18,
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
                    borderBottomLeftRadius: 18,
                    borderBottomRightRadius: 18,
                    height: 1,
                    overflow: "hidden",
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