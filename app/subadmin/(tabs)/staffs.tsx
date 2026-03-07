// app/master/(tabs)/staff.tsx
// ✅ Premium List UI
// ✅ HeaderLeft Back + HeaderRight Refresh + Add
// ✅ Details open on card press
// ✅ Edit + Delete only
// ✅ Deactivate removed fully

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
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

type Staff = {
  _id: string;
  name: string;
  username: string;
  email: string;
  roles: ("STAFF" | "SUPERVISOR")[];
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  createdBy?: { type?: "MASTER" | "MANAGER"; role?: "MASTER_ADMIN" | "MANAGER" };
  isActive?: boolean;
};

async function readResponse(res: Response) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function getInitials(name?: string) {
  if (!name?.trim()) return "ST";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "ST";
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

  const source = name || "staff";
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

function getCreatedByLabel(
  createdBy?: Staff["createdBy"]
): string {
  if (!createdBy) return "-";
  const type = createdBy.type || "-";
  const role = createdBy.role || "-";
  return `${type} • ${role}`;
}

function StatusPill({ active }: { active?: boolean }) {
  const isActive = !!active;

  return (
    <View
      className="px-3 py-1.5 rounded-full flex-row items-center"
      style={{
        backgroundColor: isActive ? "#F0FDF4" : "#FEF2F2",
        borderWidth: 1,
        borderColor: isActive ? "#BBF7D0" : "#FECACA",
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          marginRight: 6,
          backgroundColor: isActive ? "#16A34A" : "#DC2626",
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

function RolePill({ role }: { role: "STAFF" | "SUPERVISOR" }) {
  const isSupervisor = role === "SUPERVISOR";

  return (
    <View
      className="px-3 py-1.5 rounded-full"
      style={{
        backgroundColor: isSupervisor ? "#F3E8FF" : "#EFF6FF",
        borderWidth: 1,
        borderColor: isSupervisor ? "#D8B4FE" : "#BFDBFE",
      }}
    >
      <Text
        className="text-[11px] font-extrabold"
        style={{ color: isSupervisor ? "#7E22CE" : "#1D4ED8" }}
      >
        {role}
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
  active,
  onPress,
}: {
  label: string;
  active: boolean;
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
        className="px-4 py-2.5 rounded-full"
        style={{
          backgroundColor: active ? BRAND : "#FFFFFF",
          borderWidth: 1,
          borderColor: active ? BRAND : "#E2E8F0",
        }}
      >
        <Text
          className="font-extrabold"
          style={{ color: active ? "#FFFFFF" : "#334155" }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
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

export default function StaffsListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const [items, setItems] = useState<Staff[]>([]);
  const [q, setQ] = useState("");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const counts = useMemo(() => {
    const active = items.filter((x) => !!x.isActive).length;
    const inactive = items.filter((x) => !x.isActive).length;
    const supervisors = items.filter((x) => x.roles?.includes("SUPERVISOR")).length;

    return {
      all: items.length,
      active,
      inactive,
      supervisors,
    };
  }, [items]);

  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return items.filter((x) => {
      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "ACTIVE"
          ? !!x.isActive
          : !x.isActive;

      if (!matchesFilter) return false;
      if (!s) return true;

      const blob =
        `${x.name} ${x.username} ${x.email} ${x.mobile || ""} ${x.additionalNumber || ""}`
          .toLowerCase();

      return blob.includes(s);
    });
  }, [items, q, filter]);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(apiUrl(SummaryApi.staff_list.url), {
        method: SummaryApi.staff_list.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      setItems(Array.isArray(json.data) ? json.data : []);
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [headersAuthOnly]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Staffs",
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
            onPress={fetchStaff}
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
            onPress={() => router.push("/master/managers/staff/create" as any)}
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
  }, [navigation, router, fetchStaff, loading]);

  const onDelete = useCallback(async () => {
    if (!deleteTarget?._id) return;

    try {
      setActing(true);

      const res = await fetch(
        apiUrl(SummaryApi.staff_delete.url(String(deleteTarget._id))),
        {
          method: SummaryApi.staff_delete.method,
          headers: headersAuthOnly,
        }
      );

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess("Staff deleted successfully");
      setConfirmDeleteOpen(false);
      setDeleteTarget(null);
      await fetchStaff();
    } catch {
      toastError("Network error");
    } finally {
      setActing(false);
    }
  }, [deleteTarget, headersAuthOnly, fetchStaff]);

  const renderItem = ({ item }: { item: Staff }) => {
    const mainRole = item.roles?.[0] || "STAFF";
    const hasAvatar = !!item.avatarUrl?.trim();
    const tone = getAvatarTone(item.name);

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/master/managers/staff/staffDetails",
            params: { id: item._id },
          } as any)
        }
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
          marginBottom: 16,
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
                    {item.name}
                  </Text>

                  <Text
                    numberOfLines={1}
                    className="text-slate-500 mt-0.5 font-semibold"
                  >
                    @{item.username}
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
                        {item.email}
                      </Text>
                    </View>

                    {!!item.mobile && (
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
                          {item.mobile}
                          {item.additionalNumber
                            ? ` • ${item.additionalNumber}`
                            : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="items-end" style={{ gap: 8 }}>
                  <StatusPill active={!!item.isActive} />
                  <RolePill role={mainRole as "STAFF" | "SUPERVISOR"} />
                </View>
              </View>

              <View className="mt-3 self-start px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100">
                <Text className="text-[11px] font-bold text-violet-700">
                  Created By: {getCreatedByLabel(item.createdBy)}
                </Text>
              </View>

              <View className="flex-row mt-4" style={{ gap: 10 }}>
                <Pressable
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    router.push({
                      pathname: "/master/managers/staff/edit",
                      params: { id: item._id },
                    } as any);
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
                    setDeleteTarget(item);
                    setConfirmDeleteOpen(true);
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
    );
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: SURFACE }}
      edges={["left", "right", "bottom"]}
    >
      <FlatList
        data={loading && items.length === 0 ? [] : filtered}
        keyExtractor={(it) => it._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: 28,
          flexGrow:
            !loading && items.length !== 0 && filtered.length === 0
              ? 1
              : undefined,
        }}
        onRefresh={fetchStaff}
        refreshing={loading}
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
                Showing staff members in current result
              </Text>

              <View className="mt-4 flex-row" style={{ gap: 10 }}>
                <HeaderMetric label="Total" value={String(counts.all)} />
                <HeaderMetric label="Active" value={String(counts.active)} />
                <HeaderMetric
                  label="Supervisors"
                  value={String(counts.supervisors)}
                />
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
                value={q}
                onChangeText={setQ}
                placeholder="Search staff"
                placeholderTextColor="#94A3B8"
                className="flex-1 text-slate-900 ml-3 py-1"
                style={{ fontSize: 15, fontWeight: "600" }}
              />

              {!!q && (
                <Pressable
                  onPress={() => setQ("")}
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
                    onPress={() =>
                      setFilter(item.key as "ALL" | "ACTIVE" | "INACTIVE")
                    }
                  />
                )}
              />
            </View>

            {loading && items.length === 0 ? (
              <View className="pt-5">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : null}
          </View>
        }
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
                No staff found
              </Text>
              <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
                Try updating your search term or switching the filter tabs above.
              </Text>
            </View>
          ) : null
        }
      />

      {confirmDeleteOpen && (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 18,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text className="text-slate-900 font-extrabold text-lg">
              Delete Staff
            </Text>

            <Text className="text-slate-600 mt-2 leading-6">
              Delete{" "}
              <Text className="font-extrabold">{deleteTarget?.name}</Text>{" "}
              permanently?
            </Text>

            <View className="flex-row mt-5" style={{ gap: 12 }}>
              <Pressable
                onPress={() => {
                  if (acting) return;
                  setConfirmDeleteOpen(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 rounded-2xl border border-slate-200 py-3 items-center"
              >
                <Text className="text-slate-800 font-extrabold">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onDelete}
                disabled={acting}
                className="flex-1 rounded-2xl py-3 items-center"
                style={{ backgroundColor: acting ? "#9CA3AF" : "#DC2626" }}
              >
                <Text className="text-white font-extrabold">
                  {acting ? "Please wait..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}