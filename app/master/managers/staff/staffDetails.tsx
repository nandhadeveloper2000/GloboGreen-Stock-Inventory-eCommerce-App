// app/master/(tabs)/staffs/staffDetails.tsx  ✅ DETAILS (Edit/Delete/Toggle fixed paths)
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../../constants/SummaryApi";
import { useAuth } from "../../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

async function readResponse(res: Response) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

type Staff = {
  _id: string;
  name: string;
  username: string;
  email: string;
  roles: ("STAFF" | "SUPERVISOR")[];
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  idProofUrl?: string;
  address?: {
    state?: string;
    district?: string;
    taluk?: string;
    area?: string;
    street?: string;
    pincode?: string;
  };
  createdBy?: {
    type?: "MASTER" | "MANAGER";
    role?: "MASTER_ADMIN" | "MANAGER";
    ref?: "Master" | "SubAdmin";
    id?: string;
  };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function StaffDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const staffId = String(id || "");

  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [data, setData] = useState<Staff | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchDetails = useCallback(async () => {
    if (!staffId) return;
    try {
      setLoading(true);

      const res = await fetch(apiUrl(SummaryApi.staff_get.url(staffId)), {
        method: SummaryApi.staff_get.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        setData(null);
        return;
      }

      setData(json.data || null);
    } catch {
      toastError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [staffId, headersAuthOnly]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const isActive = !!data?.isActive;

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Staff Details",
      headerShadowVisible: false,
      headerStyle: { backgroundColor: "#F7F8FB" },
      headerTitleStyle: { fontWeight: "800", color: "#111827" },
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal: 8, paddingVertical: 6 }}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="chevron-left" size={30} color="#111827" />
        </Pressable>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* ✅ FIXED: Edit goes to edit page */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/master/managers/staff/edit",
                params: { id: staffId },
              })
            }
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
            hitSlop={10}
          >
            <MaterialCommunityIcons name="pencil" size={22} color="#111827" />
          </Pressable>

          <Pressable
            onPress={() => setConfirmDeleteOpen(true)}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
            hitSlop={10}
          >
            <MaterialCommunityIcons name="trash-can" size={22} color="#DC2626" />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, staffId]);

  const onToggleActive = useCallback(async () => {
    if (!staffId || !data) return;
    try {
      setActing(true);

      const fd = new FormData();
      fd.append("isActive", String(!isActive));

      const res = await fetch(apiUrl(SummaryApi.staff_update.url(staffId)), {
        method: SummaryApi.staff_update.method,
        headers: headersAuthOnly,
        body: fd as any,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess(!isActive ? "Activated" : "Deactivated");
      setConfirmToggleOpen(false);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setActing(false);
    }
  }, [staffId, data, isActive, headersAuthOnly, fetchDetails]);

  const onDelete = useCallback(async () => {
    if (!staffId) return;
    try {
      setActing(true);

      const res = await fetch(apiUrl(SummaryApi.staff_delete.url(staffId)), {
        method: SummaryApi.staff_delete.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess("Deleted");
      setConfirmDeleteOpen(false);
      router.replace("/master/(tabs)/staffs");
    } catch {
      toastError("Network error");
    } finally {
      setActing(false);
    }
  }, [staffId, headersAuthOnly, router]);

  const RolePill = ({ role }: { role: "STAFF" | "SUPERVISOR" }) => (
    <View className={`px-3 py-1 rounded-full ${role === "SUPERVISOR" ? "bg-purple-50" : "bg-blue-50"}`}>
      <Text className={`text-xs font-extrabold ${role === "SUPERVISOR" ? "text-purple-700" : "text-blue-700"}`}>
        {role}
      </Text>
    </View>
  );

  const StatusPill = ({ active }: { active: boolean }) => (
    <View className={`px-3 py-1 rounded-full ${active ? "bg-green-50" : "bg-red-50"}`}>
      <Text className={`text-xs font-extrabold ${active ? "text-green-700" : "text-red-700"}`}>
        {active ? "ACTIVE" : "INACTIVE"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB] px-4" edges={["top"]}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-gray-600">Loading...</Text>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">No data found</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Top Card */}
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-2">
            <View className="flex-row items-start">
              <View className="h-16 w-16 rounded-2xl bg-gray-100 overflow-hidden items-center justify-center">
                {data.avatarUrl ? (
                  <Image source={{ uri: data.avatarUrl }} className="h-16 w-16" />
                ) : (
                  <MaterialCommunityIcons name="account" size={32} color="#9CA3AF" />
                )}
              </View>

              <View className="flex-1 ml-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-gray-900 font-extrabold text-lg">{data.name}</Text>
                    <Text className="text-gray-500 mt-0.5">@{data.username}</Text>
                    <Text className="text-gray-600 mt-1">{data.email}</Text>
                  </View>

                  <View style={{ gap: 8 }} className="items-end">
                    <StatusPill active={!!data.isActive} />
                    <RolePill role={(data.roles?.[0] || "STAFF") as any} />
                  </View>
                </View>

                <Text className="text-gray-500 text-xs mt-2">
                  {data.mobile ? data.mobile : "-"}
                  {data.additionalNumber ? ` • ${data.additionalNumber}` : ""}
                </Text>
              </View>
            </View>

            {/* Toggle button */}
            <Pressable
              onPress={() => setConfirmToggleOpen(true)}
              disabled={acting}
              className={`mt-4 rounded-2xl py-3 items-center flex-row justify-center ${
                isActive ? "bg-red-600" : "bg-green-600"
              } ${acting ? "opacity-70" : ""}`}
            >
              <MaterialCommunityIcons
                name={isActive ? "account-off" : "account-check"}
                size={18}
                color="#fff"
              />
              <Text className="text-white font-extrabold ml-2">
                {acting ? "Please wait..." : isActive ? "Deactivate" : "Activate"}
              </Text>
            </Pressable>
          </View>

          {/* Address */}
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-4">
            <Text className="text-gray-900 font-extrabold">Address</Text>
            <Text className="text-gray-600 mt-2">
              {[
                data.address?.street,
                data.address?.area,
                data.address?.taluk,
                data.address?.district,
                data.address?.state,
                data.address?.pincode,
              ]
                .filter(Boolean)
                .join(", ") || "-"}
            </Text>
          </View>

          {/* ID Proof */}
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-4">
            <Text className="text-gray-900 font-extrabold">ID Proof</Text>
            {data.idProofUrl ? (
              <View className="mt-3 border border-gray-200 rounded-2xl overflow-hidden">
                <Image source={{ uri: data.idProofUrl }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
              </View>
            ) : (
              <Text className="text-gray-500 mt-2">Not uploaded</Text>
            )}
          </View>

          {/* CreatedBy */}
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-4">
            <Text className="text-gray-900 font-extrabold">Created By</Text>
            <Text className="text-gray-600 mt-2">
              {data.createdBy?.type || "-"} • {data.createdBy?.role || "-"} • {data.createdBy?.ref || "-"}
            </Text>
            <Text className="text-gray-400 mt-1 text-xs">
              {data.createdBy?.id ? `ID: ${data.createdBy.id}` : ""}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Confirm Toggle */}
      <Modal visible={confirmToggleOpen} transparent animationType="fade" onRequestClose={() => setConfirmToggleOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full p-4 border border-gray-200">
            <Text className="text-gray-900 font-extrabold text-lg">Confirm</Text>
            <Text className="text-gray-600 mt-2">
              Are you sure you want to {isActive ? "deactivate" : "activate"} this staff?
            </Text>

            <View className="flex-row mt-4" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setConfirmToggleOpen(false)}
                disabled={acting}
                className="flex-1 rounded-2xl border border-gray-200 py-3 items-center"
              >
                <Text className="text-gray-800 font-extrabold">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onToggleActive}
                disabled={acting}
                className={`flex-1 rounded-2xl py-3 items-center ${isActive ? "bg-red-600" : "bg-green-600"} ${
                  acting ? "opacity-70" : ""
                }`}
              >
                <Text className="text-white font-extrabold">{acting ? "Please wait..." : "Confirm"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete */}
      <Modal visible={confirmDeleteOpen} transparent animationType="fade" onRequestClose={() => setConfirmDeleteOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full p-4 border border-gray-200">
            <Text className="text-gray-900 font-extrabold text-lg">Delete</Text>
            <Text className="text-gray-600 mt-2">Delete this staff permanently?</Text>

            <View className="flex-row mt-4" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setConfirmDeleteOpen(false)}
                disabled={acting}
                className="flex-1 rounded-2xl border border-gray-200 py-3 items-center"
              >
                <Text className="text-gray-800 font-extrabold">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onDelete}
                disabled={acting}
                className={`flex-1 rounded-2xl py-3 items-center bg-red-600 ${acting ? "opacity-70" : ""}`}
              >
                <Text className="text-white font-extrabold">{acting ? "Please wait..." : "Delete"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}