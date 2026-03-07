// app/subadmin/shopowners.tsx

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

const BRAND = "#16BB05";
const BRAND_DARK = "#119304";
const SURFACE = "#F4F7FB";
const CARD = "#FFFFFF";
const TEXT = "#0F172A";

type CreatedBy = {
  type?: "MASTER" | "MANAGER" | string;
  id?: string | { $oid?: string };
  role?: string;
  ref?: string;
};

type Owner = {
  _id: string | { $oid?: string };
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  isActive?: boolean;
  createdBy?: CreatedBy;
};

type FilterType = "ALL" | "ACTIVE" | "INACTIVE";

const CARD_RADIUS = 26;
const SWIPE_DELETE_WIDTH = 84;

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

async function readResponse(res: Response) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function asId(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.$oid) return String(value.$oid);
  if (typeof value === "object" && value._id) return asId(value._id);
  return String(value);
}

function getCreatedByLabel(createdBy?: CreatedBy) {
  const type = String(createdBy?.type || "").toUpperCase();
  const role = String(createdBy?.role || "").toUpperCase();

  if (type === "MANAGER" || role === "MANAGER") return "Created By: Manager";
  if (type === "MASTER" || role === "MASTER_ADMIN") return "Created By: Master";
  return "";
}

function getInitials(name?: string) {
  if (!name?.trim()) return "SO";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "SO";
}

function getAvatarTone(name?: string) {
  const palette = [
    { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
    { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
    { bg: "#FFF7ED", text: "#C2410C", border: "#FDBA74" },
    { bg: "#FDF2F8", text: "#BE185D", border: "#F9A8D4" },
    { bg: "#F3E8FF", text: "#7E22CE", border: "#D8B4FE" },
    { bg: "#EFF6FF", text: "#1D4ED8", border: "#93C5FD" },
  ];

  const source = name || "shopowner";
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

function StatusPill({ active }: { active?: boolean }) {
  const isActive = !!active;

  return (
    <View
      className="px-3 py-1.5 rounded-full border flex-row items-center"
      style={{
        backgroundColor: isActive ? "#F0FDF4" : "#FEF2F2",
        borderColor: isActive ? "#BBF7D0" : "#FECACA",
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: isActive ? "#16A34A" : "#DC2626",
          marginRight: 6,
        }}
      />
      <Text
        className="text-[11px] font-extrabold"
        style={{ color: isActive ? "#15803D" : "#B91C1C" }}
      >
        {isActive ? "ACTIVE" : "INACTIVE"}
      </Text>
    </View>
  );
}

function RolePill() {
  return (
    <View className="px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
      <Text className="text-[11px] font-extrabold text-indigo-700">
        SHOP OWNER
      </Text>
    </View>
  );
}

function CreatorPill({ label }: { label: string }) {
  if (!label) return null;

  return (
    <View className="mt-3 self-start px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100">
      <Text className="text-[11px] font-bold text-violet-700">{label}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full overflow-hidden mr-2"
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
        <Text
          className="text-sm font-extrabold"
          style={{ color: active ? "#FFFFFF" : "#334155" }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
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

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.8],
  });

  return (
    <Animated.View
      style={{ opacity }}
      className="rounded-[28px] overflow-hidden mb-4"
    >
      <View
        className="bg-white border border-gray-200 px-4 py-4"
        style={{
          borderRadius: 28,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.06,
          shadowRadius: 14,
          elevation: 3,
        }}
      >
        <View className="flex-row items-start">
          <View className="w-16 h-16 rounded-2xl bg-gray-200" />
          <View className="flex-1 ml-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-3">
                <View className="h-5 w-36 rounded-md bg-gray-200" />
                <View className="h-4 w-24 rounded-md bg-gray-200 mt-2" />
                <View className="h-4 w-44 rounded-md bg-gray-200 mt-3" />
                <View className="h-4 w-28 rounded-md bg-gray-200 mt-2" />
              </View>

              <View>
                <View className="h-7 w-24 rounded-full bg-gray-200 mb-2" />
                <View className="h-7 w-28 rounded-full bg-gray-200" />
              </View>
            </View>

            <View className="h-7 w-36 rounded-full bg-gray-200 mt-4" />
            <View className="flex-row mt-4">
              <View className="flex-1 h-12 rounded-2xl bg-gray-200 mr-3" />
              <View className="w-12 h-12 rounded-2xl bg-gray-200" />
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function SwipeDeleteRow({
  item,
  onPress,
  onEdit,
  onDelete,
}: {
  item: Owner;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const entryAnim = useRef(new Animated.Value(20)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(entryAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 5,
      }),
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entryAnim, entryOpacity]);

  const openDelete = useCallback(() => {
    Animated.spring(translateX, {
      toValue: -SWIPE_DELETE_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [translateX]);

  const closeDelete = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dy) < 10,
        onPanResponderMove: (_, gesture) => {
          const nextX = Math.max(-SWIPE_DELETE_WIDTH, Math.min(0, gesture.dx));
          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -40) openDelete();
          else closeDelete();
        },
        onPanResponderTerminate: closeDelete,
      }),
    [closeDelete, openDelete, translateX]
  );

  const creatorLabel = getCreatedByLabel(item.createdBy);
  const mobileLine = item.additionalNumber
    ? `${item.mobile || "-"} • ${item.additionalNumber}`
    : item.mobile || "-";

  const hasAvatar = !!item.avatarUrl?.trim();
  const tone = getAvatarTone(item.name);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: entryAnim }],
        opacity: entryOpacity,
        marginBottom: 16,
      }}
    >
      <View
        style={{
          borderRadius: CARD_RADIUS,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: SWIPE_DELETE_WIDTH,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#FFF1F2",
            borderColor: "#FFE4E6",
            borderWidth: 1,
            borderRadius: CARD_RADIUS,
          }}
        >
          <Pressable
            onPress={onDelete}
            className="w-12 h-12 rounded-2xl items-center justify-center"
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={22}
              color="#E11D48"
            />
          </Pressable>
        </View>

        <Animated.View
          {...panResponder.panHandlers}
          style={{
            transform: [{ translateX }],
          }}
        >
          <Pressable
            onPress={onPress}
            style={{
              borderRadius: 28,
              overflow: "hidden",
              backgroundColor: CARD,
              borderWidth: 1,
              borderColor: "#ECF0F4",
              shadowColor: "#0F172A",
              shadowOpacity: 0.08,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 4,
            }}
          >
            <LinearGradient
              colors={["#FFFFFF", "#F8FFFA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16 }}
            >
              <View className="flex-row items-start">
                <View
                  className="w-16 h-16 rounded-[20px] overflow-hidden items-center justify-center border"
                  style={{
                    backgroundColor: hasAvatar ? "#F8FAFC" : tone.bg,
                    borderColor: hasAvatar ? "#E5E7EB" : tone.border,
                  }}
                >
                  {hasAvatar ? (
                    <Image
                      source={{ uri: item.avatarUrl! }}
                      style={{ width: 64, height: 64 }}
                    />
                  ) : (
                    <Text
                      className="font-extrabold text-base"
                      style={{ color: tone.text }}
                    >
                      {getInitials(item.name)}
                    </Text>
                  )}
                </View>

                <View className="flex-1 ml-3">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-3">
                      <Text
                        numberOfLines={1}
                        className="text-slate-900 text-[17px] font-extrabold"
                      >
                        {item.name || "-"}
                      </Text>

                      <Text
                        numberOfLines={1}
                        className="text-slate-500 mt-0.5 font-semibold"
                      >
                        @{item.username || "-"}
                      </Text>

                      <View className="mt-2.5">
                        <View className="flex-row items-center">
                          <MaterialCommunityIcons
                            name="email-outline"
                            size={15}
                            color="#64748B"
                          />
                          <Text
                            numberOfLines={1}
                            className="ml-2 text-slate-700 text-sm flex-1"
                          >
                            {item.email || "-"}
                          </Text>
                        </View>

                        <View className="flex-row items-center mt-1.5">
                          <MaterialCommunityIcons
                            name="phone-outline"
                            size={15}
                            color="#64748B"
                          />
                          <Text
                            numberOfLines={1}
                            className="ml-2 text-slate-500 text-sm flex-1"
                          >
                            {mobileLine}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="items-end" style={{ gap: 8 }}>
                      <StatusPill active={!!item.isActive} />
                      <RolePill />
                    </View>
                  </View>

                  <CreatorPill label={creatorLabel} />

                  <View className="flex-row mt-4" style={{ gap: 10 }}>
                    <Pressable
                      onPress={(e: any) => {
                        e?.stopPropagation?.();
                        onEdit();
                      }}
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
                          paddingVertical: 13,
                          paddingHorizontal: 16,
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          borderRadius: 18,
                        }}
                      >
                        <View className="flex-row items-center justify-center">
                          <MaterialCommunityIcons
                            name="pencil-outline"
                            size={18}
                            color={TEXT}
                          />
                          <Text className="text-slate-900 font-extrabold ml-2">
                            Edit
                          </Text>
                        </View>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={(e: any) => {
                        e?.stopPropagation?.();
                        openDelete();
                      }}
                      className="w-12 rounded-[18px] items-center justify-center"
                      style={{
                        backgroundColor: "#FFF1F2",
                        borderWidth: 1,
                        borderColor: "#FFE4E6",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={20}
                        color="#E11D48"
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function ShopOwnersListScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadOwners = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(apiUrl(SummaryApi.master_all_shopowners.url), {
        method: SummaryApi.master_all_shopowners.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      setOwners(Array.isArray(json.data) ? (json.data as Owner[]) : []);
    } catch (error) {
      console.log("loadOwners error:", error);
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [headersAuthOnly]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

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
            onPress={loadOwners}
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

  const goDetails = useCallback(
    (id: string) => {
      router.push({
        pathname: "/subadmin/managers/shopowners/[id]",
        params: { id },
      } as any);
    },
    [router]
  );

  const goEdit = useCallback(
    (id: string) => {
      router.push({
        pathname: "/subadmin/managers/shopowners/Edit",
        params: { id },
      } as any);
    },
    [router]
  );

  const onDeleteOwner = useCallback(
    async (item: Owner) => {
      Alert.alert(
        "Delete Shop Owner",
        `Delete ${item.name || "this shop owner"}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const ownerId = asId(item._id);

                const res = await fetch(
                  apiUrl(SummaryApi.master_delete_shopowner.url(ownerId)),
                  {
                    method: SummaryApi.master_delete_shopowner.method,
                    headers: headersAuthOnly,
                  }
                );

                const { text, json } = await readResponse(res);

                if (!res.ok || !json?.success) {
                  if (!json) console.log("RAW:", text);
                  toastError(json?.message || `HTTP ${res.status}`);
                  return;
                }

                toastSuccess("Shop owner deleted");
                setOwners((prev) => prev.filter((x) => asId(x._id) !== ownerId));
              } catch (error) {
                console.log("delete owner error:", error);
                toastError("Delete failed");
              }
            },
          },
        ]
      );
    },
    [headersAuthOnly]
  );

  const counts = useMemo(() => {
    const active = owners.filter((x) => x.isActive).length;
    const inactive = owners.filter((x) => !x.isActive).length;

    return {
      all: owners.length,
      active,
      inactive,
    };
  }, [owners]);

  const filteredOwners = useMemo(() => {
    const q = search.trim().toLowerCase();

    return owners.filter((item) => {
      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "ACTIVE"
          ? !!item.isActive
          : !item.isActive;

      if (!matchesFilter) return false;
      if (!q) return true;

      const blob = `${item.name || ""} ${item.username || ""} ${item.email || ""} ${
        item.mobile || ""
      } ${item.additionalNumber || ""} ${getCreatedByLabel(item.createdBy)}`.toLowerCase();

      return blob.includes(q);
    });
  }, [owners, search, filter]);

  const renderItem = useCallback(
    ({ item }: { item: Owner }) => (
      <SwipeDeleteRow
        item={item}
        onPress={() => goDetails(asId(item._id))}
        onEdit={() => goEdit(asId(item._id))}
        onDelete={() => onDeleteOwner(item)}
      />
    ),
    [goDetails, goEdit, onDeleteOwner]
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: SURFACE }}
      edges={["left", "right", "bottom"]}
    >
      <FlatList
        data={loading && owners.length === 0 ? [] : filteredOwners}
        keyExtractor={(item) => asId(item._id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: 28,
          flexGrow:
            !loading && owners.length !== 0 && filteredOwners.length === 0
              ? 1
              : undefined,
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
                {filteredOwners.length}
              </Text>
              <Text className="text-white/90 text-sm font-medium">
                Showing shop owners in current result
              </Text>

              <View className="mt-4 flex-row" style={{ gap: 10 }}>
                <HeaderMetric label="Total" value={String(counts.all)} />
                <HeaderMetric label="Active" value={String(counts.active)} />
                <HeaderMetric label="Inactive" value={String(counts.inactive)} />
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
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, username, email, mobile"
                placeholderTextColor="#94A3B8"
                className="flex-1 text-slate-900 ml-3 py-2"
                style={{ fontSize: 15, fontWeight: "600" }}
              />

              {!!search && (
                <Pressable
                  onPress={() => setSearch("")}
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

            <View className="mt-4">
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[
                  { key: "ALL", label: `All (${counts.all})` },
                  { key: "ACTIVE", label: `Active (${counts.active})` },
                  { key: "INACTIVE", label: `Inactive (${counts.inactive})` },
                ]}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => (
                  <FilterChip
                    label={item.label}
                    active={filter === item.key}
                    onPress={() => setFilter(item.key as FilterType)}
                  />
                )}
              />
            </View>

            {loading && owners.length === 0 ? (
              <View className="pt-5">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : null}
          </View>
        }
        refreshing={loading}
        onRefresh={loadOwners}
        ListEmptyComponent={
          !loading ? (
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
          ) : null
        }
      />
    </SafeAreaView>
  );
}