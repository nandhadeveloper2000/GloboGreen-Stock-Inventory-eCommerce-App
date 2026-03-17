import { useMemo } from "react";
import { useAuth } from "../context/auth/AuthProvider";
import { getRolePermissions, normalizeRole } from "../utils/permissions";

export function useRoleAccess() {
  const { user } = useAuth();

  const role = normalizeRole(user?.role);

  const permissions = useMemo(() => {
    return getRolePermissions(user?.role);
  }, [user?.role]);

  return {
    role,
    permissions,
    isMaster: role === "MASTER_ADMIN",
    isManager: role === "MANAGER",
    isSupervisor: role === "SUPERVISOR",
    isStaff: role === "STAFF",
  };
}