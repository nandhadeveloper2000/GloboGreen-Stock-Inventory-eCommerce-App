// app/components/staff/edit.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import Toast from "react-native-toast-message";

import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

const apiUrl = (path: string) => `${baseURL}${path}`;

const NORMAL = {
  inputHeight: 48,
  buttonHeight: 48,
  headerIconBox: 42,
  sectionIconBox: 40,
  uploadRowMinHeight: 78,
  uploadPreview: 44,
  pageHorizontal: 16,
  pageBottom: 16,
  cardRadius: 18,
  inputRadius: 12,
  buttonRadius: 14,
  uploadRadius: 14,
  pillRadius: 999,
  cardPadding: 14,
  gap: 10,
  titleFont: 16,
  subtitleFont: 11,
  labelFont: 12,
  inputFont: 15,
};

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
        borderWidth: 1,
        borderRadius: NORMAL.cardRadius,
        padding: NORMAL.cardPadding,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        style={{
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <View style={{ marginRight: 10, flex: 1, flexDirection: "row" }}>
          {icon ? (
            <View
              style={{
                width: NORMAL.sectionIconBox,
                height: NORMAL.sectionIconBox,
                borderRadius: 12,
                backgroundColor: COLORS.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <MaterialCommunityIcons
                name={icon}
                size={20}
                color={COLORS.primary}
              />
            </View>
          ) : null}

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: COLORS.heading,
                fontSize: NORMAL.titleFont,
                fontWeight: "800",
              }}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text
                style={{
                  color: COLORS.secondaryText,
                  fontSize: NORMAL.subtitleFont,
                  marginTop: 2,
                  lineHeight: 16,
                }}
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
    <View style={{ marginBottom: 12 }}>
      <View
        style={{ marginBottom: 4, flexDirection: "row", alignItems: "center" }}
      >
        <Text
          style={{
            color: COLORS.primaryText,
            fontSize: NORMAL.labelFont,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>

        {required ? (
          <Text
            style={{
              color: COLORS.danger,
              marginLeft: 4,
              fontSize: NORMAL.labelFont,
              fontWeight: "700",
            }}
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
          borderWidth: 1,
          borderRadius: NORMAL.inputRadius,
          height: NORMAL.inputHeight,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={error ? COLORS.danger : COLORS.secondaryText}
            style={{ marginRight: 8 }}
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
            height: "100%",
            color: COLORS.primaryText,
            fontSize: NORMAL.inputFont,
            fontWeight: "500",
            paddingVertical: 0,
          }}
        />
      </View>

      {error ? (
        <Text
          style={{
            color: COLORS.danger,
            marginTop: 4,
            fontSize: 11,
            fontWeight: "500",
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            color: COLORS.secondaryText,
            marginTop: 4,
            fontSize: 11,
            lineHeight: 16,
          }}
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
        height: NORMAL.buttonHeight,
        borderRadius: NORMAL.buttonRadius,
        backgroundColor:
          disabled && variant !== "secondary"
            ? COLORS.mutedText
            : variant === "secondary" && disabled
              ? COLORS.soft
              : bg,
        borderColor,
        borderWidth: 1,
        opacity: disabled ? 0.7 : 1,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: bg,
        shadowOpacity: variant === "secondary" ? 0 : 0.08,
        shadowRadius: variant === "secondary" ? 0 : 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: variant === "secondary" ? 0 : 2,
      }}
    >
      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ActivityIndicator color={COLORS.white} />
          <Text
            style={{
              color: COLORS.white,
              marginLeft: 8,
              fontSize: 14,
              fontWeight: "800",
            }}
          >
            Saving...
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={textColor}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            style={{
              color: textColor,
              fontSize: 14,
              fontWeight: "800",
            }}
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
        borderWidth: 1,
        borderRadius: NORMAL.uploadRadius,
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          minHeight: NORMAL.uploadRowMinHeight,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? COLORS.primarySoft : COLORS.card,
          }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
        </View>

        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text
            style={{
              color: COLORS.heading,
              fontSize: 14,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: COLORS.secondaryText,
              marginTop: 2,
              fontSize: 11,
              lineHeight: 15,
            }}
          >
            {active ? selectedText || subtitle : subtitle}
          </Text>
        </View>

        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={{
              width: NORMAL.uploadPreview,
              height: NORMAL.uploadPreview,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
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
      style={{
        backgroundColor: bg,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: NORMAL.pillRadius,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <MaterialCommunityIcons name={icon} size={15} color={color} />
      <Text
        style={{
          color,
          marginLeft: 6,
          fontSize: 11,
          fontWeight: "800",
        }}
      >
        {label}: {value}
      </Text>
    </View>
  );
}

type RoleChipProps = {
  active: boolean;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
};

function RoleChip({ active, label, icon, onPress }: RoleChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: active ? COLORS.primary : COLORS.border,
        backgroundColor: active ? COLORS.primary : COLORS.soft,
        paddingVertical: 12,
        paddingHorizontal: 10,
      }}
    >
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active
              ? "rgba(255,255,255,0.16)"
              : COLORS.primarySoft,
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={active ? COLORS.white : COLORS.primary}
          />
        </View>

        <Text
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: "800",
            color: active ? COLORS.white : COLORS.heading,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
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
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text
            style={{
              color: COLORS.secondaryText,
              marginTop: 12,
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

  if (!canAccessEditScreen) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        edges={["top"]}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              borderWidth: 1,
              borderRadius: NORMAL.cardRadius,
              padding: 20,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: COLORS.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                marginBottom: 16,
              }}
            >
              <MaterialCommunityIcons
                name="shield-alert-outline"
                size={28}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={{
                color: COLORS.heading,
                textAlign: "center",
                fontSize: 18,
                fontWeight: "900",
              }}
            >
              Access Denied
            </Text>

            <Text
              style={{
                color: COLORS.secondaryText,
                textAlign: "center",
                marginTop: 8,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              Only Master Admin, Manager, and Supervisor can edit staff
              records.
            </Text>

            <View style={{ marginTop: 16 }}>
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
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              borderWidth: 1,
              borderRadius: NORMAL.cardRadius,
              padding: 24,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: COLORS.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>

              <Text
                style={{
                  color: COLORS.heading,
                  marginTop: 16,
                  fontSize: 17,
                  fontWeight: "900",
                }}
              >
                Loading staff details
              </Text>

              <Text
                style={{
                  color: COLORS.secondaryText,
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 13,
                  lineHeight: 20,
                }}
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
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              borderWidth: 1,
              borderRadius: NORMAL.cardRadius,
              padding: 20,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FEF2F2",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                marginBottom: 16,
              }}
            >
              <MaterialCommunityIcons
                name="account-alert-outline"
                size={28}
                color={COLORS.danger}
              />
            </View>

            <Text
              style={{
                color: COLORS.heading,
                textAlign: "center",
                fontSize: 18,
                fontWeight: "900",
              }}
            >
              Staff not found
            </Text>

            <Text
              style={{
                color: COLORS.secondaryText,
                textAlign: "center",
                marginTop: 8,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              The requested staff record could not be loaded. It may have been
              removed or is temporarily unavailable.
            </Text>

            <View style={{ marginTop: 16 }}>
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
            borderBottomWidth: 1,
            paddingHorizontal: NORMAL.pageHorizontal,
            paddingTop: 8,
            paddingBottom: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={onBackPress}
              hitSlop={10}
              style={{
                width: NORMAL.headerIconBox,
                height: NORMAL.headerIconBox,
                borderRadius: 14,
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={COLORS.heading}
              />
            </Pressable>

            <View style={{ flex: 1, paddingHorizontal: 8 }}>
              <Text
                style={{
                  color: COLORS.heading,
                  textAlign: "center",
                  fontSize: 16,
                  fontWeight: "900",
                }}
              >
                Edit Staff
              </Text>
              <Text
                style={{
                  color: COLORS.secondaryText,
                  marginTop: 2,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: "500",
                }}
              >
                Production profile management
              </Text>
            </View>

            <View
              style={{
                width: NORMAL.headerIconBox,
                height: NORMAL.headerIconBox,
                borderRadius: 14,
                backgroundColor: COLORS.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="account-edit-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: NORMAL.pageHorizontal,
            paddingTop: 10,
            paddingBottom: 110,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: NORMAL.cardRadius,
              padding: 14,
              marginBottom: 12,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text
                  style={{
                    color: COLORS.white,
                    fontSize: 16,
                    fontWeight: "900",
                  }}
                >
                  {doc?.name || "Staff Profile"}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.82)",
                    marginTop: 4,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Update identity, role access, contact information, and
                  profile documents.
                </Text>
              </View>

              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="account-edit-outline"
                  size={22}
                  color={COLORS.white}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <StatPill
                icon="progress-check"
                label="Completion"
                value={`${completion}%`}
                tone={completion === 100 ? "success" : "primary"}
              />
              <StatPill
                icon="shield-account-outline"
                label="Role"
                value={roleLabel}
                tone="primary"
              />
              <StatPill
                icon={isDirty ? "clock-outline" : "check-circle-outline"}
                label="Status"
                value={isDirty ? "Unsaved" : "Saved"}
                tone={isDirty ? "warning" : "success"}
              />
            </View>
          </View>

          <SectionCard
            title="Basic Information"
            subtitle="Primary login and identity details"
            icon="account-outline"
          >
            <InputField
              label="Full Name"
              value={fName}
              onChangeText={setFName}
              placeholder="Enter full name"
              icon="account-outline"
              required
              error={errors.name}
            />

            <InputField
              label="Username"
              value={fUsername}
              onChangeText={setFUsername}
              placeholder="Enter username"
              icon="at"
              autoCapitalize="none"
              required
              error={errors.username}
            />

            <InputField
              label="Email"
              value={fEmail}
              onChangeText={setFEmail}
              placeholder="Enter email address"
              icon="email-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              required
              error={errors.email}
            />

            <InputField
              label="New PIN"
              value={fPin}
              onChangeText={(text) => setFPin(digitsOnly(text))}
              placeholder="Enter new PIN (optional)"
              icon="lock-outline"
              keyboardType="number-pad"
              autoCapitalize="none"
              secureTextEntry
              maxLength={6}
              hint="Leave blank to keep the current PIN."
              error={errors.pin}
            />
          </SectionCard>

          <SectionCard
            title="Role Access"
            subtitle={`Logged in as ${currentRole ?? "UNKNOWN"}`}
            icon="badge-account-outline"
          >
            <View
              style={{
                flexDirection: "row",
                gap: NORMAL.gap,
                marginTop: 2,
              }}
            >
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

            {errors.roles ? (
              <Text
                style={{
                  color: COLORS.danger,
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: "500",
                }}
              >
                {errors.roles}
              </Text>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Contact Details"
            subtitle="Phone numbers and reachability"
            icon="phone-outline"
          >
            <InputField
              label="Mobile"
              value={fMobile}
              onChangeText={(text) => setFMobile(digitsOnly(text))}
              placeholder="Primary mobile number"
              icon="phone-outline"
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.mobile}
            />

            <InputField
              label="Additional Number"
              value={fAdditional}
              onChangeText={(text) => setFAdditional(digitsOnly(text))}
              placeholder="Optional mobile number"
              icon="phone-plus-outline"
              keyboardType="phone-pad"
              maxLength={10}
              error={errors.additionalNumber}
            />
          </SectionCard>

          <SectionCard
            title="Address Information"
            subtitle="Location and postal details"
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
              icon="map-marker-radius-outline"
            />

            <InputField
              label="Taluk"
              value={fTaluk}
              onChangeText={setFTaluk}
              placeholder="Enter taluk"
              icon="home-city-outline"
            />

            <InputField
              label="Area"
              value={fArea}
              onChangeText={setFArea}
              placeholder="Enter area"
              icon="map-marker-path"
            />

            <InputField
              label="Street"
              value={fStreet}
              onChangeText={setFStreet}
              placeholder="Street / Landmark"
              icon="road-variant"
            />

            <InputField
              label="Pincode"
              value={fPincode}
              onChangeText={(text) => setFPincode(digitsOnly(text))}
              placeholder="Enter pincode"
              icon="mailbox-outline"
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
              error={errors.pincode}
            />
          </SectionCard>

          <SectionCard
            title="Profile & Verification"
            subtitle="Upload visual identity and ID proof"
            icon="image-outline"
          >
            <UploadCard
              title="Upload Avatar"
              subtitle="Profile photo"
              selectedText="Tap to change avatar"
              icon="image-plus-outline"
              onPress={() => pickImage("avatar")}
              active={!!avatarPreview}
              previewUri={avatarPreview || undefined}
            />

            <UploadCard
              title="Upload ID Proof"
              subtitle="Identity document"
              selectedText="Tap to change document image"
              icon="file-document-outline"
              onPress={() => pickImage("idproof")}
              active={!!idProofPreview}
              previewUri={idProofPreview || undefined}
            />
          </SectionCard>
        </ScrollView>

        <View
          style={{
            position: "absolute",
            left: NORMAL.pageHorizontal,
            right: NORMAL.pageHorizontal,
            bottom: NORMAL.pageBottom,
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
            borderWidth: 1,
            borderRadius: NORMAL.cardRadius,
            padding: 10,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: NORMAL.cardRadius,
            }}
          >
            <View
              style={{
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: isDirty ? "#FFF7ED" : COLORS.successSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name={isDirty ? "clock-outline" : "check-circle-outline"}
                  size={18}
                  color={isDirty ? COLORS.warning : COLORS.success}
                />
              </View>

              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.heading,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  {isDirty ? "Changes ready to save" : "Everything is up to date"}
                </Text>
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    marginTop: 2,
                    fontSize: 11,
                  }}
                >
                  {isDirty
                    ? "Review your updates and save them."
                    : "No pending edits in this form."}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: NORMAL.gap }}>
              <View style={{ flex: 1 }}>
                <ActionButton
                  title="Cancel"
                  onPress={onBackPress}
                  icon="close"
                  variant="secondary"
                />
              </View>

              <View style={{ flex: 1.2 }}>
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