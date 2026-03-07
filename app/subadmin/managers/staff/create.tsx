import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../../constants/SummaryApi";
import { useAuth } from "../../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

const BRAND = "#16BB05";
const BRAND_DARK = "#119304";
const SURFACE = "#F4F7FB";
const CARD = "#FFFFFF";

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

async function readResponse(res: Response) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
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
      <Text className="mt-1 text-white text-[16px] font-extrabold">{value}</Text>
    </View>
  );
}

function Input({
  label,
  ...rest
}: {
  label: string;
  [key: string]: any;
}) {
  return (
    <>
      <Text className="mt-3 text-slate-700 font-semibold mb-2">{label}</Text>
      <TextInput
        {...rest}
        className="text-slate-900"
        style={{
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E2E8F0",
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
        placeholderTextColor="#94A3B8"
      />
    </>
  );
}

export default function StaffCreateScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuth();

  const [saving, setSaving] = useState(false);

  const [fName, setFName] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPin, setFPin] = useState("");
  const [fRoles, setFRoles] = useState<("STAFF" | "SUPERVISOR")[]>(["STAFF"]);
  const [fMobile, setFMobile] = useState("");
  const [fAdditional, setFAdditional] = useState("");

  const [fState, setFState] = useState("");
  const [fDistrict, setFDistrict] = useState("");
  const [fTaluk, setFTaluk] = useState("");
  const [fArea, setFArea] = useState("");
  const [fStreet, setFStreet] = useState("");
  const [fPincode, setFPincode] = useState("");

  const [avatar, setAvatar] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [idproof, setIdproof] = useState<{ uri: string; name: string; type: string } | null>(null);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Create Staff",
      headerTitleAlign: "center",
      headerShadowVisible: false,
      headerStyle: { backgroundColor: "#FFFFFF" },
      headerTitleStyle: { fontWeight: "800", color: "#111827", fontSize: 20 },
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
          }}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#111827" />
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const toggleRole = (r: "STAFF" | "SUPERVISOR") => {
    setFRoles((prev) => {
      const set = new Set(prev);
      if (set.has(r)) set.delete(r);
      else set.add(r);
      const out = Array.from(set) as ("STAFF" | "SUPERVISOR")[];
      return out.length ? out : ["STAFF"];
    });
  };

  const pickImage = useCallback(async (kind: "avatar" | "idproof") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toastError("Gallery permission required");
      return;
    }

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (r.canceled) return;
    const asset = r.assets?.[0];
    if (!asset?.uri) return;

    const name = `${kind}_${Date.now()}.jpg`;
    const file = { uri: asset.uri, name, type: "image/jpeg" };

    if (kind === "avatar") setAvatar(file);
    else setIdproof(file);
  }, []);

  const validate = useCallback(() => {
    if (!fName.trim() || !fUsername.trim() || !fEmail.trim() || !fPin.trim()) {
      toastError("name, username, email, pin required");
      return false;
    }
    if (!isValidEmail(fEmail)) {
      toastError("Invalid email");
      return false;
    }
    return true;
  }, [fName, fUsername, fEmail, fPin]);

  const onCreate = useCallback(async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const fd = new FormData();
      fd.append("name", fName.trim());
      fd.append("username", fUsername.trim().toLowerCase());
      fd.append("email", fEmail.trim().toLowerCase());
      fd.append("pin", fPin.trim());

      fRoles.forEach((r) => fd.append("roles", r));
      if (fMobile.trim()) fd.append("mobile", fMobile.trim());
      if (fAdditional.trim()) fd.append("additionalNumber", fAdditional.trim());

      fd.append("state", fState.trim());
      fd.append("district", fDistrict.trim());
      fd.append("taluk", fTaluk.trim());
      fd.append("area", fArea.trim());
      fd.append("street", fStreet.trim());
      fd.append("pincode", fPincode.trim());

      if (avatar) fd.append("avatar", avatar as any);
      if (idproof) fd.append("idproof", idproof as any);

      const res = await fetch(apiUrl(SummaryApi.staff_create.url), {
        method: SummaryApi.staff_create.method,
        headers: headersAuthOnly,
        body: fd as any,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess("Created");
      router.replace("/master/(tabs)/staffs");
    } catch {
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  }, [
    avatar,
    idproof,
    fName,
    fUsername,
    fEmail,
    fPin,
    fRoles,
    fMobile,
    fAdditional,
    fState,
    fDistrict,
    fTaluk,
    fArea,
    fStreet,
    fPincode,
    headersAuthOnly,
    router,
    validate,
  ]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: SURFACE }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

          <Text className="text-white/90 text-[12px] font-semibold">
            Create Flow
          </Text>
          <Text className="mt-1 text-white text-[26px] font-extrabold">
            Staff Setup
          </Text>
          <Text className="text-white/90 text-sm font-medium">
            Add staff profile, role, address and uploads
          </Text>

          <View className="mt-4 flex-row" style={{ gap: 10 }}>
            <HeaderMetric label="Roles" value={String(fRoles.length)} />
            <HeaderMetric label="Avatar" value={avatar ? "Added" : "Pending"} />
            <HeaderMetric label="ID Proof" value={idproof ? "Added" : "Pending"} />
          </View>
        </LinearGradient>

        <View
          className="rounded-[28px] p-4"
          style={{
            backgroundColor: CARD,
            borderWidth: 1,
            borderColor: "#E8EDF3",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.06,
            shadowRadius: 14,
            elevation: 4,
          }}
        >
          <Text className="text-slate-900 font-extrabold text-[18px]">
            Create Staff
          </Text>

          <View className="items-center mt-4">
            <View className="flex-row" style={{ gap: 16 }}>
              <View className="items-center">
                <View
                  className="w-24 h-24 rounded-full overflow-hidden items-center justify-center"
                  style={{
                    backgroundColor: "#F1F5F9",
                    borderWidth: 2,
                    borderColor: "#E2E8F0",
                  }}
                >
                  {avatar?.uri ? (
                    <Image source={{ uri: avatar.uri }} style={{ width: 96, height: 96 }} />
                  ) : (
                    <LinearGradient
                      colors={["#DCFCE7", "#F0FDF4"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialCommunityIcons name="account" size={42} color={BRAND_DARK} />
                    </LinearGradient>
                  )}
                </View>
                <Text className="mt-2 text-slate-500 text-xs font-semibold">Avatar</Text>
              </View>

              <View className="items-center">
                <View
                  className="w-24 h-24 rounded-[22px] overflow-hidden items-center justify-center"
                  style={{
                    backgroundColor: "#F1F5F9",
                    borderWidth: 2,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <MaterialCommunityIcons
                    name={idproof ? "file-document-check-outline" : "file-document-outline"}
                    size={38}
                    color={idproof ? BRAND_DARK : "#94A3B8"}
                  />
                </View>
                <Text className="mt-2 text-slate-500 text-xs font-semibold">ID Proof</Text>
              </View>
            </View>

            <View className="flex-row mt-4" style={{ gap: 10 }}>
              <Pressable
                onPress={() => pickImage("avatar")}
                style={{
                  backgroundColor: BRAND,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text className="text-white font-extrabold">
                  {avatar ? "Change Avatar" : "Pick Avatar"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => pickImage("idproof")}
                style={{
                  backgroundColor: "#4F46E5",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text className="text-white font-extrabold">
                  {idproof ? "Change IDProof" : "Pick IDProof"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Input label="Name" value={fName} onChangeText={setFName} placeholder="Full name" />
          <Input
            label="Username"
            value={fUsername}
            onChangeText={setFUsername}
            placeholder="username"
            autoCapitalize="none"
          />
          <Input
            label="Email"
            value={fEmail}
            onChangeText={setFEmail}
            placeholder="email@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="PIN (required)"
            value={fPin}
            onChangeText={setFPin}
            placeholder="Enter PIN"
            secureTextEntry
            keyboardType="number-pad"
          />

          <Text className="mt-4 text-slate-900 font-extrabold">Roles</Text>
          <View className="flex-row mt-2" style={{ gap: 10 }}>
            {(["STAFF", "SUPERVISOR"] as const).map((r) => {
              const on = fRoles.includes(r);
              return (
                <Pressable
                  key={r}
                  onPress={() => toggleRole(r)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    backgroundColor: on ? "#4F46E5" : "#F8FAFC",
                    borderColor: on ? "#4F46E5" : "#E2E8F0",
                  }}
                >
                  <Text
                    style={{
                      color: on ? "#FFFFFF" : "#1F2937",
                      fontWeight: "800",
                    }}
                  >
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row mt-3" style={{ gap: 10 }}>
            <View className="flex-1">
              <Input
                label="Mobile"
                value={fMobile}
                onChangeText={setFMobile}
                placeholder="mobile"
                keyboardType="phone-pad"
              />
            </View>
            <View className="flex-1">
              <Input
                label="Additional"
                value={fAdditional}
                onChangeText={setFAdditional}
                placeholder="additional"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Text className="mt-4 text-slate-900 font-extrabold">Address</Text>
          <View className="flex-row mt-2" style={{ gap: 10 }}>
            <View className="flex-1">
              <TextInput
                placeholder="State"
                placeholderTextColor="#94A3B8"
                value={fState}
                onChangeText={setFState}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: "#0F172A",
                }}
              />
            </View>
            <View className="flex-1">
              <TextInput
                placeholder="District"
                placeholderTextColor="#94A3AF"
                value={fDistrict}
                onChangeText={setFDistrict}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: "#0F172A",
                }}
              />
            </View>
          </View>

          <View className="flex-row mt-2" style={{ gap: 10 }}>
            <View className="flex-1">
              <TextInput
                placeholder="Taluk"
                placeholderTextColor="#94A3AF"
                value={fTaluk}
                onChangeText={setFTaluk}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: "#0F172A",
                }}
              />
            </View>
            <View className="flex-1">
              <TextInput
                placeholder="Area"
                placeholderTextColor="#94A3AF"
                value={fArea}
                onChangeText={setFArea}
                style={{
                  backgroundColor: "#F8FAFC",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 18,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: "#0F172A",
                }}
              />
            </View>
          </View>

          <TextInput
            placeholder="Street"
            placeholderTextColor="#94A3AF"
            value={fStreet}
            onChangeText={setFStreet}
            style={{
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: "#0F172A",
              marginTop: 8,
            }}
          />

          <TextInput
            placeholder="Pincode"
            placeholderTextColor="#94A3AF"
            value={fPincode}
            onChangeText={setFPincode}
            keyboardType="number-pad"
            style={{
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 14,
              color: "#0F172A",
              marginTop: 8,
            }}
          />

          <Pressable
            onPress={onCreate}
            disabled={saving}
            className="mt-5 rounded-[20px] overflow-hidden"
          >
            <LinearGradient
              colors={
                saving
                  ? ["rgba(22,187,5,0.6)", "rgba(17,147,4,0.6)"]
                  : [BRAND, BRAND_DARK]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 15,
                alignItems: "center",
                borderRadius: 20,
              }}
            >
              {saving ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#fff" />
                  <Text className="text-white font-extrabold ml-2">Saving...</Text>
                </View>
              ) : (
                <Text className="text-white font-extrabold">Create Staff</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 