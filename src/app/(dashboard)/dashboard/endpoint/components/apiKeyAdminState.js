export const QUOTA_MULTIPLIER_PRESETS = [1, 1.2, 1.5, 2, 3];
export const KEY_STATUS_FILTERS = ["all", "active", "locked", "expired"];
export const KEY_SORT_OPTIONS = ["createdAt", "used", "raw", "virtual"];

function stringify(value) {
  if (Array.isArray(value)) return value.join(" ");
  if (value === null || value === undefined) return "";
  return String(value);
}

export function normalizeKeySearchTerm(value) {
  return stringify(value).trim().toLowerCase();
}

export function buildApiKeySearchText(key = {}) {
  return [
    key.name,
    key.key,
    key.id,
    key.disabledReason,
    key.disabledMessage,
    key.createdAt,
    key.expiresAt,
    stringify(key.allowedModels),
    stringify(key.quota?.window),
  ]
    .map((part) => stringify(part).toLowerCase())
    .join(" ");
}

export function filterApiKeysBySearch(keys = [], searchTerm = "") {
  const normalized = normalizeKeySearchTerm(searchTerm);
  if (!normalized) return keys;
  return keys.filter((key) => buildApiKeySearchText(key).includes(normalized));
}

export function deriveApiKeyStatus(key = {}) {
  const expired = Boolean(key.expired || key.disabledReason === "api_key_expired");
  if (expired) return "expired";

  const locked = key.disabledReason === "token_quota_exceeded";
  if (locked) return "locked";

  const enabled = key.enabled ?? key.isActive ?? true;
  if (enabled) return "active";

  return "inactive";
}

export function filterApiKeysByStatus(keys = [], status = "all") {
  if (!status || status === "all") return keys;
  return keys.filter((key) => deriveApiKeyStatus(key) === status);
}

export function getApiKeyUsageMetrics(key = {}) {
  const used = Number(key.usage?.totalTokens || 0);
  const raw = Number((key.usage?.rawTotalTokens ?? key.usage?.totalTokens) || 0);
  const virtual = Math.max(0, used - raw);
  const createdAt = key.createdAt ? new Date(key.createdAt).getTime() : 0;
  return { used, raw, virtual, createdAt };
}

export function sortApiKeys(keys = [], sortBy = "createdAt", direction = "desc") {
  const factor = direction === "asc" ? 1 : -1;
  return [...keys].sort((left, right) => {
    const a = getApiKeyUsageMetrics(left);
    const b = getApiKeyUsageMetrics(right);
    const aValue = a[sortBy] ?? 0;
    const bValue = b[sortBy] ?? 0;
    if (aValue !== bValue) return (aValue - bValue) * factor;
    return String(left.name || left.id || "").localeCompare(String(right.name || right.id || ""));
  });
}
