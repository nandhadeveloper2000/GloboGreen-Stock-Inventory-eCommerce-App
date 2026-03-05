import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi"; // adjust path
import { useAuth } from "../../context/auth/AuthProvider"; // adjust path

const apiUrl = (path: string) => `${baseURL}${path}`;

type ShopOwner = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: string;
};

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

export default function MasterHome() {
  const router = useRouter();
  const { token } = useAuth();

  const [loadingOwners, setLoadingOwners] = useState(false);
  const [owners, setOwners] = useState<ShopOwner[]>([]);

  const fetchOwners = useCallback(async () => {
    if (!token) return;
    setLoadingOwners(true);

    try {
      const res = await fetch(apiUrl(SummaryApi.master_all_shopowners.url), {
        method: SummaryApi.master_all_shopowners.method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toastError(data?.message || `Failed (${res.status})`);
        setOwners([]);
        return;
      }

      const list: ShopOwner[] =
        data?.data || data?.shopowners || data?.items || data || [];

      setOwners(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toastError(e?.message || "Network error");
      setOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const { activeCount, inactiveCount, recentOwners } = useMemo(() => {
    const safe = Array.isArray(owners) ? owners : [];
    const activeOwners = safe.filter((o) => o?.isActive !== false);
    const inactiveOwners = safe.filter((o) => o?.isActive === false);

    const recentOwners = [...safe]
      .sort((a, b) => {
        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 6);

    return {
      activeCount: activeOwners.length,
      inactiveCount: inactiveOwners.length,
      recentOwners,
    };
  }, [owners]);

  /** ✅ Correct navigation helper */
  const goShopOwnerDetails = useCallback(
    (id: string) => {
      router.push({
        pathname: "/master/managers/shopowners/[id]",
        params: { id },
      });
    },
    [router]
  );

  const Card = ({
    title,
    subtitle,
    icon,
    color,
    onPress,
  }: {
    title: string;
    subtitle: string;
    icon: any;
    color: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-3xl p-5 mb-4 border border-gray-200"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-gray-900 font-extrabold text-lg">{title}</Text>
          <Text className="text-gray-500 mt-1">{subtitle}</Text>
        </View>

        <View
          className="h-14 w-14 rounded-2xl items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <MaterialCommunityIcons name={icon} size={28} color="#fff" />
        </View>
      </View>
    </Pressable>
  );

  const StatChip = ({
    label,
    value,
    color,
    icon,
    onPress,
  }: {
    label: string;
    value: number;
    color: string;
    icon: any;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="bg-white rounded-3xl border border-gray-200 p-4 flex-1"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-gray-500 font-semibold">{label}</Text>
          <Text className="text-gray-900 font-extrabold text-2xl mt-1">
            {value}
          </Text>
        </View>

        <View
          className="h-12 w-12 rounded-2xl items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <MaterialCommunityIcons name={icon} size={22} color="#fff" />
        </View>
      </View>
    </Pressable>
  );

  /** ✅ 3-column dashboard shortcut tile */
  const QuickTile = ({
    label,
    icon,
    bg,
    onPress,
  }: {
    label: string;
    icon: any;
    bg: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-3xl border border-gray-200 flex-1 items-center justify-center p-3"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        minHeight: 110,
      }}
    >
      <View
        className="h-12 w-12 rounded-2xl items-center justify-center"
        style={{ backgroundColor: bg }}
      >
        <MaterialCommunityIcons name={icon} size={24} color="#fff" />
      </View>

      <Text className="text-gray-900 font-extrabold text-[12px] mt-3 text-center">
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB]" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== ShopOwner Overview ===== */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-900 font-extrabold text-lg">
              Shop Owners Overview
            </Text>

            <Pressable
              onPress={fetchOwners}
              className="bg-white border border-gray-200 px-3 py-2 rounded-2xl"
            >
              {loadingOwners ? (
                <ActivityIndicator />
              ) : (
                <MaterialCommunityIcons name="refresh" size={18} color="#111827" />
              )}
            </Pressable>
          </View>

          <View className="flex-row gap-3">
            <StatChip
              label="Active"
              value={activeCount}
              color="#16A34A"
              icon="check-decagram"
              onPress={() => router.push("/master/shopOwners")}
            />
            <StatChip
              label="Deactive"
              value={inactiveCount}
              color="#EF4444"
              icon="close-circle"
              onPress={() => router.push("/master/shopOwners")}
            />
          </View>

          {/* Recent preview list */}
          <View className="bg-white rounded-3xl border border-gray-200 p-4 mt-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-900 font-extrabold">Recent Shop Owners</Text>

              <Pressable onPress={() => router.push("/master/shopOwners")}>
                <Text className="text-indigo-600 font-extrabold">View All</Text>
              </Pressable>
            </View>

            {recentOwners.length === 0 ? (
              <Text className="text-gray-500">No shop owners found.</Text>
            ) : (
              recentOwners.map((o) => {
                const name = o?.name || o?.username || "Shop Owner";
                const active = o?.isActive !== false;

                return (
                  <Pressable
                    key={o._id}
                    onPress={() => goShopOwnerDetails(o._id)}
                    className="py-3 border-b border-gray-100"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-gray-900 font-bold">{name}</Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          {o?.email || "—"}
                        </Text>
                      </View>

                      <View
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: active ? "#DCFCE7" : "#FEE2E2" }}
                      >
                        <Text
                          className="text-xs font-extrabold"
                          style={{ color: active ? "#166534" : "#991B1B" }}
                        >
                          {active ? "ACTIVE" : "DEACTIVE"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* ===== Quick Actions (3-column grid) ===== */}
        <View className="mb-4">
          <Text className="text-gray-900 font-extrabold text-lg mb-3">
            Quick Actions
          </Text>

          <View className="flex-row gap-3">
            <QuickTile
              label="Add Manager"
              icon="account-plus-outline"
              bg="#4F46E5"
              onPress={() => router.push("/master/managers/create")}
            />

            <QuickTile
              label="Add Shop Owner"
              icon="store-plus-outline"
              bg="#16A34A"
              onPress={() => router.push("/master/managers/shopowners/create")}
            />

            <QuickTile
              label="Add Staff"
              icon="account-tie-outline"
              bg="#9333EA"
              onPress={() => router.push("/master/managers/staff/create")}
            />
          </View>
        </View>

        {/* ===== Main Navigation Cards ===== */}
        <Card
          title="Managers"
          subtitle="Manage system managers"
          icon="account-group-outline"
          color="#4F46E5"
          onPress={() => router.push("/master/managers")}
        />

        <Card
          title="Shop Owners"
          subtitle="Manage all shop owners"
          icon="store-outline"
          color="#16A34A"
          onPress={() => router.push("/master/shopOwners")}
        />

        <Card
          title="Staff"
          subtitle="Manage staff members"
          icon="account-tie-outline"
          color="#9333EA"
          onPress={() => router.push("/master/staffs")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}