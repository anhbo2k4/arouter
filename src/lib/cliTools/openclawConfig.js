export function normalizeOpenClawBaseUrl(baseUrl, tunnelStatus = {}) {
  const raw = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!raw) return "";

  let parsed = null;
  try {
    parsed = new URL(raw);
  } catch {
    return raw.endsWith("/v1") ? raw : `${raw}/v1`;
  }

  const host = parsed.hostname.toLowerCase();
  const is9RouterShortHost = /^r[a-z0-9]+\.9router\.com$/.test(host);
  const directTunnelUrl = tunnelStatus?.tunnel?.apiUrl || tunnelStatus?.tunnel?.tunnelUrl || tunnelStatus?.apiUrl || tunnelStatus?.tunnelUrl || "";
  const selected = is9RouterShortHost && directTunnelUrl ? String(directTunnelUrl).trim().replace(/\/+$/, "") : raw;

  return selected.endsWith("/v1") ? selected : `${selected}/v1`;
}
