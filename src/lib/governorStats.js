function toTimestamp(value) {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function maskKey(apiKey) {
  const value = String(apiKey || "");
  if (!value) return "Unknown key";
  return value.length <= 8 ? value : `${value.slice(0, 8)}...`;
}

function getCountedDecision(decision) {
  return decision === "preserved" || decision === "downgraded" ? decision : null;
}

export function aggregateGovernorStats({ details = [], tokenKeys = [] } = {}) {
  const keyBySecret = new Map();
  for (const key of tokenKeys) {
    if (key?.key) keyBySecret.set(key.key, key);
  }

  const summary = {
    preserved: 0,
    downgraded: 0,
    governed: 0,
    ignored: 0,
    downgradeRate: 0,
    reasons: {},
    lastSeenAt: null,
  };
  const byKeyMap = new Map();

  for (const detail of details) {
    const governor = detail?.requestGovernor;
    const decision = getCountedDecision(governor?.decision);
    if (!decision) {
      summary.ignored += 1;
      continue;
    }

    summary[decision] += 1;
    summary.governed += 1;
    if (governor?.reason) {
      summary.reasons[governor.reason] = (summary.reasons[governor.reason] || 0) + 1;
    }

    if (!summary.lastSeenAt || toTimestamp(detail?.timestamp) > toTimestamp(summary.lastSeenAt)) {
      summary.lastSeenAt = detail?.timestamp || null;
    }

    const apiKey = detail?.apiKey || "";
    const keyMeta = keyBySecret.get(apiKey) || null;
    const groupId = keyMeta?.id || apiKey || "unknown";
    const existing = byKeyMap.get(groupId) || {
      keyId: keyMeta?.id || null,
      keyName: keyMeta?.name || maskKey(apiKey),
      maskedKey: maskKey(apiKey),
      preserved: 0,
      downgraded: 0,
      governed: 0,
      downgradeRate: 0,
      topReason: null,
      latestRequestedModel: null,
      latestRoutedModel: null,
      lastDecision: null,
      lastSeenAt: null,
      reasons: {},
    };

    existing[decision] += 1;
    existing.governed += 1;
    existing.lastDecision = decision;
    if (governor?.reason) {
      existing.reasons[governor.reason] = (existing.reasons[governor.reason] || 0) + 1;
    }

    if (!existing.lastSeenAt || toTimestamp(detail?.timestamp) >= toTimestamp(existing.lastSeenAt)) {
      existing.lastSeenAt = detail?.timestamp || null;
      existing.latestRequestedModel = governor?.requestedModel || detail?.request?.model || null;
      existing.latestRoutedModel = governor?.routedModel || detail?.model || null;
      existing.lastDecision = decision;
    }

    byKeyMap.set(groupId, existing);
  }

  summary.downgradeRate = summary.governed > 0 ? Math.round((summary.downgraded / summary.governed) * 100) : 0;

  const byKey = [...byKeyMap.values()]
    .map((entry) => ({
      ...entry,
      downgradeRate: entry.governed > 0 ? Math.round((entry.downgraded / entry.governed) * 100) : 0,
      topReason: pickTopReason(entry.reasons),
    }))
    .sort((left, right) => {
      if (right.downgraded !== left.downgraded) return right.downgraded - left.downgraded;
      if (right.preserved !== left.preserved) return right.preserved - left.preserved;
      return toTimestamp(right.lastSeenAt) - toTimestamp(left.lastSeenAt);
    });

  return { summary, byKey };
}

function pickTopReason(reasons = {}) {
  const entries = Object.entries(reasons);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0][0];
}
