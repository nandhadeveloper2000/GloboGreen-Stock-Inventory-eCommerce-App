// app/master/managers/shopowners.tsx
// ✅ FULLY TSX
// ✅ Header uses useLayoutEffect like Staffs screen
// ✅ Staff-style card UI
// ✅ Activate/Deactivate via SummaryApi.master_toggle_shopowner_active
// ✅ Toast only (no Alert)
// ✅ Search + Refresh in header

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

type Owner = {
  _id: string;
  name: string;
  username: string;
  email: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  isActive?: boolean;
};

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const toastInfo = (msg: string) =>
  Toast.show({ type: "info", text1: "Info", text2: msg });

export default function ShopOwnersListScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Owner[]>([]);
  const [search, setSearch] = useState("");

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const readResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return { text, json: JSON.parse(text) };
    } catch {
      return { text, json: null };
    }
  };

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

      setList(Array.isArray(json.data) ? (json.data as Owner[]) : []);
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [headersAuthOnly]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  const toggleOwnerActive = useCallback(
    async (owner: Owner) => {
      try {
        const id = owner?._id;
        if (!id) return;

        const res = await fetch(
          apiUrl(SummaryApi.master_toggle_shopowner_active.url(id)),
          {
            method: SummaryApi.master_toggle_shopowner_active.method,
            headers: {
              ...headersAuthOnly,
              "Content-Type": "application/json",
            },
          }
        );

        const { text, json } = await readResponse(res);

        if (!res.ok || !json?.success) {
          if (!json) console.log("RAW:", text);
          toastError(json?.message || `HTTP ${res.status}`);
          return;
        }

        // ✅ Instant UI update (toggle)
        setList((prev) =>
          prev.map((x) => (x._id === id ? { ...x, isActive: !x.isActive } : x))
        );

        toastSuccess(owner.isActive ? "Shop Owner Deactivated" : "Shop Owner Activated");
      } catch {
        toastError("Network error");
      }
    },
    [headersAuthOnly]
  );

  const goDetails = useCallback(
    (id: string) => {
      router.push({
        pathname: "/master/managers/shopowners/[id]",
        params: { id },
      });
    },
    [router]
  );

  const goEdit = useCallback(
  (id: string) => {
    router.push({
      pathname: "/master/managers/shopowners/Edit",
      params: { id }, // Edit.tsx will read useLocalSearchParams<{id:string}>()
    });
  },
  [router]
);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((x) => {
      const s = `${x.name || ""} ${x.username || ""} ${x.email || ""} ${x.mobile || ""} ${
        x.additionalNumber || ""
      }`.toLowerCase();
      return s.includes(q);
    });
  }, [list, search]);

  /* =========================
     ✅ HEADER: title + right add + refresh
  ========================= */
  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Shop Owners",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={loadOwners}
            disabled={loading}
            style={{ paddingHorizontal: 10, paddingVertical: 6, opacity: loading ? 0.5 : 1 }}
            hitSlop={10}
          >
            <MaterialCommunityIcons name="refresh" size={24} color="#111827" />
          </Pressable>

          <Pressable
            onPress={() => router.push("/master/managers/shopowners/create")}
            style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            hitSlop={10}
          >
            <MaterialCommunityIcons name="plus" size={26} color="#111827" />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, loadOwners, loading]);

  const OwnerCard = ({ item }: { item: Owner }) => {
    const showAvatar = typeof item.avatarUrl === "string" && item.avatarUrl.trim().length > 5;
    const mobile = item.mobile || "-";
    const additional = item.additionalNumber || "";
    const mobileLine = additional ? `${mobile} • ${additional}` : mobile;

    return (
      <Pressable
        onPress={() => goDetails(item._id)}
        className="bg-white rounded-3xl border border-gray-200 mb-4 px-4 py-4"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        }}
      >
        {/* top row */}
        <View className="flex-row items-start justify-between">
          <View className="flex-row flex-1">
            <View className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden items-center justify-center">
              {showAvatar ? (
                <Image source={{ uri: item.avatarUrl! }} style={{ width: 56, height: 56 }} />
              ) : (
                <MaterialCommunityIcons name="account" size={26} color="#9CA3AF" />
              )}
            </View>

            <View className="ml-3 flex-1">
              <Text numberOfLines={1} className="text-gray-900 font-extrabold text-base">
                {item.name || "-"}
              </Text>

              <Text numberOfLines={1} className="text-gray-500 font-semibold mt-1">
                @{item.username || "-"}
              </Text>

              <Text numberOfLines={1} className="text-gray-700 mt-1">
                {item.email || "-"}
              </Text>

              <Text numberOfLines={1} className="text-gray-500 mt-1">
                {mobileLine}
              </Text>
            </View>
          </View>

          <View className="items-end ml-2">
            <View
              className={`px-3 py-1 rounded-full ${
                item.isActive ? "bg-emerald-50" : "bg-amber-50"
              }`}
            >
              <Text
                className={`text-xs font-extrabold ${
                  item.isActive ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {item.isActive ? "ACTIVE" : "INACTIVE"}
              </Text>
            </View>

            <View className="mt-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100">
              <Text className="text-xs font-extrabold text-indigo-700">SHOP OWNER</Text>
            </View>
          </View>
        </View>

        {/* buttons */}
        <View className="flex-row items-center mt-4">
          <Pressable
            onPress={(e: any) => {
              e?.stopPropagation?.();
    goEdit(item._id); // ✅ EDIT page
            }}
            className="flex-1 mr-3 rounded-2xl py-3 items-center bg-gray-900"
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
              <Text className="text-white font-extrabold ml-2">Edit</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={(e: any) => {
              e?.stopPropagation?.();
              toggleOwnerActive(item);
            }}
            className="flex-1 mr-3 rounded-2xl py-3 items-center"
            style={{
              backgroundColor: item.isActive ? "#DC2626" : "#16BB05",
            }}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name={item.isActive ? "cancel" : "check-circle"}
                size={18}
                color="#fff"
              />
              <Text className="text-white font-extrabold ml-2">
                {item.isActive ? "Deactivate" : "Activate"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={(e: any) => {
              e?.stopPropagation?.();
              toastInfo("Delete not implemented");
            }}
            className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 items-center justify-center"
          >
            <MaterialCommunityIcons name="trash-can" size={20} color="#E11D48" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB] px-4" edges={["top"]}>
      {/* Search */}
      <View className="mb-4 bg-white border border-gray-200 rounded-2xl px-3 py-2 flex-row items-center mt-3">
        <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name / username / email / mobile"
          className="flex-1 ml-2 text-gray-900"
          placeholderTextColor="#9CA3AF"
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")} hitSlop={10}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {loading && list.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-gray-600">Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <OwnerCard item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="py-10 items-center">
              <Text className="text-gray-500">No Shop Owners found</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={loadOwners}
        />
      )}
    </SafeAreaView>
  );
}