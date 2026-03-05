// app/master/(tabs)/staff.tsx  ✅ LIST (opens DETAILS) ✅ HeaderRight + Add ✅ Delete/Toggle modals
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

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

  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Staff | null>(null);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const blob = `${x.name} ${x.username} ${x.email} ${x.mobile || ""}`.toLowerCase();
      return blob.includes(s);
    });
  }, [items, q]);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);

      // ✅ make sure SummaryApi has: staff_list: { method:"GET", url:"/api/staff" }
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

  /* =========================
     ✅ HEADER: title + right add button
  ========================= */
  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Staffs",
      headerRight: () => (
        <Pressable
          onPress={() => router.push("/master/managers/staff/create")}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#111827" />
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const StatusPill = ({ active }: { active?: boolean }) => (
    <View className={`px-3 py-1 rounded-full ${active ? "bg-green-50" : "bg-red-50"}`}>
      <Text className={`text-xs font-extrabold ${active ? "text-green-700" : "text-red-700"}`}>
        {active ? "ACTIVE" : "INACTIVE"}
      </Text>
    </View>
  );

  const RolePill = ({ role }: { role: "STAFF" | "SUPERVISOR" }) => (
    <View className={`px-3 py-1 rounded-full ${role === "SUPERVISOR" ? "bg-purple-50" : "bg-blue-50"}`}>
      <Text className={`text-xs font-extrabold ${role === "SUPERVISOR" ? "text-purple-700" : "text-blue-700"}`}>
        {role}
      </Text>
    </View>
  );

  const onDelete = useCallback(async () => {
    if (!deleteTarget?._id) return;
    try {
      setActing(true);

      const res = await fetch(apiUrl(SummaryApi.staff_delete.url(String(deleteTarget._id))), {
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
      setDeleteTarget(null);
      await fetchStaff();
    } catch {
      toastError("Network error");
    } finally {
      setActing(false);
    }
  }, [deleteTarget, headersAuthOnly, fetchStaff]);

  const onToggleActive = useCallback(async () => {
    if (!toggleTarget?._id) return;
    try {
      setActing(true);

      const fd = new FormData();
      fd.append("isActive", String(!toggleTarget.isActive));

      const res = await fetch(apiUrl(SummaryApi.staff_update.url(String(toggleTarget._id))), {
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

      toastSuccess(!toggleTarget.isActive ? "Activated" : "Deactivated");
      setConfirmToggleOpen(false);
      setToggleTarget(null);
      await fetchStaff();
    } catch {
      toastError("Network error");
    } finally {
      setActing(false);
    }
  }, [toggleTarget, headersAuthOnly, fetchStaff]);

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB] px-4" edges={["top"]}>
      {/* Search */}
      <View className="bg-white border border-gray-200 rounded-2xl px-3 py-2 flex-row items-center mb-3 mt-3">
        <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search staff by name / username / email / mobile"
          placeholderTextColor="#9CA3AF"
          className="flex-1 px-2 text-gray-900"
        />
        {q ? (
          <Pressable onPress={() => setQ("")} hitSlop={10} className="p-1">
            <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-gray-600">Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it._id}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center mt-16">
              <Text className="text-gray-500">No staff found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const mainRole = item.roles?.[0] || "STAFF";
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/master/managers/staff/staffDetails",
                    params: { id: item._id },
                  })
                }
                className="bg-white border border-gray-200 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-start">
                  <View className="h-12 w-12 rounded-2xl bg-gray-100 overflow-hidden items-center justify-center">
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} className="h-12 w-12" />
                    ) : (
                      <MaterialCommunityIcons name="account" size={26} color="#9CA3AF" />
                    )}
                  </View>

                  <View className="flex-1 ml-3">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <Text className="text-gray-900 font-extrabold">{item.name}</Text>
                        <Text className="text-gray-500 mt-0.5">@{item.username}</Text>
                        <Text className="text-gray-600 mt-1">{item.email}</Text>
                        {item.mobile ? (
                          <Text className="text-gray-500 mt-1 text-xs">
                            {item.mobile}
                            {item.additionalNumber ? ` • ${item.additionalNumber}` : ""}
                          </Text>
                        ) : null}
                      </View>

                      <View className="items-end" style={{ gap: 8 }}>
                        <StatusPill active={!!item.isActive} />
                        <RolePill role={mainRole as any} />
                      </View>
                    </View>

                    {/* Actions */}
                    <View className="flex-row mt-3" style={{ gap: 10 }}>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/master/managers/staff/edit",
                            params: { id: item._id },
                          })
                        }
                        className="flex-1 bg-gray-900 rounded-2xl py-2 items-center flex-row justify-center"
                      >
                        <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
                        <Text className="text-white font-extrabold ml-2">Edit</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setToggleTarget(item);
                          setConfirmToggleOpen(true);
                        }}
                        className={`flex-1 rounded-2xl py-2 items-center flex-row justify-center ${
                          item.isActive ? "bg-red-600" : "bg-green-600"
                        }`}
                      >
                        <MaterialCommunityIcons
                          name={item.isActive ? "account-off" : "account-check"}
                          size={16}
                          color="#fff"
                        />
                        <Text className="text-white font-extrabold ml-2">
                          {item.isActive ? "Deactivate" : "Activate"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setDeleteTarget(item);
                          setConfirmDeleteOpen(true);
                        }}
                        className="w-12 bg-red-50 rounded-2xl items-center justify-center"
                      >
                        <MaterialCommunityIcons name="trash-can" size={18} color="#DC2626" />
                      </Pressable>
                    </View>

                    <Text className="text-gray-400 text-xs mt-2">
                      CreatedBy: {item.createdBy?.type || "-"} • {item.createdBy?.role || "-"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* DELETE CONFIRM */}
      <Modal
        visible={confirmDeleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteOpen(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full p-4 border border-gray-200">
            <Text className="text-gray-900 font-extrabold text-lg">Delete Staff</Text>
            <Text className="text-gray-600 mt-2">
              Delete <Text className="font-extrabold">{deleteTarget?.name}</Text> permanently?
            </Text>

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
                className={`flex-1 rounded-2xl py-3 items-center ${acting ? "bg-gray-400" : "bg-red-600"}`}
              >
                <Text className="text-white font-extrabold">{acting ? "Please wait..." : "Delete"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* TOGGLE CONFIRM */}
      <Modal
        visible={confirmToggleOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmToggleOpen(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full p-4 border border-gray-200">
            <Text className="text-gray-900 font-extrabold text-lg">Confirm</Text>
            <Text className="text-gray-600 mt-2">
              {toggleTarget?.isActive ? "Deactivate" : "Activate"}{" "}
              <Text className="font-extrabold">{toggleTarget?.name}</Text>?
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
                className={`flex-1 rounded-2xl py-3 items-center ${
                  acting ? "bg-gray-400" : toggleTarget?.isActive ? "bg-red-600" : "bg-green-600"
                }`}
              >
                <Text className="text-white font-extrabold">{acting ? "Please wait..." : "Confirm"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}