export function buildTunnelPublicUrl(shortId) {
  return shortId ? `https://r${shortId}.9router.com` : "";
}

export function buildTunnelApiUrl(tunnelUrl) {
  return String(tunnelUrl || "").replace(/\/+$/, "");
}

export function getPreferredTunnelApiUrl({ apiUrl, tunnelUrl, publicUrl } = {}) {
  return buildTunnelApiUrl(apiUrl || tunnelUrl || publicUrl || "");
}
