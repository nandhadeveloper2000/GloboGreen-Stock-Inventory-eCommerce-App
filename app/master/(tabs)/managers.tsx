// app/master/(tabs)/managers/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useNavigation, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";

type SubAdmin = {
  _id: string;
  name: string;
  username: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  idProofUrl?: string;
};

const apiUrl = (path: string) => `${baseURL}${path}`;

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

const toastError = (title: string, msg?: string) =>
  Toast.show({ type: "error", text1: title, text2: msg || "" });

const toastSuccess = (title: string, msg?: string) =>
  Toast.show({ type: "success", text1: title, text2: msg || "" });

const toastInfo = (title: string, msg?: string) =>
  Toast.show({ type: "info", text1: title, text2: msg || "" });

/* =========================
   Premium UI helpers
========================= */
const InfoLine = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row items-center justify-between py-2">
    <Text className="text-gray-500 text-[12px] font-semibold">{label}</Text>
    <Text
      numberOfLines={1}
      className="text-gray-900 font-extrabold max-w-[65%] text-right"
    >
      {value || "-"}
    </Text>
  </View>
);

const Divider = () => <View className="h-[1px] bg-gray-100" />;

export default function ManagersIndex() {
  const { token } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [list, setList] = useState<SubAdmin[]>([]);
  const [search, setSearch] = useState("");

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<SubAdmin | null>(null);
  const [eName, setEName] = useState("");
  const [eUsername, setEUsername] = useState("");
  const [eEmail, setEEmail] = useState("");

  // Delete confirm modal
  const [deleteOpen, setDeleteOpen] = useState(false);

  const headersJson = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

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
      return { text, json: null as any };
    }
  };

  /* =========================
     ✅ HEADER: title + right add button
  ========================= */
  useEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Managers",
      headerRight: () => (
        <Pressable
          onPress={() => router.push("../managers/create")}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#111827" />
        </Pressable>
      ),
    });
  }, [navigation, router]);

  /* =========================
     LIST
  ========================= */
  const loadSubAdmins = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(apiUrl(SummaryApi.master_all_subadmin.url), {
        method: SummaryApi.master_all_subadmin.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError("Failed to load", json?.message || `HTTP ${res.status}`);
        return;
      }

      setList(Array.isArray(json.data) ? json.data : []);
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setLoading(false);
    }
  }, [headersAuthOnly]);

  useEffect(() => {
    loadSubAdmins();
  }, [loadSubAdmins]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((x) => {
      const name = (x.name || "").toLowerCase();
      const username = (x.username || "").toLowerCase();
      const email = (x.email || "").toLowerCase();
      return name.includes(q) || username.includes(q) || email.includes(q);
    });
  }, [list, search]);

  /* =========================
     EDIT OPEN/CLOSE
  ========================= */
  const openEdit = (item: SubAdmin) => {
    setEditItem(item);
    setEditOpen(true);
    setEName(item.name || "");
    setEUsername(item.username || "");
    setEEmail(item.email || "");
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditItem(null);
    setDeleteOpen(false);
  };

  /* =========================
     PICK IMAGE
  ========================= */
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toastInfo("Permission Required", "Please allow gallery permission");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled) return null;
    return result.assets?.[0] ?? null;
  };

  const filePart = (asset: ImagePicker.ImagePickerAsset, prefix: string) => {
    const uri = asset.uri;
    const isPng = uri.toLowerCase().endsWith(".png");
    const mime = (asset as any).mimeType ?? (isPng ? "image/png" : "image/jpeg");
    const filename = `${prefix}_${Date.now()}.${isPng ? "png" : "jpg"}`;
    return { uri, name: filename, type: mime } as any;
  };

  /* =========================
     AVATAR UPLOAD (PUT /:id/avatar)
  ========================= */
  const changeAvatar = async () => {
    if (!editItem?._id) return;

    const asset = await pickImage();
    if (!asset?.uri) return;

    const form = new FormData();
    form.append("avatar", filePart(asset, "avatar"));

    try {
      setSaving(true);

      const res = await fetch(
        apiUrl(SummaryApi.master_subadmin_avatar_upload.url(editItem._id)),
        {
          method: SummaryApi.master_subadmin_avatar_upload.method, // PUT
          headers: headersAuthOnly,
          body: form,
        }
      );

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError("Upload Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      const newUrl = json?.data?.avatarUrl;
      if (typeof newUrl === "string" && newUrl.trim().length > 5) {
        setEditItem((prev) => (prev ? { ...prev, avatarUrl: newUrl } : prev));
      }

      await loadSubAdmins();
      toastSuccess("Success", "Avatar updated");
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     ID PROOF UPLOAD (PATCH /:id FormData)
  ========================= */
  const changeIdProof = async () => {
    if (!editItem?._id) return;

    const asset = await pickImage();
    if (!asset?.uri) return;

    const form = new FormData();
    form.append("idproof", filePart(asset, "idproof")); // ✅ must be "idproof"

    try {
      setSaving(true);

      const res = await fetch(
        apiUrl(SummaryApi.master_update_subadmin.url(editItem._id)),
        {
          method: SummaryApi.master_update_subadmin.method, // PATCH
          headers: headersAuthOnly,
          body: form,
        }
      );

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError("Upload Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      const newUrl = json?.data?.idProofUrl;
      if (typeof newUrl === "string") {
        setEditItem((prev) => (prev ? { ...prev, idProofUrl: newUrl } : prev));
      }

      await loadSubAdmins();
      toastSuccess("Success", "ID Proof updated");
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     UPDATE (PATCH JSON)
  ========================= */
  const updateSubAdmin = async () => {
    if (!editItem?._id) return;

    const name = eName.trim();
    const username = eUsername.trim().toLowerCase();
    const email = eEmail.trim().toLowerCase();

    if (!name || !username || !email) {
      toastError("Validation", "Enter name, username, email");
      return;
    }
    if (!isValidEmail(email)) {
      toastError("Validation", "Enter valid email");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(
        apiUrl(SummaryApi.master_update_subadmin.url(editItem._id)),
        {
          method: SummaryApi.master_update_subadmin.method, // PATCH
          headers: headersJson,
          body: JSON.stringify({ name, username, email }),
        }
      );

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError("Update Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      await loadSubAdmins();
      toastSuccess("Updated", "SubAdmin updated");
      closeEdit();
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     DELETE
  ========================= */
  const requestDelete = () => {
    if (!editItem?._id) return;
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    const id = editItem?._id;
    if (!id) return;

    try {
      setSaving(true);

      const res = await fetch(apiUrl(SummaryApi.master_delete_subadmin.url(id)), {
        method: SummaryApi.master_delete_subadmin.method, // DELETE
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError("Delete Failed", json?.message || `HTTP ${res.status}`);
        return;
      }

      await loadSubAdmins();
      toastSuccess("Deleted", "SubAdmin deleted");
      closeEdit();
    } catch {
      toastError("Network Error", "Please check your connection");
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     PREMIUM CARD
  ========================= */
  const SubAdminCard = ({ item, index }: { item: SubAdmin; index: number }) => {
    const showAvatar =
      typeof item.avatarUrl === "string" && item.avatarUrl.trim().length > 5;

    const role = (item.role || "MANAGER").toUpperCase();

    const badgeBg =
      role === "MASTER_ADMIN"
        ? "bg-amber-50 border-amber-100"
        : role === "SUPERVISOR"
        ? "bg-sky-50 border-sky-100"
        : "bg-indigo-50 border-indigo-100";

    const badgeText =
      role === "MASTER_ADMIN"
        ? "text-amber-700"
        : role === "SUPERVISOR"
        ? "text-sky-700"
        : "text-indigo-700";

    return (
      <Pressable
        onPress={() => openEdit(item)}
        className="bg-white rounded-3xl border border-gray-100 mb-3 overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <View className="px-4 pt-4 pb-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-900 font-extrabold">
              Id :{" "}
              <Text className="text-gray-700">
                {String(index + 1).padStart(2, "0")}
              </Text>
            </Text>

            <View className={`px-3 py-1 rounded-full border ${badgeBg}`}>
              <Text className={`${badgeText} text-[12px] font-extrabold`}>
                {role}
              </Text>
            </View>
          </View>

          <View className="mt-3 bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3">
            <InfoLine label="Name" value={item.name || "-"} />
            <Divider />
            <InfoLine label="Username" value={`@${item.username || "-"}`} />
            <Divider />
            <InfoLine label="Email" value={item.email || "-"} />
          </View>

          <View className="flex-row items-center justify-between mt-4">
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-full bg-gray-100 border border-gray-200 overflow-hidden items-center justify-center">
                {showAvatar ? (
                  <Image
                    source={{ uri: item.avatarUrl! }}
                    style={{ width: 44, height: 44 }}
                  />
                ) : (
                  <MaterialCommunityIcons name="account" size={22} color="#9CA3AF" />
                )}
              </View>

              <View className="ml-3">
                <Text className="text-gray-500 text-[12px] font-semibold">
                  Tap to edit
                </Text>
                <Text className="text-gray-900 font-extrabold">View / Update</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Pressable
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  openEdit(item);
                }}
                className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 items-center justify-center mr-2"
              >
                <MaterialCommunityIcons name="pencil" size={18} color="#047857" />
              </Pressable>

              <Pressable
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  openEdit(item);
                  setTimeout(() => setDeleteOpen(true), 50);
                }}
                className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 items-center justify-center"
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color="#BE123C"
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="h-[6px] bg-gray-50" />
      </Pressable>
    );
  };

  const showIdProof =
    typeof editItem?.idProofUrl === "string" && editItem.idProofUrl.trim().length > 5;

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB] px-4" edges={["top"]}>
      {/* Search */}
      <View className="mt-3 mb-3 bg-white border border-gray-200 rounded-2xl px-3 py-2 flex-row items-center">
        <MaterialCommunityIcons name="magnify" size={20} color="#6B7280" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name / username / email"
          className="flex-1 ml-2 text-gray-900"
          placeholderTextColor="#9CA3AF"
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")} hitSlop={10}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}

        <Pressable
          onPress={loadSubAdmins}
          hitSlop={10}
          className="p-2"
          disabled={loading}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={22}
            color={loading ? "#9CA3AF" : "#111827"}
          />
        </Pressable>
      </View>

      {/* List */}
      {loading && list.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-gray-600">Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => <SubAdminCard item={item} index={index} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-10 items-center">
              <Text className="text-gray-500">No SubAdmins found</Text>
            </View>
          }
        />
      )}

      {/* EDIT MODAL */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-900 text-lg font-extrabold">Edit SubAdmin</Text>
              <Pressable onPress={closeEdit} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={22} color="#111827" />
              </Pressable>
            </View>

            {/* Avatar */}
            <View className="items-center mt-2">
              <View className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden items-center justify-center border border-gray-200">
                {editItem?.avatarUrl ? (
                  <Image source={{ uri: editItem.avatarUrl }} style={{ width: 80, height: 80 }} />
                ) : (
                  <MaterialCommunityIcons name="account" size={40} color="#9CA3AF" />
                )}
              </View>

              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={changeAvatar}
                  disabled={saving}
                  className={`px-4 py-2 rounded-xl ${saving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"}`}
                >
                  <Text className="text-white font-extrabold">
                    {saving ? "Uploading..." : "Change Avatar"}
                  </Text>
                </Pressable>
              </View>

              <Text className="mt-2 text-[12px] text-gray-500">
                Tap “Change Avatar” to update photo
              </Text>
            </View>

            {/* ID Proof */}
            <View className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
              <Text className="text-gray-900 font-extrabold">ID Proof</Text>

              <View className="flex-row items-center mt-3">
                <View className="w-14 h-14 rounded-2xl bg-white border border-gray-200 overflow-hidden items-center justify-center">
                  {showIdProof ? (
                    <Image
                      source={{ uri: editItem!.idProofUrl! }}
                      style={{ width: 56, height: 56 }}
                    />
                  ) : (
                    <MaterialCommunityIcons name="card-account-details" size={26} color="#9CA3AF" />
                  )}
                </View>

                <View className="flex-1 ml-3">
                  <Text className="text-gray-700 font-semibold">
                    {showIdProof ? "Uploaded" : "Not uploaded"}
                  </Text>
                  <Text className="text-gray-500 text-[12px] mt-0.5">
                    Upload Aadhaar / PAN / License photo
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={changeIdProof}
                  disabled={saving}
                  className={`px-4 py-2 rounded-xl ${saving ? "bg-[#111827]/60" : "bg-[#111827]"}`}
                >
                  <Text className="text-white font-extrabold">
                    {saving ? "Uploading..." : "Change ID Proof"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text className="mt-4 text-gray-700 font-semibold mb-2">Name</Text>
            <TextInput
              value={eName}
              onChangeText={setEName}
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
              placeholder="Name"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="mt-3 text-gray-700 font-semibold mb-2">Username</Text>
            <TextInput
              value={eUsername}
              onChangeText={setEUsername}
              autoCapitalize="none"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
              placeholder="Username"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="mt-3 text-gray-700 font-semibold mb-2">Email</Text>
            <TextInput
              value={eEmail}
              onChangeText={setEEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
            />

            <View className="flex-row gap-3 mt-5">
              <Pressable
                onPress={updateSubAdmin}
                disabled={saving}
                className={`flex-1 rounded-2xl py-4 items-center ${saving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"}`}
              >
                <Text className="text-white font-extrabold">
                  {saving ? "Saving..." : "Update"}
                </Text>
              </Pressable>

              {!!editItem?._id && (
                <Pressable
                  onPress={requestDelete}
                  disabled={saving}
                  className="flex-1 rounded-2xl py-4 items-center bg-red-600"
                >
                  <Text className="text-white font-extrabold">Delete</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        visible={deleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteOpen(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="w-full bg-white rounded-3xl p-5">
            <Text className="text-gray-900 text-lg font-extrabold">Delete SubAdmin?</Text>
            <Text className="mt-2 text-gray-600">
              Are you sure you want to delete this SubAdmin? This action cannot be undone.
            </Text>

            <View className="flex-row gap-3 mt-5">
              <Pressable
                onPress={() => setDeleteOpen(false)}
                disabled={saving}
                className="flex-1 rounded-2xl py-4 items-center bg-gray-200"
              >
                <Text className="text-gray-900 font-extrabold">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={confirmDelete}
                disabled={saving}
                className={`flex-1 rounded-2xl py-4 items-center ${saving ? "bg-red-600/60" : "bg-red-600"}`}
              >
                <Text className="text-white font-extrabold">
                  {saving ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}