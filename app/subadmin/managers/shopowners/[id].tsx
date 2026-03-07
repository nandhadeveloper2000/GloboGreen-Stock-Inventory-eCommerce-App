import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import * as DocumentPicker from "expo-document-picker";

import SummaryApi, { baseURL } from "../../../constants/SummaryApi";
import { useAuth } from "../../../context/auth/AuthProvider";

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

function formatDateTimeIST(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function InfoRow({
  icon,
  label,
  value,
  valueClassName = "text-slate-800 font-bold",
}: {
  icon: any;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row items-start">
      <View className="w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center mt-0.5">
        <MaterialCommunityIcons name={icon} size={16} color="#64748B" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-slate-500 text-[11px] font-extrabold uppercase tracking-wide">
          {label}
        </Text>
        <Text className={valueClassName} style={{ lineHeight: 20 }}>
          {value || "-"}
        </Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-[1px] bg-slate-200 my-2.5" />;
}

export default function ShopOwnerDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const [docUploadingKey, setDocUploadingKey] = useState<DocFieldKey | null>(null);

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

      toastSuccess(`${key} updated successfully`);
      await fetchDetails();
    } catch (e: any) {
      toastError(e?.message || "Upload failed");
    } finally {
      setDocUploadingKey(null);
    }
  };

  const DocRow = ({ label, keyName }: { label: string; keyName: DocFieldKey }) => {
    const v = getDocField(keyName);
    const has = !!v?.url;
    const busyUpload = docUploadingKey === keyName;

    return (
      <View
        className="rounded-[22px] p-4 mt-3"
        style={{
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-slate-900 font-extrabold text-[15px]">
              {label}
            </Text>

            <Text className="text-slate-500 text-xs mt-1">
              {has ? v.fileName || v.mimeType || "Uploaded" : "Not uploaded"}
            </Text>

            {has ? (
              <Text className="text-slate-400 text-[11px] mt-1">
                {(v.mimeType || "").toUpperCase()}
                {v.bytes ? ` • ${(v.bytes / 1024).toFixed(1)} KB` : ""}
              </Text>
            ) : (
              <Text className="text-slate-400 text-[11px] mt-1">
                PDF / Image supported
              </Text>
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => openDocUrl(v.url)}
              className="px-4 py-2.5 rounded-xl"
              style={{
                backgroundColor: "#F1F5F9",
                borderWidth: 1,
                borderColor: "#E2E8F0",
              }}
            >
              <Text className="text-slate-900 font-extrabold text-xs">
                View
              </Text>
            </Pressable>

            <Pressable
              onPress={() => pickAndUploadDoc(keyName)}
              disabled={busyUpload}
              className="px-4 py-2.5 rounded-xl items-center"
              style={{
                backgroundColor: busyUpload ? "rgba(22,187,5,0.6)" : BRAND,
              }}
            >
              {busyUpload ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-extrabold text-xs">
                  {has ? "Replace" : "Upload"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: SURFACE }} edges={["top"]}>
      <View
        className="flex-row items-center justify-between px-4 py-2"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#E2E8F0",
          }}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#111827" />
        </Pressable>

        <Text className="text-slate-900 text-[18px] font-extrabold">
          Shop Owner Details
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BRAND} />
          <Text className="mt-3 text-slate-600 font-semibold">Loading...</Text>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-white border border-slate-200 items-center justify-center">
            <MaterialCommunityIcons
              name="account-alert-outline"
              size={36}
              color="#94A3B8"
            />
          </View>
          <Text className="mt-4 text-slate-900 font-extrabold text-[18px]">
            No data found
          </Text>
          <Text className="mt-1 text-slate-500 text-center">
            Unable to load shop owner details.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
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
                  Profile
                </Text>
                <Text className="mt-1 text-white text-[26px] font-extrabold">
                  {data?.name || "Shop Owner"}
                </Text>
                <Text className="text-white/90 text-sm font-medium mt-1">
                  @{data?.username || "-"}
                </Text>
              </View>

              <View
                className="px-3 py-2 rounded-full"
                style={{
                  backgroundColor: isActive
                    ? "rgba(220,252,231,0.95)"
                    : "rgba(254,226,226,0.95)",
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

            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <View
                className="flex-1 rounded-[18px] px-3 py-3"
                style={{
                  backgroundColor: "rgba(255,255,255,0.14)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <Text className="text-white/80 text-[11px] font-semibold">
                  Email
                </Text>
                <Text className="mt-1 text-white text-[14px] font-extrabold" numberOfLines={1}>
                  {data?.email || "-"}
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
                <Text className="text-white/80 text-[11px] font-semibold">
                  Mobile
                </Text>
                <Text className="mt-1 text-white text-[14px] font-extrabold" numberOfLines={1}>
                  {data?.mobile || "-"}
                </Text>
              </View>
            </View>
          </LinearGradient>

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
            <Text className="text-slate-900 font-extrabold text-[16px] mb-3">
              Owner Information
            </Text>

            <InfoRow
              icon="email-outline"
              label="Email"
              value={data?.email || "-"}
            />
            <Divider />
            <InfoRow
              icon="phone-outline"
              label="Mobile"
              value={data?.mobile || "-"}
            />
            <Divider />
            <InfoRow
              icon="phone-plus-outline"
              label="Additional Number"
              value={data?.additionalNumber || "-"}
            />
            <Divider />
            <InfoRow
              icon="store-outline"
              label="Shop Control"
              value={data?.shopControl || "-"}
            />
            <Divider />
            <InfoRow
              icon="clock-outline"
              label="Created At"
              value={formatDateTimeIST(data?.createdAt)}
            />
            <Divider />
            <InfoRow
              icon="calendar-clock-outline"
              label="Updated At"
              value={formatDateTimeIST(data?.updatedAt)}
            />
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
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-900 font-extrabold text-[16px]">
                Documents
              </Text>
              <View className="bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                <Text className="text-indigo-700 font-extrabold text-xs">
                  PDF / Image
                </Text>
              </View>
            </View>

            <DocRow label="ID Proof" keyName="idProof" />
            <DocRow label="GST Certificate" keyName="gstCertificate" />
            <DocRow label="Udyam Certificate" keyName="udyamCertificate" />

            <Text className="text-slate-400 text-[11px] mt-3">
              Upload supports PDF, JPEG, PNG and WEBP. Replace will overwrite the same key.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "#E8EDF3",
              padding: 16,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.06,
              shadowRadius: 14,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-900 font-extrabold text-[16px]">
                Shops
              </Text>
              <View className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <Text className="text-emerald-700 font-extrabold text-xs">
                  {shops.length}
                </Text>
              </View>
            </View>

            {shops.length === 0 ? (
              <Text className="text-slate-500 mt-4">No shops assigned</Text>
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
                    ? [bt, (s as PopulatedShop).city, sid?.slice?.(-6)]
                        .filter(Boolean)
                        .join(" • ")
                    : sid;

                  return (
                    <View
                      key={`${sid}-${idx}`}
                      className="rounded-[22px] p-4 mb-3"
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-2">
                          <Text className="text-slate-900 font-extrabold">
                            {title}
                          </Text>
                          <Text className="text-slate-500 mt-1 text-xs">
                            {sub}
                          </Text>
                        </View>

                        <View className="bg-white px-3 py-1.5 rounded-full border border-slate-200">
                          <Text className="text-slate-700 font-bold text-xs">
                            #{idx + 1}
                          </Text>
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
              <Text className="text-slate-400 text-xs mt-1">
                Tip: populate shopIds or return data.shops for full shop details.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}