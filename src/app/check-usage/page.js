"use client";

import { useEffect, useMemo, useState } from "react";

function fmtNumber(value) {
  if (value === null || value === undefined) return "Unlimited";
  return Number(value || 0).toLocaleString("vi-VN");
}

function fmtCompact(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return fmtNumber(n);
}

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(value) {
  if (!value) return "No expiry";
  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(used, limit) {
  const max = Number(limit || 0);
  if (max <= 0) return 0;
  return Math.min(100, Math.round((Number(used || 0) / max) * 100));
}

function remaining(used, limit) {
  const max = Number(limit || 0);
  if (max <= 0) return null;
  return Math.max(0, max - Number(used || 0));
}

function maskKey(value) {
  const key = String(value || "");
  if (key.length <= 12) return key || "sk-...";
  return `${key.slice(0, 6)}...${key.slice(-5)}`;
}

function splitMs(ms) {
  const seconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    mins: Math.floor((seconds % 3600) / 60),
    secs: seconds % 60,
  };
}

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

function Gauge({ percent, label, value, limit, tone = "amber" }) {
  return (
    <div className="retro-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="retro-kicker">{label}</p>
          <p className="mt-3 font-mono text-2xl font-black text-[var(--retro-screen)]">{value}</p>
        </div>
        <div className={`retro-badge retro-badge-${tone}`}>{percent}%</div>
      </div>
      <div className="retro-meter mt-4" aria-label={`${label} usage ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--retro-muted)]">
        <span>Limit</span>
        <span>{limit}</span>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, sub }) {
  return (
    <div className="retro-card relative min-h-[132px] overflow-hidden p-4">
      <div className="absolute right-3 top-3 text-[var(--retro-dim)]">{icon}</div>
      <p className="retro-kicker pr-8">{label}</p>
      <p className="mt-5 font-mono text-3xl font-black text-[var(--retro-screen)]">{value}</p>
      {sub ? <p className="mt-2 text-xs text-[var(--retro-muted)]">{sub}</p> : null}
    </div>
  );
}

function TrendChart({ data }) {
  const points = data?.length ? data : [];
  const width = 760;
  const height = 210;
  const pad = { left: 56, right: 22, top: 18, bottom: 34 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((item) => Number(item.totalTokens || 0)));
  const coords = points.map((item, index) => {
    const x = pad.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * chartW);
    const y = pad.top + chartH - (Number(item.totalTokens || 0) / max) * chartH;
    return { ...item, x, y };
  });
  const linePath = coords.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const areaPath = coords.length ? `${linePath} L${coords[coords.length - 1].x},${pad.top + chartH} L${coords[0].x},${pad.top + chartH} Z` : "";
  const yTicks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="retro-panel p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="retro-kicker">Signal Monitor</p>
          <h2 className="mt-1 text-lg font-black text-[var(--retro-paper)]">7-day token trend</h2>
        </div>
        <div className="retro-badge retro-badge-cyan">live chart</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full overflow-visible">
        <defs>
          <linearGradient id="retro-token-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--retro-amber)" stopOpacity="0.36" />
            <stop offset="100%" stopColor="var(--retro-amber)" stopOpacity="0.02" />
          </linearGradient>
          <filter id="retro-glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {yTicks.map((tick) => {
          const y = pad.top + chartH * (1 - tick);
          return (
            <g key={tick}>
              <text x="0" y={y + 4} className="fill-[var(--retro-muted)] font-mono text-[11px]">{fmtCompact(max * tick)}</text>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--retro-grid)" strokeDasharray="5 7" />
            </g>
          );
        })}
        {coords.map((point) => (
          <g key={point.date}>
            <line x1={point.x} x2={point.x} y1={pad.top} y2={pad.top + chartH} stroke="var(--retro-grid)" strokeDasharray="3 10" />
            <text x={point.x} y={height - 8} textAnchor="middle" className="fill-[var(--retro-muted)] font-mono text-[11px]">{point.label}</text>
          </g>
        ))}
        <path d={`M${pad.left},${pad.top + chartH} L${width - pad.right},${pad.top + chartH}`} stroke="var(--retro-cyan)" strokeWidth="2" />
        {areaPath ? <path d={areaPath} fill="url(#retro-token-area)" /> : null}
        {linePath ? <path d={linePath} fill="none" stroke="var(--retro-amber)" strokeWidth="3" filter="url(#retro-glow)" className="retro-chart-line" /> : null}
        {coords.map((point) => (
          <circle key={`${point.date}-dot`} cx={point.x} cy={point.y} r="4" fill="var(--retro-screen)" stroke="var(--retro-amber)" strokeWidth="2" className="retro-chart-dot" />
        ))}
      </svg>
    </div>
  );
}

function CountdownBlock({ resetMs }) {
  const time = splitMs(resetMs);
  const cells = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Mins", value: time.mins },
    { label: "Secs", value: time.secs, accent: true },
  ];

  return (
    <div className="retro-panel p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="retro-kicker">Daily Reset Core</p>
          <h2 className="mt-1 text-lg font-black text-[var(--retro-paper)]">00:00 VN countdown</h2>
        </div>
        <Icon className="h-6 w-6 text-[var(--retro-amber)]">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2M9 2h6" />
        </Icon>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cells.map((cell) => (
          <div key={cell.label} className={`retro-counter ${cell.accent ? "retro-counter-hot" : ""}`}>
            <div className="font-mono text-xl font-black sm:text-2xl">{String(cell.value).padStart(2, "0")}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em]">{cell.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-[var(--retro-muted)]">At Vietnam midnight, the current daily token window starts from zero.</p>
    </div>
  );
}

function ResetPulseCard({ resetMs }) {
  const time = splitMs(resetMs);
  const totalHours = time.days * 24 + time.hours;

  return (
    <div className="retro-panel neural-card hidden min-w-[290px] p-4 lg:block">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="retro-kicker">Quota Epoch</p>
          <p className="mt-2 font-mono text-3xl font-black text-[var(--retro-screen)]">00:00</p>
          <p className="mt-1 text-xs text-[var(--retro-muted)]">Daily reset · Asia/Ho Chi Minh</p>
        </div>
        <div className="quantum-ring" aria-hidden="true">
          <span />
          <b>{String(totalHours).padStart(2, "0")}h</b>
        </div>
      </div>
      <div className="neural-bars mt-4" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} style={{ "--bar": `${18 + ((index * 13) % 58)}%`, "--delay": `${index * 55}ms` }} />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="retro-panel relative overflow-hidden p-8 text-center sm:p-10">
      <div className="retro-radar mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full">
        <Icon className="h-9 w-9 text-[var(--retro-screen)]">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </Icon>
      </div>
      <p className="retro-kicker">Awaiting key signal</p>
      <h2 className="mt-3 text-2xl font-black text-[var(--retro-paper)]">Check requests, token burn, limits, trend, and reset time.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--retro-muted)]">
        Paste an API key above. The checker only returns quota status and usage telemetry for that key.
      </p>
    </section>
  );
}

function LoadingState() {
  const scanLines = [
    { time: "00:00.12", tag: "AUTH", text: "Verifying encrypted key signature" },
    { time: "00:00.31", tag: "EPOCH", text: "Locking Vietnam daily reset boundary" },
    { time: "00:00.48", tag: "TOKENS", text: "Mapping input and output token flow" },
    { time: "00:00.72", tag: "LIMITS", text: "Checking remaining quota headroom" },
    { time: "00:00.94", tag: "HUD", text: "Rendering neural telemetry surface" },
  ];

  return (
    <section className="retro-panel overflow-hidden p-0" aria-live="polite">
      <div className="border-b border-[var(--retro-border)] bg-black/24 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="retro-kicker">Scanning quota memory</p>
            <p className="mt-1 font-mono text-xs text-[var(--retro-screen)]">quota_probe.scan --mode=read-only</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--retro-screen)] shadow-[0_0_14px_rgba(119,255,207,0.7)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--retro-muted)]">active</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="rounded-md border border-[rgba(119,255,207,0.16)] bg-black/35 p-3 font-mono text-xs shadow-[inset_0_0_28px_rgba(77,232,255,0.04)] sm:text-sm">
          {scanLines.map((item, index) => (
            <div
              key={item.tag}
              className="scan-log-line grid grid-cols-[70px_72px_1fr] gap-2 py-1.5 text-[var(--retro-muted)]"
              style={{ animationDelay: `${index * 170}ms` }}
            >
              <span className="text-[var(--retro-dim)]">{item.time}</span>
              <span className="text-[var(--retro-cyan)]">[{item.tag}]</span>
              <span className="min-w-0 text-[var(--retro-paper)]">
                {item.text}
                <span className="scan-log-cursor ml-1 text-[var(--retro-screen)]">_</span>
              </span>
            </div>
          ))}
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[rgba(231,247,255,0.08)]">
            <div className="scan-progress h-full rounded-full bg-gradient-to-r from-[var(--retro-cyan)] via-[var(--retro-screen)] to-[var(--retro-amber)]" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CheckUsagePage() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(null);

  useEffect(() => {
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);

  const status = result?.status;
  const key = result?.key;
  const usage = result?.usage || {};
  const quota = key?.quota || {};
  const dailyTrend = result?.dailyTrend || [];
  const resetMs = status?.resetAt && now ? Math.max(0, new Date(status.resetAt).getTime() - now) : status?.resetInMs || 0;
  const totalPercent = pct(usage.totalTokens, quota.maxTotalTokens);
  const inputPercent = pct(usage.inputTokens, quota.maxInputTokens);
  const outputPercent = pct(usage.outputTokens, quota.maxOutputTokens);
  const remainingTotal = status?.remainingTotalTokens ?? remaining(usage.totalTokens, quota.maxTotalTokens);

  const statusLabel = status?.expired ? "Expired" : status?.active ? (status.exceeded ? "Limit reached" : "Active") : "Locked";
  const statusTone = useMemo(() => {
    if (!status) return "amber";
    if (!status.active) return "red";
    if (status.exceeded) return "amber";
    return "green";
  }, [status]);

  async function checkUsage(event) {
    event?.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/public/key-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to check this API key.");
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err?.message || "Unable to check this API key.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="retro-shell min-h-screen px-4 py-6 text-[var(--retro-paper)] sm:px-6 lg:px-8">
      <style jsx global>{`
        :root {
          --retro-ink: #02040a;
          --retro-panel: rgba(5, 12, 25, 0.82);
          --retro-panel-2: rgba(8, 19, 37, 0.92);
          --retro-border: rgba(90, 226, 255, 0.32);
          --retro-grid: rgba(125, 247, 255, 0.16);
          --retro-paper: #ecfbff;
          --retro-muted: #87a7ba;
          --retro-dim: rgba(236, 251, 255, 0.24);
          --retro-screen: #80ffd8;
          --retro-amber: #ffd36e;
          --retro-cyan: #56e7ff;
          --retro-red: #ff6d87;
          --retro-green: #7dffae;
          --neural-violet: #9d8cff;
        }

        .retro-shell {
          background:
            linear-gradient(rgba(86, 231, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(128, 255, 216, 0.04) 1px, transparent 1px),
            linear-gradient(115deg, transparent 0 18%, rgba(157, 140, 255, 0.08) 18.2%, transparent 19% 62%, rgba(86, 231, 255, 0.08) 62.2%, transparent 63%),
            radial-gradient(ellipse at 50% -20%, rgba(86, 231, 255, 0.18), transparent 42%),
            linear-gradient(180deg, #02040a 0%, #06111f 48%, #02040a 100%);
          background-size: 28px 28px, 28px 28px, 100% 100%, 100% 100%, auto;
          position: relative;
          overflow-x: hidden;
        }

        .retro-shell > * {
          position: relative;
          z-index: 2;
        }

        .retro-shell::before {
          content: "";
          pointer-events: none;
          position: fixed;
          inset: 0;
          z-index: 20;
          background: repeating-linear-gradient(
            0deg,
            rgba(231, 247, 255, 0.045) 0,
            rgba(231, 247, 255, 0.045) 1px,
            transparent 1px,
            transparent 5px
          );
          opacity: 0.42;
        }

        .retro-shell::after {
          animation: retro-scan 6.4s linear infinite;
          background: linear-gradient(180deg, transparent, rgba(77, 232, 255, 0.12), rgba(119, 255, 207, 0.04), transparent);
          content: "";
          height: 18vh;
          left: 0;
          pointer-events: none;
          position: fixed;
          right: 0;
          top: -20vh;
          z-index: 21;
        }

        .retro-panel,
        .retro-card {
          background:
            linear-gradient(135deg, rgba(86, 231, 255, 0.1), transparent 34%),
            linear-gradient(215deg, rgba(157, 140, 255, 0.09), transparent 38%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent),
            var(--retro-panel);
          border: 1px solid var(--retro-border);
          box-shadow:
            inset 0 0 0 1px rgba(128, 255, 216, 0.08),
            0 22px 70px rgba(0, 0, 0, 0.42),
            0 0 34px rgba(86, 231, 255, 0.06);
          overflow: hidden;
          position: relative;
          backdrop-filter: blur(18px);
        }

        .retro-panel::before,
        .retro-card::before {
          animation: retro-edge-flow 5.5s linear infinite;
          background: linear-gradient(90deg, transparent, rgba(77, 232, 255, 0.5), rgba(119, 255, 207, 0.32), transparent);
          content: "";
          height: 1px;
          left: -45%;
          opacity: 0.55;
          position: absolute;
          right: auto;
          top: 0;
          width: 45%;
        }

        .retro-panel {
          border-radius: 8px;
        }

        .retro-card {
          border-radius: 6px;
          transition: border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease;
        }

        .retro-card:hover {
          border-color: rgba(119, 255, 207, 0.42);
          box-shadow:
            inset 0 0 0 1px rgba(119, 255, 207, 0.08),
            0 24px 70px rgba(0, 0, 0, 0.44),
            0 0 38px rgba(77, 232, 255, 0.09);
          transform: translateY(-2px);
        }

        .retro-kicker {
          color: var(--retro-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          line-height: 1.3;
          text-transform: uppercase;
        }

        .cyber-title {
          text-shadow:
            0 0 18px rgba(86, 231, 255, 0.24),
            0 0 46px rgba(157, 140, 255, 0.16);
        }

        .cyber-terminal-line {
          animation: cyber-cursor 1.2s steps(2, end) infinite;
          border-right: 2px solid var(--retro-screen);
          color: var(--retro-screen);
          display: inline-block;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          padding-right: 6px;
        }

        .retro-badge {
          border: 1px solid color-mix(in srgb, currentColor 72%, transparent);
          border-radius: 999px;
          box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.035);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          padding: 6px 9px;
          text-transform: uppercase;
        }

        .retro-badge-green {
          background: rgba(109, 240, 140, 0.12);
          color: var(--retro-green);
        }

        .retro-badge-amber {
          background: rgba(255, 191, 71, 0.12);
          color: var(--retro-amber);
        }

        .retro-badge-red {
          background: rgba(255, 107, 95, 0.12);
          color: var(--retro-red);
        }

        .retro-badge-cyan {
          background: rgba(94, 224, 216, 0.12);
          color: var(--retro-cyan);
        }

        .neural-card {
          isolation: isolate;
        }

        .neural-card::after {
          background:
            linear-gradient(90deg, transparent, rgba(86, 231, 255, 0.12), transparent),
            repeating-linear-gradient(90deg, transparent 0 12px, rgba(128, 255, 216, 0.08) 12px 13px);
          content: "";
          inset: 0;
          opacity: 0.7;
          pointer-events: none;
          position: absolute;
          z-index: -1;
        }

        .quantum-ring {
          align-items: center;
          aspect-ratio: 1;
          border: 1px solid rgba(86, 231, 255, 0.28);
          border-radius: 999px;
          display: grid;
          justify-items: center;
          place-items: center;
          position: relative;
          width: 78px;
        }

        .quantum-ring span {
          animation: neural-spin 4.8s linear infinite;
          background: conic-gradient(from 0deg, transparent, var(--retro-cyan), var(--retro-screen), transparent 72%);
          border-radius: inherit;
          inset: -2px;
          mask: radial-gradient(circle, transparent 56%, #000 58%);
          position: absolute;
        }

        .quantum-ring b {
          color: var(--retro-paper);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 14px;
          position: relative;
        }

        .neural-bars {
          align-items: end;
          display: grid;
          gap: 4px;
          grid-template-columns: repeat(18, minmax(0, 1fr));
          height: 44px;
        }

        .neural-bars span {
          animation: neural-bars 1.8s ease-in-out infinite;
          animation-delay: var(--delay);
          background: linear-gradient(180deg, var(--retro-cyan), var(--retro-screen));
          border-radius: 999px 999px 0 0;
          height: var(--bar);
          opacity: 0.78;
        }

        .retro-meter {
          background: rgba(0, 0, 0, 0.42);
          border: 1px solid rgba(231, 247, 255, 0.13);
          height: 12px;
          overflow: hidden;
          position: relative;
        }

        .retro-meter span {
          animation: retro-meter-pulse 2.8s ease-in-out infinite, retro-stripes 1.1s linear infinite;
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 8px, transparent 8px 16px),
            linear-gradient(90deg, var(--retro-cyan), var(--retro-screen), var(--retro-amber));
          background-size: 160px 100%, auto;
          display: block;
          height: 100%;
          min-width: 2px;
          transition: width 550ms ease;
        }

        .retro-counter {
          background: rgba(0, 0, 0, 0.32);
          border: 1px solid rgba(119, 255, 207, 0.2);
          color: var(--retro-screen);
          min-height: 78px;
          padding: 12px 6px;
          text-align: center;
        }

        .retro-counter-hot {
          animation: retro-text-flicker 1.8s ease-in-out infinite;
          color: var(--retro-amber);
        }

        .retro-radar {
          background:
            linear-gradient(90deg, transparent 49%, rgba(119, 255, 207, 0.24) 50%, transparent 51%),
            linear-gradient(0deg, transparent 49%, rgba(77, 232, 255, 0.24) 50%, transparent 51%),
            radial-gradient(circle, transparent 30%, rgba(119, 255, 207, 0.18) 31%, transparent 32%, transparent 58%, rgba(77, 232, 255, 0.22) 59%, transparent 60%);
          border: 1px solid rgba(119, 255, 207, 0.3);
          box-shadow: 0 0 36px rgba(77, 232, 255, 0.14);
        }

        .retro-loader-dot {
          animation: retro-loader 900ms ease-in-out infinite;
          background: var(--retro-screen);
          box-shadow: 0 0 16px rgba(158, 255, 139, 0.6);
          display: inline-block;
          height: 9px;
          width: 9px;
        }

        .scan-log-line {
          animation: scan-log-in 520ms ease-out both;
          opacity: 0;
          transform: translateY(6px);
        }

        .scan-log-cursor {
          animation: cyber-cursor 1s steps(2, end) infinite;
        }

        .scan-progress {
          animation: scan-progress 1.25s ease-in-out infinite;
          transform-origin: left;
        }

        .retro-chart-line {
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: retro-draw 1.2s ease-out forwards;
        }

        .retro-chart-dot {
          animation: retro-dot 1.8s ease-in-out infinite;
          transform-origin: center;
        }

        @keyframes retro-scan {
          to {
            transform: translateY(130vh);
          }
        }

        @keyframes retro-meter-pulse {
          0%, 100% {
            filter: brightness(0.96);
          }
          50% {
            filter: brightness(1.25);
          }
        }

        @keyframes retro-text-flicker {
          0%, 100% {
            opacity: 1;
            text-shadow: 0 0 16px rgba(255, 191, 71, 0.35);
          }
          50% {
            opacity: 0.74;
            text-shadow: 0 0 6px rgba(255, 191, 71, 0.2);
          }
        }

        @keyframes retro-loader {
          0%, 100% {
            opacity: 0.35;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @keyframes cyber-cursor {
          50% {
            border-color: transparent;
            opacity: 0;
          }
        }

        @keyframes scan-log-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scan-progress {
          0% {
            transform: translateX(-100%) scaleX(0.4);
          }
          55% {
            transform: translateX(0%) scaleX(0.72);
          }
          100% {
            transform: translateX(125%) scaleX(0.32);
          }
        }

        @keyframes retro-edge-flow {
          to {
            transform: translateX(330%);
          }
        }

        @keyframes retro-stripes {
          to {
            background-position: 160px 0, 0 0;
          }
        }

        @keyframes retro-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes retro-dot {
          0%, 100% {
            opacity: 0.72;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.16);
          }
        }

        @keyframes neural-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes neural-bars {
          0%, 100% {
            filter: brightness(0.85);
            transform: scaleY(0.72);
          }
          50% {
            filter: brightness(1.35);
            transform: scaleY(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .retro-shell::after,
          .retro-meter span,
          .retro-counter-hot,
          .retro-loader-dot,
          .retro-chart-line,
          .retro-chart-dot,
          .retro-panel::before,
          .retro-card::before,
          .scan-log-line,
          .scan-log-cursor,
          .scan-progress,
          .quantum-ring span,
          .neural-bars span {
            animation: none;
            opacity: 1;
            transform: none;
          }

          .retro-card:hover {
            transform: none;
          }
        }
      `}</style>

      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="retro-badge retro-badge-cyan inline-flex">arouter neural quota</div>
            <h1 className="cyber-title mt-4 max-w-3xl text-4xl font-black tracking-normal text-[var(--retro-paper)] sm:text-5xl">
              Future quota command center
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--retro-muted)]">
              Live telemetry for API key traffic, token load, remaining headroom, expiry, and the next midnight reset.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em]">
              <span className="cyber-terminal-line">neural_quota.scan --secure --daily-reset</span>
            </p>
          </div>
          <ResetPulseCard resetMs={resetMs} />
        </header>

        <form onSubmit={checkUsage} className="retro-panel mb-6 grid gap-3 p-3 sm:grid-cols-[1fr_auto]">
          <label className="relative min-h-12">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--retro-screen)]">
              <Icon className="h-5 w-5">
                <circle cx="8" cy="12" r="3" />
                <path d="M11 12h10M16 12v3M19 12v3" />
              </Icon>
            </span>
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              type="password"
              placeholder="Paste API key"
              className="h-12 w-full rounded-none border border-[rgba(158,255,139,0.25)] bg-black/35 pl-12 pr-4 font-mono text-sm text-[var(--retro-paper)] outline-none transition placeholder:text-[var(--retro-muted)] focus:border-[var(--retro-screen)] focus:shadow-[0_0_0_3px_rgba(158,255,139,0.12)]"
              aria-label="API key"
              suppressHydrationWarning
            />
          </label>
          <button
            type="submit"
            disabled={!apiKey.trim() || loading}
            className="inline-flex h-12 items-center justify-center gap-2 border border-[var(--retro-amber)] bg-[rgba(255,191,71,0.14)] px-7 font-mono text-sm font-black uppercase tracking-[0.16em] text-[var(--retro-amber)] transition hover:bg-[rgba(255,191,71,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon className="h-5 w-5">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </Icon>
            {loading ? "Scanning" : "Check"}
          </button>
        </form>

        {error ? (
          <div className="retro-panel mb-6 border-[rgba(255,107,95,0.45)] bg-[rgba(255,107,95,0.08)] p-4 text-sm text-[var(--retro-red)]" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? <LoadingState /> : null}

        {!loading && result?.found ? (
          <section className="space-y-5">
            <div className="retro-panel overflow-hidden">
              <div className="grid gap-4 border-b border-[var(--retro-border)] p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center border border-[rgba(158,255,139,0.35)] bg-[rgba(158,255,139,0.08)] text-[var(--retro-screen)]">
                    <Icon className="h-6 w-6">
                      <circle cx="8" cy="12" r="3" />
                      <path d="M11 12h10M16 12v3M19 12v3" />
                    </Icon>
                  </div>
                  <div className="min-w-0">
                    <p className="retro-kicker">Key Identity</p>
                    <h2 className="mt-1 truncate text-2xl font-black text-[var(--retro-paper)]">{key.name || "API Key"}</h2>
                    <p className="mt-1 truncate font-mono text-xs text-[var(--retro-muted)]">{maskKey(apiKey)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <div className={`retro-badge retro-badge-${statusTone}`}>{statusLabel}</div>
                  <div className="retro-badge retro-badge-cyan">{status?.window || "unknown"} window</div>
                </div>
              </div>

              {key.disabledMessage ? (
                <div className="m-5 border border-[rgba(255,107,95,0.45)] bg-[rgba(255,107,95,0.08)] p-3 text-sm text-[var(--retro-red)]">
                  {key.disabledMessage}
                </div>
              ) : null}

              <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  icon={
                    <Icon className="h-5 w-5">
                      <path d="M7 3v14M7 17l-4-4M7 17l4-4M17 21V7M17 7l-4 4M17 7l4 4" />
                    </Icon>
                  }
                  label="Requests"
                  value={fmtNumber(usage.requests)}
                  sub="Recorded in current window"
                />
                <StatTile
                  icon={
                    <Icon className="h-5 w-5">
                      <path d="M21 16V8l-9-5-9 5v8l9 5 9-5Z" />
                      <path d="M3.3 7.5 12 12l8.7-4.5M12 22V12" />
                    </Icon>
                  }
                  label="Input"
                  value={fmtNumber(usage.inputTokens)}
                  sub={`${fmtNumber(remaining(usage.inputTokens, quota.maxInputTokens))} remaining`}
                />
                <StatTile
                  icon={
                    <Icon className="h-5 w-5">
                      <path d="M12 3a9 9 0 1 0 9 9" />
                      <path d="M12 7v5l3 3" />
                    </Icon>
                  }
                  label="Output"
                  value={fmtNumber(usage.outputTokens)}
                  sub={`${fmtNumber(remaining(usage.outputTokens, quota.maxOutputTokens))} remaining`}
                />
                <StatTile
                  icon={
                    <Icon className="h-5 w-5">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </Icon>
                  }
                  label="Total"
                  value={fmtNumber(usage.totalTokens)}
                  sub={`${fmtNumber(remainingTotal)} remaining`}
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="grid gap-3 lg:col-span-1">
                <Gauge percent={totalPercent} label="Total Load" value={fmtNumber(usage.totalTokens)} limit={fmtNumber(quota.maxTotalTokens && quota.maxTotalTokens > 0 ? quota.maxTotalTokens : null)} tone={totalPercent >= 90 ? "red" : totalPercent >= 70 ? "amber" : "green"} />
                <Gauge percent={inputPercent} label="Input Load" value={fmtNumber(usage.inputTokens)} limit={fmtNumber(quota.maxInputTokens && quota.maxInputTokens > 0 ? quota.maxInputTokens : null)} tone={inputPercent >= 90 ? "red" : "cyan"} />
                <Gauge percent={outputPercent} label="Output Load" value={fmtNumber(usage.outputTokens)} limit={fmtNumber(quota.maxOutputTokens && quota.maxOutputTokens > 0 ? quota.maxOutputTokens : null)} tone={outputPercent >= 90 ? "red" : "amber"} />
              </div>
              <div className="space-y-5 lg:col-span-2">
                <TrendChart data={dailyTrend} />
                <CountdownBlock resetMs={resetMs} />
              </div>
            </div>

            <div className="retro-panel grid gap-3 p-4 text-xs text-[var(--retro-muted)] sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="retro-kicker">Created</p>
                <p className="mt-2 font-mono text-[var(--retro-paper)]">{fmtDate(key.createdAt)}</p>
              </div>
              <div>
                <p className="retro-kicker">Allowed Models</p>
                <p className="mt-2 line-clamp-2 font-mono text-[var(--retro-paper)]">{key.allowedModels?.length ? key.allowedModels.join(", ") : "All models"}</p>
              </div>
              <div>
                <p className="retro-kicker">Expires</p>
                <p className={`mt-2 font-mono ${status?.expired ? "text-[var(--retro-red)]" : "text-[var(--retro-paper)]"}`}>{fmtDateTime(status?.expiresAt)}</p>
              </div>
              <div>
                <p className="retro-kicker">Resets</p>
                <p className="mt-2 font-mono text-[var(--retro-paper)]">{fmtDate(status?.resetAt)}</p>
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !result?.found ? <EmptyState /> : null}
      </div>
    </main>
  );
}
