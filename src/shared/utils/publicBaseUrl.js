function trimTrailingSlashes(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function normalizeBaseUrl(value) {
  return trimTrailingSlashes(value);
}

export function appendV1Path(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return "";
  return normalized.endsWith("/v1") ? normalized : `${normalized}/v1`;
}

export function isPublicBaseUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0" && host !== "::1";
  } catch {
    return false;
  }
}

export function resolvePreferredBaseUrl(origin = "", configuredBaseUrl = "") {
  const configured = normalizeBaseUrl(configuredBaseUrl);
  if (configured) return configured;

  const currentOrigin = normalizeBaseUrl(origin);
  if (currentOrigin) return currentOrigin;

  return "http://localhost:1508";
}
