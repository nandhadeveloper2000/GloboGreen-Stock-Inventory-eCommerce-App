// app/components/staff/edit.tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";
import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import { normalizeRole } from "../../utils/permissions";

const apiUrl = (path: string) => `${baseURL}${path}`;

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim().toLowerCase());

const digitsOnly = (value: string) => value.replace(/\D/g, "");

type StaffRole = "STAFF" | "SUPERVISOR";

type Staff = {
  _id: string;
  name: string;
  username: string;
  email: string;
  roles: StaffRole[];
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

type FileAsset = {
  uri: string;
  name: string;
  type: string;
};

type Snapshot = {
  name: string;
  username: string;
  email: string;
  pin: string;
  roles: StaffRole[];
  mobile: string;
  additionalNumber: string;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
  avatarUri: string;
  idProofUri: string;
};

async function readResponse(res: Response) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function normalizeRoles(roles: StaffRole[]) {
  return [...roles].sort().join("|");
}

function buildSnapshot(payload: {
  name: string;
  username: string;
  email: string;
  pin: string;
  roles: StaffRole[];
  mobile: string;
  additionalNumber: string;
  state: string;
  district: string;
  taluk: string;
  area: string;
  street: string;
  pincode: string;
  avatarUri?: string | null;
  idProofUri?: string | null;
}): Snapshot {
  return {
    name: payload.name.trim(),
    username: payload.username.trim().toLowerCase(),
    email: payload.email.trim().toLowerCase(),
    pin: payload.pin.trim(),
    roles: [...payload.roles].sort(),
    mobile: payload.mobile.trim(),
    additionalNumber: payload.additionalNumber.trim(),
    state: payload.state.trim(),
    district: payload.district.trim(),
    taluk: payload.taluk.trim(),
    area: payload.area.trim(),
    street: payload.street.trim(),
    pincode: payload.pincode.trim(),
    avatarUri: payload.avatarUri || "",
    idProofUri: payload.idProofUri || "",
  };
}

function isEqualSnapshot(a: Snapshot | null, b: Snapshot) {
  if (!a) return false;

  return (
    a.name === b.name &&
    a.username === b.username &&
    a.email === b.email &&
    a.pin === b.pin &&
    normalizeRoles(a.roles) === normalizeRoles(b.roles) &&
    a.mobile === b.mobile &&
    a.additionalNumber === b.additionalNumber &&
    a.state === b.state &&
    a.district === b.district &&
    a.taluk === b.taluk &&
    a.area === b.area &&
    a.street === b.street &&
    a.pincode === b.pincode &&
    a.avatarUri === b.avatarUri &&
    a.idProofUri === b.idProofUri
  );
}

type SectionCardProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  children: React.ReactNode;
  rightNode?: React.ReactNode;
};

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  rightNode,
}: SectionCardProps) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
      className="mb-4 overflow-hidden rounded-[28px] border"
    >
      <View className="px-4 pb-4 pt-4">
        <View className="mb-4 flex-row items-start justify-between">
          <View className="mr-3 flex-1 flex-row">
            {icon ? (
              <View
                style={{ backgroundColor: COLORS.primarySoft }}
                className="mr-3 h-12 w-12 items-center justify-center rounded-2xl"
              >
                <MaterialCommunityIcons
                  name={icon}
                  size={22}
                  color={COLORS.primary}
                />
              </View>
            ) : null}

            <View className="flex-1">
              <Text
                style={{ color: COLORS.heading }}
                className="text-[17px] font-extrabold"
              >
                {title}
              </Text>

              {subtitle ? (
                <Text
                  style={{ color: COLORS.secondaryText }}
                  className="mt-1 text-[12px] leading-5"
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>

          {rightNode}
        </View>

        {children}
      </View>
    </View>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  maxLength?: number;
};

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  autoCapitalize = "sentences",
  secureTextEntry = false,
  required = false,
  hint,
  error,
  maxLength,
}: InputFieldProps) {
  const isActive = value.trim().length > 0;

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center">
        <Text
          style={{ color: COLORS.primaryText }}
          className="text-[13px] font-bold"
        >
          {label}
        </Text>
        {required ? (
          <Text
            style={{ color: COLORS.danger }}
            className="ml-1 text-[13px] font-bold"
          >
            *
          </Text>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: COLORS.soft,
          borderColor: error
            ? COLORS.danger
            : isActive
              ? COLORS.primaryLight
              : COLORS.border,
        }}
        className="rounded-2xl border px-4"
      >
        <View className="flex-row items-center">
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={error ? COLORS.danger : COLORS.secondaryText}
              style={{ marginRight: 10 }}
            />
          ) : null}

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder || label}
            placeholderTextColor={COLORS.labelText}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry}
            maxLength={maxLength}
            style={{
              flex: 1,
              color: COLORS.primaryText,
              paddingVertical: 14,
              fontSize: 15,
              fontWeight: "500",
            }}
          />
        </View>
      </View>

      {error ? (
        <Text
          style={{ color: COLORS.danger }}
          className="mt-2 text-[12px] font-medium"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{ color: COLORS.secondaryText }}
          className="mt-2 text-[12px] leading-5"
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

type ActionButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  variant?: "primary" | "secondary" | "success" | "danger";
  disabled?: boolean;
};

function ActionButton({
  title,
  onPress,
  loading = false,
  icon,
  variant = "primary",
  disabled = false,
}: ActionButtonProps) {
  const bg =
    variant === "success"
      ? COLORS.success
      : variant === "secondary"
        ? COLORS.card
        : variant === "danger"
          ? COLORS.danger
          : COLORS.primary;

  const borderColor =
    variant === "secondary"
      ? COLORS.border
      : disabled
        ? COLORS.mutedText
        : bg;

  const textColor =
    variant === "secondary" ? COLORS.secondaryText : COLORS.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor:
          disabled && variant !== "secondary"
            ? COLORS.mutedText
            : variant === "secondary" && disabled
              ? COLORS.soft
              : bg,
        borderColor,
        borderWidth: 1,
        opacity: disabled ? 0.7 : 1,
        shadowOpacity: variant === "secondary" ? 0 : 0.18,
        shadowRadius: variant === "secondary" ? 0 : 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: variant === "secondary" ? 0 : 4,
      }}
      className="items-center justify-center rounded-2xl py-4"
    >
      {loading ? (
        <View className="flex-row items-center">
          <ActivityIndicator color={COLORS.white} />
          <Text
            style={{ color: COLORS.white }}
            className="ml-2 text-[15px] font-extrabold"
          >
            Saving...
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center">
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={textColor}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            style={{ color: textColor }}
            className="text-[15px] font-extrabold"
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

type UploadCardProps = {
  title: string;
  subtitle: string;
  selectedText?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  active?: boolean;
  previewUri?: string;
};

function UploadCard({
  title,
  subtitle,
  selectedText,
  icon,
  onPress,
  active = false,
  previewUri,
}: UploadCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? COLORS.primarySoft : COLORS.soft,
        borderColor: active ? COLORS.primaryLight : COLORS.border,
      }}
      className="mb-3 overflow-hidden rounded-2xl border"
    >
      <View className="flex-row items-center p-4">
        <View className="h-12 w-12 items-center justify-center rounded-2xl">
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={active ? COLORS.primary : COLORS.primary}
          />
        </View>

        <View className="ml-3 flex-1">
          <Text
            style={{ color: COLORS.heading }}
            className="text-[15px] font-extrabold"
          >
            {title}
          </Text>
          <Text
            style={{ color: COLORS.secondaryText }}
            className="mt-1 text-[12px] leading-5"
          >
            {active ? selectedText || subtitle : subtitle}
          </Text>
        </View>

        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={COLORS.mutedText}
          />
        )}
      </View>
    </Pressable>
  );
}

function StatPill({
  icon,
  label,
  value,
  tone = "primary",
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning";
}) {
  const bg =
    tone === "success"
      ? COLORS.successSoft
      : tone === "warning"
        ? "#FFF7ED"
        : COLORS.primarySoft;

  const color =
    tone === "success"
      ? COLORS.success
      : tone === "warning"
        ? COLORS.warning
        : COLORS.primary;

  return (
    <View
      style={{ backgroundColor: bg, borderColor: COLORS.border }}
      className="mr-2 flex-row items-center rounded-full border px-3 py-2"
    >
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={{ color }} className="ml-2 text-[12px] font-extrabold">
        {label}: {value}
      </Text>
    </View>
  );
}

export default function StaffEditScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const staffId = Array.isArray(id) ? id[0] ?? "" : id ?? "";

  const { token, user, isReady, loading: authLoading } = useAuth();

  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<Staff | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<Snapshot | null>(null);

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

  const [avatar, setAvatar] = useState<FileAsset | null>(null);
  const [idproof, setIdproof] = useState<FileAsset | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentRole = useMemo(() => {
    const rawRole = user?.role || user?.roles?.[0] || null;
    return normalizeRole(rawRole);
  }, [user]);

  const canAccessEditScreen = useMemo(() => {
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

  const headersAuthOnly = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        name: fName,
        username: fUsername,
        email: fEmail,
        pin: fPin,
        roles: fRoles,
        mobile: fMobile,
        additionalNumber: fAdditional,
        state: fState,
        district: fDistrict,
        taluk: fTaluk,
        area: fArea,
        street: fStreet,
        pincode: fPincode,
        avatarUri: avatar?.uri || doc?.avatarUrl || "",
        idProofUri: idproof?.uri || doc?.idProofUrl || "",
      }),
    [
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
      avatar,
      idproof,
      doc?.avatarUrl,
      doc?.idProofUrl,
    ]
  );

  const isDirty = useMemo(
    () => !isEqualSnapshot(initialSnapshot, currentSnapshot),
    [initialSnapshot, currentSnapshot]
  );

  const completion = useMemo(() => {
    const required = [fName, fUsername, fEmail];
    const optional = [
      fMobile,
      fAdditional,
      fState,
      fDistrict,
      fTaluk,
      fArea,
      fStreet,
      fPincode,
    ];

    const doneRequired = required.filter((v) => v.trim()).length;
    const doneOptional = optional.filter((v) => v.trim()).length;

    const score = Math.round(
      ((doneRequired * 2 + doneOptional) /
        (required.length * 2 + optional.length)) *
        100
    );

    return Math.max(0, Math.min(100, score));
  }, [
    fName,
    fUsername,
    fEmail,
    fMobile,
    fAdditional,
    fState,
    fDistrict,
    fTaluk,
    fArea,
    fStreet,
    fPincode,
  ]);

  const roleLabel = useMemo(() => {
    if (fRoles.includes("SUPERVISOR") && fRoles.includes("STAFF")) {
      return "Staff + Supervisor";
    }
    if (fRoles.includes("SUPERVISOR")) return "Supervisor";
    return "Staff";
  }, [fRoles]);

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

    const file: FileAsset = {
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

  const load = useCallback(async () => {
    if (!staffId || !canAccessEditScreen) return;

    try {
      setLoading(true);

      const res = await fetch(apiUrl(SummaryApi.staff_get.url(staffId)), {
        method: SummaryApi.staff_get.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW_STAFF_GET_RESPONSE:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      const s: Staff = json.data;
      setDoc(s);

      const nextName = s.name || "";
      const nextUsername = s.username || "";
      const nextEmail = s.email || "";

      const nextRolesRaw: StaffRole[] =
        Array.isArray(s.roles) && s.roles.length
          ? (s.roles.filter(
              (role): role is StaffRole =>
                role === "STAFF" || role === "SUPERVISOR"
            ) as StaffRole[])
          : ["STAFF"];

      const nextRoles: StaffRole[] = nextRolesRaw.length
        ? nextRolesRaw
        : ["STAFF"];

      const nextMobile = s.mobile || "";
      const nextAdditional = s.additionalNumber || "";

      const nextState = s.address?.state || "";
      const nextDistrict = s.address?.district || "";
      const nextTaluk = s.address?.taluk || "";
      const nextArea = s.address?.area || "";
      const nextStreet = s.address?.street || "";
      const nextPincode = s.address?.pincode || "";

      setFName(nextName);
      setFUsername(nextUsername);
      setFEmail(nextEmail);
      setFPin("");
      setFRoles(nextRoles);
      setFMobile(nextMobile);
      setFAdditional(nextAdditional);

      setFState(nextState);
      setFDistrict(nextDistrict);
      setFTaluk(nextTaluk);
      setFArea(nextArea);
      setFStreet(nextStreet);
      setFPincode(nextPincode);

      setAvatar(null);
      setIdproof(null);
      setErrors({});

      setInitialSnapshot(
        buildSnapshot({
          name: nextName,
          username: nextUsername,
          email: nextEmail,
          pin: "",
          roles: nextRoles,
          mobile: nextMobile,
          additionalNumber: nextAdditional,
          state: nextState,
          district: nextDistrict,
          taluk: nextTaluk,
          area: nextArea,
          street: nextStreet,
          pincode: nextPincode,
          avatarUri: s.avatarUrl || "",
          idProofUri: s.idProofUrl || "",
        })
      );
    } catch (error) {
      console.log("STAFF_LOAD_ERROR", error);
      toastError("Network error");
    } finally {
      setLoading(false);
    }
  }, [staffId, canAccessEditScreen, headersAuthOnly]);

  useEffect(() => {
    if (isReady && !authLoading && canAccessEditScreen) {
      load();
    }
  }, [isReady, authLoading, canAccessEditScreen, load]);

  const validate = useCallback(() => {
    if (!canAccessEditScreen) {
      toastError("You do not have permission to edit staff");
      return false;
    }

    const nextErrors: Record<string, string> = {};

    if (!fName.trim()) nextErrors.name = "Full name is required";
    if (!fUsername.trim()) nextErrors.username = "Username is required";
    if (!fEmail.trim()) nextErrors.email = "Email address is required";

    if (fEmail.trim() && !isValidEmail(fEmail)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (fMobile.trim() && digitsOnly(fMobile).length < 10) {
      nextErrors.mobile = "Mobile number must be at least 10 digits";
    }

    if (fAdditional.trim() && digitsOnly(fAdditional).length < 10) {
      nextErrors.additionalNumber =
        "Additional number must be at least 10 digits";
    }

    if (fPincode.trim() && digitsOnly(fPincode).length !== 6) {
      nextErrors.pincode = "Pincode must be exactly 6 digits";
    }

    if (fPin.trim() && digitsOnly(fPin).length < 4) {
      nextErrors.pin = "PIN must be at least 4 digits";
    }

    const validSelectedRoles = fRoles.filter((r) =>
      allowedAssignableRoles.includes(r)
    );

    if (!validSelectedRoles.length) {
      nextErrors.roles = "Please select a valid role";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toastError("Please correct the highlighted fields");
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }

    return true;
  }, [
    canAccessEditScreen,
    fName,
    fUsername,
    fEmail,
    fMobile,
    fAdditional,
    fPincode,
    fPin,
    fRoles,
    allowedAssignableRoles,
  ]);

  const onUpdate = useCallback(async () => {
    if (!staffId) return;
    if (!validate()) return;
    if (!isDirty) {
      toastError("No changes to update");
      return;
    }

    try {
      setSaving(true);

      const fd = new FormData();

      fd.append("name", fName.trim());
      fd.append("username", fUsername.trim().toLowerCase());
      fd.append("email", fEmail.trim().toLowerCase());

      if (fPin.trim()) fd.append("pin", fPin.trim());

      fRoles
        .filter((role) => allowedAssignableRoles.includes(role))
        .forEach((role) => fd.append("roles", role));

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

      const res = await fetch(apiUrl(SummaryApi.staff_update.url(staffId)), {
        method: SummaryApi.staff_update.method,
        headers: headersAuthOnly,
        body: fd as any,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW_STAFF_UPDATE_RESPONSE:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      const updatedStaff: Staff = json?.data || {
        ...doc!,
        name: fName.trim(),
        username: fUsername.trim().toLowerCase(),
        email: fEmail.trim().toLowerCase(),
        roles: fRoles.filter((role) => allowedAssignableRoles.includes(role)),
        mobile: fMobile.trim(),
        additionalNumber: fAdditional.trim(),
        address: {
          state: fState.trim(),
          district: fDistrict.trim(),
          taluk: fTaluk.trim(),
          area: fArea.trim(),
          street: fStreet.trim(),
          pincode: fPincode.trim(),
        },
        avatarUrl: avatar?.uri || doc?.avatarUrl,
        idProofUrl: idproof?.uri || doc?.idProofUrl,
      };

      setDoc(updatedStaff);
      setAvatar(null);
      setIdproof(null);
      setFPin("");

      setInitialSnapshot(
        buildSnapshot({
          name: fName,
          username: fUsername,
          email: fEmail,
          pin: "",
          roles: fRoles.filter((role) => allowedAssignableRoles.includes(role)),
          mobile: fMobile,
          additionalNumber: fAdditional,
          state: fState,
          district: fDistrict,
          taluk: fTaluk,
          area: fArea,
          street: fStreet,
          pincode: fPincode,
          avatarUri: updatedStaff.avatarUrl || avatar?.uri || "",
          idProofUri: updatedStaff.idProofUrl || idproof?.uri || "",
        })
      );

      toastSuccess("Staff updated successfully");
    } catch (error) {
      console.log("STAFF_UPDATE_ERROR", error);
      toastError("Network error");
    } finally {
      setSaving(false);
    }
  }, [
    staffId,
    validate,
    isDirty,
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
    avatar,
    idproof,
    headersAuthOnly,
    allowedAssignableRoles,
    doc,
  ]);

  const onBackPress = useCallback(() => {
    if (!isDirty) {
      router.back();
      return;
    }

    Alert.alert(
      "Discard changes?",
      "You have unsaved changes. Leaving this screen will discard your edits.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]
    );
  }, [isDirty, router]);

  const avatarPreview = avatar?.uri || doc?.avatarUrl || "";
  const idProofPreview = idproof?.uri || doc?.idProofUrl || "";

  if (!isReady || authLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text
            style={{ color: COLORS.secondaryText }}
            className="mt-3 text-[14px] font-semibold"
          >
            Loading authentication...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canAccessEditScreen) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-center px-6">
          <View
            style={{
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              shadowOpacity: 0.08,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 3,
            }}
            className="w-full rounded-[28px] border p-6"
          >
            <View
              style={{ backgroundColor: COLORS.primarySoft }}
              className="mb-4 h-16 w-16 items-center justify-center rounded-full self-center"
            >
              <MaterialCommunityIcons
                name="shield-alert-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={{ color: COLORS.heading }}
              className="text-center text-[19px] font-extrabold"
            >
              Access Denied
            </Text>

            <Text
              style={{ color: COLORS.secondaryText }}
              className="mt-2 text-center text-[13px] leading-6"
            >
              Only Master Admin, Manager, and Supervisor can edit staff
              records.
            </Text>

            <View className="mt-5">
              <ActionButton
                title="Go Back"
                onPress={() => router.back()}
                icon="arrow-left"
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-center px-6">
          <View
            style={{
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              shadowOpacity: 0.08,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 10 },
              elevation: 3,
            }}
            className="w-full rounded-[28px] border p-8"
          >
            <View className="items-center">
              <View
                style={{ backgroundColor: COLORS.primarySoft }}
                className="h-16 w-16 items-center justify-center rounded-full"
              >
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>

              <Text
                style={{ color: COLORS.heading }}
                className="mt-5 text-[18px] font-extrabold"
              >
                Loading staff details
              </Text>

              <Text
                style={{ color: COLORS.secondaryText }}
                className="mt-2 text-center text-[13px] leading-6"
              >
                Please wait while we fetch the latest profile information.
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!doc) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-center px-6">
          <View
            style={{
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              shadowOpacity: 0.08,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 3,
            }}
            className="w-full rounded-[28px] border p-6"
          >
            <View
              style={{ backgroundColor: "#FEF2F2" }}
              className="mb-4 h-16 w-16 items-center justify-center rounded-full self-center"
            >
              <MaterialCommunityIcons
                name="account-alert-outline"
                size={30}
                color={COLORS.danger}
              />
            </View>

            <Text
              style={{ color: COLORS.heading }}
              className="text-center text-[19px] font-extrabold"
            >
              Staff not found
            </Text>

            <Text
              style={{ color: COLORS.secondaryText }}
              className="mt-2 text-center text-[13px] leading-6"
            >
              The requested staff record could not be loaded. It may have been
              removed or is temporarily unavailable.
            </Text>

            <View className="mt-5">
              <ActionButton
                title="Back to Staff List"
                onPress={() => router.replace("/master/(tabs)/staffs")}
                icon="arrow-left"
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            backgroundColor: COLORS.background,
            borderBottomColor: COLORS.border,
          }}
          className="border-b px-4 pb-3 pt-2"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={onBackPress}
              hitSlop={10}
              style={{
                backgroundColor: COLORS.card,
                borderColor: COLORS.border,
              }}
              className="h-11 w-11 items-center justify-center rounded-2xl border"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={COLORS.heading}
              />
            </Pressable>

            <View className="flex-1 px-3">
              <Text
                style={{ color: COLORS.heading }}
                className="text-center text-[18px] font-extrabold"
              >
                Edit Staff
              </Text>
              <Text
                style={{ color: COLORS.secondaryText }}
                className="mt-0.5 text-center text-[11px] font-medium"
              >
                Production profile management
              </Text>
            </View>

            <View
              style={{ backgroundColor: COLORS.primarySoft }}
              className="h-11 w-11 items-center justify-center rounded-2xl"
            >
              <MaterialCommunityIcons
                name="account-edit-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 110,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.18,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 4,
            }}
            className="mb-4 overflow-hidden rounded-[30px] px-5 py-5"
          >
            <View
              style={{
                position: "absolute",
                right: -30,
                top: -20,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />
            <View
              style={{
                position: "absolute",
                left: -18,
                bottom: -28,
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            />

            <View className="flex-row items-start">
              <View className="flex-1 pr-4">
                <Text className="text-[24px] font-black text-white">
                  Edit Staff Profile
                </Text>
                <View className="mt-4 flex-row flex-wrap">
                  <StatPill
                    icon="shield-account-outline"
                    label="Role"
                    value={roleLabel}
                  />
                  <StatPill
                    icon={doc.isActive ? "check-decagram" : "pause-circle"}
                    label="Status"
                    value={doc.isActive ? "Active" : "Inactive"}
                    tone={doc.isActive ? "success" : "warning"}
                  />
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "rgba(255,255,255,0.16)",
                  borderColor: "rgba(255,255,255,0.14)",
                }}
                className="items-center rounded-[24px] border px-3 py-3"
              >
                {avatarPreview ? (
                  <Image
                    source={{ uri: avatarPreview }}
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 22,
                      borderWidth: 2,
                      borderColor: "rgba(255,255,255,0.25)",
                    }}
                  />
                ) : (
                  <View
                    style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                    className="h-[68px] w-[68px] items-center justify-center rounded-[22px]"
                  >
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={34}
                      color={COLORS.white}
                    />
                  </View>
                )}

                <Text className="mt-3 text-[12px] font-bold text-white">
                  {completion}% complete
                </Text>
              </View>
            </View>
          </View>

          <SectionCard
            title="Basic Information"
            subtitle="Primary identity and account details"
            icon="account-outline"
          >
            <InputField
              label="Full Name"
              value={fName}
              onChangeText={(v) => {
                setFName(v);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Enter full name"
              icon="account"
              required
              error={errors.name}
            />

            <InputField
              label="Username"
              value={fUsername}
              onChangeText={(v) => {
                setFUsername(v.replace(/\s/g, ""));
                if (errors.username) {
                  setErrors((prev) => ({ ...prev, username: "" }));
                }
              }}
              placeholder="Enter username"
              autoCapitalize="none"
              icon="at"
              required
              hint="Used for login and internal identification"
              error={errors.username}
            />

            <InputField
              label="Email Address"
              value={fEmail}
              onChangeText={(v) => {
                setFEmail(v);
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="email-outline"
              required
              error={errors.email}
            />

            <InputField
              label="PIN"
              value={fPin}
              onChangeText={(v) => {
                setFPin(digitsOnly(v));
                if (errors.pin) setErrors((prev) => ({ ...prev, pin: "" }));
              }}
              placeholder="Enter new PIN"
              keyboardType="number-pad"
              secureTextEntry
              icon="lock-outline"
              hint="Leave blank if you do not want to change the PIN"
              maxLength={6}
              error={errors.pin}
            />
          </SectionCard>

          <SectionCard
            title="Roles & Contact"
            subtitle={`Assign access levels and communication numbers — logged in as ${currentRole ?? "UNKNOWN"}`}
            icon="shield-account-outline"
          >
            <Text
              style={{ color: COLORS.primaryText }}
              className="mb-2 text-[13px] font-bold"
            >
              Roles
            </Text>

            <View className="mb-1 flex-row" style={{ gap: 10 }}>
              {allowedAssignableRoles.map((role) => {
                const selected = fRoles.includes(role);

                return (
                  <Pressable
                    key={role}
                    onPress={() => toggleRole(role)}
                    style={{
                      backgroundColor: selected ? COLORS.primary : COLORS.soft,
                      borderColor: selected ? COLORS.primary : COLORS.border,
                    }}
                    className="flex-1 rounded-2xl border px-4 py-4"
                  >
                    <View className="flex-row items-center justify-center">
                      <MaterialCommunityIcons
                        name={selected ? "check-circle" : "circle-outline"}
                        size={18}
                        color={selected ? COLORS.white : COLORS.secondaryText}
                      />
                      <Text
                        style={{
                          color: selected ? COLORS.white : COLORS.primaryText,
                        }}
                        className="ml-2 font-extrabold"
                      >
                        {role}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {errors.roles ? (
              <Text
                style={{ color: COLORS.danger }}
                className="mb-4 text-[12px] font-medium"
              >
                {errors.roles}
              </Text>
            ) : null}

            <InputField
              label="Mobile Number"
              value={fMobile}
              onChangeText={(v) => {
                setFMobile(digitsOnly(v));
                if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: "" }));
              }}
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              icon="phone-outline"
              maxLength={10}
              error={errors.mobile}
            />

            <InputField
              label="Additional Number"
              value={fAdditional}
              onChangeText={(v) => {
                setFAdditional(digitsOnly(v));
                if (errors.additionalNumber) {
                  setErrors((prev) => ({ ...prev, additionalNumber: "" }));
                }
              }}
              placeholder="Enter additional number"
              keyboardType="phone-pad"
              icon="phone-plus-outline"
              maxLength={10}
              error={errors.additionalNumber}
            />
          </SectionCard>

          <SectionCard
            title="Address"
            subtitle="Geographic and postal details"
            icon="map-marker-outline"
          >
            <InputField
              label="State"
              value={fState}
              onChangeText={setFState}
              placeholder="Enter state"
              icon="map-outline"
            />

            <InputField
              label="District"
              value={fDistrict}
              onChangeText={setFDistrict}
              placeholder="Enter district"
              icon="office-building-outline"
            />

            <InputField
              label="Taluk"
              value={fTaluk}
              onChangeText={setFTaluk}
              placeholder="Enter taluk"
              icon="map-search-outline"
            />

            <InputField
              label="Area"
              value={fArea}
              onChangeText={setFArea}
              placeholder="Enter area"
              icon="home-city-outline"
            />

            <InputField
              label="Street"
              value={fStreet}
              onChangeText={setFStreet}
              placeholder="Enter street"
              icon="road-variant"
            />

            <InputField
              label="Pincode"
              value={fPincode}
              onChangeText={(v) => {
                setFPincode(digitsOnly(v));
                if (errors.pincode) {
                  setErrors((prev) => ({ ...prev, pincode: "" }));
                }
              }}
              placeholder="Enter pincode"
              keyboardType="number-pad"
              icon="numeric"
              maxLength={6}
              error={errors.pincode}
            />
          </SectionCard>

          <SectionCard
            title="Document Uploads"
            subtitle="Upload staff avatar and proof documents"
            icon="file-document-outline"
          >
            <UploadCard
              title="Avatar"
              subtitle="Choose a professional profile image"
              selectedText="New avatar selected"
              icon="image-outline"
              onPress={() => pickImage("avatar")}
              active={!!avatar}
              previewUri={avatarPreview}
            />

            <UploadCard
              title="ID Proof"
              subtitle="Choose identity proof image"
              selectedText="New ID proof selected"
              icon="card-account-details-outline"
              onPress={() => pickImage("idproof")}
              active={!!idproof}
              previewUri={idProofPreview}
            />
          </SectionCard>

          <SectionCard
            title="Record Status"
            subtitle="Current operational visibility and edit state"
            icon="chart-box-outline"
          >
            <View className="flex-row" style={{ gap: 10 }}>
              <View
                style={{
                  backgroundColor: COLORS.soft,
                  borderColor: COLORS.border,
                  flex: 1,
                }}
                className="rounded-2xl border p-4"
              >
                <Text
                  style={{ color: COLORS.secondaryText }}
                  className="text-[12px] font-semibold"
                >
                  Account Status
                </Text>
                <Text
                  style={{ color: doc.isActive ? COLORS.success : COLORS.warning }}
                  className="mt-2 text-[16px] font-extrabold"
                >
                  {doc.isActive ? "Active" : "Inactive"}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: COLORS.soft,
                  borderColor: COLORS.border,
                  flex: 1,
                }}
                className="rounded-2xl border p-4"
              >
                <Text
                  style={{ color: COLORS.secondaryText }}
                  className="text-[12px] font-semibold"
                >
                  Form Changes
                </Text>
                <Text
                  style={{ color: isDirty ? COLORS.warning : COLORS.success }}
                  className="mt-2 text-[16px] font-extrabold"
                >
                  {isDirty ? "Pending" : "Saved"}
                </Text>
              </View>
            </View>
          </SectionCard>
        </ScrollView>

        <View
          style={{
            backgroundColor: "rgba(246,248,252,0.96)",
            borderTopColor: COLORS.border,
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: -8 },
            elevation: 14,
          }}
          className="border-t px-4 pb-4 pt-3"
        >
          <View
            style={{
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
            }}
            className="rounded-[28px] border px-4 py-4"
          >
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  style={{
                    backgroundColor: isDirty ? "#FFF7ED" : COLORS.successSoft,
                  }}
                  className="h-10 w-10 items-center justify-center rounded-2xl"
                >
                  <MaterialCommunityIcons
                    name={isDirty ? "clock-outline" : "check-circle-outline"}
                    size={20}
                    color={isDirty ? COLORS.warning : COLORS.success}
                  />
                </View>

                <View className="ml-3">
                  <Text
                    style={{ color: COLORS.heading }}
                    className="text-[14px] font-extrabold"
                  >
                    {isDirty ? "Changes ready to save" : "Everything is up to date"}
                  </Text>
                  <Text
                    style={{ color: COLORS.secondaryText }}
                    className="mt-1 text-[12px]"
                  >
                    {isDirty
                      ? "Review your updates and save them."
                      : "No pending edits in this form."}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <ActionButton
                  title="Cancel"
                  onPress={onBackPress}
                  icon="close"
                  variant="secondary"
                />
              </View>

              <View className="flex-[1.3]">
                <ActionButton
                  title="Update Staff"
                  onPress={onUpdate}
                  loading={saving}
                  icon="content-save-outline"
                  variant="success"
                  disabled={!isDirty}
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}