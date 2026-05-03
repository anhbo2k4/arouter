function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toTimestamp(value) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function maskKey(apiKey) {
  const value = String(apiKey || "");
  if (!value) return "Unknown key";
  return value.length <= 8 ? value : `${value.slice(0, 8)}...`;
}

function roundPercent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function buildAvailableKeys(tokenKeys = []) {
  return [
    { id: "all", name: "All keys" },
    ...tokenKeys
      .filter((key) => key?.id)
      .map((key) => ({ id: key.id, name: key.name || maskKey(key.key) })),
  ];
}

function getKeyFilterSecret(selectedKeyId, tokenKeys = []) {
  if (!selectedKeyId || selectedKeyId === "all") return null;
  const key = tokenKeys.find((entry) => entry?.id === selectedKeyId);
  return key?.key || null;
}

function isWithinWindow(timestamp, window, nowMs) {
  const valueMs = toTimestamp(timestamp);
  if (!valueMs) return false;
  if (window === "24h") {
    return valueMs >= nowMs - (24 * 60 * 60 * 1000) && valueMs <= nowMs;
  }
  return valueMs >= nowMs - (7 * 24 * 60 * 60 * 1000) && valueMs <= nowMs;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function startOfUtcHour(ms) {
  const date = new Date(ms);
  date.setUTCMinutes(0, 0, 0);
  return date.getTime();
}

function startOfUtcDay(ms) {
  const date = new Date(ms);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function buildTimeline(filteredDetails, window, nowMs) {
  const bucketCount = window === "24h" ? 24 : 7;
  const baseStart = window === "24h"
    ? startOfUtcHour(nowMs) - ((bucketCount - 1) * 60 * 60 * 1000)
    : startOfUtcDay(nowMs) - ((bucketCount - 1) * 24 * 60 * 60 * 1000);
  const stepMs = window === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  const timeline = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = baseStart + (index * stepMs);
    const bucketDate = new Date(bucketStart);
    return {
      key: bucketStart,
      label: window === "24h"
        ? `${pad2(bucketDate.getUTCHours())}:00`
        : `${pad2(bucketDate.getUTCMonth() + 1)}/${pad2(bucketDate.getUTCDate())}`,
      savedBytes: 0,
      compressedRequests: 0,
      requests: 0,
    };
  });

  for (const detail of filteredDetails) {
    const timestampMs = toTimestamp(detail?.timestamp);
    if (!timestampMs) continue;
    const rtk = detail?.rtk;
    const bucketIndex = Math.floor((timestampMs - baseStart) / stepMs);
    if (bucketIndex < 0 || bucketIndex >= timeline.length) continue;
    timeline[bucketIndex].requests += 1;
    timeline[bucketIndex].savedBytes += toNumber(rtk?.savedBytes);
    if (rtk?.applied) {
      timeline[bucketIndex].compressedRequests += 1;
    }
  }

  return timeline;
}

export function aggregateRtkStats({ details = [], tokenKeys = [], selectedKeyId = "all", window = "7d", now = null } = {}) {
  const normalizedWindow = window === "24h" ? "24h" : "7d";
  const nowMs = toTimestamp(now || new Date().toISOString()) || Date.now();
  const keyBySecret = new Map();
  for (const key of tokenKeys) {
    if (key?.key) keyBySecret.set(key.key, key);
  }
  const selectedSecret = getKeyFilterSecret(selectedKeyId, tokenKeys);
  const filteredDetails = details.filter((detail) => {
    if (selectedSecret && detail?.apiKey !== selectedSecret) return false;
    return isWithinWindow(detail?.timestamp, normalizedWindow, nowMs);
  });

  const summary = {
    totalRequests: filteredDetails.length,
    rtkSeen: 0,
    compressedRequests: 0,
    bytesBefore: 0,
    bytesAfter: 0,
    savedBytes: 0,
    savedPercent: 0,
    hitCount: 0,
    unsafeFallbackCount: 0,
    lastSeenAt: null,
  };

  const rejectedReasons = {};
  const filterMap = new Map();
  const byKeyMap = new Map();

  for (const detail of filteredDetails) {
    const rtk = detail?.rtk;
    if (!rtk) continue;

    summary.rtkSeen += 1;
    summary.bytesBefore += toNumber(rtk.bytesBefore);
    summary.bytesAfter += toNumber(rtk.bytesAfter);
    summary.savedBytes += toNumber(rtk.savedBytes);
    summary.hitCount += toNumber(rtk.hitCount);
    summary.unsafeFallbackCount += toNumber(rtk.quality?.unsafeFallbackCount);
    if (rtk.applied) summary.compressedRequests += 1;

    if (!summary.lastSeenAt || toTimestamp(detail?.timestamp) > toTimestamp(summary.lastSeenAt)) {
      summary.lastSeenAt = detail?.timestamp || null;
    }

    for (const [reason, count] of Object.entries(rtk.quality?.rejectedCandidates || {})) {
      rejectedReasons[reason] = (rejectedReasons[reason] || 0) + toNumber(count);
    }

    const perFilterHits = Array.isArray(rtk.hits) && rtk.hits.length > 0
      ? rtk.hits.flatMap((hit) => {
          const names = Array.isArray(hit?.filters) && hit.filters.length > 0
            ? hit.filters
            : (hit?.filter ? [hit.filter] : []);
          return names
            .filter(Boolean)
            .map((name) => ({
              name,
              savedBytes: toNumber(hit?.saved),
            }));
        })
          .filter((hit) => hit.name)
      : (Array.isArray(rtk.filters) ? rtk.filters : [])
          .filter(Boolean)
          .map((name) => ({
            name,
            savedBytes: toNumber(rtk.savedBytes),
          }));

    for (const hit of perFilterHits) {
      const existing = filterMap.get(hit.name) || { name: hit.name, count: 0, savedBytes: 0 };
      existing.count += 1;
      existing.savedBytes += hit.savedBytes;
      filterMap.set(hit.name, existing);
    }

    const apiKey = detail?.apiKey || "";
    const keyMeta = keyBySecret.get(apiKey) || null;
    const groupId = keyMeta?.id || apiKey || "unknown";
    const existing = byKeyMap.get(groupId) || {
      keyId: keyMeta?.id || null,
      keyName: keyMeta?.name || maskKey(apiKey),
      maskedKey: maskKey(apiKey),
      totalRequests: 0,
      rtkSeen: 0,
      compressedRequests: 0,
      bytesBefore: 0,
      bytesAfter: 0,
      savedBytes: 0,
      savedPercent: 0,
      hitCount: 0,
      unsafeFallbackCount: 0,
      lastSeenAt: null,
    };

    existing.totalRequests += 1;
    existing.rtkSeen += 1;
    existing.bytesBefore += toNumber(rtk.bytesBefore);
    existing.bytesAfter += toNumber(rtk.bytesAfter);
    existing.savedBytes += toNumber(rtk.savedBytes);
    existing.hitCount += toNumber(rtk.hitCount);
    existing.unsafeFallbackCount += toNumber(rtk.quality?.unsafeFallbackCount);
    if (rtk.applied) existing.compressedRequests += 1;

    if (!existing.lastSeenAt || toTimestamp(detail?.timestamp) >= toTimestamp(existing.lastSeenAt)) {
      existing.lastSeenAt = detail?.timestamp || null;
    }

    byKeyMap.set(groupId, existing);
  }

  summary.savedPercent = roundPercent(summary.savedBytes, summary.bytesBefore);

  const topFilters = [...filterMap.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    if (right.savedBytes !== left.savedBytes) return right.savedBytes - left.savedBytes;
    return left.name.localeCompare(right.name);
  });

  const byKey = [...byKeyMap.values()]
    .map((entry) => ({
      ...entry,
      savedPercent: roundPercent(entry.savedBytes, entry.bytesBefore),
    }))
    .sort((left, right) => {
      if (right.savedBytes !== left.savedBytes) return right.savedBytes - left.savedBytes;
      if (right.compressedRequests !== left.compressedRequests) return right.compressedRequests - left.compressedRequests;
      return toTimestamp(right.lastSeenAt) - toTimestamp(left.lastSeenAt);
    });

  return {
    selectedKeyId,
    window: normalizedWindow,
    availableKeys: buildAvailableKeys(tokenKeys),
    summary,
    topFilters,
    rejectedReasons,
    byKey,
    timeline: buildTimeline(filteredDetails, normalizedWindow, nowMs),
  };
}
