// app/master/(tabs)/managers/create.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

const apiUrl = (path: string) => `${baseURL}${path}`;

export default function CreateSubAdmin() {
  const { token } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [saving, setSaving] = useState(false);

  // Create
  const [cName, setCName] = useState("");
  const [cUsername, setCUsername] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPin, setCPin] = useState("");
  const [cAvatar, setCAvatar] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  // ID Proof (optional)
  const [cIdProof, setCIdProof] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    navigation.setOptions?.({
      headerTitle: "Create SubAdmin",
    });
  }, [navigation]);

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

  const resetCreate = () => {
    setCName("");
    setCUsername("");
    setCEmail("");
    setCPin("");
    setCAvatar(null);
    setCIdProof(null);
  };

  const requestGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please allow gallery permission",
      });
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const ok = await requestGallery();
    if (!ok) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled) return null;
    return result.assets?.[0] ?? null;
  };

  const pickAvatar = async () => {
    const asset = await pickImage();
    if (!asset?.uri) return;
    setCAvatar(asset);
  };

  const pickIdProof = async () => {
    const asset = await pickImage();
    if (!asset?.uri) return;
    setCIdProof(asset);
  };

  const filePart = (asset: ImagePicker.ImagePickerAsset, prefix: string) => {
    const uri = asset.uri;
    const isPng = uri.toLowerCase().endsWith(".png");
    const mime = (asset as any).mimeType ?? (isPng ? "image/png" : "image/jpeg");
    const filename = `${prefix}_${Date.now()}.${isPng ? "png" : "jpg"}`;
    return { uri, name: filename, type: mime } as any;
  };

  const createSubAdmin = async () => {
    const name = cName.trim();
    const username = cUsername.trim().toLowerCase();
    const email = cEmail.trim().toLowerCase();
    const pin = String(cPin || "").trim();

    if (!name || !username || !email || !pin) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Enter name, username, email and PIN",
      });
      return;
    }
    if (!isValidEmail(email)) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Enter a valid email address",
      });
      return;
    }
    if (pin.length < 4) {
      Toast.show({
        type: "error",
        text1: "Invalid PIN",
        text2: "PIN must be at least 4 digits",
      });
      return;
    }

    try {
      setSaving(true);

      const hasFiles = !!cAvatar?.uri || !!cIdProof?.uri;

      if (hasFiles) {
        const form = new FormData();
        form.append("name", name);
        form.append("username", username);
        form.append("email", email);
        form.append("pin", pin);

        if (cAvatar?.uri) form.append("avatar", filePart(cAvatar, "avatar"));
        if (cIdProof?.uri) form.append("idproof", filePart(cIdProof, "idproof"));

        const res = await fetch(apiUrl(SummaryApi.master_create_subadmin.url), {
          method: SummaryApi.master_create_subadmin.method,
          headers: headersAuthOnly,
          body: form,
        });

        const { json } = await readResponse(res);
        if (!res.ok || !json?.success) {
          Toast.show({
            type: "error",
            text1: "Create Failed",
            text2: json?.message || `HTTP ${res.status}`,
          });
          return;
        }
      } else {
        const res = await fetch(apiUrl(SummaryApi.master_create_subadmin.url), {
          method: SummaryApi.master_create_subadmin.method,
          headers: headersJson,
          body: JSON.stringify({ name, username, email, pin }),
        });

        const { json } = await readResponse(res);
        if (!res.ok || !json?.success) {
          Toast.show({
            type: "error",
            text1: "Create Failed",
            text2: json?.message || `HTTP ${res.status}`,
          });
          return;
        }
      }

      resetCreate();
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "SubAdmin created successfully",
      });

      // ✅ Go back to managers list
      router.back();
    } catch {
      Toast.show({
        type: "error",
        text1: "Network Error",
        text2: "Please check your connection",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-[#F7F8FB]"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
        <Text className="text-gray-900 text-lg font-extrabold">
          Create SubAdmin
        </Text>

        {/* Avatar */}
        <View className="items-center mt-4">
          <View className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden items-center justify-center border border-gray-200">
            {cAvatar?.uri ? (
              <Image source={{ uri: cAvatar.uri }} style={{ width: 80, height: 80 }} />
            ) : (
              <MaterialCommunityIcons name="account" size={40} color="#9CA3AF" />
            )}
          </View>

          <View className="flex-row gap-3 mt-3">
            <Pressable
              onPress={pickAvatar}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#16BB05]"
            >
              <Text className="text-white font-extrabold">Choose Avatar</Text>
            </Pressable>

            <Pressable
              onPress={() => setCAvatar(null)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gray-200"
            >
              <Text className="text-gray-900 font-extrabold">Clear</Text>
            </Pressable>
          </View>

          <Text className="mt-2 text-[12px] text-gray-500">Avatar is optional</Text>
        </View>

        {/* ID PROOF */}
        <View className="mt-5 bg-gray-50 border border-gray-200 rounded-2xl p-3">
          <Text className="text-gray-900 font-extrabold">ID Proof (optional)</Text>

          <View className="flex-row items-center mt-3">
            <View className="w-14 h-14 rounded-2xl bg-white border border-gray-200 overflow-hidden items-center justify-center">
              {cIdProof?.uri ? (
                <Image source={{ uri: cIdProof.uri }} style={{ width: 56, height: 56 }} />
              ) : (
                <MaterialCommunityIcons name="card-account-details" size={26} color="#9CA3AF" />
              )}
            </View>

            <View className="flex-1 ml-3">
              <Text className="text-gray-700 font-semibold">
                {cIdProof?.uri ? "Selected" : "Not selected"}
              </Text>
              <Text className="text-gray-500 text-[12px] mt-0.5">
                Upload Aadhaar / PAN / License photo
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3 mt-3">
            <Pressable
              onPress={pickIdProof}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#111827]"
            >
              <Text className="text-white font-extrabold">Choose ID Proof</Text>
            </Pressable>

            <Pressable
              onPress={() => setCIdProof(null)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gray-200"
            >
              <Text className="text-gray-900 font-extrabold">Clear</Text>
            </Pressable>
          </View>
        </View>

        <Text className="mt-4 text-gray-700 font-semibold mb-2">Name</Text>
        <TextInput
          value={cName}
          onChangeText={setCName}
          placeholder="Full name"
          className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
          placeholderTextColor="#9CA3AF"
        />

        <Text className="mt-3 text-gray-700 font-semibold mb-2">Username</Text>
        <TextInput
          value={cUsername}
          onChangeText={setCUsername}
          placeholder="username"
          autoCapitalize="none"
          className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
          placeholderTextColor="#9CA3AF"
        />

        <Text className="mt-3 text-gray-700 font-semibold mb-2">Email</Text>
        <TextInput
          value={cEmail}
          onChangeText={setCEmail}
          placeholder="email@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
          placeholderTextColor="#9CA3AF"
        />

        <Text className="mt-3 text-gray-700 font-semibold mb-2">PIN</Text>
        <TextInput
          value={cPin}
          onChangeText={setCPin}
          placeholder="Set PIN (e.g. 1234)"
          keyboardType="number-pad"
          className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
          placeholderTextColor="#9CA3AF"
        />

        <Pressable
          onPress={createSubAdmin}
          disabled={saving}
          className={`mt-5 rounded-2xl py-4 items-center ${
            saving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
          }`}
        >
          {saving ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#fff" />
              <Text className="ml-3 text-white font-extrabold">Saving...</Text>
            </View>
          ) : (
            <Text className="text-white font-extrabold">Create</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}