import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Pressable,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../../context/auth/AuthProvider";
import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { router } from "expo-router";

export default function MasterProfile() {
  const { token, refreshToken, user, setAuth } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [profile, setProfile] = useState<any>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const headersJson = useMemo(() => {
    const h: any = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  /* ===================== LOAD (ME) ✅ ===================== */

  const loadMe = async () => {
    try {
      setLoading(true);

      const url = `${baseURL}${SummaryApi.master_me.url}`;
      const res = await fetch(url, {
        method: SummaryApi.master_me.method,
        headers: headersJson,
      });

      const data = await res.json().catch(() => null);
      const me = data?.data?.user;

      if (!res.ok || !data?.success || !me) {
        Alert.alert("Failed", data?.message || "Cannot load profile");
        return;
      }

      setProfile(me);
      setName(me?.name || "");
      setUsername(me?.username || "");
      setEmail(me?.email || "");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ===================== SAVE PROFILE ===================== */

  const saveProfile = async () => {
    const id = profile?._id || user?._id;
    if (!id) return Alert.alert("Error", "Master id not found");

    const n = name.trim();
    const u = username.trim();
    const e = email.trim();

    if (!n || !u || !e) {
      Alert.alert("Validation", "Enter name, username, email");
      return;
    }

    try {
      setSaving(true);

      const url = `${baseURL}${SummaryApi.master_update.url(id)}`;
      const res = await fetch(url, {
        method: SummaryApi.master_update.method,
        headers: headersJson,
        body: JSON.stringify({ name: n, username: u, email: e }),
      });

      const data = await res.json().catch(() => null);
      const updated = data?.data?.user;

      if (!res.ok || !data?.success || !updated) {
        Alert.alert("Update Failed", data?.message || "Try again");
        return;
      }

      setProfile(updated);
      await setAuth(updated, token, refreshToken); // keep refreshToken
      Alert.alert("Saved", "Profile updated");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  /* ===================== AVATAR UPLOAD ===================== */

  const avatarUrl = profile?.avatarUrl || "";

  const uploadAvatar = async (uri: string) => {
    if (!token) throw new Error("No token");

    const url = `${baseURL}${SummaryApi.master_avatar_upload.url}`;

    const form = new FormData();
    form.append("avatar", {
      uri,
      name: `avatar_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);

    const res = await fetch(url, {
      method: SummaryApi.master_avatar_upload.method || "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Upload failed");
    }

    const updated = data?.data?.user;
    setProfile(updated);
    await setAuth(updated, token, refreshToken);
  };

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "Allow gallery permission");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setProfile((p: any) => ({ ...(p || {}), avatarUrl: asset.uri }));

      setAvatarSaving(true);
      await uploadAvatar(asset.uri);

      Alert.alert("Done", "Avatar updated");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Upload error");
    } finally {
      setAvatarSaving(false);
    }
  };

  const removeAvatar = async () => {
    try {
      if (!token) return Alert.alert("Error", "No token");

      const url = `${baseURL}${SummaryApi.master_avatar_remove.url}`;

      setAvatarSaving(true);

      const res = await fetch(url, {
        method: SummaryApi.master_avatar_remove.method || "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        return Alert.alert("Failed", data?.message || "Remove failed");
      }

      const updated = data?.data?.user;
      setProfile(updated);
      await setAuth(updated, token, refreshToken);

      Alert.alert("Removed", "Avatar removed");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setAvatarSaving(false);
    }
  };

  /* ===================== LOGOUT ===================== */

 const logout = async () => {
  try {
    if (refreshToken) {
      const url = `${baseURL}${SummaryApi.master_logout.url}`;
      await fetch(url, {
        method: SummaryApi.master_logout.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => null);
    }

    await setAuth(null, null, null);

    router.replace("/Login"); // ✅ your route
  } catch (e) {
    await setAuth(null, null, null);
    router.replace("/Login");
  }
};

  /* ===================== UI ===================== */

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F7F8FB]">
        <ActivityIndicator />
        <Text className="mt-2 text-gray-600">Loading...</Text>
      </View>
    );
  }

  const InputRow = ({
    label,
    icon,
    value,
    onChangeText,
    props,
  }: {
    label: string;
    icon: any;
    value: string;
    onChangeText: (t: string) => void;
    props?: any;
  }) => (
    <View className="mt-4">
      <Text className="text-gray-700 font-semibold mb-1">{label}</Text>

      <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 h-11">
        <MaterialCommunityIcons name={icon} size={18} color="#6B7280" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          blurOnSubmit={false}
          {...props}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F7F8FB]"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
            {/* Header */}
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-900 text-lg font-extrabold">My Profile</Text>

              <View className="px-3 py-1 rounded-full bg-[#16BB05]/10 border border-[#16BB05]/20">
                <Text className="text-[12px] font-bold text-[#16BB05]">
                  {profile?.role || "MASTER"}
                </Text>
              </View>
            </View>

            {/* Avatar */}
            <View className="items-center mt-6">
              <View className="relative">
                <View className="w-28 h-28 rounded-full bg-gray-100 items-center justify-center overflow-hidden border border-gray-200">
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name="account" size={80} color="#9CA3AF" />
                  )}
                </View>

                <Pressable
                  onPress={pickAvatar}
                  disabled={avatarSaving}
                  className={`absolute bottom-0 right-0 w-10 h-10 rounded-full items-center justify-center border-4 border-white ${
                    avatarSaving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
                  }`}
                  hitSlop={10}
                >
                  {avatarSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="camera" size={18} color="#fff" />
                  )}
                </Pressable>
              </View>

              {/* Buttons */}
              <View className="flex-row gap-2 mt-4">
                <Pressable
                  onPress={pickAvatar}
                  disabled={avatarSaving}
                  className={`px-4 py-2 rounded-xl ${
                    avatarSaving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
                  }`}
                >
                  <Text className="text-white font-extrabold">Change</Text>
                </Pressable>

                <Pressable
                  onPress={removeAvatar}
                  disabled={avatarSaving}
                  className="px-4 py-2 rounded-xl bg-gray-200"
                >
                  <Text className="text-gray-900 font-extrabold">Remove</Text>
                </Pressable>
              </View>

              <Text className="mt-3 text-[12px] text-gray-500 text-center">
                Tap the camera icon to update your profile photo
              </Text>
            </View>

            {/* Fields */}
            <InputRow
              label="Name"
              icon="account-outline"
              value={name}
              onChangeText={setName}
              props={{
                placeholder: "Enter name",
                returnKeyType: "next",
                textContentType: "name",
              }}
            />

            <InputRow
              label="Username"
              icon="at"
              value={username}
              onChangeText={setUsername}
              props={{
                autoCapitalize: "none",
                placeholder: "Enter username",
                returnKeyType: "next",
              }}
            />

            <InputRow
              label="Email"
              icon="email-outline"
              value={email}
              onChangeText={setEmail}
              props={{
                autoCapitalize: "none",
                keyboardType: "email-address",
                placeholder: "Enter email",
                returnKeyType: "done",
                textContentType: "emailAddress",
              }}
            />

            {/* Save */}
            <Pressable
              onPress={saveProfile}
              disabled={saving}
              className={`mt-6 rounded-2xl py-4 items-center ${
                saving ? "bg-[#16BB05]/60" : "bg-[#16BB05]"
              }`}
            >
              <View className="flex-row items-center">
                {saving ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text className="ml-2 text-white font-extrabold">Saving...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
                    <Text className="ml-2 text-white font-extrabold">Save Changes</Text>
                  </>
                )}
              </View>
            </Pressable>

            {/* Logout */}
            <Pressable
              onPress={logout}
              disabled={saving || avatarSaving}
              className="mt-3 rounded-2xl py-4 items-center bg-red-500"
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons name="logout" size={20} color="#fff" />
                <Text className="ml-2 text-white font-extrabold">Logout</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}