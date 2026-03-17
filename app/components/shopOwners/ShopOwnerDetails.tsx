import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SummaryApi, { baseURL } from "../../constants/SummaryApi";
import { COLORS } from "../../constants/colors";
import { ROLES } from "../../constants/roles";
import { useAuth } from "../../context/auth/AuthProvider";
import { normalizeRole } from "../../utils/permissions";

type Address = {
  state?: string;
  district?: string;
  taluk?: string;
  area?: string;
  street?: string;
  pincode?: string;
};

type CreatedBy = {
  type?: "MASTER" | "MANAGER" | "SUPERVISOR" | "STAFF" | string;
  id?: string | { $oid?: string };
  role?: "MASTER_ADMIN" | "MANAGER" | "SUPERVISOR" | "STAFF" | string;
  ref?: "Master" | "SubAdmin" | "Supervisor" | "Staff" | string;
};

type DocField = {
  url?: string;
  publicId?: string;
  mimeType?: string;
  fileName?: string;
  bytes?: number;
};

type DocFieldKey = "idProof" | "gstCertificate" | "udyamCertificate";

type ShopLite = {
  _id?: string;
  name?: string;
  isActive?: boolean;
  address?: Address;
  frontImageUrl?: string;
  createdAt?: string;
};

type ShopOwnerData = {
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  mobile?: string;
  additionalNumber?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  role?: "SHOP_OWNER" | string;
  verifyEmail?: boolean;
  address?: Address;
  shops?: ShopLite[];
  shopIds?: ShopLite[];
  businessTypes?: string[];
  shopControl?: "INVENTORY_ONLY" | "ALL_IN_ONE_ECOMMERCE" | string;
  idProof?: DocField;
  gstCertificate?: DocField;
  udyamCertificate?: DocField;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  createdBy?: CreatedBy;
  createdAt?: string;
  updatedAt?: string;
};

type AuthLike = {
  user?: any;
  auth?: any;
  token?: string | null;
  accessToken?: string | null;
};

const apiUrl = (path: string) => `${baseURL}${path}`;

async function readResponse(res: Response) {
  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { text, json };
}

function getApiErrorMessage(json: any, fallback = "Something went wrong") {
  if (!json) return fallback;

  if (typeof json?.message === "string" && json.message.trim()) {
    return json.message;
  }

  if (typeof json?.error === "string" && json.error.trim()) {
    return json.error;
  }

  if (Array.isArray(json?.errors) && json.errors.length > 0) {
    const first = json.errors[0];
    if (typeof first === "string") return first;
    if (typeof first?.message === "string") return first.message;
  }

  if (json?.keyPattern) {
    const field = Object.keys(json.keyPattern)[0];
    if (field) return `${field} already exists`;
  }

  if (json?.code === 11000 && json?.keyValue) {
    const field = Object.keys(json.keyValue)[0];
    if (field) return `${field} already exists`;
  }

  return fallback;
}

function toastSuccess(message: string) {
  Alert.alert("Success", message);
}

function toastError(message: string) {
  Alert.alert("Error", message);
}

function toastInfo(message: string) {
  Alert.alert("Info", message);
}

function getInitials(name?: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "SO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function toDateSafe(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTimeIST(value?: string | null) {
  const d = toDateSafe(value);
  if (!d) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

function formatDateCompactIST(value?: string | null) {
  const d = toDateSafe(value);
  if (!d) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

function getRemainingDays(validTo?: string | null) {
  const d = toDateSafe(validTo);
  if (!d) return null;

  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getRemainingLabel(validTo?: string | null) {
  const days = getRemainingDays(validTo);
  if (days === null) return "-";
  if (days < 0) return "Expired";
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function formatAddress(address?: Address) {
  if (!address) return "-";

  const parts = [
    address.street,
    address.area,
    address.taluk,
    address.district,
    address.state,
    address.pincode,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return parts.length ? parts.join(", ") : "-";
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusTone(active?: boolean) {
  if (active) {
    return {
      bg: "rgba(34,197,94,0.15)",
      text: "#DCFCE7",
      chipBg: "#ECFDF5",
      chipText: COLORS.successDark,
    };
  }

  return {
    bg: "rgba(239,68,68,0.15)",
    text: "#FECACA",
    chipBg: "#FEF2F2",
    chipText: COLORS.danger,
  };
}

function CompactPill({
  text,
  bg,
  color,
  icon,
}: {
  text: string;
  bg: string;
  color: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}) {
  return (
    <View
      className="mr-2 flex-row items-center rounded-full px-2.5 py-1"
      style={{ backgroundColor: bg }}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={12}
          color={color}
          style={{ marginRight: 4 }}
        />
      ) : null}

      <Text
        className="text-[10px] font-extrabold tracking-[0.3px]"
        style={{ color }}
      >
        {text}
      </Text>
    </View>
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-[18px] border bg-white p-3 ${className}`}
      style={{
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="mb-3 flex-row items-start justify-between">
      <View className="flex-1 pr-2">
        <Text
          className="text-[15px] font-extrabold"
          style={{ color: COLORS.heading }}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            className="mt-0.5 text-[11px] leading-[16px]"
            style={{ color: COLORS.secondaryText }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
  softBg,
  cardWidth,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
  tint: string;
  softBg: string;
  cardWidth: number;
}) {
  return (
    <View
      style={{
        width: cardWidth,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        padding: 12,
      }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-[12px]"
        style={{ backgroundColor: softBg }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={tint} />
      </View>

      <Text
        className="mt-2 text-[10px] font-bold uppercase"
        style={{ color: COLORS.secondaryText }}
        numberOfLines={1}
      >
        {label}
      </Text>

      <Text
        className="mt-1 text-[12px] font-extrabold leading-[17px]"
        style={{ color: COLORS.heading }}
        numberOfLines={2}
      >
        {value || "-"}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}) {
  return (
    <View
      className="mb-2.5 flex-row items-start rounded-[14px] border p-3"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.soft }}
    >
      <View
        className="mr-3 h-9 w-9 items-center justify-center rounded-[12px]"
        style={{
          backgroundColor: COLORS.white,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={COLORS.primaryText}
        />
      </View>

      <View className="flex-1">
        <Text
          className="text-[10px] font-bold uppercase"
          style={{ color: COLORS.secondaryText }}
        >
          {label}
        </Text>

        <Text
          className="mt-0.5 text-[13px] font-bold leading-[18px]"
          style={{ color: COLORS.heading }}
        >
          {value || "-"}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  backgroundColor,
  icon,
  loading,
  outline,
  disabled,
}: {
  title: string;
  onPress: () => void;
  backgroundColor?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  loading?: boolean;
  outline?: boolean;
  disabled?: boolean;
}) {
  const bg = outline ? COLORS.white : backgroundColor || COLORS.primary;
  const color = outline ? COLORS.primaryText : COLORS.white;
  const borderColor = outline ? COLORS.border : backgroundColor || COLORS.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className="h-[44px] flex-row items-center justify-center rounded-[14px] px-3"
      style={{
        backgroundColor: bg,
        borderWidth: 1,
        borderColor,
        opacity: disabled || loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={16}
              color={color}
              style={{ marginRight: 6 }}
            />
          ) : null}

          <Text className="text-[13px] font-extrabold" style={{ color }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function DocumentRow({
  label,
  doc,
  onView,
}: {
  label: string;
  doc?: DocField;
  onView: (url?: string) => void;
}) {
  const uploaded = !!doc?.url;

  return (
    <View
      className="mb-2.5 rounded-[14px] border p-3"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.soft }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text
            className="text-[13px] font-extrabold"
            style={{ color: COLORS.heading }}
          >
            {label}
          </Text>

          <Text
            className="mt-0.5 text-[11px]"
            style={{ color: COLORS.secondaryText }}
            numberOfLines={1}
          >
            {doc?.fileName || (uploaded ? "Uploaded document" : "No file uploaded")}
          </Text>

          {uploaded ? (
            <Text
              className="mt-0.5 text-[10px]"
              style={{ color: COLORS.mutedText }}
            >
              {formatBytes(doc?.bytes)}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => onView(doc?.url)}
          className="flex-row items-center rounded-[12px] px-3 py-2"
          style={{
            backgroundColor: uploaded ? COLORS.primary : COLORS.white,
            borderWidth: 1,
            borderColor: uploaded ? COLORS.primary : COLORS.border,
          }}
        >
          <MaterialCommunityIcons
            name="eye-outline"
            size={14}
            color={uploaded ? COLORS.white : COLORS.primaryText}
          />
          <Text
            className="ml-1 text-[11px] font-extrabold"
            style={{ color: uploaded ? COLORS.white : COLORS.primaryText }}
          >
            View
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle: string;
}) {
  return (
    <View
      className="items-center justify-center rounded-[18px] border p-5"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.soft }}
    >
      <View
        className="h-[62px] w-[62px] items-center justify-center rounded-[18px]"
        style={{
          backgroundColor: COLORS.white,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <MaterialCommunityIcons name={icon} size={30} color={COLORS.mutedText} />
      </View>

      <Text
        className="mt-3 text-[15px] font-extrabold"
        style={{ color: COLORS.heading }}
      >
        {title}
      </Text>

      <Text
        className="mt-1.5 text-center text-[12px] leading-[18px]"
        style={{ color: COLORS.secondaryText }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function ShopCard({
  shop,
  index,
  deletingShopId,
  onDeleteShop,
  onViewShop,
  onEditShop,
  canEditShop,
  canDeleteShop,
}: {
  shop: ShopLite;
  index: number;
  deletingShopId: string;
  onDeleteShop: (shopId: string) => void;
  onViewShop: (shopId: string) => void;
  onEditShop: (shopId: string) => void;
  canEditShop: boolean;
  canDeleteShop: boolean;
}) {
  const shopId = String(shop?._id || "");
  const isDeleting = deletingShopId === shopId;

  return (
    <View
      className="mb-2.5 rounded-[16px] border p-3"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.soft }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text
            className="text-[14px] font-extrabold"
            style={{ color: COLORS.heading }}
            numberOfLines={1}
          >
            {shop?.name || `Shop ${index + 1}`}
          </Text>

          <Text
            className="mt-1 text-[11px] leading-[16px]"
            style={{ color: COLORS.secondaryText }}
            numberOfLines={2}
          >
            {formatAddress(shop?.address)}
          </Text>

          {shop?.createdAt ? (
            <Text
              className="mt-1 text-[10px]"
              style={{ color: COLORS.mutedText }}
            >
              Created: {formatDateCompactIST(shop.createdAt)}
            </Text>
          ) : null}
        </View>

        <CompactPill
          text={shop?.isActive ? "ACTIVE" : "INACTIVE"}
          bg={shop?.isActive ? "#ECFDF5" : "#F3F4F6"}
          color={shop?.isActive ? COLORS.successDark : COLORS.secondaryText}
          icon={
            shop?.isActive ? "check-decagram-outline" : "pause-circle-outline"
          }
        />
      </View>

      <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        <View style={{ flex: 1, minWidth: 90 }}>
          <ActionButton
            title="View"
            onPress={() => onViewShop(shopId)}
            backgroundColor={COLORS.primary}
            icon="eye-outline"
          />
        </View>

        {canEditShop ? (
          <View style={{ flex: 1, minWidth: 90 }}>
            <ActionButton
              title="Edit"
              onPress={() => onEditShop(shopId)}
              backgroundColor={COLORS.success}
              icon="square-edit-outline"
            />
          </View>
        ) : null}

        {canDeleteShop ? (
          <View style={{ flex: 1, minWidth: 90 }}>
            <ActionButton
              title={isDeleting ? "Deleting..." : "Delete"}
              onPress={() => onDeleteShop(shopId)}
              backgroundColor={COLORS.danger}
              icon="delete-outline"
              loading={isDeleting}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function HeaderBar({
  title,
  subtitle,
  onBack,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <View className="px-4 pb-3 pt-1">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onBack}
          hitSlop={10}
          className="h-10 w-10 items-center justify-center rounded-[14px]"
          style={{
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={COLORS.heading}
          />
        </Pressable>

        <View className="flex-1 px-3 items-center">
          <Text
            className="text-[17px] font-extrabold"
            style={{ color: COLORS.heading }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5 text-[10px]"
            style={{ color: COLORS.secondaryText }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        <Pressable
          onPress={onRefresh}
          hitSlop={10}
          className="h-10 w-10 items-center justify-center rounded-[14px]"
          style={{
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color={COLORS.heading}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function ShopOwnerDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authCtx = useAuth() as unknown as AuthLike;
  const token = authCtx?.accessToken || authCtx?.token || null;
  const { width } = useWindowDimensions();

  const isSmallMobile = width < 380;
  const contentPadding = isSmallMobile ? 12 : 16;
  const statGap = 10;

  const statCardWidth = useMemo(() => {
    const available = width - contentPadding * 2 - statGap;
    return Math.max(140, available / 2);
  }, [width, contentPadding]);

  const rawUser =
    authCtx?.user ||
    (authCtx?.auth && typeof authCtx.auth === "object" && "user" in authCtx.auth
      ? (authCtx.auth as any)?.user
      : authCtx?.auth) ||
    null;

  const currentRole = normalizeRole(rawUser?.role);

  const canEditOwner = [
    ROLES.MASTER_ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.STAFF,
  ].includes(currentRole as any);

  const canDeleteOwner = currentRole === ROLES.MASTER_ADMIN;
  const canToggleOwner = currentRole === ROLES.MASTER_ADMIN;

  const canEditShop = [
    ROLES.MASTER_ADMIN,
    ROLES.MANAGER,
    ROLES.SUPERVISOR,
    ROLES.STAFF,
  ].includes(currentRole as any);

  const canDeleteShop = currentRole === ROLES.MASTER_ADMIN;

  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deletingOwner, setDeletingOwner] = useState(false);
  const [deletingShopId, setDeletingShopId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [data, setData] = useState<ShopOwnerData | null>(null);

  const headersAuthOnly = useMemo(() => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const headersJson = useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const shops = useMemo<ShopLite[]>(() => {
    if (Array.isArray(data?.shops) && data.shops.length) return data.shops;
    if (Array.isArray(data?.shopIds) && data.shopIds.length) return data.shopIds;
    return [];
  }, [data]);

  const isActive = !!data?.isActive;
  const remainingDays = getRemainingDays(data?.validTo);
  const heroTone = getStatusTone(isActive);

  const getDocField = useCallback(
    (key: DocFieldKey): DocField => {
      return (data?.[key] || {}) as DocField;
    },
    [data]
  );

  const fetchDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const url = SummaryApi.shopowner_get.url(String(id));
      const res = await fetch(apiUrl(url), {
        method: SummaryApi.shopowner_get.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(getApiErrorMessage(json, `HTTP ${res.status}`));
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

  const openDocUrl = useCallback(async (url?: string) => {
    if (!url) {
      toastInfo("No document uploaded");
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      toastError("Unable to open document");
    }
  }, []);

  const onToggleActive = useCallback(async () => {
    if (!canToggleOwner) {
      toastError("Only Master Admin can change account status");
      return;
    }

    if (!id) return;

    try {
      setToggling(true);

      const url = SummaryApi.shopowner_toggle_active.url(String(id));
      const res = await fetch(apiUrl(url), {
        method: SummaryApi.shopowner_toggle_active.method,
        headers: headersJson,
        body: JSON.stringify({ isActive: !isActive }),
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW:", text);
        toastError(getApiErrorMessage(json, `HTTP ${res.status}`));
        return;
      }

      toastSuccess(json?.message || (!isActive ? "Activated" : "Deactivated"));
      await fetchDetails();
    } catch {
      toastError("Network error");
    } finally {
      setToggling(false);
      setConfirmOpen(false);
    }
  }, [canToggleOwner, id, headersJson, isActive, fetchDetails]);

  const onDeleteOwner = useCallback(() => {
    if (!canDeleteOwner) {
      toastError("Only Master Admin can delete shop owner");
      return;
    }

    if (!id) return;

    Alert.alert(
      "Delete Shop Owner",
      "Are you sure you want to delete this shop owner account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingOwner(true);

              const res = await fetch(
                apiUrl(SummaryApi.shopowner_delete.url(String(id))),
                {
                  method: SummaryApi.shopowner_delete.method,
                  headers: headersAuthOnly,
                }
              );

              const { text, json } = await readResponse(res);

              if (!res.ok || !json?.success) {
                if (!json) console.log("RAW:", text);
                toastError(getApiErrorMessage(json, `HTTP ${res.status}`));
                return;
              }

              toastSuccess(json?.message || "Shop owner deleted successfully");
              router.back();
            } catch {
              toastError("Network error");
            } finally {
              setDeletingOwner(false);
            }
          },
        },
      ]
    );
  }, [canDeleteOwner, id, headersAuthOnly, router]);

  const onDeleteShop = useCallback(
    (shopId: string) => {
      if (!canDeleteShop) {
        toastError("Only Master Admin can delete shop");
        return;
      }

      Alert.alert("Delete Shop", "Are you sure you want to delete this shop?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingShopId(shopId);

              const res = await fetch(apiUrl(SummaryApi.master_delete_shop.url(shopId)), {
                method: SummaryApi.master_delete_shop.method,
                headers: headersAuthOnly,
              });

              const { text, json } = await readResponse(res);

              if (!res.ok || !json?.success) {
                if (!json) console.log("RAW:", text);
                toastError(getApiErrorMessage(json, `HTTP ${res.status}`));
                return;
              }

              toastSuccess(json?.message || "Shop deleted successfully");
              await fetchDetails();
            } catch {
              toastError("Network error");
            } finally {
              setDeletingShopId("");
            }
          },
        },
      ]);
    },
    [canDeleteShop, headersAuthOnly, fetchDetails]
  );

  const goToEditOwner = useCallback(() => {
    if (!canEditOwner) {
      toastError("You do not have permission to edit shop owner");
      return;
    }

    router.push({
      pathname: "/components/shopOwners/edit",
      params: { id: String(id) },
    } as any);
  }, [canEditOwner, router, id]);

  const goToCreateShop = useCallback(() => {
    router.push("/components/shops/create" as any);
  }, [router]);

  const goToViewShop = useCallback(
    (shopId: string) => {
      router.push({
        pathname: "/components/shops/view",
        params: { id: shopId },
      } as any);
    },
    [router]
  );

  const goToEditShop = useCallback(
    (shopId: string) => {
      if (!canEditShop) {
        toastError("You do not have permission to edit shop");
        return;
      }

      router.push({
        pathname: "/components/shops/edit",
        params: { id: shopId },
      } as any);
    },
    [canEditShop, router]
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <HeaderBar
          title="Shop Owner Details"
          subtitle="Compact premium view"
          onBack={() => router.back()}
          onRefresh={fetchDetails}
        />

        <View className="flex-1 items-center justify-center px-6">
          <View
            className="h-[68px] w-[68px] items-center justify-center rounded-[22px]"
            style={{ backgroundColor: COLORS.primarySoft }}
          >
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>

          <Text
            className="mt-4 text-[15px] font-extrabold"
            style={{ color: COLORS.heading }}
          >
            Loading details
          </Text>

          <Text
            className="mt-1 text-[12px]"
            style={{ color: COLORS.secondaryText }}
          >
            Fetching latest shop owner profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <HeaderBar
          title="Shop Owner Details"
          subtitle="Compact premium view"
          onBack={() => router.back()}
          onRefresh={fetchDetails}
        />

        <View className="flex-1 items-center justify-center px-6">
          <View
            className="h-[76px] w-[76px] items-center justify-center rounded-[24px]"
            style={{ backgroundColor: COLORS.soft }}
          >
            <MaterialCommunityIcons
              name="database-off-outline"
              size={36}
              color={COLORS.mutedText}
            />
          </View>

          <Text
            className="mt-4 text-[17px] font-extrabold"
            style={{ color: COLORS.heading }}
          >
            No data found
          </Text>

          <Text
            className="mt-2 text-center text-[12px] leading-[18px]"
            style={{ color: COLORS.secondaryText }}
          >
            Unable to load this shop owner record right now.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <HeaderBar
        title="Shop Owner Details"
        subtitle="Compact premium view"
        onBack={() => router.back()}
        onRefresh={fetchDetails}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: contentPadding,
          paddingBottom: 26,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark || COLORS.primary, "#0F172A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 22,
            padding: 14,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -20,
              right: -18,
              width: 92,
              height: 92,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          />

          <View
            style={{
              position: "absolute",
              bottom: -24,
              left: -18,
              width: 110,
              height: 110,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />

          <View className="flex-row items-start">
            {data.avatarUrl ? (
              <Image
                source={{ uri: data.avatarUrl }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 18,
                  marginRight: 12,
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.22)",
                }}
              />
            ) : (
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 18,
                  marginRight: 12,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <Text
                  className="text-[18px] font-extrabold"
                  style={{ color: COLORS.white }}
                >
                  {getInitials(data.name)}
                </Text>
              </View>
            )}

            <View className="flex-1">
              <Text
                className="text-[19px] font-extrabold"
                style={{ color: COLORS.white }}
                numberOfLines={1}
              >
                {data.name || "-"}
              </Text>

              <Text
                className="mt-0.5 text-[12px] font-semibold"
                style={{ color: "rgba(255,255,255,0.82)" }}
                numberOfLines={1}
              >
                @{data.username || "username"}
              </Text>

              <View className="mt-2 flex-row flex-wrap items-center">
                <CompactPill
                  text={isActive ? "ACTIVE" : "INACTIVE"}
                  bg={heroTone.bg}
                  color={heroTone.text}
                  icon={isActive ? "check-decagram" : "alert-circle-outline"}
                />

                {data.verifyEmail ? (
                  <CompactPill
                    text="EMAIL VERIFIED"
                    bg="rgba(59,130,246,0.16)"
                    color="#DBEAFE"
                    icon="email-check-outline"
                  />
                ) : null}
              </View>
            </View>
          </View>

          <View
            className="mt-3 rounded-[16px] px-3 py-2.5"
            style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="email-outline"
                size={15}
                color="rgba(255,255,255,0.85)"
              />
              <Text
                className="ml-2 flex-1 text-[12px] font-semibold"
                style={{ color: COLORS.white }}
                numberOfLines={1}
              >
                {data.email || "-"}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center">
              <MaterialCommunityIcons
                name="phone-outline"
                size={15}
                color="rgba(255,255,255,0.85)"
              />
              <Text
                className="ml-2 flex-1 text-[12px] font-semibold"
                style={{ color: COLORS.white }}
                numberOfLines={1}
              >
                {data.mobile || "-"}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row" style={{ gap: 8 }}>
            <View
              className="flex-1 rounded-[16px] px-3 py-2.5"
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              <Text
                className="text-[10px] font-bold"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                SHOP CONTROL
              </Text>
              <Text
                className="mt-1 text-[12px] font-extrabold"
                style={{ color: COLORS.white }}
                numberOfLines={1}
              >
                {data.shopControl || "-"}
              </Text>
            </View>

            <View
              className="flex-1 rounded-[16px] px-3 py-2.5"
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              <Text
                className="text-[10px] font-bold"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                SHOPS
              </Text>
              <Text
                className="mt-1 text-[12px] font-extrabold"
                style={{ color: COLORS.white }}
              >
                {String(shops.length)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View className="mb-3 flex-row" style={{ gap: statGap }}>
          <StatCard
            icon="calendar-start"
            label="Valid From"
            value={formatDateTimeIST(data.validFrom).replace(",", "\n")}
            tint={COLORS.primary}
            softBg={COLORS.primarySoft}
            cardWidth={statCardWidth}
          />
          <StatCard
            icon="calendar-end"
            label="Valid To"
            value={formatDateTimeIST(data.validTo).replace(",", "\n")}
            tint={COLORS.success}
            softBg={COLORS.primarySoft}
            cardWidth={statCardWidth}
          />
        </View>

        <View className="mb-3 flex-row" style={{ gap: statGap }}>
          <StatCard
            icon="timer-sand"
            label="Remaining"
            value={getRemainingLabel(data.validTo)}
            tint={
              remainingDays !== null && remainingDays <= 7
                ? COLORS.danger
                : COLORS.primary
            }
            softBg={COLORS.primarySoft}
            cardWidth={statCardWidth}
          />
          <StatCard
            icon="shield-account-outline"
            label="Account Status"
            value={isActive ? "Enabled" : "Disabled"}
            tint={isActive ? COLORS.success : COLORS.danger}
            softBg={COLORS.primarySoft}
            cardWidth={statCardWidth}
          />
        </View>

        <SectionCard className="mb-3">
          <SectionHeader
            title="Quick Actions"
            subtitle="Manage account access and owner profile."
          />

          {(canEditOwner || canDeleteOwner) && (
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {canEditOwner ? (
                <View style={{ flex: 1, minWidth: 130 }}>
                  <ActionButton
                    title="Edit Owner"
                    onPress={goToEditOwner}
                    backgroundColor={COLORS.primary}
                    icon="square-edit-outline"
                  />
                </View>
              ) : null}

              {canDeleteOwner ? (
                <View style={{ flex: 1, minWidth: 130 }}>
                  <ActionButton
                    title={deletingOwner ? "Deleting..." : "Delete Owner"}
                    onPress={onDeleteOwner}
                    backgroundColor={COLORS.danger}
                    icon="delete-outline"
                    loading={deletingOwner}
                  />
                </View>
              ) : null}
            </View>
          )}

          {canToggleOwner ? (
            <>
              <View className="mt-2.5">
                <ActionButton
                  title={
                    toggling
                      ? "Updating..."
                      : isActive
                      ? "Deactivate Access"
                      : "Activate Access"
                  }
                  onPress={() => setConfirmOpen(true)}
                  backgroundColor={isActive ? COLORS.danger : COLORS.success}
                  icon={isActive ? "account-off-outline" : "account-check-outline"}
                  loading={toggling}
                />
              </View>

              <Text
                className="mt-2.5 text-[11px] leading-[16px]"
                style={{ color: COLORS.mutedText }}
              >
                This affects dashboard access and shop owner operations.
              </Text>
            </>
          ) : null}
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader
            title="Contact & Profile"
            subtitle="Primary owner details and registered address."
          />

          <InfoRow label="Mobile Number" value={data.mobile} icon="phone-outline" />
          <InfoRow
            label="Additional Mobile"
            value={data.additionalNumber}
            icon="cellphone"
          />
          <InfoRow
            label="Shop Control"
            value={data.shopControl}
            icon="shield-crown-outline"
          />
          <InfoRow
            label="Email Verified"
            value={data.verifyEmail ? "Yes" : "No"}
            icon="email-check-outline"
          />
          <InfoRow
            label="Registered Address"
            value={formatAddress(data.address)}
            icon="map-marker-outline"
          />
        </SectionCard>

        <SectionCard className="mb-3">
          <SectionHeader
            title="Documents"
            subtitle="Uploaded verification documents."
            right={
              <CompactPill
                text="VIEW ONLY"
                bg={COLORS.primarySoft}
                color={COLORS.primary}
                icon="eye-outline"
              />
            }
          />

          <DocumentRow
            label="ID Proof"
            doc={getDocField("idProof")}
            onView={openDocUrl}
          />
        </SectionCard>

        <SectionCard>
          <SectionHeader
            title="Assigned Shops"
            subtitle="All linked shops under this owner."
            right={
              <View className="flex-row items-center">
                {canEditShop ? (
                  <Pressable
                    onPress={goToCreateShop}
                    className="mr-2 h-9 w-9 items-center justify-center rounded-[12px]"
                    style={{
                      backgroundColor: COLORS.primary,
                      shadowColor: "#000",
                      shadowOpacity: 0.08,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 2,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={18}
                      color={COLORS.white}
                    />
                  </Pressable>
                ) : null}

                <CompactPill
                  text={String(shops.length)}
                  bg={COLORS.primarySoft}
                  color={COLORS.primary}
                  icon="storefront-outline"
                />
              </View>
            }
          />

          {shops.length === 0 ? (
            <EmptyState
              icon="store-off-outline"
              title="No shops assigned"
              subtitle="This shop owner currently has no linked shop records."
            />
          ) : (
            <View className="mt-1">
              {shops.map((shop, index) => (
                <ShopCard
                  key={`shop-${index}-${shop?._id || index}`}
                  shop={shop}
                  index={index}
                  deletingShopId={deletingShopId}
                  onDeleteShop={onDeleteShop}
                  onViewShop={goToViewShop}
                  onEditShop={goToEditShop}
                  canEditShop={canEditShop}
                  canDeleteShop={canDeleteShop}
                />
              ))}
            </View>
          )}
        </SectionCard>
      </ScrollView>

      <Modal
        visible={canToggleOwner && confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View
          className="flex-1 items-center justify-center px-5"
          style={{ backgroundColor: "rgba(15,23,42,0.25)" }}
        >
          <View
            className="w-full rounded-[22px] border p-4"
            style={{
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }}
          >
            <View
              className="mb-3 h-[52px] w-[52px] items-center justify-center rounded-[16px] border"
              style={{
                backgroundColor: COLORS.soft,
                borderColor: COLORS.border,
              }}
            >
              <MaterialCommunityIcons
                name={
                  isActive ? "alert-circle-outline" : "check-decagram-outline"
                }
                size={24}
                color={isActive ? COLORS.danger : COLORS.success}
              />
            </View>

            <Text
              className="text-[17px] font-extrabold"
              style={{ color: COLORS.heading }}
            >
              Confirm Action
            </Text>

            <Text
              className="mt-1.5 text-[13px] leading-[19px]"
              style={{ color: COLORS.secondaryText }}
            >
              Are you sure you want to {isActive ? "deactivate" : "activate"} this
              shop owner account?
            </Text>

            <View className="mt-4 flex-row" style={{ gap: 8 }}>
              <View className="flex-1">
                <ActionButton
                  title="Cancel"
                  onPress={() => setConfirmOpen(false)}
                  outline
                  disabled={toggling}
                />
              </View>

              <View className="flex-1">
                <ActionButton
                  title={
                    toggling
                      ? "Please wait..."
                      : isActive
                      ? "Deactivate"
                      : "Activate"
                  }
                  onPress={onToggleActive}
                  backgroundColor={isActive ? COLORS.danger : COLORS.success}
                  loading={toggling}
                  icon={isActive ? "account-off-outline" : "account-check-outline"}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}