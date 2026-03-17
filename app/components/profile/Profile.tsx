import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

type AuthLike = {
  user?: any;
  auth?: any;
  token?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  setAuth?: (
    userOrAuth: any,
    accessToken?: string | null,
    refreshToken?: string | null
  ) => Promise<void> | void;
};

type ApiConfig = {
  url: string;
  method?: string;
};

type GradientColors = readonly [string, string, ...string[]];

type RoleTheme = {
  badge: string;
  title: string;
  subtitle: string;
  gradient: GradientColors;
};

type RoleApis = {
  me: ApiConfig | null;
  updateMe: ApiConfig | null;
  avatarUpload: ApiConfig | null;
  avatarRemove: ApiConfig | null;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getRoleLabel(role?: string | null) {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return "Master Admin";
    case ROLES.MANAGER:
      return "Manager";
    case ROLES.SUPERVISOR:
      return "Supervisor";
    case ROLES.STAFF:
      return "Staff";
    default:
      return "User";
  }
}

function getRoleTheme(role?: string | null): RoleTheme {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        badge: "MASTER ADMIN",
        title: "My Profile",
        subtitle:
          "Manage your master account details, avatar, and personal information.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };

    case ROLES.MANAGER:
      return {
        badge: "MANAGER",
        title: "My Profile",
        subtitle:
          "Manage your manager account details, avatar, and personal information.",
        gradient: [COLORS.heroGreenDark, COLORS.primaryDark, COLORS.primary],
      };

    case ROLES.SUPERVISOR:
      return {
        badge: "SUPERVISOR",
        title: "My Profile",
        subtitle:
          "Manage your supervisor account details, avatar, and personal information.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    case ROLES.STAFF:
      return {
        badge: "STAFF",
        title: "My Profile",
        subtitle:
          "Manage your staff account details, avatar, and personal information.",
        gradient: [COLORS.primaryDark, COLORS.successDark, COLORS.primary],
      };

    default:
      return {
        badge: "ACCOUNT",
        title: "My Profile",
        subtitle: "Manage your account profile information.",
        gradient: [COLORS.heroDark, COLORS.heroGreenDark, COLORS.heroGreen],
      };
  }
}

function getProfileApis(role?: string | null): RoleApis {
  const normalized = normalizeRole(role);

  switch (normalized) {
    case ROLES.MASTER_ADMIN:
      return {
        me: SummaryApi.master_me,
        updateMe: SummaryApi.master_update_me,
        avatarUpload: SummaryApi.master_avatar_upload,
        avatarRemove: SummaryApi.master_avatar_remove,
      };

    case ROLES.MANAGER:
      return {
        me: SummaryApi.subadmin_me,
        updateMe: SummaryApi.subadmin_update_me,
        avatarUpload: SummaryApi.subadmin_avatar_upload,
        avatarRemove: SummaryApi.subadmin_avatar_remove,
      };

    case ROLES.SUPERVISOR:
      return {
        me: SummaryApi.staff_me,
        updateMe: SummaryApi.staff_update_me,
        avatarUpload: SummaryApi.staff_avatar_upload_me,
        avatarRemove: SummaryApi.staff_avatar_remove_me,
      };

    case ROLES.STAFF:
      return {
        me: SummaryApi.staff_me,
        updateMe: SummaryApi.staff_update_me,
        avatarUpload: SummaryApi.staff_avatar_upload_me,
        avatarRemove: SummaryApi.staff_avatar_remove_me,
      };

    default:
      return {
        me: null,
        updateMe: null,
        avatarUpload: null,
        avatarRemove: null,
      };
  }
}

function getAvatarUrlFromUser(user: any) {
  return user?.avatarUrl || user?.avatar?.url || "";
}

function getDisplayName(user: any) {
  return user?.name || "User";
}

function InputRow({
  label,
  icon,
  value,
  onChangeText,
  props,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  props?: any;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-[13px] font-extrabold text-heading">
        {label}
      </Text>

      <View className="h-[56px] flex-row items-center rounded-[20px] border border-border bg-soft px-4">
        <View className="h-[34px] w-[34px] items-center justify-center rounded-xl border border-border bg-white">
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={COLORS.secondaryText}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={COLORS.labelText}
          autoCorrect={false}
          className="ml-3 flex-1 text-[15px] font-semibold text-primaryText"
          {...props}
        />
      </View>
    </View>
  );
}

export default function Profile() {
  const authCtx = useAuth() as unknown as AuthLike;

  const token = authCtx?.accessToken || authCtx?.token || null;
  const refreshToken = authCtx?.refreshToken || null;
  const setAuth = authCtx?.setAuth;

  const rawUser =
    authCtx?.user ||
    (authCtx?.auth && typeof authCtx.auth === "object" && "user" in authCtx.auth
      ? (authCtx.auth as any)?.user
      : authCtx?.auth) ||
    null;

  const role = rawUser?.role || null;
  const roleLabel = getRoleLabel(role);
  const theme = getRoleTheme(role);
  const apis = getProfileApis(role);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [profile, setProfile] = useState<any>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const headersJson = useMemo(() => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const avatarUrl = getAvatarUrlFromUser(profile);

  const loadMe = useCallback(async () => {
    try {
      if (!token) return;

      if (!apis.me?.url) {
        Alert.alert("Error", `${roleLabel} profile API is not configured`);
        return;
      }

      setLoading(true);

      const res = await fetch(`${baseURL}${apis.me.url}`, {
        method: apis.me.method || "GET",
        headers: headersJson,
      });

      const data: any = await readJsonSafe(res);
      const me = data?.data?.user || data?.data || data?.user || null;

      if (!res.ok || !me) {
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
  }, [token, apis.me?.url, apis.me?.method, roleLabel, headersJson]);

  useEffect(() => {
    if (!token) return;
    loadMe();
  }, [token, loadMe]);

  const saveProfile = async () => {
    if (!apis.updateMe?.url) {
      Alert.alert("Error", `${roleLabel} update profile API is not configured`);
      return;
    }

    const n = name.trim();
    const u = username.trim();
    const e = email.trim();

    if (!n || !u || !e) {
      Alert.alert("Validation", "Enter name, username, and email");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${baseURL}${apis.updateMe.url}`, {
        method: apis.updateMe.method || "PUT",
        headers: headersJson,
        body: JSON.stringify({
          name: n,
          username: u,
          email: e,
        }),
      });

      const data: any = await readJsonSafe(res);
      const updated = data?.data?.user || data?.data || data?.user || null;

      if (!res.ok || !updated) {
        Alert.alert("Update Failed", data?.message || "Try again");
        return;
      }

      setProfile(updated);

      if (typeof setAuth === "function") {
        await setAuth(updated, token, refreshToken);
      }

      Alert.alert("Saved", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!token) throw new Error("No token");

    if (!apis.avatarUpload?.url) {
      throw new Error(`${roleLabel} avatar upload API is not configured`);
    }

    const form = new FormData();
    form.append("avatar", {
      uri,
      name: `avatar_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);

    const res = await fetch(`${baseURL}${apis.avatarUpload.url}`, {
      method: apis.avatarUpload.method || "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const data: any = await readJsonSafe(res);

    if (!res.ok) {
      throw new Error(data?.message || "Upload failed");
    }

    const updated = data?.data?.user || data?.data || data?.user || null;

    if (updated) {
      setProfile(updated);
      if (typeof setAuth === "function") {
        await setAuth(updated, token, refreshToken);
      }
    }
  };

  const pickAvatarFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert("Permission", "Please allow gallery permission");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setProfile((prev: any) => ({
        ...(prev || {}),
        avatarUrl: asset.uri,
      }));

      setAvatarSaving(true);
      await uploadAvatar(asset.uri);

      Alert.alert("Done", "Profile photo updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Image upload failed");
    } finally {
      setAvatarSaving(false);
    }
  };

  const openCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();

      if (!perm.granted) {
        Alert.alert("Permission", "Please allow camera permission");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setProfile((prev: any) => ({
        ...(prev || {}),
        avatarUrl: asset.uri,
      }));

      setAvatarSaving(true);
      await uploadAvatar(asset.uri);

      Alert.alert("Done", "Profile photo updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Camera upload failed");
    } finally {
      setAvatarSaving(false);
    }
  };

  const openAvatarOptions = () => {
    if (avatarSaving) return;

    Alert.alert("Update Profile Photo", "Choose image source", [
      {
        text: "Camera",
        onPress: openCamera,
      },
      {
        text: "Gallery",
        onPress: pickAvatarFromGallery,
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const removeAvatar = async () => {
    try {
      if (!token) {
        Alert.alert("Error", "No token");
        return;
      }

      if (!apis.avatarRemove?.url) {
        Alert.alert("Error", `${roleLabel} avatar remove API is not configured`);
        return;
      }

      setAvatarSaving(true);

      const res = await fetch(`${baseURL}${apis.avatarRemove.url}`, {
        method: apis.avatarRemove.method || "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: any = await readJsonSafe(res);

      if (!res.ok) {
        Alert.alert("Failed", data?.message || "Remove failed");
        return;
      }

      const updated = data?.data?.user || data?.data || data?.user || null;

      if (updated) {
        setProfile(updated);
        if (typeof setAuth === "function") {
          await setAuth(updated, token, refreshToken);
        }
      } else {
        setProfile((prev: any) => ({
          ...(prev || {}),
          avatarUrl: "",
          avatar: undefined,
        }));
      }

      Alert.alert("Removed", "Avatar removed successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setAvatarSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        <View className="flex-1 items-center justify-center px-6">
          <View className="h-[84px] w-[84px] items-center justify-center rounded-full bg-successSoft">
            <ActivityIndicator size="large" color={COLORS.success} />
          </View>

          <Text className="mt-4 text-[16px] font-black text-primaryText">
            Loading profile...
          </Text>

          <Text className="mt-1 text-[13px] text-secondaryText">
            Please wait while we fetch your details
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor={COLORS.heroDark} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: 120,
              flexGrow: 1,
            }}
          >
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="min-h-[235px] overflow-hidden rounded-b-[34px] px-5 pb-7 pt-3"
            >
              <View className="absolute right-[-20px] top-[-30px] h-[180px] w-[180px] rounded-full bg-white/10" />
              <View className="absolute bottom-6 left-[-20px] h-[130px] w-[130px] rounded-full bg-white/10" />
              <View className="absolute right-10 top-24 h-[90px] w-[90px] rounded-full bg-white/5" />

              <View className="self-start rounded-full bg-white/15 px-3 py-1.5">
                <Text className="text-[11px] font-extrabold tracking-wide text-white">
                  {theme.badge}
                </Text>
              </View>

              <Text className="mt-4 text-[30px] font-black text-white">
                {theme.title}
              </Text>

              <Text className="mt-2 max-w-[94%] text-[14px] leading-[22px] text-white/85">
                {theme.subtitle}
              </Text>
            </LinearGradient>

            <View className="-mt-6 px-4 pb-8">
              <View
                className="rounded-[28px] border border-border bg-card p-4"
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                <View className="items-center">
                  <View className="relative">
                    <View
                      className="h-[124px] w-[124px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-soft"
                      style={{
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 3,
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
                          colors={[COLORS.successSoft, "#F0FDF4"]}
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
                            size={72}
                            color={COLORS.successDark}
                          />
                        </LinearGradient>
                      )}
                    </View>

                    <Pressable
                      onPress={openAvatarOptions}
                      disabled={avatarSaving}
                      hitSlop={10}
                      className="absolute bottom-1 right-1 h-[38px] w-[38px] items-center justify-center rounded-full border-[3px] border-white bg-primary"
                      style={{
                        shadowColor: "#000",
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 4,
                      }}
                    >
                      {avatarSaving ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <MaterialCommunityIcons
                          name="camera"
                          size={17}
                          color={COLORS.white}
                        />
                      )}
                    </Pressable>
                  </View>

                  <Text className="mt-4 text-[18px] font-black text-primaryText">
                    {getDisplayName(profile)}
                  </Text>

                  <Text className="mt-1 text-[13px] font-semibold text-secondaryText">
                    @{profile?.username || "username"}
                  </Text>

                  <View className="mt-4 w-full flex-row gap-3">
                    <Pressable
                      onPress={openAvatarOptions}
                      disabled={avatarSaving}
                      className={`flex-1 flex-row items-center justify-center rounded-[18px] px-4 py-3.5 ${
                        avatarSaving ? "bg-primary/60" : "bg-primary"
                      }`}
                    >
                      {avatarSaving ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <>
                          <MaterialCommunityIcons
                            name="image-edit-outline"
                            size={18}
                            color={COLORS.white}
                          />
                          <Text className="ml-2 text-[14px] font-extrabold text-white">
                            Change Photo
                          </Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={removeAvatar}
                      disabled={avatarSaving}
                      className="flex-1 flex-row items-center justify-center rounded-[18px] border border-border bg-soft px-4 py-3.5"
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color={COLORS.primaryText}
                      />
                      <Text className="ml-2 text-[14px] font-extrabold text-primaryText">
                        Remove
                      </Text>
                    </Pressable>
                  </View>

                  <Text className="mt-3 text-center text-[12px] text-secondaryText">
                    Tap camera or change photo to update your profile photo
                  </Text>
                </View>

                <View className="mt-5 rounded-[22px] border border-border bg-soft px-4 py-3">
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-[12px] font-extrabold text-secondaryText">
                      ACCOUNT TYPE
                    </Text>
                    <Text className="font-black text-successDark">
                      {roleLabel}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-[12px] font-extrabold text-secondaryText">
                      EMAIL
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="max-w-[65%] text-right font-extrabold text-primaryText"
                    >
                      {profile?.email || "-"}
                    </Text>
                  </View>
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
                    returnKeyType: "done",
                    textContentType: "emailAddress",
                  }}
                />

                <Pressable
                  onPress={saveProfile}
                  disabled={saving}
                  className={`mb-4 mt-6 items-center rounded-[20px] py-4 ${
                    saving ? "bg-primary/60" : "bg-primary"
                  }`}
                >
                  <View className="flex-row items-center">
                    {saving ? (
                      <>
                        <ActivityIndicator color={COLORS.white} />
                        <Text className="ml-2 font-black text-white">
                          Saving...
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="content-save"
                          size={20}
                          color={COLORS.white}
                        />
                        <Text className="ml-2 font-black text-white">
                          Save Changes
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}