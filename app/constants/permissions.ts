import { UserRole } from "./roles";

export type PermissionMap = {
  createManager: boolean;
  createShopOwner: boolean;
  createSupervisor: boolean;
  createStaff: boolean;
  activateUsers: boolean;
  deleteUsers: boolean;
  manageSubAdmins: boolean;
  manageStaff: boolean;
  manageShopOwners: boolean;
};

export const PERMISSIONS: Record<UserRole, PermissionMap> = {
  MASTER_ADMIN: {
    createManager: true,
    createShopOwner: true,
    createSupervisor: true,
    createStaff: true,
    activateUsers: true,
    deleteUsers: true,
    manageSubAdmins: true,
    manageStaff: true,
    manageShopOwners: true,
  },

  MANAGER: {
    createManager: false,
    createShopOwner: true,
    createSupervisor: true,
    createStaff: true,
    activateUsers: false,
    deleteUsers: false,
    manageSubAdmins: false,
    manageStaff: true,
    manageShopOwners: true,
  },

  SUPERVISOR: {
    createManager: false,
    createShopOwner: true,
    createSupervisor: false,
    createStaff: true,
    activateUsers: false,
    deleteUsers: false,
    manageSubAdmins: false,
    manageStaff: false,
    manageShopOwners: true,
  },

  STAFF: {
    createManager: false,
    createShopOwner: true,
    createSupervisor: false,
    createStaff: false,
    activateUsers: false,
    deleteUsers: false,
    manageSubAdmins: false,
    manageStaff: false,
    manageShopOwners: true,
  },
};