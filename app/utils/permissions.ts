import { PERMISSIONS } from "../constants/permissions";
import { UserRole } from "../constants/roles";

export function normalizeRole(role?: string | null): UserRole | null {
  if (!role) return null;

  const value = String(role).toUpperCase();

  if (value === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (value === "MANAGER") return "MANAGER";
  if (value === "SUPERVISOR") return "SUPERVISOR";
  if (value === "STAFF") return "STAFF";

  return null;
}

export function getRolePermissions(role?: string | null) {
  const normalized = normalizeRole(role);
  if (!normalized) return null;
  return PERMISSIONS[normalized];
}