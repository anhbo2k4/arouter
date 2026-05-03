"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { Card, Button, Input, Modal, CardSkeleton, Toggle } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import ApiKeyTokenLimits from "./components/ApiKeyTokenLimits";
import { deriveApiKeyStatus, filterApiKeysBySearch, filterApiKeysByStatus } from "./components/apiKeyAdminState";

const TUNNEL_BENEFITS = [
  { icon: "public", title: "Access Anywhere", desc: "Use your API from any network" },
  { icon: "group", title: "Share Endpoint", desc: "Share URL with team members" },
  { icon: "code", title: "Use in Cursor/Cline", desc: "Connect AI tools remotely" },
  { icon: "lock", title: "Encrypted", desc: "End-to-end TLS via Cloudflare" },
];

const TUNNEL_PING_INTERVAL_MS = 2000;
const TUNNEL_PING_MAX_MS = 300000;

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getBarHeight(value, maxValue) {
  const numeric = Number(value || 0);
  const max = Math.max(1, Number(maxValue || 0));
  const ratio = Math.max(0.12, numeric / max);
  return `${Math.min(100, ratio * 100)}%`;
}

export default function APIPageClient({ machineId }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState(null);
  const [apiKeySearch, setApiKeySearch] = useState("");
  const [apiKeyStatusFilter, setApiKeyStatusFilter] = useState("all");
  const [showApiKeyList, setShowApiKeyList] = useState(true);

  const [requireApiKey, setRequireApiKey] = useState(false);
  const [requireLogin, setRequireLogin] = useState(true);
  const [hasPassword, setHasPassword] = useState(true);
  const [tunnelDashboardAccess, setTunnelDashboardAccess] = useState(false);
  const [rtkEnabled, setRtkEnabledState] = useState(true);
  const [rtkStats, setRtkStats] = useState(null);
  const [rtkStatsLoading, setRtkStatsLoading] = useState(true);
  const [rtkWindow, setRtkWindow] = useState("7d");
  const [rtkKeyId, setRtkKeyId] = useState("all");

  // Cloudflare Tunnel state
  const [tunnelChecking, setTunnelChecking] = useState(true);
  const [tunnelEnabled, setTunnelEnabled] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [tunnelPublicUrl, setTunnelPublicUrl] = useState("");
  const [tunnelApiUrl, setTunnelApiUrl] = useState("");
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [tunnelProgress, setTunnelProgress] = useState("");
  const [tunnelStatus, setTunnelStatus] = useState(null);
  const [showEnableTunnelModal, setShowEnableTunnelModal] = useState(false);
  const [showDisableTunnelModal, setShowDisableTunnelModal] = useState(false);

  // Tailscale state
  const [tsEnabled, setTsEnabled] = useState(false);
  const [tsUrl, setTsUrl] = useState("");
  const [tsLoading, setTsLoading] = useState(false);
  const [tsProgress, setTsProgress] = useState("");
  const [tsStatus, setTsStatus] = useState(null);
  const [tsInstalled, setTsInstalled] = useState(null); // null=checking, true/false
  const [tsInstalling, setTsInstalling] = useState(false);
  const [tsInstallLog, setTsInstallLog] = useState([]);
  const [tsSudoPassword, setTsSudoPassword] = useState("");
  const [tsConnecting, setTsConnecting] = useState(false);
  const [showTsModal, setShowTsModal] = useState(false);
  const [showDisableTsModal, setShowDisableTsModal] = useState(false);
  const tsLogRef = useRef(null);

  // API key visibility toggle state
  const [visibleKeys, setVisibleKeys] = useState(new Set());

  const { copied, copy } = useCopyToClipboard();
  const filteredKeys = useMemo(() => {
    const searched = filterApiKeysBySearch(keys, apiKeySearch);
    return filterApiKeysByStatus(searched, apiKeyStatusFilter);
  }, [keys, apiKeySearch, apiKeyStatusFilter]);
  const rtkTimelineMax = useMemo(
    () => Math.max(1, ...(rtkStats?.timeline || []).map((bucket) => Number(bucket.savedBytes || 0))),
    [rtkStats],
  );

  // Auto-scroll install log
  useEffect(() => {
    if (tsLogRef.current) tsLogRef.current.scrollTop = tsLogRef.current.scrollHeight;
  }, [tsInstallLog]);

  useEffect(() => {
    fetchData();
    loadSettings();
  }, []);

  useEffect(() => {
    loadRtkStats(rtkWindow, rtkKeyId);
  }, [rtkWindow, rtkKeyId]);

  const loadSettings = async () => {
    setTunnelChecking(true);
    try {
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setRequireApiKey(data.requireApiKey || false);
        setRequireLogin(data.requireLogin !== false);
        setHasPassword(data.hasPassword || false);
        setTunnelDashboardAccess(data.tunnelDashboardAccess || false);
        setRtkEnabledState(data.rtkEnabled !== false);
      }
      setTunnelEnabled(false);
      setTunnelUrl("");
      setTunnelPublicUrl("");
      setTunnelApiUrl("");
      setTsEnabled(false);
      setTsUrl("");
    } catch (error) {
      console.log("Error loading settings:", error);
    } finally {
      setTunnelChecking(false);
    }
  };

  const handleTunnelDashboardAccess = async (value) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tunnelDashboardAccess: value }),
      });
      if (res.ok) setTunnelDashboardAccess(value);
    } catch (error) {
      console.log("Error updating tunnelDashboardAccess:", error);
    }
  };

  const handleRequireApiKey = async (value) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireApiKey: value }),
      });
      if (res.ok) setRequireApiKey(value);
    } catch (error) {
      console.log("Error updating requireApiKey:", error);
    }
  };

  const handleRtkEnabled = async (value) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtkEnabled: value }),
      });
      if (res.ok) {
        setRtkEnabledState(value);
        await loadRtkStats(rtkWindow, rtkKeyId);
      }
    } catch (error) {
      console.log("Error updating rtkEnabled:", error);
    }
  };

  const loadRtkStats = async (windowValue = rtkWindow, keyIdValue = rtkKeyId) => {
    setRtkStatsLoading(true);
    try {
      const params = new URLSearchParams({
        window: windowValue || "7d",
        keyId: keyIdValue || "all",
      });
      const res = await fetch(`/api/dashboard/rtk/stats?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRtkStats(data);
      }
    } catch (error) {
      console.log("Error loading RTK stats:", error);
    } finally {
      setRtkStatsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const keysRes = await fetch("/api/keys");
      const keysData = await keysRes.json();
      if (keysRes.ok) {
        setKeys(keysData.keys || []);
      }
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // u2500u2500u2500 Cloudflare Tunnel handlers
  // Ping tunnel health until reachable, also check backend status to detect process die
  const pingTunnelHealth = async (url) => {
    setTunnelLoading(true);
    setTunnelProgress("Waiting for tunnel ready...");
    const healthUrl = `${url}/api/health`;
    const start = Date.now();
    while (Date.now() - start < TUNNEL_PING_MAX_MS) {
      await new Promise((r) => setTimeout(r, TUNNEL_PING_INTERVAL_MS));
      try {
        const ping = await fetch(healthUrl, { mode: "no-cors", cache: "no-store" });
        if (ping.ok || ping.type === "opaque") {
          setTunnelEnabled(true);
          setTunnelLoading(false);
          setTunnelProgress("");
          return true;
        }
      } catch { /* not ready yet */ }
      // Every 5 pings (~10s), check if backend process still alive
      if ((Date.now() - start) % 10000 < TUNNEL_PING_INTERVAL_MS) {
        try {
          const statusRes = await fetch("/api/tunnel/status");
          if (statusRes.ok) {
            const status = await statusRes.json();
            if (!status.tunnel?.enabled) {
              setTunnelStatus({ type: "error", message: "Tunnel process stopped unexpectedly." });
              setTunnelLoading(false);
              setTunnelProgress("");
              return false;
            }
          }
        } catch { /* ignore */ }
      }
    }
    setTunnelStatus({ type: "error", message: "Tunnel created but not reachable. Please try again." });
    setTunnelLoading(false);
    setTunnelProgress("");
    return false;
  };

  const handleEnableTunnel = async () => {
    setShowEnableTunnelModal(false);
    setTunnelLoading(true);
    setTunnelStatus(null);
    setTunnelProgress("Creating tunnel...");

    // Poll download progress while enable request is pending
    let polling = true;
    const pollProgress = async () => {
      while (polling) {
        try {
          const r = await fetch("/api/tunnel/status");
          if (r.ok) {
            const s = await r.json();
            if (s.download?.downloading) {
              setTunnelProgress(`Downloading cloudflared... ${s.download.progress}%`);
            } else if (polling) {
              setTunnelProgress("Creating tunnel...");
            }
          }
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 1000));
      }
    };
    pollProgress();

    try {
      const res = await fetch("/api/tunnel/enable", { method: "POST" });
      polling = false;
      const data = await res.json();
      if (!res.ok) {
        setTunnelStatus({ type: "error", message: data.error || "Failed to enable tunnel" });
        return;
      }

      const url = data.apiUrl || data.tunnelUrl || data.publicUrl;
      if (!url) {
        setTunnelStatus({ type: "error", message: "No tunnel URL returned" });
        return;
      }

      setTunnelUrl(data.tunnelUrl || "");
      setTunnelPublicUrl(data.publicUrl || "");
      setTunnelApiUrl(data.apiUrl || data.tunnelUrl || data.publicUrl || "");
      await pingTunnelHealth(url);
    } catch (error) {
      setTunnelStatus({ type: "error", message: error.message });
    } finally {
      polling = false;
      setTunnelLoading(false);
      setTunnelProgress("");
    }
  };

  const handleDisableTunnel = async () => {
    setTunnelLoading(true);
    setTunnelStatus(null);
    try {
      const res = await fetch("/api/tunnel/disable", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTunnelEnabled(false);
        setTunnelUrl("");
        setTunnelPublicUrl("");
        setTunnelApiUrl("");
        setShowDisableTunnelModal(false);
        setTunnelStatus({ type: "success", message: "Tunnel disabled" });
      } else {
        setTunnelStatus({ type: "error", message: data.error || "Failed to disable tunnel" });
      }
    } catch (error) {
      setTunnelStatus({ type: "error", message: error.message });
    } finally {
      setTunnelLoading(false);
    }
  };

  // u2500u2500u2500 Tailscale handlers
  const checkTailscaleInstalled = async () => {
    setTsInstalled(null);
    try {
      const res = await fetch("/api/tunnel/tailscale-check");
      if (res.ok) {
        const data = await res.json();
        setTsInstalled(data.installed);
        return data;
      }
    } catch { /* ignore */ }
    setTsInstalled(false);
    return { installed: false };
  };

  const handleInstallTailscale = async () => {
    setTsInstalling(true);
    setTsStatus(null);
    setTsInstallLog([]);
    try {
      const res = await fetch("/api/tunnel/tailscale-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sudoPassword: tsSudoPassword }),
      });
      setTsSudoPassword("");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const lines = part.split("\n");
          let event = "progress";
          let data = null;
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            if (line.startsWith("data: ")) {
              try { data = JSON.parse(line.slice(6)); } catch { /* skip */ }
            }
          }
          if (!data) continue;
          if (event === "progress") {
            setTsInstallLog((prev) => [...prev.slice(-50), data.message]);
          } else if (event === "done") {
            setTsInstalled(true);
            setTsInstalling(false);
            return;
          } else if (event === "error") {
            setTsStatus({ type: "error", message: data.error || "Install failed" });
          }
        }
      }
    } catch (e) {
      setTsStatus({ type: "error", message: e.message });
    } finally {
      setTsInstalling(false);
    }
  };

  // Ping Tailscale health until reachable
  const pingTsHealth = async (url) => {
    setTsProgress("Waiting for Tailscale ready...");
    const healthUrl = `${url}/api/health`;
    const start = Date.now();
    while (Date.now() - start < TUNNEL_PING_MAX_MS) {
      await new Promise((r) => setTimeout(r, TUNNEL_PING_INTERVAL_MS));
      try {
        const ping = await fetch(healthUrl, { mode: "no-cors", cache: "no-store" });
        if (ping.ok || ping.type === "opaque") return true;
      } catch { /* not ready yet */ }
    }
    return false;
  };

  const handleConnectTailscale = async (preOpenedTab) => {
    const tab = preOpenedTab || null;
    setShowTsModal(false);
    setTsConnecting(true);
    setTsLoading(true);
    setTsStatus(null);
    setTsProgress("Connecting...");
    try {
      const res = await fetch("/api/tunnel/tailscale-enable", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.success) {
        if (tab) tab.close();
        setTsUrl(data.tunnelUrl || "");
        const reachable = await pingTsHealth(data.tunnelUrl);
        if (reachable) {
          setTsEnabled(true);
          setTsStatus(null);
        } else {
          setTsEnabled(true);
          setTsStatus({ type: "warning", message: "Connected but not reachable yet." });
        }
        return;
      }

      // Needs login: redirect pre-opened tab or open new
      if (data.needsLogin && data.authUrl) {
        if (tab) tab.location.href = data.authUrl;
        else window.open(data.authUrl, "tailscale_auth", "width=600,height=700");
        setTsProgress("Waiting for login...");
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const r2 = await fetch("/api/tunnel/tailscale-check");
            if (r2.ok) {
              const check = await r2.json();
              if (check.loggedIn) {
                setTsProgress("Starting funnel...");
                const res2 = await fetch("/api/tunnel/tailscale-enable", { method: "POST" });
                const data2 = await res2.json();
                if (res2.ok && data2.success) {
                  if (tab) tab.close();
                  setTsUrl(data2.tunnelUrl || "");
                  const ok2 = await pingTsHealth(data2.tunnelUrl);
                  if (ok2) {
                    setTsEnabled(true);
                    setTsStatus(null);
                  } else {
                    setTsEnabled(true);
                    setTsStatus({ type: "warning", message: "Connected but not reachable yet." });
                  }
                } else if (data2.funnelNotEnabled && data2.enableUrl) {
                  await pollFunnelEnable(data2.enableUrl, tab);
                } else {
                  setTsStatus({ type: "error", message: data2.error || "Failed to start funnel" });
                }
                return;
              }
            }
          } catch { /* retry */ }
        }
        setTsStatus({ type: "error", message: "Login timed out. Please try again." });
        return;
      }

      // Funnel not enabled: redirect pre-opened tab
      if (data.funnelNotEnabled && data.enableUrl) {
        await pollFunnelEnable(data.enableUrl, tab);
        return;
      }

      if (tab) tab.close();
      setTsStatus({ type: "error", message: data.error || "Failed to connect" });
    } catch (error) {
      if (tab) tab.close();
      setTsStatus({ type: "error", message: error.message });
    } finally {
      setTsLoading(false);
      setTsConnecting(false);
      setTsProgress("");
    }
  };

  const pollFunnelEnable = async (enableUrl, tab) => {
    if (tab) tab.location.href = enableUrl;
    else window.open(enableUrl, "tailscale_auth", "width=600,height=700");
    setTsProgress("Enable Funnel in browser, waiting...");
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch("/api/tunnel/tailscale-enable", { method: "POST" });
        const data = await res.json();
        if (res.ok && data.success) {
          if (tab) tab.close();
          setTsUrl(data.tunnelUrl || "");
          const ok3 = await pingTsHealth(data.tunnelUrl);
          if (ok3) {
            setTsEnabled(true);
            setTsStatus(null);
          } else {
            setTsEnabled(true);
            setTsStatus({ type: "warning", message: "Connected but not reachable yet." });
          }
          return;
        }
        if (data.funnelNotEnabled) continue;
        if (data.error) {
          setTsStatus({ type: "error", message: data.error });
          return;
        }
      } catch { /* retry */ }
    }
    setTsStatus({ type: "error", message: "Timed out waiting for Funnel to be enabled." });
  };

  const handleDisableTailscale = async () => {
    setTsLoading(true);
    setTsStatus(null);
    try {
      const res = await fetch("/api/tunnel/tailscale-disable", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTsEnabled(false);
        setTsUrl("");
        setShowDisableTsModal(false);
        setTsStatus({ type: "success", message: "Tailscale disabled" });
      } else {
        setTsStatus({ type: "error", message: data.error || "Failed to disable Tailscale" });
      }
    } catch (e) {
      setTsStatus({ type: "error", message: e.message });
    } finally {
      setTsLoading(false);
    }
  };

  const handleOpenTsModal = async () => {
    setTsStatus(null);
    setTsInstallLog([]);
    setShowTsModal(true);
    await checkTailscaleInstalled();
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();

      if (res.ok) {
        setCreatedKey(data.key);
        await fetchData();
        setNewKeyName("");
        setShowAddModal(false);
      }
    } catch (error) {
      console.log("Error creating key:", error);
    }
  };

  const handleDeleteKey = async (id) => {
    if (!confirm("Delete this API key?")) return;

    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== id));
        // Clean up visibility state
        setVisibleKeys(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (error) {
      console.log("Error deleting key:", error);
    }
  };

  const handleToggleKey = async (id, isActive) => {
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        setKeys(prev => prev.map(k => k.id === id ? { ...k, isActive } : k));
      }
    } catch (error) {
      console.log("Error toggling key:", error);
    }
  };

  const maskKey = (fullKey) => {
    if (!fullKey) return "";
    return fullKey.length > 8 ? fullKey.slice(0, 8) + "..." : fullKey;
  };

  const toggleKeyVisibility = (keyId) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  const [baseUrl, setBaseUrl] = useState("/v1");

  // Hydration fix: Only access window on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(`${window.location.origin}/v1`);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const currentEndpoint = baseUrl;

  return (
    <div className="flex flex-col gap-8">
      {/* Endpoint Card */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">API Endpoint</h2>

        {/* Endpoint rows */}
        <div className="flex flex-col gap-2">
          {/* Local */}
          <EndpointRow
            label="Local"
            url={currentEndpoint}
            copyId="local_url"
            copied={copied}
            onCopy={copy}
          />
          <div className="rounded-xl border border-border bg-sidebar/40 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary">lan</span>
              <div className="flex flex-col gap-2">
                <p className="font-medium text-sm">Public access now goes through Nginx</p>
                <p className="text-sm text-text-muted">
                  Point your domain to the VPS IP, terminate TLS in Nginx, and reverse proxy traffic to
                  <span className="font-mono"> 127.0.0.1:1508</span>. Cloudflare Tunnel and Tailscale quick-access helpers are disabled in this setup.
                </p>
                <div className="flex items-center gap-2">
                  <Input value={`${currentEndpoint}/v1`} readOnly className="flex-1 font-mono text-sm" />
                  <button
                    onClick={() => copy(`${currentEndpoint}/v1`, "nginx_v1")}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary transition-colors shrink-0"
                    title="Copy public /v1 endpoint"
                  >
                    <span className="material-symbols-outlined text-[18px]">{copied === "nginx_v1" ? "check" : "content_copy"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Token Saver (RTK) */}
      <Card id="rtk">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Token Saver</h2>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="pr-4">
            <p className="font-medium">Compress tool output</p>
            <p className="text-sm text-text-muted">
              Auto-compress tool output (git diff/grep/ls/tree/logs) before sending to LLM to save tokens. Disable if you see issues.
            </p>
          </div>
          <Toggle
            checked={rtkEnabled}
            onChange={() => handleRtkEnabled(!rtkEnabled)}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.18em] text-text-muted">Window</span>
              <select
                value={rtkWindow}
                onChange={(e) => setRtkWindow(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7d</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-[0.18em] text-text-muted">API Key</span>
              <select
                value={rtkKeyId}
                onChange={(e) => setRtkKeyId(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary md:min-w-56"
              >
                {(rtkStats?.availableKeys || [{ id: "all", name: "All keys" }]).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-text-muted">
            {rtkStatsLoading ? "Refreshing RTK telemetry..." : `Scope: ${rtkWindow === "24h" ? "hourly view" : "daily view"}${rtkKeyId !== "all" ? " · filtered by key" : ""}`}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-black/[0.02] p-4 dark:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Saved</p>
            <p className="mt-2 text-2xl font-semibold text-text-main">
              {rtkStatsLoading ? "..." : formatBytes(rtkStats?.summary?.savedBytes)}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {rtkStatsLoading ? "Loading telemetry..." : `${formatPercent(rtkStats?.summary?.savedPercent)} overall compression`}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-black/[0.02] p-4 dark:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Compressed</p>
            <p className="mt-2 text-2xl font-semibold text-text-main">
              {rtkStatsLoading ? "..." : `${Number(rtkStats?.summary?.compressedRequests || 0)}`}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {rtkStatsLoading ? "Loading telemetry..." : `${Number(rtkStats?.summary?.rtkSeen || 0)} requests observed`}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-black/[0.02] p-4 dark:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Quality Guards</p>
            <p className="mt-2 text-2xl font-semibold text-text-main">
              {rtkStatsLoading ? "..." : `${Number(rtkStats?.summary?.unsafeFallbackCount || 0)}`}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Risky compressions blocked before they reached the model
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-black/[0.02] p-4 dark:bg-white/[0.02]">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Filter Hits</p>
            <p className="mt-2 text-2xl font-semibold text-text-main">
              {rtkStatsLoading ? "..." : `${Number(rtkStats?.summary?.hitCount || 0)}`}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Multi-pass filter applications that produced smaller safe payloads
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-black/[0.02] p-4 dark:bg-white/[0.02]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-medium text-text-main">Lossless-first quality guardrails</p>
              <p className="mt-1 max-w-2xl text-sm text-text-muted">
                RTK only removes repetition, boilerplate, and noisy machine output. Commands, stack frames, errors, file paths, and Expected/Received anchors stay intact. If a candidate compression looks unsafe, Arouter keeps the safer version.
              </p>
            </div>
            <div className="text-xs text-text-muted">
              {rtkStats?.summary?.lastSeenAt ? `Last seen ${new Date(rtkStats.summary.lastSeenAt).toLocaleString()}` : "No RTK request details yet"}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-text-main">Savings timeline</p>
                <p className="mt-1 text-sm text-text-muted">
                  Bars show saved bytes per bucket. Footer labels show how many requests were actually compressed in that same bucket.
                </p>
              </div>
              <div className="text-right text-xs text-text-muted">
                <div>Peak bucket: {rtkStatsLoading ? "..." : formatBytes(rtkTimelineMax)}</div>
                <div>{rtkWindow === "24h" ? "24 hourly buckets" : "7 daily buckets"}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex h-44 items-end gap-2">
                {(rtkStats?.timeline || []).map((bucket) => (
                  <div key={bucket.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-36 w-full items-end">
                      <div
                        className="w-full rounded-t-xl bg-gradient-to-t from-primary/85 via-primary/60 to-primary/25 transition-all"
                        style={{ height: getBarHeight(bucket.savedBytes, rtkTimelineMax) }}
                        title={`${bucket.label}: ${formatBytes(bucket.savedBytes)} saved · ${bucket.compressedRequests} compressed`}
                      />
                    </div>
                    <div className="text-[10px] text-text-muted">{bucket.label}</div>
                    <div className="text-[10px] text-text-muted">x{bucket.compressedRequests}</div>
                  </div>
                ))}
              </div>
              {!rtkStatsLoading && (!rtkStats?.timeline || rtkStats.timeline.length === 0) ? (
                <div className="mt-4 rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-text-muted">
                  No timeline data yet for this selection.
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(rtkStats?.topFilters || []).slice(0, 6).map((filter) => (
              <span
                key={filter.name}
                className="rounded-full border border-border px-3 py-1 text-xs text-text-muted"
              >
                {filter.name} · {filter.count} · {formatBytes(filter.savedBytes)}
              </span>
            ))}
            {!rtkStatsLoading && (!rtkStats?.topFilters || rtkStats.topFilters.length === 0) ? (
              <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-text-muted">
                No filter activity yet
              </span>
            ) : null}
          </div>
          {!rtkStatsLoading && rtkStats?.rejectedReasons && Object.keys(rtkStats.rejectedReasons).length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Rejected candidates</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(rtkStats.rejectedReasons).map(([reason, count]) => (
                  <span
                    key={reason}
                    className="rounded-full border border-border px-3 py-1 text-xs text-text-muted"
                  >
                    {reason} · {count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* API Keys */}
      <Card id="require-api-key">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">API Keys</h2>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
              {filteredKeys.length}/{keys.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon={showApiKeyList ? "expand_less" : "expand_more"}
              onClick={() => setShowApiKeyList((prev) => !prev)}
            >
              {showApiKeyList ? "Hide List" : "Show List"}
            </Button>
            <Button icon="add" onClick={() => setShowAddModal(true)}>
              Create Key
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          <div>
            <p className="font-medium">Require API key</p>
            <p className="text-sm text-text-muted">
              Requests without a valid key will be rejected
            </p>
          </div>
          <Toggle
            checked={requireApiKey}
            onChange={() => handleRequireApiKey(!requireApiKey)}
          />
        </div>

        {keys.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">vpn_key</span>
            </div>
            <p className="text-text-main font-medium mb-1">No API keys yet</p>
            <p className="text-sm text-text-muted mb-4">Create your first API key to get started</p>
            <Button icon="add" onClick={() => setShowAddModal(true)}>
              Create Key
            </Button>
          </div>
        ) : !showApiKeyList ? (
          <div className="rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 text-sm text-text-muted">
            API key list is collapsed. Use <span className="font-medium text-text-main">Show List</span> when you need to inspect keys.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full flex-col gap-3 md:max-w-2xl md:flex-row">
                <input
                  value={apiKeySearch}
                  onChange={(e) => setApiKeySearch(e.target.value)}
                  placeholder="Search by key name, key value, model, or status..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                />
                <select
                  value={apiKeyStatusFilter}
                  onChange={(e) => setApiKeyStatusFilter(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary md:w-44"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="locked">Locked</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="text-xs text-text-muted">
                Filter matches name, secret, model access, and status. Locked keys are quota-disabled keys.
              </div>
            </div>

            {filteredKeys.map((key) => (
              <div
                key={key.id}
                className={`group flex items-center justify-between py-3 border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0 ${key.isActive === false ? "opacity-60" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{key.name}</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                      {deriveApiKeyStatus({
                        isActive: key.isActive,
                        enabled: key.enabled,
                        expired: key.expired,
                        disabledReason: key.disabledReason,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-text-muted font-mono">
                      {visibleKeys.has(key.id) ? key.key : maskKey(key.key)}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(key.id)}
                      className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                      title={visibleKeys.has(key.id) ? "Hide key" : "Show key"}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {visibleKeys.has(key.id) ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                    <button
                      onClick={() => copy(key.key, key.id)}
                      className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copied === key.id ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                  {key.isActive === false && (
                    <p className="text-xs text-orange-500 mt-1">Paused</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Toggle
                    size="sm"
                    checked={key.isActive ?? true}
                    onChange={(checked) => {
                      if (key.isActive && !checked) {
                        if (confirm(`Pause API key "${key.name}"?\n\nThis key will stop working immediately but can be resumed later.`)) {
                          handleToggleKey(key.id, checked);
                        }
                      } else {
                        handleToggleKey(key.id, checked);
                      }
                    }}
                    title={key.isActive ? "Pause key" : "Resume key"}
                  />
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="p-2 hover:bg-red-500/10 rounded text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
            {!filteredKeys.length ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                No API keys matched <span className="font-medium text-text-main">{apiKeySearch || "this filter"}</span>.
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <ApiKeyTokenLimits />

      {/* Add Key Modal */}
      <Modal
        isOpen={showAddModal}
        title="Create API Key"
        onClose={() => {
          setShowAddModal(false);
          setNewKeyName("");
        }}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Key Name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Production Key"
          />
          <div className="flex gap-2">
            <Button onClick={handleCreateKey} fullWidth disabled={!newKeyName.trim()}>
              Create
            </Button>
            <Button
              onClick={() => {
                setShowAddModal(false);
                setNewKeyName("");
              }}
              variant="ghost"
              fullWidth
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Created Key Modal */}
      <Modal
        isOpen={!!createdKey}
        title="API Key Created"
        onClose={() => setCreatedKey(null)}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2 font-medium">
              Save this key now!
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              This is the only time you will see this key. Store it securely.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={createdKey || ""}
              readOnly
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="secondary"
              icon={copied === "created_key" ? "check" : "content_copy"}
              onClick={() => copy(createdKey, "created_key")}
            >
              {copied === "created_key" ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Button onClick={() => setCreatedKey(null)} fullWidth>
            Done
          </Button>
        </div>
      </Modal>

      {/* Enable Tunnel Modal */}
      <Modal
        isOpen={showEnableTunnelModal}
        title="Enable Tunnel"
        onClose={() => setShowEnableTunnelModal(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">cloud_upload</span>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                  Cloudflare Tunnel
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Expose your local Arouter to the internet. No port forwarding, no static IP needed. Share endpoint URL with your team or use it in Cursor, Cline, and other AI tools from anywhere.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TUNNEL_BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex flex-col items-center text-center p-3 rounded-lg bg-sidebar/50">
                <span className="material-symbols-outlined text-xl text-primary mb-1">{benefit.icon}</span>
                <p className="text-xs font-semibold">{benefit.title}</p>
                <p className="text-xs text-text-muted">{benefit.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-muted">
            Requires outbound port 7844 (TCP/UDP). Connection may take 10-30s.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleEnableTunnel}
              fullWidth
              className="bg-linear-to-r from-primary to-blue-500 hover:from-primary-hover hover:to-blue-600 text-white!"
            >
              Start Tunnel
            </Button>
            <Button onClick={() => setShowEnableTunnelModal(false)} variant="ghost" fullWidth>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Disable Cloudflare Tunnel Modal */}
      <Modal
        isOpen={showDisableTunnelModal}
        title="Disable Tunnel"
        onClose={() => !tunnelLoading && setShowDisableTunnelModal(false)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">The Cloudflare tunnel will be disconnected. Remote access via tunnel URL will stop working.</p>
          <div className="flex gap-2">
            <Button onClick={handleDisableTunnel} fullWidth disabled={tunnelLoading} className="bg-red-500! hover:bg-red-600! text-white!">
              {tunnelLoading ? "Disabling..." : "Disable"}
            </Button>
            <Button onClick={() => setShowDisableTunnelModal(false)} variant="ghost" fullWidth disabled={tunnelLoading}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Tailscale Modal */}
      <Modal
        isOpen={showTsModal}
        title="Tailscale Funnel"
        onClose={() => { if (!tsInstalling) { setShowTsModal(false); setTsSudoPassword(""); setTsStatus(null); } }}
      >
        <div className="flex flex-col gap-4">
          {/* Checking state */}
          {tsInstalled === null && (
            <p className="text-sm text-text-muted flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              Checking...
            </p>
          )}

          {/* Not installed */}
          {tsInstalled === false && !tsInstalling && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-muted">Tailscale is not installed. Install it to enable Funnel.</p>
              <div className="flex gap-2">
                <Button
                  onClick={handleInstallTailscale}
                  fullWidth
                  className="bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white!"
                >
                  Install Tailscale
                </Button>
                <Button onClick={() => setShowTsModal(false)} variant="ghost" fullWidth>Cancel</Button>
              </div>
            </div>
          )}

          {/* Installing with progress log */}
          {tsInstalling && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Installing Tailscale...
              </div>
              {tsInstallLog.length > 0 && (
                <div ref={tsLogRef} className="bg-black/5 dark:bg-white/5 rounded p-2 max-h-40 overflow-y-auto font-mono text-xs text-text-muted">
                  {tsInstallLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Installed: show Connect button */}
          {tsInstalled === true && !tsInstalling && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Tailscale installed
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const tab = window.open("", "tailscale_auth", "width=600,height=700");
                    if (tab) tab.document.write("<p style='font-family:sans-serif;text-align:center;margin-top:40px'>Connecting to Tailscale...</p>");
                    handleConnectTailscale(tab);
                  }}
                  fullWidth
                  className="bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white!"
                >
                  Connect
                </Button>
                <Button onClick={() => setShowTsModal(false)} variant="ghost" fullWidth>Cancel</Button>
              </div>
            </div>
          )}

          {tsStatus && <StatusAlert status={tsStatus} />}
        </div>
      </Modal>

      {/* Disable Tailscale Modal */}
      <Modal
        isOpen={showDisableTsModal}
        title="Disable Tailscale"
        onClose={() => !tsLoading && setShowDisableTsModal(false)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">Tailscale Funnel will be stopped. Remote access via Tailscale URL will stop working.</p>
          <div className="flex gap-2">
            <Button onClick={handleDisableTailscale} fullWidth disabled={tsLoading} className="bg-red-500! hover:bg-red-600! text-white!">
              {tsLoading ? "Disabling..." : "Disable"}
            </Button>
            <Button onClick={() => setShowDisableTsModal(false)} variant="ghost" fullWidth disabled={tsLoading}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Reusable endpoint row component */
function EndpointRow({ label, url, copyId, copied, onCopy, badge, actions }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-mono px-1.5 py-0.5 rounded shrink-0 min-w-[68px] text-center ${badge === "CF" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
          badge === "TS" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
            "bg-sidebar text-text-muted"
        }`}>{label}</span>
      <Input value={url} readOnly className="flex-1 font-mono text-sm" />
      <button
        onClick={() => onCopy(url, copyId)}
        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary transition-colors shrink-0"
      >
        <span className="material-symbols-outlined text-[18px]">{copied === copyId ? "check" : "content_copy"}</span>
      </button>
      {actions}
    </div>
  );
}

/** Reusable status alert */
function StatusAlert({ status, className = "" }) {
  // Render URLs in message as clickable links
  const renderMessage = (msg) => {
    const parts = msg.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
      /^https?:\/\//.test(part)
        ? <a key={i} href={part} target="_blank" rel="noreferrer" className="underline font-medium">{part}</a>
        : part
    );
  };

  return (
    <div className={`p-2 rounded text-sm ${className} ${status.type === "success" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
        status.type === "warning" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
        status.type === "info" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
          "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}>
      {renderMessage(status.message)}
    </div>
  );
}

/** Inline tooltip, Claude Code CLI style */
function Tooltip({ text }) {
  return (
    <span className="relative group inline-flex items-center">
      <span className="material-symbols-outlined text-[14px] text-text-muted cursor-help">help</span>
      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 z-50 w-64 rounded bg-gray-900 dark:bg-gray-800 text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
        {text}
      </span>
    </span>
  );
}

/** Security warning banner with optional action link */
function SecurityWarning({ message, action }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
      <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">warning</span>
      <p className="text-xs flex-1">{message}</p>
      {action && (
        <a
          href={action.href}
          className="text-xs font-medium underline shrink-0 hover:opacity-80"
          onClick={action.href.startsWith("#") ? (e) => {
            e.preventDefault();
            document.getElementById(action.href.slice(1))?.scrollIntoView({ behavior: "smooth" });
          } : undefined}
        >
          {action.label}
        </a>
      )}
    </div>
  );
}

APIPageClient.propTypes = {
  machineId: PropTypes.string.isRequired,
};
