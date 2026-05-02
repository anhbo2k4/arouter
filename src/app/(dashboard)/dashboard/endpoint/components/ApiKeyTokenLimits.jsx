"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function fmtLimit(n) {
  return Number(n || 0) > 0 ? fmt(n) : "Unlimited";
}

function remaining(used, limit) {
  return Number(limit || 0) > 0 ? Math.max(0, Number(limit || 0) - Number(used || 0)) : null;
}

function percent(used, limit) {
  return Number(limit || 0) > 0 ? Math.min(100, Math.round((Number(used || 0) / Number(limit || 0)) * 100)) : 0;
}

function formatDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDaysLocal(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setSeconds(0, 0);
  return formatDateTimeLocal(date.toISOString());
}

function formatExpiry(value) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "No expiry";
  const label = date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  return date.getTime() <= Date.now() ? `Expired: ${label}` : `Expires: ${label}`;
}

function statusTone({ key, expired, quotaLocked }) {
  if (expired) return "border-red-500/40 bg-red-500/10 text-red-300";
  if (quotaLocked) return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  if (key.enabled) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  return "border-neutral-600 bg-neutral-800 text-neutral-300";
}

function rowTone({ expired, quotaLocked, over }) {
  if (expired) return "border-l-red-500 hover:bg-red-500/[0.04]";
  if (quotaLocked || over) return "border-l-amber-500 hover:bg-amber-500/[0.04]";
  return "border-l-orange-500/50 hover:bg-orange-500/[0.035]";
}

const AUTO_REFRESH_MS = 60_000;

export default function ApiKeyTokenLimits() {
  const [keys, setKeys] = useState([]);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [testingId, setTestingId] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [rowEdits, setRowEdits] = useState({});
  const [dirtyRows, setDirtyRows] = useState({});
  const [savingId, setSavingId] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);
  const refreshTimerRef = useRef(null);
  const loadingRef = useRef(false);
  const [form, setForm] = useState({
    name: "",
    window: "daily",
    maxTotalTokens: 1000000,
    maxInputTokens: 0,
    maxOutputTokens: 0,
    allowedModels: "",
    expiresAt: "",
  });

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await fetch("/api/dashboard/token-limits/api-keys", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      const nextKeys = data.keys || [];
      setKeys(nextKeys);
      setLastUpdatedAt(data.updatedAt || new Date().toISOString());
      setRowEdits((prev) =>
        Object.fromEntries(
          nextKeys.map((key) => {
            const current = {
              window: key.quota?.window || "daily",
              maxTotalTokens: Number(key.quota?.maxTotalTokens || 0),
              maxInputTokens: Number(key.quota?.maxInputTokens || 0),
              maxOutputTokens: Number(key.quota?.maxOutputTokens || 0),
              allowedModels: Array.isArray(key.allowedModels) ? key.allowedModels.join(", ") : "",
              expiresAt: formatDateTimeLocal(key.expiresAt),
            };
            return [key.id, dirtyRows[key.id] ? prev[key.id] || current : current];
          })
        )
      );
    } finally {
      loadingRef.current = false;
    }
  }, [dirtyRows]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      load();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [dirtyRows, load]);

  useEffect(() => {
    const events = new EventSource("/api/usage/stream");
    events.onopen = () => setLiveConnected(true);
    events.onerror = () => setLiveConnected(false);
    events.onmessage = () => {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        load();
      }, 250);
    };

    return () => {
      clearTimeout(refreshTimerRef.current);
      events.close();
      setLiveConnected(false);
    };
  }, [dirtyRows, load]);

  async function createKey() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/token-limits/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || "API Key",
          allowedModels: form.allowedModels
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          quota: {
            enabled: true,
            window: form.window,
            maxTotalTokens: Number(form.maxTotalTokens || 0),
            maxInputTokens: Number(form.maxInputTokens || 0),
            maxOutputTokens: Number(form.maxOutputTokens || 0),
            action: "reject",
          },
          expiresAt: form.expiresAt || null,
        }),
      });
      const data = await res.json();
      setSecret(data.secret || data.key?.secret || "");
      setForm((prev) => ({ ...prev, name: "", allowedModels: "", expiresAt: "" }));
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function patchKey(id, patch) {
    await fetch(`/api/dashboard/token-limits/api-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  function getRowEdit(key) {
    return rowEdits[key.id] || {
      window: key.quota?.window || "daily",
      maxTotalTokens: Number(key.quota?.maxTotalTokens || 0),
      maxInputTokens: Number(key.quota?.maxInputTokens || 0),
      maxOutputTokens: Number(key.quota?.maxOutputTokens || 0),
      allowedModels: Array.isArray(key.allowedModels) ? key.allowedModels.join(", ") : "",
      expiresAt: formatDateTimeLocal(key.expiresAt),
    };
  }

  function onChangeRow(id, field, value) {
    setDirtyRows((prev) => ({ ...prev, [id]: true }));
    setRowEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  }

  async function saveRow(key) {
    const edit = getRowEdit(key);
    setSavingId(key.id);
    try {
      await patchKey(key.id, {
        quota: {
          ...key.quota,
          window: edit.window || key.quota?.window || "daily",
          maxTotalTokens: Number(edit.maxTotalTokens || 0),
          maxInputTokens: Number(edit.maxInputTokens || 0),
          maxOutputTokens: Number(edit.maxOutputTokens || 0),
          action: "reject",
        },
        allowedModels: String(edit.allowedModels || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        expiresAt: edit.expiresAt || null,
      });
      setDirtyRows((prev) => {
        const next = { ...prev };
        delete next[key.id];
        return next;
      });
    } finally {
      setSavingId("");
    }
  }

  async function deleteKey(id) {
    if (!confirm("Delete this API key?")) return;
    await fetch(`/api/dashboard/token-limits/api-keys/${id}`, { method: "DELETE" });
    await load();
  }

  async function copyKey(id, keyValue) {
    try {
      await navigator.clipboard.writeText(keyValue || "");
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 1200);
    } catch {
      // ignore clipboard errors
    }
  }

  async function quickTest(key) {
    setTestingId(key.id);
    setTestMessage("");
    try {
      const model = key.allowedModels?.[0] || "if/qwen3-coder-plus";
      const res = await fetch("/api/dashboard/token-limits/quick-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId: key.id,
          model,
          prompt: `quick test ${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestMessage(`Test OK: +${fmt(data.estimatedTotalTokens || data.estimatedInputTokens || 0)} tokens`);
      } else {
        setTestMessage(`Test fail (${res.status}): ${data.error || "Unknown error"}`);
      }
      await load();
    } finally {
      setTestingId("");
    }
  }

  const totalUsed = useMemo(() => keys.reduce((s, k) => s + Number(k.usage?.totalTokens || 0), 0), [keys]);
  const activeCount = useMemo(() => keys.filter((key) => key.enabled && !key.expired).length, [keys]);
  const lockedCount = useMemo(
    () => keys.filter((key) => key.disabledReason === "token_quota_exceeded" || key.disabledReason === "api_key_expired").length,
    [keys]
  );
  const lastUpdatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "";
  const inputClass =
    "rounded-xl border border-neutral-800 bg-neutral-950/80 px-3 py-2.5 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20";
  const compactInputClass =
    "h-8 rounded-lg border border-neutral-800 bg-black/35 px-2 text-xs text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15";
  const actionButtonClass =
    "rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-200 transition hover:border-orange-500/60 hover:bg-orange-500/10 disabled:opacity-60";

  return (
    <section className="relative mt-6 overflow-hidden rounded-2xl border border-orange-500/20 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_34%),linear-gradient(180deg,rgba(23,23,23,0.96),rgba(10,10,10,0.98))] p-5 text-neutral-100 shadow-[0_24px_80px_rgba(0,0,0,0.36)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-orange-500/0 via-orange-400/80 to-cyan-400/0" />

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-200">
            <span className={`h-2 w-2 rounded-full ${liveConnected ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" : "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.7)]"}`} />
            {liveConnected ? "Live connected" : "Live reconnecting"}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">API Key Token Limits</h2>
          <p className="max-w-2xl text-sm text-neutral-400">Manage token limits, expiration time, and lock state for every API key.</p>
          <p className="text-xs text-neutral-500">Auto refresh: 1m{lastUpdatedLabel ? ` | Last update: ${lastUpdatedLabel}` : ""}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[430px]">
          <div className="rounded-xl border border-orange-500/20 bg-neutral-950/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Total Used</div>
            <div className="mt-2 text-lg font-bold text-orange-200">{fmt(totalUsed)}</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-neutral-950/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Active</div>
            <div className="mt-2 text-lg font-bold text-emerald-300">{fmt(activeCount)}</div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-neutral-950/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Locked</div>
            <div className="mt-2 text-lg font-bold text-red-300">{fmt(lockedCount)}</div>
          </div>
        </div>
      </div>

      {secret ? (
        <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]">
          <div className="font-medium text-amber-200">New API key - shown once</div>
          <code className="mt-2 block break-all rounded-lg border border-amber-500/20 bg-black/40 p-3 text-sm text-amber-100">{secret}</code>
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-200">Create API key</div>
            <div className="text-xs text-neutral-500">Set model access, token ceiling, reset window, and expiration from the start.</div>
          </div>
          <button onClick={load} className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:border-cyan-500/50 hover:bg-cyan-500/10">
            Refresh
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-8">
          <input className={`${inputClass} md:col-span-2`} placeholder="Key name, e.g. Team A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputClass} type="number" min="0" placeholder="Total tokens" value={form.maxTotalTokens} onChange={(e) => setForm({ ...form, maxTotalTokens: e.target.value })} />
          <input className={inputClass} type="number" min="0" placeholder="Input limit" value={form.maxInputTokens} onChange={(e) => setForm({ ...form, maxInputTokens: e.target.value })} />
          <input className={inputClass} type="number" min="0" placeholder="Output limit" value={form.maxOutputTokens} onChange={(e) => setForm({ ...form, maxOutputTokens: e.target.value })} />
          <select className={inputClass} value={form.window} onChange={(e) => setForm({ ...form, window: e.target.value })}>
            <option value="daily">Daily reset at 00:00 VN</option>
          </select>
          <input className={`${inputClass} md:col-span-2`} placeholder="Allowed models, comma separated" value={form.allowedModels} onChange={(e) => setForm({ ...form, allowedModels: e.target.value })} />
          <input
            className={inputClass}
            type="datetime-local"
            title="API key expiration time"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <button disabled={loading} onClick={createKey} className="rounded-xl border border-orange-400/40 bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_36px_rgba(249,115,22,0.24)] transition hover:bg-orange-500 disabled:opacity-60 md:col-span-2">
            {loading ? "Creating..." : "Create key"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {keys.map((key) => {
          const used = Number(key.usage?.totalTokens || 0);
          const requests = Number(key.usage?.requests || 0);
          const limit = Number(key.quota?.maxTotalTokens || 0);
          const remainingTotal = remaining(used, limit);
          const edit = getRowEdit(key);
          const pct = percent(used, limit);
          const over = limit > 0 && used >= limit;
          const quotaLocked = key.disabledReason === "token_quota_exceeded";
          const expired = key.expired || key.disabledReason === "api_key_expired";
          const progressColor = expired || over ? "from-red-500 to-red-300" : pct >= 80 ? "from-amber-500 to-orange-300" : "from-cyan-400 to-emerald-300";
          const statusLabel = expired ? "Expired" : key.enabled ? "Enabled" : quotaLocked ? "Limit locked" : "Disabled";

          return (
            <article
              key={key.id}
              className={`group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/78 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.26)] transition ${rowTone({ expired, quotaLocked, over })}`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="grid gap-3 xl:grid-cols-[minmax(230px,0.95fr)_minmax(260px,1.2fr)_minmax(300px,1.25fr)_minmax(260px,1fr)]">
                <div className="min-w-0 rounded-xl border border-neutral-800/80 bg-black/24 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone({ key, expired, quotaLocked })}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabel}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-neutral-500">{key.quota?.window || "daily"}</span>
                  </div>
                  <h3 className="truncate text-sm font-bold text-white">{key.name}</h3>
                  <p className="mt-1 text-[11px] text-neutral-500">Created {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "-"}</p>
                  <div className="mt-3 flex min-w-0 items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg border border-neutral-800 bg-neutral-950/90 px-2 py-1.5 font-mono text-[11px] text-neutral-300">{key.key}</code>
                    <button className={actionButtonClass} onClick={() => copyKey(key.id, key.key)}>
                      {copiedId === key.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {key.disabledMessage ? (
                    <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-[11px] leading-5 text-red-200">{key.disabledMessage}</div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-neutral-800/80 bg-black/24 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Total usage</p>
                      <p className="mt-1 text-lg font-black text-neutral-100">{fmt(used)} <span className="text-xs font-medium text-neutral-500">/ {fmtLimit(limit)}</span></p>
                    </div>
                    <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-xs font-black text-cyan-200">{pct}%</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full border border-neutral-800 bg-neutral-900">
                    <div className={`h-full rounded-full bg-gradient-to-r ${progressColor} shadow-[0_0_16px_rgba(34,211,238,0.32)] transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg bg-neutral-900/70 p-2">
                      <div className="text-neutral-500">Remain</div>
                      <div className="mt-1 font-semibold text-neutral-200">{remainingTotal === null ? "Unlimited" : fmt(remainingTotal)}</div>
                    </div>
                    <div className="rounded-lg bg-neutral-900/70 p-2">
                      <div className="text-neutral-500">Requests</div>
                      <div className="mt-1 font-semibold text-neutral-200">{fmt(requests)}</div>
                    </div>
                    <div className="rounded-lg bg-neutral-900/70 p-2">
                      <div className="text-neutral-500">I/O</div>
                      <div className="mt-1 font-semibold text-neutral-200">{fmt(key.usage?.inputTokens || 0)} / {fmt(key.usage?.outputTokens || 0)}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-800/80 bg-black/24 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Limits editor</p>
                    {dirtyRows[key.id] ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">Unsaved</span> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] text-neutral-500">Window</span>
                      <select className={compactInputClass} value={edit.window} onChange={(e) => onChangeRow(key.id, "window", e.target.value)}>
                        <option value="rolling_5h">Rolling 5h</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] text-neutral-500">Total</span>
                      <input className={compactInputClass} type="number" min="0" value={edit.maxTotalTokens} onChange={(e) => onChangeRow(key.id, "maxTotalTokens", e.target.value)} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] text-neutral-500">Input</span>
                      <input className={compactInputClass} type="number" min="0" value={edit.maxInputTokens} onChange={(e) => onChangeRow(key.id, "maxInputTokens", e.target.value)} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] text-neutral-500">Output</span>
                      <input className={compactInputClass} type="number" min="0" value={edit.maxOutputTokens} onChange={(e) => onChangeRow(key.id, "maxOutputTokens", e.target.value)} />
                    </label>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.7fr)]">
                    <label className="grid gap-1">
                      <span className="text-[10px] text-neutral-500">Allowed models</span>
                      <input className={compactInputClass} value={edit.allowedModels} onChange={(e) => onChangeRow(key.id, "allowedModels", e.target.value)} placeholder="All models, or comma-separated model IDs" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] text-neutral-500">Expires</span>
                      <input className={compactInputClass} type="datetime-local" value={edit.expiresAt} onChange={(e) => onChangeRow(key.id, "expiresAt", e.target.value)} />
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                    <span className={expired ? "font-medium text-red-300" : "font-medium text-neutral-400"}>{formatExpiry(key.expiresAt)}</span>
                    <button type="button" className={actionButtonClass} onClick={() => onChangeRow(key.id, "expiresAt", addDaysLocal(7))}>+7d</button>
                    <button type="button" className={actionButtonClass} onClick={() => onChangeRow(key.id, "expiresAt", addDaysLocal(30))}>+30d</button>
                    <button type="button" className={actionButtonClass} onClick={() => onChangeRow(key.id, "expiresAt", "")}>No expiry</button>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800/80 bg-black/24 p-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-neutral-900/70 p-2">
                      <div className="text-neutral-500">Input cap</div>
                      <div className="mt-1 font-semibold text-neutral-200">{fmtLimit(key.quota?.maxInputTokens || 0)}</div>
                    </div>
                    <div className="rounded-lg bg-neutral-900/70 p-2">
                      <div className="text-neutral-500">Output cap</div>
                      <div className="mt-1 font-semibold text-neutral-200">{fmtLimit(key.quota?.maxOutputTokens || 0)}</div>
                    </div>
                    <div className="col-span-2 rounded-lg bg-neutral-900/70 p-2">
                      <div className="text-neutral-500">Models</div>
                      <div className="mt-1 line-clamp-2 font-mono text-[11px] text-neutral-200">{key.allowedModels?.length ? key.allowedModels.join(", ") : "All models"}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className={actionButtonClass} disabled={testingId === key.id} onClick={() => quickTest(key)}>
                      {testingId === key.id ? "Testing..." : "Quick test"}
                    </button>
                    <button className="rounded-lg border border-emerald-500/30 bg-emerald-600/90 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60" disabled={savingId === key.id} onClick={() => saveRow(key)}>
                      {savingId === key.id ? "Saving..." : "Save"}
                    </button>
                    <button className={actionButtonClass} onClick={() => patchKey(key.id, { enabled: !key.enabled })}>{key.enabled ? "Disable" : "Enable"}</button>
                    <button className="rounded-lg border border-red-500/30 bg-red-600/90 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-500" onClick={() => deleteKey(key.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {!keys.length ? (
          <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/70 p-8 text-center text-neutral-400">
            No API key token limits yet.
          </div>
        ) : null}
      </div>
      {testMessage ? <p className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-300">{testMessage}</p> : null}
    </section>
  );
}
