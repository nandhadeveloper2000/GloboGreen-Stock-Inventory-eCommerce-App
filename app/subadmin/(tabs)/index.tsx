import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

type CreatedBy = {
  type?: string;
  id?: string;
  role?: string;
  ref?: string;
};

type ShopOwner = {
  _id: string;
  name?: string;
  username?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: string;
  createdBy?: CreatedBy;
};

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function MetricCard({
  label,
  value,
  icon,
  color,
  onPress,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-1 rounded-[22px] overflow-hidden"
      style={{
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View
        style={{
          backgroundColor: CARD,
          borderWidth: 1,
          borderColor: "#E5EAF1",
          borderRadius: 22,
          padding: 16,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-slate-500 font-semibold">{label}</Text>
            <Text className="text-slate-900 font-extrabold text-[26px] mt-1">
              {value}
            </Text>
          </View>

          <View
            className="h-12 w-12 rounded-[16px] items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <MaterialCommunityIcons name={icon} size={22} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function QuickTile({
  label,
  icon,
  bg,
  onPress,
}: {
  label: string;
  icon: any;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-[24px] overflow-hidden"
      style={{
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View
        className="items-center justify-center"
        style={{
          backgroundColor: CARD,
          borderWidth: 1,
          borderColor: "#E5EAF1",
          borderRadius: 24,
          paddingVertical: 18,
          paddingHorizontal: 14,
          minHeight: 118,
        }}
      >
        <View
          className="h-14 w-14 rounded-[18px] items-center justify-center"
          style={{ backgroundColor: bg }}
        >
          <MaterialCommunityIcons name={icon} size={26} color="#fff" />
        </View>

        <Text className="text-slate-900 font-extrabold text-[13px] mt-3 text-center">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function SectionCard({
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
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-[28px] overflow-hidden mb-4"
      style={{
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 4,
      }}
    >
      <LinearGradient
        colors={["#FFFFFF", "#F8FFFA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 28,
          borderWidth: 1,
          borderColor: "#E8EDF3",
          padding: 18,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-slate-900 font-extrabold text-[18px]">
              {title}
            </Text>
            <Text className="text-slate-500 mt-1">{subtitle}</Text>
          </View>

          <View
            className="h-14 w-14 rounded-[18px] items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <MaterialCommunityIcons name={icon} size={26} color="#fff" />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function ManagerDashboard() {
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

  const managerCreatedOwners = useMemo(() => {
    const safeOwners = Array.isArray(owners) ? owners : [];

    return safeOwners.filter((owner) => {
      const createdRole = owner?.createdBy?.role?.toUpperCase?.() || "";
      const createdType = owner?.createdBy?.type?.toUpperCase?.() || "";

      return createdRole === "MANAGER" || createdType === "MANAGER";
    });
  }, [owners]);

  const { activeCount, inactiveCount, totalCount, recentOwners } = useMemo(() => {
    const safeOwners = Array.isArray(managerCreatedOwners)
      ? managerCreatedOwners
      : [];

    const activeOwners = safeOwners.filter((owner) => owner?.isActive !== false);
    const inactiveOwners = safeOwners.filter((owner) => owner?.isActive === false);

    const latestOwners = [...safeOwners]
      .sort((a, b) => {
        const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);

    return {
      totalCount: safeOwners.length,
      activeCount: activeOwners.length,
      inactiveCount: inactiveOwners.length,
      recentOwners: latestOwners,
    };
  }, [managerCreatedOwners]);

  const goShopOwnerDetails = useCallback(
    (id: string) => {
      router.push({
        pathname: "/subadmin/managers/shopowners/[id]",
        params: { id },
      } as any);
    },
    [router]
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: SURFACE }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#18C10A", "#109203"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            padding: 18,
            overflow: "hidden",
            marginBottom: 16,
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

          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white/90 text-[12px] font-semibold">
                Dashboard
              </Text>
              <Text className="mt-1 text-white text-[26px] font-extrabold">
                Manager Overview
              </Text>
              <Text className="text-white/90 text-sm font-medium mt-1">
                Manage shop owners and staff from one place
              </Text>
            </View>

            <Pressable
              onPress={fetchOwners}
              disabled={loadingOwners}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.16)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              {loadingOwners ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <MaterialCommunityIcons name="refresh" size={22} color="#fff" />
              )}
            </Pressable>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 10 }}>
            <View
              className="flex-1 rounded-[18px] px-3 py-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Text className="text-white/80 text-[11px] font-semibold">Total Owners</Text>
              <Text className="mt-1 text-white text-[18px] font-extrabold">
                {totalCount}
              </Text>
            </View>

            <View
              className="flex-1 rounded-[18px] px-3 py-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Text className="text-white/80 text-[11px] font-semibold">Active</Text>
              <Text className="mt-1 text-white text-[18px] font-extrabold">
                {activeCount}
              </Text>
            </View>

            <View
              className="flex-1 rounded-[18px] px-3 py-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              <Text className="text-white/80 text-[11px] font-semibold">Inactive</Text>
              <Text className="mt-1 text-white text-[18px] font-extrabold">
                {inactiveCount}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View className="mb-4">
          <Text className="text-slate-900 font-extrabold text-[18px] mb-3">
            Shop Owners Overview
          </Text>

          <View className="flex-row" style={{ gap: 12 }}>
            <MetricCard
              label="Active"
              value={activeCount}
              color="#16A34A"
              icon="check-decagram"
              onPress={() => router.push("/subadmin/shopOwners" as any)}
            />
            <MetricCard
              label="Inactive"
              value={inactiveCount}
              color="#EF4444"
              icon="close-circle"
              onPress={() => router.push("/subadmin/shopOwners" as any)}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-slate-900 font-extrabold text-[18px] mb-3">
            Quick Actions
          </Text>

          <View className="flex-row" style={{ gap: 12 }}>
            <QuickTile
              label="Add Shop Owner"
              icon="store-plus-outline"
              bg="#16A34A"
              onPress={() =>
                router.push("/subadmin/managers/shopowners/create" as any)
              }
            />

            <QuickTile
              label="Add Staff"
              icon="account-tie-outline"
              bg="#9333EA"
              onPress={() => router.push("/subadmin/managers/staff/create" as any)}
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: CARD,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "#E8EDF3",
            padding: 16,
            marginBottom: 16,
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-slate-900 font-extrabold text-[16px]">
              Recent Shop Owners
            </Text>

            <Pressable onPress={() => router.push("/subadmin/shopOwners" as any)}>
              <Text className="font-extrabold" style={{ color: BRAND }}>
                View All
              </Text>
            </Pressable>
          </View>

          {loadingOwners ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator color={BRAND} />
              <Text className="mt-3 text-slate-500 font-medium">
                Loading recent owners...
              </Text>
            </View>
          ) : recentOwners.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <View className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 items-center justify-center">
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={28}
                  color="#94A3B8"
                />
              </View>
              <Text className="mt-4 text-slate-900 font-extrabold">
                No shop owners found
              </Text>
              <Text className="mt-1 text-slate-500 text-center">
                No manager-created shop owners available.
              </Text>
            </View>
          ) : (
            recentOwners.map((owner, index) => {
              const displayName = owner?.name || owner?.username || "Shop Owner";
              const isActive = owner?.isActive !== false;
              const isLast = index === recentOwners.length - 1;

              return (
                <Pressable
                  key={owner._id}
                  onPress={() => goShopOwnerDetails(owner._id)}
                  className="py-3"
                  style={{
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: "#F1F5F9",
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 pr-3">
                      <View
                        className="w-11 h-11 rounded-[14px] items-center justify-center"
                        style={{ backgroundColor: "#F0FDF4" }}
                      >
                        <MaterialCommunityIcons
                          name="store-outline"
                          size={20}
                          color={BRAND_DARK}
                        />
                      </View>

                      <View className="ml-3 flex-1">
                        <Text className="text-slate-900 font-bold" numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text className="text-slate-500 text-xs mt-1" numberOfLines={1}>
                          {owner?.email || "—"}
                        </Text>
                        <Text className="text-slate-400 text-[11px] mt-1">
                          Created {formatDate(owner?.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: isActive ? "#DCFCE7" : "#FEE2E2",
                      }}
                    >
                      <Text
                        className="text-[11px] font-extrabold"
                        style={{ color: isActive ? "#166534" : "#991B1B" }}
                      >
                        {isActive ? "ACTIVE" : "INACTIVE"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <SectionCard
          title="Shop Owners"
          subtitle="Manage all shop owners"
          icon="store-outline"
          color="#16A34A"
          onPress={() => router.push("/subadmin/shopOwners" as any)}
        />

        <SectionCard
          title="Staff"
          subtitle="Manage staff members"
          icon="account-tie-outline"
          color="#9333EA"
          onPress={() => router.push("/subadmin/staffs" as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}