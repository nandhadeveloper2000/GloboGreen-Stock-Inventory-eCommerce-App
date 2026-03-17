// app/components/staff/create.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

const apiUrl = (path: string) => `${baseURL}${path}`;

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

type StaffRole = "STAFF" | "SUPERVISOR";

type UploadFile = {
  uri: string;
  name: string;
  type: string;
} | null;

type AppInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
};

function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon = "text-box-outline",
  keyboardType = "default",
  autoCapitalize = "sentences",
  secureTextEntry = false,
}: AppInputProps) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text
        style={{
          color: COLORS.secondaryText,
          fontSize: 12,
          fontWeight: "800",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.7,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: COLORS.card,
          borderColor: COLORS.border,
          borderWidth: 1,
          borderRadius: 18,
          paddingHorizontal: 14,
          minHeight: 56,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={COLORS.primary}
          />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.labelText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          style={{
            flex: 1,
            marginLeft: 12,
            color: COLORS.primaryText,
            fontSize: 15,
            fontWeight: "600",
            paddingVertical: 14,
          }}
        />
      </View>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginTop: 14,
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            backgroundColor: COLORS.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={COLORS.primary}
          />
        </View>

        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text
            style={{
              color: COLORS.heading,
              fontSize: 17,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text
              style={{
                color: COLORS.secondaryText,
                fontSize: 12,
                marginTop: 3,
                fontWeight: "500",
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {children}
    </View>
  );
}

function RoleChip({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: 1.2,
        borderColor: active ? COLORS.primary : COLORS.border,
        backgroundColor: active ? COLORS.primary : COLORS.soft,
      }}
    >
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active
              ? "rgba(255,255,255,0.16)"
              : COLORS.primarySoft,
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={active ? COLORS.white : COLORS.primary}
          />
        </View>

        <Text
          style={{
            marginTop: 8,
            fontWeight: "800",
            fontSize: 14,
            color: active ? COLORS.white : COLORS.heading,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function UploadBox({
  title,
  subtitle,
  selected,
  icon,
  onPress,
  previewUri,
  tint,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  previewUri?: string;
  tint: "dark" | "primary";
}) {
  const dark = tint === "dark";

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 22,
        padding: 14,
        borderWidth: 1,
        borderColor: selected
          ? COLORS.successLight
          : dark
          ? COLORS.border
          : COLORS.primaryLight,
        backgroundColor: selected
          ? COLORS.successSoft
          : dark
          ? COLORS.heroDark
          : COLORS.primary,
        minHeight: 165,
      }}
    >
      <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
        {selected && previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={{
              width: 78,
              height: 78,
              borderRadius: 22,
              marginBottom: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 20,
              backgroundColor: selected
                ? COLORS.white
                : "rgba(255,255,255,0.14)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <MaterialCommunityIcons
              name={selected ? "check-circle" : icon}
              size={28}
              color={selected ? COLORS.success : COLORS.white}
            />
          </View>
        )}

        <Text
          style={{
            color: selected ? COLORS.successDark : COLORS.white,
            fontWeight: "800",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {selected ? `${title} Selected` : title}
        </Text>

        <Text
          style={{
            color: selected ? COLORS.successDark : "rgba(255,255,255,0.76)",
            fontSize: 12,
            marginTop: 6,
            textAlign: "center",
            fontWeight: "500",
          }}
        >
          {selected ? "Tap to change image" : subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export default function StaffCreateScreen() {
  const router = useRouter();
  const { token, user, isReady, loading } = useAuth();

  const currentRole = useMemo(() => {
    const rawRole = user?.role || user?.roles?.[0] || null;
    return normalizeRole(rawRole);
  }, [user]);

  const canAccessCreateScreen = useMemo(() => {
    return (
      currentRole === ROLES.MASTER_ADMIN ||
      currentRole === ROLES.MANAGER ||
      currentRole === ROLES.SUPERVISOR
    );
  }, [currentRole]);

  const allowedAssignableRoles = useMemo<StaffRole[]>(() => {
    if (currentRole === ROLES.MASTER_ADMIN) return ["STAFF", "SUPERVISOR"];
    if (currentRole === ROLES.MANAGER) return ["STAFF", "SUPERVISOR"];
    if (currentRole === ROLES.SUPERVISOR) return ["STAFF"];
    return [];
  }, [currentRole]);

  const [saving, setSaving] = useState(false);

  const [fName, setFName] = useState("");
  const [fUsername, setFUsername] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPin, setFPin] = useState("");
  const [fRoles, setFRoles] = useState<StaffRole[]>(["STAFF"]);
  const [fMobile, setFMobile] = useState("");
  const [fAdditional, setFAdditional] = useState("");

  const [fState, setFState] = useState("");
  const [fDistrict, setFDistrict] = useState("");
  const [fTaluk, setFTaluk] = useState("");
  const [fArea, setFArea] = useState("");
  const [fStreet, setFStreet] = useState("");
  const [fPincode, setFPincode] = useState("");

  const [avatar, setAvatar] = useState<UploadFile>(null);
  const [idproof, setIdproof] = useState<UploadFile>(null);

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const toggleRole = useCallback(
    (role: StaffRole) => {
      if (!allowedAssignableRoles.includes(role)) return;

      setFRoles((prev) => {
        const exists = prev.includes(role);

        let next: StaffRole[] = exists
          ? prev.filter((r) => r !== role)
          : [...prev, role];

        next = next.filter((r) => allowedAssignableRoles.includes(r));

        if (!next.length) {
          return [allowedAssignableRoles[0] ?? "STAFF"];
        }

        return next;
      });
    },
    [allowedAssignableRoles]
  );

  const pickImage = useCallback(async (kind: "avatar" | "idproof") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      toastError("Gallery permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      aspect: kind === "avatar" ? [1, 1] : undefined,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    const file = {
      uri: asset.uri,
      name: `${kind}_${Date.now()}.jpg`,
      type: "image/jpeg",
    };

    if (kind === "avatar") {
      setAvatar(file);
    } else {
      setIdproof(file);
    }
  }, []);

  const validate = useCallback(() => {
    if (!canAccessCreateScreen) {
      toastError("You do not have permission to create staff");
      return false;
    }

    if (!fName.trim() || !fUsername.trim() || !fEmail.trim() || !fPin.trim()) {
      toastError("Name, username, email and pin are required");
      return false;
    }

    if (!isValidEmail(fEmail)) {
      toastError("Invalid email address");
      return false;
    }

    if (fPin.trim().length < 4) {
      toastError("PIN must be at least 4 digits");
      return false;
    }

    const validSelectedRoles = fRoles.filter((r) =>
      allowedAssignableRoles.includes(r)
    );

    if (!validSelectedRoles.length) {
      toastError("Please select a valid role");
      return false;
    }

    return true;
  }, [
    allowedAssignableRoles,
    canAccessCreateScreen,
    fEmail,
    fName,
    fPin,
    fRoles,
    fUsername,
  ]);

  const onCreate = useCallback(async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const fd = new FormData();

      fd.append("name", fName.trim());
      fd.append("username", fUsername.trim().toLowerCase());
      fd.append("email", fEmail.trim().toLowerCase());
      fd.append("pin", fPin.trim());

      fRoles
        .filter((role) => allowedAssignableRoles.includes(role))
        .forEach((role) => fd.append("roles", role));

      if (fMobile.trim()) fd.append("mobile", fMobile.trim());
      if (fAdditional.trim()) fd.append("additionalNumber", fAdditional.trim());

      if (fState.trim()) fd.append("state", fState.trim());
      if (fDistrict.trim()) fd.append("district", fDistrict.trim());
      if (fTaluk.trim()) fd.append("taluk", fTaluk.trim());
      if (fArea.trim()) fd.append("area", fArea.trim());
      if (fStreet.trim()) fd.append("street", fStreet.trim());
      if (fPincode.trim()) fd.append("pincode", fPincode.trim());

      if (avatar) fd.append("avatar", avatar as any);
      if (idproof) fd.append("idproof", idproof as any);

      const res = await fetch(apiUrl(SummaryApi.staff_create.url), {
        method: SummaryApi.staff_create.method,
        headers: headersAuthOnly,
        body: fd as any,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) {
          console.log("RAW_STAFF_CREATE_RESPONSE:", text);
        }
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess("Staff created successfully");
      router.back();
    } catch (error) {
      console.log("CREATE_STAFF_ERROR", error);
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  }, [
    allowedAssignableRoles,
    avatar,
    fAdditional,
    fArea,
    fDistrict,
    fEmail,
    fMobile,
    fName,
    fPin,
    fPincode,
    fRoles,
    fState,
    fStreet,
    fTaluk,
    fUsername,
    headersAuthOnly,
    idproof,
    router,
    validate,
  ]);

  if (!isReady || loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["top"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text
            style={{
              marginTop: 12,
              color: COLORS.secondaryText,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Loading authentication...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canAccessCreateScreen) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["top"]}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 28,
              backgroundColor: COLORS.primarySoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <MaterialCommunityIcons
              name="shield-alert-outline"
              size={38}
              color={COLORS.primary}
            />
          </View>

          <Text
            style={{
              color: COLORS.heading,
              fontSize: 22,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Access Denied
          </Text>

          <Text
            style={{
              color: COLORS.secondaryText,
              fontSize: 14,
              textAlign: "center",
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            Only Master Admin, Manager, and Supervisor can create staff
            members.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 22,
              minHeight: 52,
              paddingHorizontal: 22,
              borderRadius: 16,
              backgroundColor: COLORS.primary,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color={COLORS.white}
            />
            <Text
              style={{
                color: COLORS.white,
                fontWeight: "800",
                fontSize: 15,
                marginLeft: 8,
              }}
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={["top"]}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 130,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={26}
                color={COLORS.heading}
              />
            </Pressable>

            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: COLORS.heading,
                  fontSize: 18,
                  fontWeight: "900",
                }}
              >
                Create Staff
              </Text>
              <Text
                style={{
                  color: COLORS.secondaryText,
                  fontSize: 12,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                Add employee profile and access
              </Text>
            </View>

            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: COLORS.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="account-plus-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
          </View>

          <SectionCard
            icon="account-outline"
            title="Basic Information"
            subtitle="Primary login and identity details"
          >
            <AppInput
              label="Full Name"
              value={fName}
              onChangeText={setFName}
              placeholder="Enter full name"
              icon="account-outline"
            />

            <AppInput
              label="Username"
              value={fUsername}
              onChangeText={setFUsername}
              placeholder="Enter username"
              autoCapitalize="none"
              icon="at"
            />

            <AppInput
              label="Email"
              value={fEmail}
              onChangeText={setFEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="email-outline"
            />

            <AppInput
              label="PIN"
              value={fPin}
              onChangeText={setFPin}
              placeholder="Enter secure PIN"
              keyboardType="number-pad"
              secureTextEntry
              autoCapitalize="none"
              icon="shield-lock-outline"
            />
          </SectionCard>

          <SectionCard
            icon="badge-account-outline"
            title="Role Access"
            subtitle={`Logged in as ${currentRole ?? "UNKNOWN"}`}
          >
            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              {allowedAssignableRoles.includes("STAFF") && (
                <RoleChip
                  active={fRoles.includes("STAFF")}
                  label="STAFF"
                  icon="account-outline"
                  onPress={() => toggleRole("STAFF")}
                />
              )}

              {allowedAssignableRoles.includes("SUPERVISOR") && (
                <RoleChip
                  active={fRoles.includes("SUPERVISOR")}
                  label="SUPERVISOR"
                  icon="account-supervisor-outline"
                  onPress={() => toggleRole("SUPERVISOR")}
                />
              )}
            </View>
          </SectionCard>

          <SectionCard
            icon="phone-outline"
            title="Contact Details"
            subtitle="Phone numbers and reachability"
          >
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="Mobile"
                  value={fMobile}
                  onChangeText={setFMobile}
                  placeholder="Primary mobile number"
                  keyboardType="phone-pad"
                  icon="phone-outline"
                />
              </View>

              <View style={{ flex: 1 }}>
                <AppInput
                  label="Additional"
                  value={fAdditional}
                  onChangeText={setFAdditional}
                  placeholder="Optional number"
                  keyboardType="phone-pad"
                  icon="phone-plus-outline"
                />
              </View>
            </View>
          </SectionCard>

          <SectionCard
            icon="map-marker-outline"
            title="Address Information"
            subtitle="Location and postal details"
          >
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="State"
                  value={fState}
                  onChangeText={setFState}
                  placeholder="Enter state"
                  icon="map-outline"
                />
              </View>

              <View style={{ flex: 1 }}>
                <AppInput
                  label="District"
                  value={fDistrict}
                  onChangeText={setFDistrict}
                  placeholder="Enter district"
                  icon="office-building-marker-outline"
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="Taluk"
                  value={fTaluk}
                  onChangeText={setFTaluk}
                  placeholder="Enter taluk"
                  icon="city-variant-outline"
                />
              </View>

              <View style={{ flex: 1 }}>
                <AppInput
                  label="Area"
                  value={fArea}
                  onChangeText={setFArea}
                  placeholder="Enter area"
                  icon="map-marker-radius-outline"
                />
              </View>
            </View>

            <AppInput
              label="Street"
              value={fStreet}
              onChangeText={setFStreet}
              placeholder="Street / Landmark"
              icon="road-variant"
            />

            <AppInput
              label="Pincode"
              value={fPincode}
              onChangeText={setFPincode}
              placeholder="Enter pincode"
              keyboardType="number-pad"
              autoCapitalize="none"
              icon="mailbox-outline"
            />
          </SectionCard>

          <SectionCard
            icon="image-outline"
            title="Profile & Verification"
            subtitle="Upload visual identity and ID proof"
          >
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <UploadBox
                title="Upload Avatar"
                subtitle="Profile photo"
                selected={!!avatar}
                previewUri={avatar?.uri}
                icon="image-plus-outline"
                onPress={() => pickImage("avatar")}
                tint="dark"
              />

              <UploadBox
                title="Upload ID Proof"
                subtitle="Identity document"
                selected={!!idproof}
                previewUri={idproof?.uri}
                icon="file-document-outline"
                onPress={() => pickImage("idproof")}
                tint="primary"
              />
            </View>
          </SectionCard>
        </ScrollView>

        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            backgroundColor: COLORS.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: COLORS.border,
            padding: 12,
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <Pressable
            onPress={onCreate}
            disabled={saving}
            style={{
              minHeight: 58,
              borderRadius: 18,
              backgroundColor: saving ? COLORS.mutedText : COLORS.success,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
          >
            {saving ? (
              <>
                <ActivityIndicator color={COLORS.white} />
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "800",
                    fontSize: 15,
                    marginLeft: 10,
                  }}
                >
                  Saving Staff...
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={22}
                  color={COLORS.white}
                />
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "900",
                    fontSize: 15,
                    marginLeft: 8,
                  }}
                >
                  Create Staff
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}