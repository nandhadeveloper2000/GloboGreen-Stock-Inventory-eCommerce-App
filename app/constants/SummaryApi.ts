export const baseURL = "https://globogreen-server.onrender.com";
const API_BASE = "/api";

export const withQuery = (
  url: string,
  params?: Record<string, string | number | undefined | null>
) => {
  if (!params) return url;

  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");

  return qs ? `${url}?${qs}` : url;
};

const SummaryApi = {
  /* ===================== SUBADMIN AUTH ===================== */
  subadmin_login: { method: "POST", url: `${API_BASE}/subadmins/login` },
  subadmin_refresh_token: {
    method: "POST",
    url: `${API_BASE}/subadmins/refresh-token`,
  },
  subadmin_logout: { method: "POST", url: `${API_BASE}/subadmins/logout` },

  subadmin_forgot_pin: {
    method: "POST",
    url: `${API_BASE}/subadmins/forgot-pin`,
  },
  subadmin_verify_pin_otp: {
    method: "POST",
    url: `${API_BASE}/subadmins/verify-pin-otp`,
  },
  subadmin_reset_pin: {
    method: "POST",
    url: `${API_BASE}/subadmins/reset-pin`,
  },
  subadmin_change_pin: {
    method: "PUT",
    url: `${API_BASE}/subadmins/me/change-pin`,
  },

  /* ===================== SUBADMIN SELF ===================== */
  subadmin_me: { method: "GET", url: `${API_BASE}/subadmins/me` },
  subadmin_update_me: { method: "PUT", url: `${API_BASE}/subadmins/me` },
  subadmin_avatar_upload: {
    method: "POST",
    url: `${API_BASE}/subadmins/me/avatar`,
  },
  subadmin_avatar_remove: {
    method: "DELETE",
    url: `${API_BASE}/subadmins/me/avatar`,
  },

  /* ===================== MASTER AUTH ===================== */
  master_login: { method: "POST", url: `${API_BASE}/master/login` },
  master_refresh: { method: "POST", url: `${API_BASE}/master/refresh` },
  master_logout: { method: "POST", url: `${API_BASE}/master/logout` },
  master_forgot_pin: { method: "POST", url: `${API_BASE}/master/forgot-pin` },
  master_reset_pin: { method: "POST", url: `${API_BASE}/master/reset-pin` },
  master_change_pin: { method: "POST", url: `${API_BASE}/master/change-pin` },

  /* ===================== MASTER ME ===================== */
  master_me: { method: "GET", url: `${API_BASE}/master/me` },
  master_update_me: { method: "PATCH", url: `${API_BASE}/master/me` },

  /* ===================== MASTER AVATAR (ME) ===================== */
  master_avatar_upload: {
    method: "POST",
    url: `${API_BASE}/master/me/avatar`,
  },
  master_avatar_remove: {
    method: "DELETE",
    url: `${API_BASE}/master/me/avatar`,
  },

  /* ===================== MASTER ADMIN CRUD ===================== */
  master_list: { method: "GET", url: `${API_BASE}/master` },
  master_get_by_id: {
    method: "GET",
    url: (id: string) => `${API_BASE}/master/${id}`,
  },
  master_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/master/${id}`,
  },
  master_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/master/${id}`,
  },

  /* ===================== SUBADMINS (MASTER CRUD) ===================== */
  master_create_subadmin: { method: "POST", url: `${API_BASE}/subadmins` },
  master_all_subadmin: { method: "GET", url: `${API_BASE}/subadmins` },
  master_update_subadmin: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/subadmins/${id}`,
  },
  master_delete_subadmin: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/subadmins/${id}`,
  },
  master_subadmin_avatar_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/subadmins/${id}/avatar`,
  },
  master_subadmin_avatar_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/subadmins/${id}/avatar`,
  },

  /* ===================== SHOP OWNERS (ADMIN / MANAGER / SUPERVISOR / STAFF) ===================== */
  shopowner_create: { method: "POST", url: `${API_BASE}/shopowners` },
  shopowner_list: { method: "GET", url: `${API_BASE}/shopowners` },
  shopowner_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shopowners/${id}`,
  },
  shopowner_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shopowners/${id}`,
  },
  shopowner_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shopowners/${id}`,
  },
  shopowner_toggle_active: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shopowners/${id}/activate`,
  },
  shopowner_admin_avatar_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shopowners/${id}/avatar`,
  },
  shopowner_admin_avatar_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shopowners/${id}/avatar`,
  },
  shopowner_admin_docs_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shopowners/${id}/docs`,
  },
  shopowner_admin_docs_remove: {
    method: "DELETE",
    url: (id: string, key: "idProof") =>
      `${API_BASE}/shopowners/${id}/docs/${key}`,
  },

  /* ===================== SHOP OWNER AUTH (PUBLIC) ===================== */
  shopowner_login: { method: "POST", url: `${API_BASE}/shopowners/login` },
  shopowner_refresh: { method: "POST", url: `${API_BASE}/shopowners/refresh` },
  shopowner_forgot_pin: {
    method: "POST",
    url: `${API_BASE}/shopowners/forgot-pin`,
  },
  shopowner_verify_pin_otp: {
    method: "POST",
    url: `${API_BASE}/shopowners/verify-pin-otp`,
  },
  shopowner_reset_pin: {
    method: "POST",
    url: `${API_BASE}/shopowners/reset-pin`,
  },

  /* ===================== SHOP OWNER SELF ===================== */
  shopowner_me: { method: "GET", url: `${API_BASE}/shopowners/me` },
  shopowner_logout: { method: "POST", url: `${API_BASE}/shopowners/logout` },
  shopowner_change_pin: {
    method: "PUT",
    url: `${API_BASE}/shopowners/me/change-pin`,
  },
  shopowner_avatar_upload: {
    method: "POST",
    url: `${API_BASE}/shopowners/me/avatar`,
  },
  shopowner_avatar_remove: {
    method: "DELETE",
    url: `${API_BASE}/shopowners/me/avatar`,
  },

  /* ===================== SHOPS CRUD ===================== */
  master_create_shop: { method: "POST", url: `${API_BASE}/shops` },
  master_list_shops: { method: "GET", url: `${API_BASE}/shops` },
  master_get_shop: {
    method: "GET",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  master_update_shop: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },
  master_delete_shop: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}`,
  },

  /* ===================== SHOP FRONT IMAGE ===================== */
  shop_front_upload_owner: {
    method: "POST",
    url: (id: string) => `${API_BASE}/shops/${id}/front`,
  },
  shop_front_remove_owner: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}/front`,
  },
  shop_front_upload_admin: {
    method: "POST",
    url: (id: string) => `${API_BASE}/shops/${id}/front/admin`,
  },
  shop_front_remove_admin: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/shops/${id}/front/admin`,
  },

  /* ===================== SHOP DOCUMENTS ===================== */
  shop_docs_upload_owner: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}/docs`,
  },
  shop_docs_remove_owner: {
    method: "DELETE",
    url: (id: string, key: "gstCertificate" | "udyamCertificate") =>
      `${API_BASE}/shops/${id}/docs/${key}`,
  },

  shop_docs_upload_admin: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/shops/${id}/docs/admin`,
  },
  shop_docs_remove_admin: {
    method: "DELETE",
    url: (id: string, key: "gstCertificate" | "udyamCertificate") =>
      `${API_BASE}/shops/${id}/docs/${key}/admin`,
  },

  /* ===================== STAFF (MASTER + MANAGER + SUPERVISOR) ===================== */
  staff_create: { method: "POST", url: `${API_BASE}/staff` },
  staff_list: { method: "GET", url: `${API_BASE}/staff` },
  staff_get: {
    method: "GET",
    url: (id: string) => `${API_BASE}/staff/${id}`,
  },
  staff_update: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/staff/${id}`,
  },
  staff_delete: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/staff/${id}`,
  },

  /* ===================== STAFF AVATAR (ADMIN) ===================== */
  staff_avatar_upload: {
    method: "PUT",
    url: (id: string) => `${API_BASE}/staff/${id}/avatar`,
  },
  staff_avatar_remove: {
    method: "DELETE",
    url: (id: string) => `${API_BASE}/staff/${id}/avatar`,
  },

  /* ===================== STAFF SELF ===================== */
  staff_me: { method: "GET", url: `${API_BASE}/staff/me` },
  staff_update_me: { method: "PUT", url: `${API_BASE}/staff/me` },
  staff_avatar_upload_me: {
    method: "POST",
    url: `${API_BASE}/staff/me/avatar`,
  },
  staff_avatar_remove_me: {
    method: "DELETE",
    url: `${API_BASE}/staff/me/avatar`,
  },

  /* ===================== STAFF AUTH ===================== */
  staffLogin: { method: "POST", url: `${API_BASE}/staff/login` },
  staffRefreshToken: {
    method: "POST",
    url: `${API_BASE}/staff/refresh-token`,
  },
  staffLogout: { method: "POST", url: `${API_BASE}/staff/logout` },
  staff_forgot_pin: { method: "POST", url: `${API_BASE}/staff/forgot-pin` },
  staffVerifyPinOtp: {
    method: "POST",
    url: `${API_BASE}/staff/verify-pin-otp`,
  },
  staff_reset_pin: { method: "POST", url: `${API_BASE}/staff/reset-pin` },
  staffChangePin: {
    method: "PUT",
    url: `${API_BASE}/staff/me/change-pin`,
  },
};

export default SummaryApi;