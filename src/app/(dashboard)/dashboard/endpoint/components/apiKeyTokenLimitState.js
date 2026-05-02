export function formatDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildRowEditSnapshot(key) {
  return {
    window: key.quota?.window || "daily",
    maxTotalTokens: Number(key.quota?.maxTotalTokens || 0),
    maxInputTokens: Number(key.quota?.maxInputTokens || 0),
    maxOutputTokens: Number(key.quota?.maxOutputTokens || 0),
    allowedModels: Array.isArray(key.allowedModels) ? key.allowedModels.join(", ") : "",
    expiresAt: formatDateTimeLocal(key.expiresAt),
  };
}

export function mergeRowEditsWithDirtyRows(nextKeys, previousEdits, dirtyRows) {
  return Object.fromEntries(
    nextKeys.map((key) => {
      const current = buildRowEditSnapshot(key);
      return [key.id, dirtyRows[key.id] ? previousEdits[key.id] || current : current];
    })
  );
}
