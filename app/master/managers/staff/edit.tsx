// app/master/managers/staff/edit.tsx  ✅ EDIT (separate screen) ✅ back to /master/managers/staff
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../../constants/SummaryApi";
import { useAuth } from "../../../context/auth/AuthProvider";

const apiUrl = (path: string) => `${baseURL}${path}`;

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

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

export default function StaffEditScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const staffId = String(id || "");
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [doc, setDoc] = useState<Staff | null>(null);

  const [fName, setFName] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPin, setFPin] = useState(""); // optional
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
      headerTitle: "Edit Staff",
      headerShadowVisible: false,
      headerStyle: { backgroundColor: "#F7F8FB" },
      headerTitleStyle: { fontWeight: "800", color: "#111827" },
    });
  }, [navigation]);

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

  const load = useCallback(async () => {
    if (!staffId) return;
    try {
      setLoading(true);

      // ✅ make sure SummaryApi has:
      // staff_get: { method:"GET", url:(id)=>`/api/staff/${id}` }
      const res = await fetch(apiUrl(SummaryApi.staff_get.url(staffId)), {
        method: SummaryApi.staff_get.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      const s: Staff = json.data;
      setDoc(s);

      setFName(s.name || "");
      setFUsername(s.username || "");
      setFEmail(s.email || "");
      setFPin("");
      setFRoles(Array.isArray(s.roles) && s.roles.length ? s.roles : ["STAFF"]);
      setFMobile(s.mobile || "");
      setFAdditional(s.additionalNumber || "");

      setFState(s.address?.state || "");
      setFDistrict(s.address?.district || "");
      setFTaluk(s.address?.taluk || "");
      setFArea(s.address?.area || "");
      setFStreet(s.address?.street || "");
      setFPincode(s.address?.pincode || "");

      setAvatar(null);
      setIdproof(null);
    } catch {
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [staffId, headersAuthOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const validate = () => {
    if (!fName.trim() || !fUsername.trim() || !fEmail.trim()) {
      toastError("name, username, email required");
      return false;
    }
    if (!isValidEmail(fEmail)) {
      toastError("Invalid email");
      return false;
    }
    return true;
  };

  const onUpdate = useCallback(async () => {
    if (!staffId) return;
    if (!validate()) return;

    try {
      setSaving(true);

      const fd = new FormData();
      fd.append("name", fName.trim());
      fd.append("username", fUsername.trim().toLowerCase());
      fd.append("email", fEmail.trim().toLowerCase());

      if (fPin.trim()) fd.append("pin", fPin.trim());

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

      // ✅ staff_update: { method:"PUT", url:(id)=>`/api/staff/${id}` }
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

      toastSuccess("Updated");
      // ✅ FIXED PATH
      router.replace("/master/(tabs)/staffs");
    } catch {
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  }, [
    staffId,
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
  ]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F7F8FB] px-4" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className="mt-2 text-gray-600">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doc) {
    return (
      <SafeAreaView className="flex-1 bg-[#F7F8FB] px-4" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">No data found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FB] px-4" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View className="bg-white border border-gray-200 rounded-2xl p-4 mt-3">
          <Text className="text-gray-900 font-extrabold text-lg">Update Staff</Text>

          <Text className="text-gray-900 font-extrabold mt-3">Name</Text>
          <TextInput value={fName} onChangeText={setFName} className="mt-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />

          <Text className="text-gray-900 font-extrabold mt-3">Username</Text>
          <TextInput value={fUsername} onChangeText={setFUsername} autoCapitalize="none" className="mt-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />

          <Text className="text-gray-900 font-extrabold mt-3">Email</Text>
          <TextInput value={fEmail} onChangeText={setFEmail} autoCapitalize="none" keyboardType="email-address" className="mt-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />

          <Text className="text-gray-900 font-extrabold mt-3">PIN (optional)</Text>
          <TextInput value={fPin} onChangeText={setFPin} secureTextEntry keyboardType="number-pad" className="mt-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />

          <Text className="text-gray-900 font-extrabold mt-3">Roles</Text>
          <View className="flex-row mt-2" style={{ gap: 10 }}>
            {(["STAFF", "SUPERVISOR"] as const).map((r) => {
              const on = fRoles.includes(r);
              return (
                <Pressable
                  key={r}
                  onPress={() => toggleRole(r)}
                  className={`px-4 py-2 rounded-2xl border ${on ? "bg-indigo-600 border-indigo-600" : "bg-gray-50 border-gray-200"}`}
                >
                  <Text className={`${on ? "text-white" : "text-gray-800"} font-extrabold`}>{r}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row mt-3" style={{ gap: 10 }}>
            <View className="flex-1">
              <Text className="text-gray-900 font-extrabold">Mobile</Text>
              <TextInput value={fMobile} onChangeText={setFMobile} keyboardType="phone-pad" className="mt-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-extrabold">Additional</Text>
              <TextInput value={fAdditional} onChangeText={setFAdditional} keyboardType="phone-pad" className="mt-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />
            </View>
          </View>

          <Text className="text-gray-900 font-extrabold mt-4">Address</Text>
          <View className="flex-row mt-2" style={{ gap: 10 }}>
            <TextInput placeholder="State" placeholderTextColor="#9CA3AF" value={fState} onChangeText={setFState} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />
            <TextInput placeholder="District" placeholderTextColor="#9CA3AF" value={fDistrict} onChangeText={setFDistrict} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />
          </View>
          <View className="flex-row mt-2" style={{ gap: 10 }}>
            <TextInput placeholder="Taluk" placeholderTextColor="#9CA3AF" value={fTaluk} onChangeText={setFTaluk} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />
            <TextInput placeholder="Area" placeholderTextColor="#9CA3AF" value={fArea} onChangeText={setFArea} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />
          </View>
          <TextInput placeholder="Street" placeholderTextColor="#9CA3AF" value={fStreet} onChangeText={setFStreet} className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />
          <TextInput placeholder="Pincode" placeholderTextColor="#9CA3AF" value={fPincode} onChangeText={setFPincode} keyboardType="number-pad" className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 text-gray-900" />

          <Text className="text-gray-900 font-extrabold mt-4">Uploads</Text>
          <View className="flex-row mt-2" style={{ gap: 10 }}>
            <Pressable onPress={() => pickImage("avatar")} className="flex-1 bg-gray-900 rounded-2xl py-3 items-center flex-row justify-center">
              <MaterialCommunityIcons name="image" size={18} color="#fff" />
              <Text className="text-white font-extrabold ml-2">{avatar ? "New Avatar" : "Pick Avatar"}</Text>
            </Pressable>
            <Pressable onPress={() => pickImage("idproof")} className="flex-1 bg-indigo-600 rounded-2xl py-3 items-center flex-row justify-center">
              <MaterialCommunityIcons name="file-document" size={18} color="#fff" />
              <Text className="text-white font-extrabold ml-2">{idproof ? "New IDProof" : "Pick IDProof"}</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onUpdate}
            disabled={saving}
            className={`mt-5 rounded-2xl py-3 items-center ${saving ? "bg-gray-400" : "bg-green-600"}`}
          >
            {saving ? (
              <View className="flex-row items-center">
                <ActivityIndicator />
                <Text className="text-white font-extrabold ml-2">Saving...</Text>
              </View>
            ) : (
              <Text className="text-white font-extrabold">Update Staff</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}