export const ROLES = {
  MASTER_ADMIN: "MASTER_ADMIN",
  MANAGER: "MANAGER",
  SUPERVISOR: "SUPERVISOR",
  STAFF: "STAFF",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];