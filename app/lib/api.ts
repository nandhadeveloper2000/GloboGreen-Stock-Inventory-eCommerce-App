import { baseURL } from "../constants/SummaryApi";

export async function apiFetch(
  url: string,
  opts: {
    method?: string;
    token?: string | null;
    body?: any;
    shopId?: string | null;
    headers?: Record<string, string>;
  } = {}
) {
  const { method = "GET", token, body, shopId, headers = {} } = opts;

  const finalUrl = shopId
    ? `${baseURL}${url}${url.includes("?") ? "&" : "?"}shopId=${encodeURIComponent(shopId)}`
    : `${baseURL}${url}`;

  const res = await fetch(finalUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}