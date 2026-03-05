import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import * as DocumentPicker from "expo-document-picker";

import SummaryApi, { baseURL } from "../../../constants/SummaryApi";
import { useAuth } from "../../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const toastInfo = (msg: string) =>
  Toast.show({ type: "info", text1: "Info", text2: msg });

type PopulatedShop = {
  _id: string;
  name?: string;
  shopName?: string;
  businessType?: string;
  businessTypes?: string[];
  city?: string;
};

type ShopLite = string | PopulatedShop;

type DocFieldKey = "idProof" | "gstCertificate" | "udyamCertificate";

type DocField = {
  url?: string;
  publicId?: string;
  mimeType?: string;
  fileName?: string;
  bytes?: number;
};

export default function ShopOwnerDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [data, setData] = useState<any>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  // docs UI state
  const [docUploadingKey, setDocUploadingKey] = useState<DocFieldKey | null>(null);
  const [docRemovingKey, setDocRemovingKey] = useState<DocFieldKey | null>(null);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const headersJson = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
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

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);

      const url = SummaryApi.master_get_shopowner.url(String(id));
      const res = await fetch(apiUrl(url), {
        method: SummaryApi.master_get_shopowner.method,
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
  }, [id, headersAuthOnly]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const isActive = !!data?.isActive;

  const shops: ShopLite[] = useMemo(() => {
    if (Array.isArray(data?.shops) && data.shops.length) return data.shops;
    if (Array.isArray(data?.shopIds) && data.shopIds.length) return data.shopIds;
    return [];
  }, [data]);

  /** ✅ FIX: backend expects req.body.isActive */
  const onToggleActive = useCallback(async () => {
    if (!id) return;

    try {
      setToggling(true);

      const url = SummaryApi.master_toggle_shopowner_active.url(String(id));
      const res = await fetch(apiUrl(url), {
        method: SummaryApi.master_toggle_shopowner_active.method,
        headers: headersJson,
        body: JSON.stringify({ isActive: !isActive }),
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess(json?.message || (!isActive ? "Activated" : "Deactivated"));
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setToggling(false);
      setConfirmOpen(false);
    }
  }, [id, headersJson, fetchDetails, isActive]);

  const getDocField = (key: DocFieldKey): DocField => {
    const v = (data?.[key] || {}) as DocField;
    return v || {};
  };

  const openDocUrl = async (url?: string) => {
    if (!url) return toastInfo("No document uploaded");
    try {
      await Linking.openURL(url);
    } catch {
      toastError("Unable to open document");
    }
  };

  const pickAndUploadDoc = async (key: DocFieldKey) => {
    if (!id) return;

    try {
      setDocUploadingKey(key);

      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: ["application/pdf", "image/*"],
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return toastError("File not selected");

      // NOTE: DocumentPicker provides mimeType/name/size on most platforms
      const mime = asset.mimeType || "application/octet-stream";
      const name = asset.name || `${key}_${Date.now()}`;

      const form = new FormData();
      form.append(key, { uri: asset.uri, name, type: mime } as any);

      const res = await fetch(
        apiUrl(SummaryApi.master_shopowner_docs_upload.url(String(id))),
        {
          method: SummaryApi.master_shopowner_docs_upload.method,
          headers: headersAuthOnly,
          body: form,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess(`${key} updated ✅`);
      await fetchDetails();
    } catch (e: any) {
      toastError(e?.message || "Upload failed");
    } finally {
      setDocUploadingKey(null);
    }
  };

  const removeDoc = async (key: DocFieldKey) => {
    if (!id) return;

    try {
      setDocRemovingKey(key);

      const res = await fetch(
        apiUrl(SummaryApi.master_shopowner_docs_remove.url(String(id), key)),
        {
          method: SummaryApi.master_shopowner_docs_remove.method,
          headers: headersAuthOnly,
        }
      );

      const rr = await readResponse(res);
      const json = rr.json;

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", rr.text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess(`${key} removed ✅`);
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setDocRemovingKey(null);
    }
  };

  const DocRow = ({ label, keyName }: { label: string; keyName: DocFieldKey }) => {
    const v = getDocField(keyName);
    const has = !!v?.url;

    const busyUpload = docUploadingKey === keyName;
    const busyRemove = docRemovingKey === keyName;

    return (
      <View className="border border-gray-200 rounded-2xl p-3 mt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-gray-900 font-extrabold">{label}</Text>
            <Text className="text-gray-500 text-xs mt-1">
              {has ? (v.fileName || v.mimeType || "Uploaded") : "Not uploaded"}
            </Text>
            {has ? (
              <Text className="text-gray-400 text-[11px] mt-1">
                {(v.mimeType || "").toUpperCase()} {v.bytes ? `• ${(v.bytes / 1024).toFixed(1)} KB` : ""}
              </Text>
            ) : null}
          </View>

          <View className="flex-row" style={{ gap: 10 }}>
            <Pressable
              onPress={() => openDocUrl(v.url)}
              className="px-3 py-2 rounded-xl bg-gray-100"
            >
              <Text className="text-gray-900 font-extrabold text-xs">View</Text>
            </Pressable>

            <Pressable
              onPress={() => pickAndUploadDoc(keyName)}
              disabled={busyUpload || busyRemove}
              className={`px-3 py-2 rounded-xl ${busyUpload ? "bg-[#16BB05]/60" : "bg-[#16BB05]"}`}
            >
              {busyUpload ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-extrabold text-xs">
                  {has ? "Replace" : "Upload"}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => removeDoc(keyName)}
              disabled={!has || busyUpload || busyRemove}
              className={`px-3 py-2 rounded-xl ${!has ? "bg-gray-200" : "bg-red-600"} ${busyRemove ? "opacity-70" : ""}`}
            >
              {busyRemove ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`${!has ? "text-gray-500" : "text-white"} font-extrabold text-xs`}>
                  Remove
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB] px-4" edges={["top"]}>
      <View className="flex-row items-center justify-between py-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="p-2">
          <MaterialCommunityIcons name="chevron-left" size={30} color="#111827" />
        </Pressable>

        <Text className="text-gray-900 text-lg font-extrabold">ShopOwner Details</Text>

        <View className="w-10" />
      </View>

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
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* PROFILE */}
          <View className="bg-white border border-gray-200 rounded-2xl p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-gray-900 font-extrabold text-lg">{data?.name}</Text>
                <Text className="text-gray-500 mt-1">@{data?.username}</Text>
                <Text className="text-gray-600 mt-2">{data?.email}</Text>
              </View>

              <View className={`px-3 py-1 rounded-full ${isActive ? "bg-green-50" : "bg-red-50"}`}>
                <Text className={`text-xs font-extrabold ${isActive ? "text-green-700" : "text-red-700"}`}>
                  {isActive ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-gray-900 font-extrabold">Mobile</Text>
              <Text className="text-gray-600 mt-1">{data?.mobile || "-"}</Text>
            </View>

            <View className="mt-4">
              <Text className="text-gray-900 font-extrabold">Shop Control</Text>
              <Text className="text-gray-600 mt-1">{data?.shopControl || "-"}</Text>
            </View>

            <View className="mt-5">
              <Pressable
                onPress={() => setConfirmOpen(true)}
                disabled={toggling}
                className={`rounded-2xl px-4 py-3 flex-row items-center justify-center ${
                  isActive ? "bg-red-600" : "bg-green-600"
                } ${toggling ? "opacity-70" : ""}`}
              >
                {toggling ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <MaterialCommunityIcons name={isActive ? "account-off" : "account-check"} size={20} color="#fff" />
                )}
                <Text className="text-white font-extrabold ml-2">
                  {toggling ? "Updating..." : isActive ? "Deactivate" : "Activate"}
                </Text>
              </Pressable>

              <Text className="text-gray-500 text-xs mt-2">
                Toggle ShopOwner status (Master/Manager access).
              </Text>
            </View>
          </View>

          {/* ✅ DOCUMENTS */}
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-900 font-extrabold text-base">Documents</Text>
              <View className="bg-indigo-50 px-3 py-1 rounded-full">
                <Text className="text-indigo-700 font-extrabold text-xs">PDF / Image</Text>
              </View>
            </View>

            <DocRow label="ID Proof" keyName="idProof" />
            <DocRow label="GST Certificate" keyName="gstCertificate" />
            <DocRow label="Udyam Certificate" keyName="udyamCertificate" />

            <Text className="text-gray-400 text-[11px] mt-3">
              Upload supports PDF/JPEG/PNG/WEBP. Replace will overwrite the same key.
            </Text>
          </View>

          {/* SHOPS */}
          <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-900 font-extrabold text-base">Shops</Text>
              <View className="bg-indigo-50 px-3 py-1 rounded-full">
                <Text className="text-indigo-700 font-extrabold text-xs">{shops.length}</Text>
              </View>
            </View>

            {shops.length === 0 ? (
              <Text className="text-gray-500 mt-3">No shops assigned</Text>
            ) : (
              <View className="mt-3">
                {shops.map((s: ShopLite, idx: number) => {
                  const isObj = typeof s === "object" && s !== null;
                  const sid = isObj ? (s as PopulatedShop)._id : String(s);

                  const title = isObj
                    ? (s as PopulatedShop).shopName || (s as PopulatedShop).name || "Shop"
                    : "Shop";

                  const bt = isObj
                    ? Array.isArray((s as any).businessTypes)
                      ? (s as any).businessTypes.join(", ")
                      : (s as any).businessType
                    : "";

                  const sub = isObj
                    ? [bt, (s as PopulatedShop).city, sid?.slice?.(-6)].filter(Boolean).join(" • ")
                    : sid;

                  return (
                    <View key={`${sid}-${idx}`} className="border border-gray-200 rounded-2xl p-3 mb-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-2">
                          <Text className="text-gray-900 font-extrabold">{title}</Text>
                          <Text className="text-gray-500 mt-1 text-xs">{sub}</Text>
                        </View>

                        <View className="bg-gray-50 px-3 py-1 rounded-full">
                          <Text className="text-gray-700 font-bold text-xs">#{idx + 1}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {Array.isArray(data?.shopIds) &&
            data.shopIds.length > 0 &&
            !(Array.isArray(data?.shops) && data.shops.length) ? (
              <Text className="text-gray-400 text-xs mt-1">
                Tip: populate shopIds or return data.shops for full shop details.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      )}

      {/* CONFIRM MODAL */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full p-4 border border-gray-200">
            <Text className="text-gray-900 font-extrabold text-lg">Confirm</Text>
            <Text className="text-gray-600 mt-2">
              Are you sure you want to {isActive ? "deactivate" : "activate"} this shop owner?
            </Text>

            <View className="flex-row mt-4" style={{ gap: 12 }}>
              <Pressable
                onPress={() => setConfirmOpen(false)}
                disabled={toggling}
                className="flex-1 rounded-2xl border border-gray-200 py-3 items-center"
              >
                <Text className="text-gray-800 font-extrabold">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onToggleActive}
                disabled={toggling}
                className={`flex-1 rounded-2xl py-3 items-center ${
                  isActive ? "bg-red-600" : "bg-green-600"
                } ${toggling ? "opacity-70" : ""}`}
              >
                <Text className="text-white font-extrabold">
                  {toggling ? "Please wait..." : isActive ? "Deactivate" : "Activate"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}