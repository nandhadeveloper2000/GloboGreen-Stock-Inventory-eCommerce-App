// app/subadmin/(tabs)/profile.tsx

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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { useAuth } from "../../context/auth/AuthProvider";
import SummaryApi, { baseURL } from "../../constants/SummaryApi";

const BRAND = "#16BB05";
const BRAND_DARK = "#119304";
const SURFACE = "#F4F7FB";
const CARD = "#FFFFFF";
const TEXT = "#0F172A";

export default function SubAdminProfile() {
  const { token, refreshToken, user, setAuth } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [profile, setProfile] = useState<any>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [additionalNumber, setAdditionalNumber] = useState("");

  const headersJson = useMemo(() => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadMe = async () => {
    try {
      setLoading(true);

      const url = `${baseURL}${SummaryApi.subadmin_me.url}`;
      const res = await fetch(url, {
        method: SummaryApi.subadmin_me.method,
        headers: headersAuthOnly,
      });

      const data = await res.json().catch(() => null);
      const me = data?.data?.user || data?.data;

      if (!res.ok || !data?.success || !me) {
        Alert.alert("Failed", data?.message || "Cannot load profile");
        return;
      }

      setProfile(me);
      setName(me?.name || "");
      setUsername(me?.username || "");
      setEmail(me?.email || "");
      setMobile(me?.mobile || "");
      setAdditionalNumber(me?.additionalNumber || "");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadMe();
  }, [token]);

  const saveProfile = async () => {
    const n = name.trim();
    const u = username.trim();
    const e = email.trim();
    const m = mobile.trim();
    const a = additionalNumber.trim();

    if (!n || !u || !e) {
      Alert.alert("Validation", "Enter name, username, email");
      return;
    }

    try {
      setSaving(true);

      const url = `${baseURL}${SummaryApi.subadmin_update_me.url}`;

      const fd = new FormData();
      fd.append("name", n);
      fd.append("username", u);
      fd.append("email", e);
      fd.append("mobile", m);
      fd.append("additionalNumber", a);

      const res = await fetch(url, {
        method: SummaryApi.subadmin_update_me.method,
        headers: headersAuthOnly,
        body: fd,
      });

      const data = await res.json().catch(() => null);
      const updated = data?.data?.user || data?.data;

      if (!res.ok || !data?.success || !updated) {
        Alert.alert("Update Failed", data?.message || "Try again");
        return;
      }

      setProfile(updated);
      await setAuth(updated, token, refreshToken);
      Alert.alert("Saved", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = profile?.avatarUrl || "";

  const uploadAvatar = async (uri: string) => {
    if (!token) throw new Error("No token");

    const url = `${baseURL}${SummaryApi.subadmin_avatar_upload.url}`;

    const form = new FormData();
    form.append("avatar", {
      uri,
      name: `avatar_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);

    const res = await fetch(url, {
      method: SummaryApi.subadmin_avatar_upload.method || "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Upload failed");
    }

    const updated = data?.data?.user || data?.data;
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
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setProfile((prev: any) => ({ ...(prev || {}), avatarUrl: asset.uri }));

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
      if (!token) {
        Alert.alert("Error", "No token");
        return;
      }

      setAvatarSaving(true);

      const url = `${baseURL}${SummaryApi.subadmin_avatar_remove.url}`;
      const res = await fetch(url, {
        method: SummaryApi.subadmin_avatar_remove.method || "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        Alert.alert("Failed", data?.message || "Remove failed");
        return;
      }

      const updated = data?.data?.user || data?.data;
      setProfile(updated);
      await setAuth(updated, token, refreshToken);

      Alert.alert("Removed", "Avatar removed");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setAvatarSaving(false);
    }
  };

  const logout = async () => {
    try {
      const url = `${baseURL}${SummaryApi.subadmin_logout.url}`;
      await fetch(url, {
        method: SummaryApi.subadmin_logout.method || "POST",
        headers: headersAuthOnly,
      }).catch(() => null);

      await setAuth(null, null, null);
      router.replace("/Login");
    } catch {
      await setAuth(null, null, null);
      router.replace("/Login");
    }
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: SURFACE }}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text className="mt-3 text-slate-600 font-semibold">Loading profile...</Text>
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
      <Text className="text-slate-700 font-semibold mb-2">{label}</Text>
      <View
        className="flex-row items-center rounded-2xl px-4 h-14"
        style={{
          backgroundColor: "#F8FAFC",
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <MaterialCommunityIcons name={icon} size={18} color="#64748B" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          className="flex-1 ml-3 text-[15px] text-slate-900 py-0"
          placeholderTextColor="#94A3B8"
          autoCorrect={false}
          blurOnSubmit={false}
          {...props}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: SURFACE }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 30,
          }}
          keyboardShouldPersistTaps="handled"
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

            <Text className="text-white/90 text-[12px] font-semibold">
              Profile Overview
            </Text>
            <Text className="mt-1 text-white text-[26px] font-extrabold">
              {profile?.name || "SubAdmin"}
            </Text>
            <Text className="text-white/90 text-sm font-medium">
              Manage your account details and avatar
            </Text>

            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <View
                className="flex-1 rounded-[18px] px-3 py-3"
                style={{
                  backgroundColor: "rgba(255,255,255,0.14)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <Text className="text-white/80 text-[11px] font-semibold">Role</Text>
                <Text className="mt-1 text-white text-[16px] font-extrabold">
                  {profile?.role || "SUBADMIN"}
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
                <Text className="text-white/80 text-[11px] font-semibold">Username</Text>
                <Text className="mt-1 text-white text-[16px] font-extrabold" numberOfLines={1}>
                  @{profile?.username || "-"}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 28,
              padding: 18,
              borderWidth: 1,
              borderColor: "#ECF0F4",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <View className="items-center">
              <View className="relative">
                <View
                  className="w-28 h-28 rounded-full overflow-hidden items-center justify-center"
                  style={{
                    backgroundColor: "#F1F5F9",
                    borderWidth: 2,
                    borderColor: "#E2E8F0",
                  }}
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
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
                      <MaterialCommunityIcons
                        name="account"
                        size={60}
                        color={BRAND_DARK}
                      />
                    </LinearGradient>
                  )}
                </View>

                <Pressable
                  onPress={pickAvatar}
                  disabled={avatarSaving}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: avatarSaving ? "rgba(22,187,5,0.6)" : BRAND,
                    borderWidth: 4,
                    borderColor: "#FFFFFF",
                  }}
                  hitSlop={10}
                >
                  {avatarSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="camera" size={18} color="#fff" />
                  )}
                </Pressable>
              </View>

              <View className="flex-row mt-4" style={{ gap: 10 }}>
                <Pressable
                  onPress={pickAvatar}
                  disabled={avatarSaving}
                  className="rounded-[18px] overflow-hidden"
                >
                  <LinearGradient
                    colors={avatarSaving ? ["rgba(22,187,5,0.6)", "rgba(17,147,4,0.6)"] : [BRAND, BRAND_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 18,
                      borderRadius: 18,
                    }}
                  >
                    <Text className="text-white font-extrabold">Change</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={removeAvatar}
                  disabled={avatarSaving}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 18,
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Text className="text-slate-900 font-extrabold">Remove</Text>
                </Pressable>
              </View>

              <Text className="mt-3 text-[12px] text-slate-500 text-center">
                Tap the camera icon to update your profile photo
              </Text>
            </View>

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
                returnKeyType: "next",
                textContentType: "emailAddress",
              }}
            />

            <InputRow
              label="Mobile"
              icon="phone-outline"
              value={mobile}
              onChangeText={setMobile}
              props={{
                keyboardType: "phone-pad",
                placeholder: "Enter mobile number",
                returnKeyType: "next",
              }}
            />

            <InputRow
              label="Additional Number"
              icon="phone-plus-outline"
              value={additionalNumber}
              onChangeText={setAdditionalNumber}
              props={{
                keyboardType: "phone-pad",
                placeholder: "Enter additional number",
                returnKeyType: "done",
              }}
            />

            <Pressable
              onPress={saveProfile}
              disabled={saving}
              className="mt-6 rounded-[20px] overflow-hidden"
            >
              <LinearGradient
                colors={saving ? ["rgba(22,187,5,0.6)", "rgba(17,147,4,0.6)"] : [BRAND, BRAND_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 15,
                  alignItems: "center",
                  borderRadius: 20,
                }}
              >
                <View className="flex-row items-center">
                  {saving ? (
                    <>
                      <ActivityIndicator color="#fff" />
                      <Text className="ml-2 text-white font-extrabold">Saving...</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
                      <Text className="ml-2 text-white font-extrabold">Save Changes</Text>
                    </>
                  )}
                </View>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={confirmLogout}
              disabled={saving || avatarSaving}
              style={{
                marginTop: 12,
                paddingVertical: 15,
                alignItems: "center",
                borderRadius: 20,
                backgroundColor: "#EF4444",
              }}
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