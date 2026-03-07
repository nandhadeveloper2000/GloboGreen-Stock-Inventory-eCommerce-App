// app/constants/SummaryApi.ts
export const baseURL = "https://globogreen-server.onrender.com";
const API_BASE = "/api";

export const withQuery = (
  url: string,
  params?: Record<string, string | number | undefined | null>
) => {
  if (!params) return url;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${url}?${qs}` : url;
};

const SummaryApi = {
  /* ===================== SUBADMIN AUTH ===================== */
  subadmin_login: { method: "POST", url: `${API_BASE}/subadmins/login` },
subadmin_logout: { method: "POST", url: `${API_BASE}/subadmins/logout` },

  /* ===================== MASTER AUTH ===================== */
  master_login: { method: "POST", url: `${API_BASE}/master/login` },
  master_refresh: { method: "POST", url: `${API_BASE}/master/refresh` },
  master_logout: { method: "POST", url: `${API_BASE}/master/logout` },

  /* ===================== MASTER ME ===================== */
  master_me: { method: "GET", url: `${API_BASE}/master/me` },
  master_update_me: { method: "PATCH", url: `${API_BASE}/master/me` },

  /* ===================== MASTER AVATAR (ME) ===================== */
  master_avatar_upload: { method: "POST", url: `${API_BASE}/master/me/avatar` },
  master_avatar_remove: { method: "DELETE", url: `${API_BASE}/master/me/avatar` },

  /* ===================== MASTER ADMIN CRUD ===================== */
  master_list: { method: "GET", url: `${API_BASE}/master` },
  master_get_by_id: { method: "GET", url: (id: string) => `${API_BASE}/master/${id}` },
  master_update: { method: "PUT", url: (id: string) => `${API_BASE}/master/${id}` },
  master_delete: { method: "DELETE", url: (id: string) => `${API_BASE}/master/${id}` },

  /* ===================== SUBADMINS (MASTER CRUD) ===================== */
  master_create_subadmin: { method: "POST", url: `${API_BASE}/subadmins` },
  master_all_subadmin: { method: "GET", url: `${API_BASE}/subadmins` },
  master_update_subadmin: { method: "PUT", url: (id: string) => `${API_BASE}/subadmins/${id}` },
  master_delete_subadmin: { method: "DELETE", url: (id: string) => `${API_BASE}/subadmins/${id}` },
  master_subadmin_avatar_upload: { method: "PUT", url: (id: string) => `${API_BASE}/subadmins/${id}/avatar` },
  master_subadmin_avatar_remove: { method: "DELETE", url: (id: string) => `${API_BASE}/subadmins/${id}/avatar` },

  /* ===================== SHOP OWNERS (ADMIN) ===================== */
master_create_shopowner: { method: "POST", url: `${API_BASE}/shopowners` },
master_all_shopowners: { method: "GET", url: `${API_BASE}/shopowners` },
master_get_shopowner: { method: "GET", url: (id: string) => `${API_BASE}/shopowners/${id}` },
master_update_shopowner: { method: "PUT", url: (id: string) => `${API_BASE}/shopowners/${id}` },
master_delete_shopowner: { method: "DELETE", url: (id: string) => `${API_BASE}/shopowners/${id}` },
master_toggle_shopowner_active: { method: "PUT", url: (id: string) => `${API_BASE}/shopowners/${id}/activate` },

master_shopowner_avatar_upload: { method: "PUT", url: (id: string) => `${API_BASE}/shopowners/${id}/avatar` },
master_shopowner_avatar_remove: { method: "DELETE", url: (id: string) => `${API_BASE}/shopowners/${id}/avatar` },

master_shopowner_docs_upload: { method: "PUT", url: (id: string) => `${API_BASE}/shopowners/${id}/docs` },
master_shopowner_docs_remove: { method: "DELETE", url: (id: string, key: string) => `${API_BASE}/shopowners/${id}/docs/${key}` },

  /* ===================== SHOP OWNER AUTH (PUBLIC) ===================== */
  shopowner_login: { method: "POST", url: `${API_BASE}/shopowners/login` },
  shopowner_refresh: { method: "POST", url: `${API_BASE}/shopowners/refresh` },

  /* ===================== SHOP OWNER SELF ===================== */
  shopowner_me: { method: "GET", url: `${API_BASE}/shopowners/me` },
  shopowner_logout: { method: "POST", url: `${API_BASE}/shopowners/logout` },
  shopowner_avatar_upload: { method: "POST", url: `${API_BASE}/shopowners/me/avatar` },
  shopowner_avatar_remove: { method: "DELETE", url: `${API_BASE}/shopowners/me/avatar` },

  /* ===================== SHOPS ===================== */
  master_create_shop: { method: "POST", url: `${API_BASE}/shops` },
  master_list_shops: { method: "GET", url: `${API_BASE}/shops` },
  master_get_shop: { method: "GET", url: (id: string) => `${API_BASE}/shops/${id}` },
  master_update_shop: { method: "PUT", url: (id: string) => `${API_BASE}/shops/${id}` },
  master_delete_shop: { method: "DELETE", url: (id: string) => `${API_BASE}/shops/${id}` },

  // optional: if you use separate endpoints for front image
  shop_front_upload_owner: { method: "POST", url: (id: string) => `${API_BASE}/shops/${id}/front` },
  shop_front_remove_owner: { method: "DELETE", url: (id: string) => `${API_BASE}/shops/${id}/front` },
  shop_front_upload_admin: { method: "POST", url: (id: string) => `${API_BASE}/shops/${id}/front/admin` },
  shop_front_remove_admin: { method: "DELETE", url: (id: string) => `${API_BASE}/shops/${id}/front/admin` },

    /* ===================== STAFF (MASTER + MANAGER) ===================== */
  staff_create: { method: "POST", url: `${API_BASE}/staff` },
  staff_list: { method: "GET", url: `${API_BASE}/staff` },
  staff_get: { method: "GET", url: (id: string) => `${API_BASE}/staff/${id}` },
  staff_update: { method: "PUT", url: (id: string) => `${API_BASE}/staff/${id}` },
  staff_delete: { method: "DELETE", url: (id: string) => `${API_BASE}/staff/${id}` },

  // Optional (if you later create separate endpoints like shopowner avatar)
  staff_avatar_upload: { method: "PUT", url: (id: string) => `${API_BASE}/staff/${id}/avatar` },
  staff_avatar_remove: { method: "DELETE", url: (id: string) => `${API_BASE}/staff/${id}/avatar` },

  /* ===================== SUBADMIN SELF ===================== */
subadmin_me: { method: "GET", url: `${API_BASE}/subadmins/me` },
subadmin_update_me: { method: "PUT", url: `${API_BASE}/subadmins/me` },
subadmin_avatar_upload: { method: "POST", url: `${API_BASE}/subadmins/me/avatar` },
subadmin_avatar_remove: { method: "DELETE", url: `${API_BASE}/subadmins/me/avatar` },
 };

export default SummaryApi;