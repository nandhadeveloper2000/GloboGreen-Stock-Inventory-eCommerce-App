// app/components/staff/staffDetails.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
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

const toastSuccess = (msg: string) =>
  Toast.show({ type: "success", text1: "Success", text2: msg });

const toastError = (msg: string) =>
  Toast.show({ type: "error", text1: "Error", text2: msg });

const SHADOW_COLOR = "rgba(0,0,0,0.18)";
const OVERLAY_COLOR = "rgba(0,0,0,0.45)";
const SUPERVISOR_BG = "#F3E8FF";

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

async function readResponse(res: Response) {
  const text = await res.text();

  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value?: string;
}) {
  const displayValue = value?.trim() ? value : "-";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          height: 40,
          width: 40,
          borderRadius: 16,
          backgroundColor: COLORS.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 0.7,
            textTransform: "uppercase",
            color: COLORS.labelText,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            marginTop: 4,
            fontSize: 15,
            fontWeight: "700",
            color: COLORS.primaryText,
          }}
        >
          {displayValue}
        </Text>
      </View>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: SHADOW_COLOR,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <View
          style={{
            height: 40,
            width: 40,
            borderRadius: 16,
            backgroundColor: COLORS.soft,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={COLORS.heading}
          />
        </View>

        <Text
          style={{
            fontSize: 17,
            fontWeight: "800",
            color: COLORS.heading,
          }}
        >
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? COLORS.activeBg : COLORS.inactiveBg,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.7,
          color: active ? COLORS.activeText : COLORS.inactiveText,
        }}
      >
        {active ? "ACTIVE" : "INACTIVE"}
      </Text>
    </View>
  );
}

function RolePill({ role }: { role: StaffRole }) {
  const isSupervisor = role === "SUPERVISOR";

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: isSupervisor ? SUPERVISOR_BG : COLORS.primarySoft,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.7,
          color: COLORS.primary,
        }}
      >
        {role}
      </Text>
    </View>
  );
}

function ConfirmModal({
  visible,
  title,
  message,
  cancelText = "Cancel",
  confirmText = "Confirm",
  confirmColor = COLORS.heading,
  loading = false,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  confirmColor?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: OVERLAY_COLOR,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            width: "100%",
            backgroundColor: COLORS.card,
            borderRadius: 28,
            padding: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                height: 64,
                width: 64,
                borderRadius: 999,
                backgroundColor: COLORS.soft,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={34}
                color={confirmColor}
              />
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: COLORS.heading,
              }}
            >
              {title}
            </Text>

            <Text
              style={{
                marginTop: 8,
                textAlign: "center",
                color: COLORS.secondaryText,
                lineHeight: 22,
              }}
            >
              {message}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: COLORS.white,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: COLORS.primaryText, fontWeight: "800" }}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                borderRadius: 18,
                paddingVertical: 14,
                alignItems: "center",
                backgroundColor: confirmColor,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: COLORS.white, fontWeight: "800" }}>
                {loading ? "Please wait..." : confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function StaffDetailsScreen() {
  const router = useRouter();
  const { token, user, isReady, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const staffId = Array.isArray(id) ? (id[0] ?? "") : (id ?? "");

  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [data, setData] = useState<Staff | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);

  const currentRole = useMemo(() => {
    const rawRole = user?.role || user?.roles?.[0] || null;
    return normalizeRole(rawRole);
  }, [user]);

  const canViewEdit = useMemo(() => {
    return (
      currentRole === ROLES.MASTER_ADMIN ||
      currentRole === ROLES.MANAGER ||
      currentRole === ROLES.SUPERVISOR
    );
  }, [currentRole]);

  const canManageStatusAndDelete = useMemo(() => {
    return currentRole === ROLES.MASTER_ADMIN;
  }, [currentRole]);

  const headersAuthOnly = useMemo(() => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const fetchDetails = useCallback(async () => {
    if (!staffId) {
      setData(null);
      return;
    }

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
        setData(null);
        return;
      }

      setData((json.data as Staff) || null);
    } catch (error) {
      console.log("STAFF_DETAILS_FETCH_ERROR", error);
      toastError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [staffId, headersAuthOnly]);

  useEffect(() => {
    if (isReady && !authLoading) {
      fetchDetails();
    }
  }, [isReady, authLoading, fetchDetails]);

  const isActive = !!data?.isActive;

  const addressText = useMemo(() => {
    return (
      [
        data?.address?.street,
        data?.address?.area,
        data?.address?.taluk,
        data?.address?.district,
        data?.address?.state,
        data?.address?.pincode,
      ]
        .filter(Boolean)
        .join(", ") || "-"
    );
  }, [data]);

  const primaryRole: StaffRole = useMemo(() => {
    return data?.roles?.includes("SUPERVISOR") ? "SUPERVISOR" : "STAFF";
  }, [data]);

  const handleEdit = useCallback(() => {
    if (!staffId) return;

    router.push({
      pathname: "/components/staff/edit",
      params: { id: staffId },
    } as never);
  }, [router, staffId]);

  const onToggleActive = useCallback(async () => {
    if (!staffId || !data) return;

    if (!canManageStatusAndDelete) {
      toastError("Only Master Admin can activate or deactivate staff");
      setConfirmToggleOpen(false);
      return;
    }

    try {
      setActing(true);

      const fd = new FormData();
      fd.append("isActive", String(!isActive));

      const res = await fetch(apiUrl(SummaryApi.staff_update.url(staffId)), {
        method: SummaryApi.staff_update.method,
        headers: headersAuthOnly,
        body: fd,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW_STAFF_TOGGLE_RESPONSE:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess(!isActive ? "Activated" : "Deactivated");
      setConfirmToggleOpen(false);
      await fetchDetails();
    } catch (error) {
      console.log("STAFF_TOGGLE_ERROR", error);
      toastError("Network error");
    } finally {
      setActing(false);
    }
  }, [
    staffId,
    data,
    canManageStatusAndDelete,
    isActive,
    headersAuthOnly,
    fetchDetails,
  ]);

  const onDelete = useCallback(async () => {
    if (!staffId) return;

    if (!canManageStatusAndDelete) {
      toastError("Only Master Admin can delete staff");
      setConfirmDeleteOpen(false);
      return;
    }

    try {
      setActing(true);

      const res = await fetch(apiUrl(SummaryApi.staff_delete.url(staffId)), {
        method: SummaryApi.staff_delete.method,
        headers: headersAuthOnly,
      });

      const { text, json } = await readResponse(res);

      if (!res.ok || !json?.success) {
        if (!json) console.log("RAW_STAFF_DELETE_RESPONSE:", text);
        toastError(json?.message || `HTTP ${res.status}`);
        return;
      }

      toastSuccess("Deleted");
      setConfirmDeleteOpen(false);
      router.replace("/master/(tabs)/staffs" as never);
    } catch (error) {
      console.log("STAFF_DELETE_ERROR", error);
      toastError("Network error");
    } finally {
      setActing(false);
    }
  }, [staffId, canManageStatusAndDelete, headersAuthOnly, router]);

  if (!isReady || authLoading) {
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
              marginTop: 14,
              color: COLORS.secondaryText,
              fontWeight: "600",
            }}
          >
            Loading authentication...
          </Text>
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
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              height: 56,
              width: 56,
              borderRadius: 999,
              backgroundColor: COLORS.card,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>

          <Text
            style={{
              marginTop: 14,
              color: COLORS.secondaryText,
              fontWeight: "600",
            }}
          >
            Loading staff details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
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
          <View
            style={{
              height: 80,
              width: 80,
              borderRadius: 999,
              backgroundColor: COLORS.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="account-off-outline"
              size={36}
              color={COLORS.mutedText}
            />
          </View>

          <Text
            style={{
              color: COLORS.heading,
              fontWeight: "800",
              fontSize: 18,
              marginTop: 14,
            }}
          >
            No data found
          </Text>

          <Text
            style={{
              color: COLORS.secondaryText,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            This staff record may have been removed or is unavailable.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 18,
              borderRadius: 18,
              backgroundColor: COLORS.card,
              borderWidth: 1,
              borderColor: COLORS.border,
              paddingHorizontal: 18,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: COLORS.heading, fontWeight: "800" }}>
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
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            height: 44,
            width: 44,
            borderRadius: 16,
            backgroundColor: COLORS.card,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color={COLORS.heading}
          />
        </Pressable>

        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 12 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: COLORS.heading,
            }}
          >
            Staff Details
          </Text>

          <Text
            style={{
              marginTop: 2,
              fontSize: 12,
              fontWeight: "600",
              color: COLORS.secondaryText,
            }}
          >
            Profile overview and account actions
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {canViewEdit && (
            <Pressable
              onPress={handleEdit}
              style={{
                height: 44,
                width: 44,
                borderRadius: 16,
                backgroundColor: COLORS.card,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
              hitSlop={10}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={21}
                color={COLORS.heading}
              />
            </Pressable>
          )}

          {canManageStatusAndDelete && (
            <Pressable
              onPress={() => setConfirmDeleteOpen(true)}
              style={{
                height: 44,
                width: 44,
                borderRadius: 16,
                backgroundColor: COLORS.card,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
              hitSlop={10}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={21}
                color={COLORS.danger}
              />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
      >
        <View
          style={{
            marginTop: 4,
            borderRadius: 28,
            overflow: "hidden",
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            shadowColor: SHADOW_COLOR,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.07,
            shadowRadius: 18,
            elevation: 3,
          }}
        >
          <View
            style={{
              height: 112,
              backgroundColor: COLORS.primary,
              position: "relative",
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                height: 110,
                width: 140,
                backgroundColor: COLORS.primary,
                opacity: 0.18,
                borderBottomLeftRadius: 80,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: 80,
                width: 100,
                backgroundColor: COLORS.primaryLight,
                opacity: 0.18,
                borderTopRightRadius: 60,
              }}
            />
          </View>

          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 20,
              marginTop: -40,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  height: 96,
                  width: 96,
                  borderRadius: 28,
                  backgroundColor: COLORS.white,
                  padding: 4,
                  borderWidth: 1,
                  borderColor: COLORS.white,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 24,
                    overflow: "hidden",
                    backgroundColor: COLORS.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {data.avatarUrl ? (
                    <Image
                      source={{ uri: data.avatarUrl }}
                      style={{ height: "100%", width: "100%" }}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="account"
                      size={42}
                      color={COLORS.mutedText}
                    />
                  )}
                </View>
              </View>

              <View style={{ alignItems: "flex-end", gap: 8 }}>
                <StatusPill active={isActive} />
                <RolePill role={primaryRole} />
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: COLORS.heading,
                }}
              >
                {data.name}
              </Text>

              <Text
                style={{
                  marginTop: 4,
                  color: COLORS.secondaryText,
                  fontSize: 15,
                }}
              >
                @{data.username}
              </Text>

              <Text
                style={{
                  marginTop: 8,
                  color: COLORS.primaryText,
                  fontWeight: "600",
                }}
              >
                {data.email}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: COLORS.soft,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    fontWeight: "800",
                    color: COLORS.labelText,
                  }}
                >
                  Mobile
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    color: COLORS.heading,
                    fontWeight: "700",
                  }}
                >
                  {data.mobile || "-"}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: COLORS.soft,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    fontWeight: "800",
                    color: COLORS.labelText,
                  }}
                >
                  Alt Number
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    color: COLORS.heading,
                    fontWeight: "700",
                  }}
                >
                  {data.additionalNumber || "-"}
                </Text>
              </View>
            </View>

            {canManageStatusAndDelete && (
              <Pressable
                onPress={() => setConfirmToggleOpen(true)}
                disabled={acting}
                style={{
                  marginTop: 18,
                  borderRadius: 20,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  backgroundColor: isActive ? COLORS.danger : COLORS.success,
                  opacity: acting ? 0.7 : 1,
                }}
              >
                <MaterialCommunityIcons
                  name={
                    isActive
                      ? "account-off-outline"
                      : "account-check-outline"
                  }
                  size={20}
                  color={COLORS.white}
                />
                <Text
                  style={{
                    color: COLORS.white,
                    fontWeight: "800",
                    marginLeft: 8,
                    fontSize: 15,
                  }}
                >
                  {acting
                    ? "Please wait..."
                    : isActive
                      ? "Deactivate Staff"
                      : "Activate Staff"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <SectionCard title="Contact Information" icon="card-account-phone-outline">
          <InfoRow icon="email-outline" label="Email" value={data.email} />
          <InfoRow
            icon="phone-outline"
            label="Primary Mobile"
            value={data.mobile}
          />
          <InfoRow
            icon="phone-plus-outline"
            label="Additional Number"
            value={data.additionalNumber}
          />
        </SectionCard>

        <SectionCard title="Address Details" icon="map-marker-outline">
          <InfoRow
            icon="home-city-outline"
            label="Full Address"
            value={addressText}
          />
          <InfoRow icon="map-outline" label="State" value={data.address?.state} />
          <InfoRow
            icon="map-marker-radius-outline"
            label="District"
            value={data.address?.district}
          />
          <InfoRow
            icon="office-building-marker-outline"
            label="Taluk"
            value={data.address?.taluk}
          />
        </SectionCard>

        <SectionCard title="ID Proof" icon="card-bulleted-outline">
          {data.idProofUrl ? (
            <View
              style={{
                borderRadius: 20,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.soft,
              }}
            >
              <Image
                source={{ uri: data.idProofUrl }}
                style={{ width: "100%", height: 240 }}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View
              style={{
                borderRadius: 20,
                backgroundColor: COLORS.soft,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: COLORS.border,
                paddingVertical: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="file-document-outline"
                size={34}
                color={COLORS.mutedText}
              />
              <Text
                style={{
                  color: COLORS.secondaryText,
                  marginTop: 12,
                  fontWeight: "600",
                }}
              >
                ID proof not uploaded
              </Text>
            </View>
          )}
        </SectionCard>
      </ScrollView>

      <ConfirmModal
        visible={confirmToggleOpen}
        title={isActive ? "Deactivate Staff" : "Activate Staff"}
        message={`Are you sure you want to ${
          isActive ? "deactivate" : "activate"
        } this staff account?`}
        confirmText={isActive ? "Deactivate" : "Activate"}
        confirmColor={isActive ? COLORS.danger : COLORS.success}
        loading={acting}
        onClose={() => setConfirmToggleOpen(false)}
        onConfirm={onToggleActive}
      />

      <ConfirmModal
        visible={confirmDeleteOpen}
        title="Delete Staff"
        message="This action is permanent and cannot be undone. Do you want to delete this staff record?"
        confirmText="Delete"
        confirmColor={COLORS.danger}
        loading={acting}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}