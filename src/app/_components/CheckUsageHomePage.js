"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/shared/hooks/useTheme";

const TELEGRAM_URL = "https://t.me/abnosleep";

const HERO_SIGNAL_CARDS = [
  { value: "No login", label: "Public checker access" },
  { value: "3 plans", label: "Visible weekly options" },
  { value: "UTC+7", label: "Daily quota reset" },
];

const PRICING_OPTIONS = [
  {
    id: "starter",
    label: "Starter",
    badge: "STARTER",
    price: "200,000 \u20ab",
    priceValue: 200000,
    tokens: 100_000_000,
    tokenLabel: "100M TOKENS",
    duration: "1 TUẦN",
    description: "Phù hợp để code dự án nhỏ, làm MVP, build side project, hoặc duy trì nhu cầu hằng ngày với chi phí gọn và nhịp dùng ổn định.",
    specs: [
      "100M tokens / ngày",
      "Hạn dùng 1 tuần",
      "1 API key",
      "Dùng được trên nhiều thiết bị",
      "Khuyến khích 2-3 thiết bị",
    ],
    dailyCurve: [38, 46, 58, 54, 62, 72, 52],
    cta: "Mua gói này",
  },
  {
    id: "popular",
    label: "Popular",
    badge: "POPULAR",
    price: "400,000 \u20ab",
    priceValue: 400000,
    tokens: 200_000_000,
    tokenLabel: "200M TOKENS",
    duration: "1 TUẦN",
    description: "Phù hợp cho các project lớn hơn, team làm việc thường xuyên, cần đủ headroom để code, test, debug và scale ổn định mỗi ngày.",
    specs: [
      "200M tokens / ngày",
      "Hạn dùng 1 tuần",
      "1 API key",
      "Dùng được trên nhiều thiết bị",
      "Khuyến khích 2-3 thiết bị",
    ],
    dailyCurve: [44, 58, 74, 70, 84, 94, 68],
    cta: "Chọn gói phổ biến",
    featured: true,
  },
  {
    id: "power",
    label: "Power",
    badge: "POWER",
    price: "1,000,000 \u20ab",
    priceValue: 1000000,
    tokens: 500_000_000,
    tokenLabel: "500M TOKENS",
    duration: "1 TUẦN",
    description: "Hợp để nuôi OpenClaw, code đa dự án cùng lúc, và gánh workload nặng liên tục khi bạn cần dư địa lớn xuyên suốt cả tuần.",
    specs: [
      "500M tokens / ngày",
      "Hạn dùng 1 tuần",
      "1 API key",
      "Dùng được trên nhiều thiết bị",
      "Khuyến khích 2-3 thiết bị",
    ],
    dailyCurve: [56, 68, 82, 88, 96, 100, 78],
    cta: "Lấy gói lớn",
  },
];

const STATS = [
  { value: "1B+", label: "tokens distributed", note: "dòng phân phối tăng đều", trend: [34, 42, 40, 54, 58, 72, 84] },
  { value: "99.9%", label: "uptime (30 ngày)", note: "ổn định cho luồng check công khai", trend: [88, 90, 91, 92, 94, 95, 96] },
  { value: "< 50ms", label: "avg latency", note: "giữ phản hồi nhanh ở checker", trend: [68, 64, 58, 54, 48, 44, 38] },
  { value: "3 plans", label: "weekly options", note: "thấy rõ để khách so sánh nhanh", trend: [24, 26, 28, 30, 32, 34, 36] },
];

const FEATURE_PILLS = [
  { label: "Public telemetry", icon: "pulse" },
  { label: "Secure key scan", icon: "shield" },
  { label: "Live remaining headroom", icon: "spark" },
];

const HOURLY_BARS = [30, 42, 36, 28, 24, 18, 22, 34, 48, 56, 62, 54, 46, 52, 58, 64, 60, 48, 36, 28, 22, 18, 16, 14];
const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatNumber(value) {
  if (value === null || value === undefined) return "Unlimited";
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatTokens(value) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return formatNumber(amount);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "No expiry";
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function maskKey(value) {
  const key = String(value || "");
  if (!key) return "sk-\u2022\u2022\u2022\u2022\u2022\u2022";
  if (key.length <= 12) return key;
  return `${key.slice(0, 3)}-\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${key.slice(-4)}`;
}

function getRemaining(used, limit) {
  const max = Number(limit || 0);
  if (max <= 0) return null;
  return Math.max(0, max - Number(used || 0));
}

function getPercent(used, limit) {
  const max = Number(limit || 0);
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(used || 0) / max) * 100)));
}

function getHcmNow(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 60 * 60 * 1000);
}

function getCountdownState(now = new Date()) {
  const hcmNow = getHcmNow(now);
  const nextMidnight = new Date(hcmNow);
  nextMidnight.setHours(24, 0, 0, 0);
  const diffMs = nextMidnight.getTime() - hcmNow.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  const elapsed = hcmNow.getHours() * 3600 + hcmNow.getMinutes() * 60 + hcmNow.getSeconds();
  const progress = elapsed / 86400;

  return {
    display: `${hours}:${mins}:${secs}`,
    diffMs,
    progress,
    hoursLeft: Math.max(0, Math.ceil(diffMs / 3_600_000)),
    resetLabel: `${Math.floor(diffMs / 3_600_000)}h ${Math.floor((diffMs % 3_600_000) / 60_000)}m`,
  };
}

function averageBurnRate(dailyTrend) {
  if (!dailyTrend?.length) return 0;
  const totals = dailyTrend.map((entry) => Number(entry.totalTokens || 0)).filter((value) => Number.isFinite(value));
  if (!totals.length) return 0;
  return Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length);
}

function pickRecommendedPlan({ burnRate, weeklyLimit, usedTokens }) {
  const projectedNeed = Math.max(Number(weeklyLimit || 0), Math.round(Number(burnRate || 0) * 7 * 1.15), Math.round(Number(usedTokens || 0) * 1.1));
  return PRICING_OPTIONS.find((plan) => plan.tokens >= projectedNeed) || PRICING_OPTIONS[PRICING_OPTIONS.length - 1];
}

function getProjectionTone(daysUntilEmpty) {
  if (!Number.isFinite(daysUntilEmpty)) return "info";
  if (daysUntilEmpty < 3) return "danger";
  if (daysUntilEmpty <= 7) return "warning";
  return "success";
}

function getChartGeometry(values, width, height, options = {}) {
  const safeValues = (values?.length ? values : [0]).map((value) => Number(value || 0));
  const maxValue = Math.max(1, Number(options.maxValue || 0), ...safeValues);
  const paddingTop = options.paddingTop ?? 8;
  const paddingBottom = options.paddingBottom ?? 8;
  const innerHeight = Math.max(1, height - paddingTop - paddingBottom);
  const step = safeValues.length > 1 ? width / (safeValues.length - 1) : width;
  const coords = safeValues.map((value, index) => ({
    x: step * index,
    y: height - paddingBottom - (value / maxValue) * innerHeight,
  }));
  const linePath = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - paddingBottom} L 0 ${height - paddingBottom} Z`;

  return { coords, linePath, areaPath, maxValue };
}

function Icon({ name, className = "h-4 w-4" }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "terminal":
      return (
        <svg {...props}>
          <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          <path d="m7 10 3 2-3 2" />
          <path d="M13 14h4" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...props}>
          <path d="M5 12h14" />
          <path d="m13 5 7 7-7 7" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3 5 6v6c0 4.4 2.9 8.4 7 9 4.1-.6 7-4.6 7-9V6l-7-3Z" />
          <path d="m9.5 12 1.7 1.7L14.8 10" />
        </svg>
      );
    case "spark":
      return (
        <svg {...props}>
          <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        </svg>
      );
    case "pulse":
      return (
        <svg {...props}>
          <path d="M3 12h4l2-4 4 8 2-4h6" />
        </svg>
      );
    case "key":
      return (
        <svg {...props}>
          <circle cx="8" cy="15" r="3" />
          <path d="M10.5 13.5 21 3" />
          <path d="M15 5h3v3" />
          <path d="M18 8h3v3" />
        </svg>
      );
    case "copy":
      return (
        <svg {...props}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
      );
    case "check-circle":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.2 2.2 4.8-4.8" />
        </svg>
      );
    case "x-circle":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6" />
          <path d="m15 9-6 6" />
        </svg>
      );
    case "radar":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <path d="M12 3v9l6 3" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "menu":
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    case "sun":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.5" />
          <path d="M12 19v2.5" />
          <path d="m4.9 4.9 1.8 1.8" />
          <path d="m17.3 17.3 1.8 1.8" />
          <path d="M2.5 12H5" />
          <path d="M19 12h2.5" />
          <path d="m4.9 19.1 1.8-1.8" />
          <path d="m17.3 6.7 1.8-1.8" />
        </svg>
      );
    case "moon":
      return (
        <svg {...props}>
          <path d="M20 14.2A7.8 7.8 0 1 1 9.8 4 6.5 6.5 0 1 0 20 14.2Z" />
        </svg>
      );
    default:
      return null;
  }
}

function QuotaEpochWidget({ countdown }) {
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference * (1 - countdown.progress);
  const currentHour = Math.min(23, Math.floor(countdown.progress * 24));

  return (
    <aside className="quota-widget reveal-item" data-reveal>
      <div className="quota-header">
        <span className="mono-eyebrow">QUOTA EPOCH</span>
        <div className="live-indicator">
          <span className="live-dot" />
          <span className="mono-eyebrow mono-accent">LIVE</span>
        </div>
      </div>

      <div className="quota-main">
        <div>
          <p className="countdown-skeleton" id="countdown">
            {countdown.display}
          </p>
          <p className="quota-subtle">Daily reset · Asia/Ho Chi Minh</p>
        </div>

        <div className="progress-ring-shell" aria-label="Daily reset progress">
          <svg width="80" height="80" viewBox="0 0 80 80" className="progress-ring">
            <circle cx="40" cy="40" r="36" className="progress-track" />
            <circle
              id="progress-ring"
              cx="40"
              cy="40"
              r="36"
              className="progress-value"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="progress-ring-label">{String(countdown.hoursLeft).padStart(2, "0")}h</div>
        </div>
      </div>

      <div className="hourly-bars" aria-hidden="true">
        {HOURLY_BARS.map((value, index) => {
          let tone = "future";
          if (index < currentHour) tone = "past";
          if (index === currentHour) tone = "current";

          return (
            <div key={index} className={`hour-bar hour-bar-${tone}`} title={index === currentHour ? "Current hour" : `${String(index).padStart(2, "0")}:00`}>
              <span style={{ height: `${value}%` }} />
            </div>
          );
        })}
      </div>

      <div className="quota-footer">
        <div>
          <p className="footer-label">Reset in</p>
          <p className="footer-value">{countdown.resetLabel}</p>
        </div>
        <div>
          <p className="footer-label">Timezone</p>
          <p className="footer-value">UTC+7</p>
        </div>
      </div>
    </aside>
  );
}

function PlanCapacityChart({ plan }) {
  return (
    <div className="plan-capacity-panel">
      <div className="plan-capacity-head">
        <div>
          <span className="mono-eyebrow">CAPACITY PROFILE</span>
          <p className="plan-capacity-value">{`${formatTokens(plan.tokens)}/ngày`}</p>
        </div>
        <span className="plan-capacity-badge">1 KEY</span>
      </div>

      <div className="plan-capacity-meta">
        <span>7 DAY ACCESS</span>
        <span>2-3 DEVICES RECOMMENDED</span>
      </div>

      <div className="plan-capacity-visual">
        <div className="plan-capacity-grid" aria-hidden="true" />

        <div className="plan-capacity-bars" aria-hidden="true">
          {plan.dailyCurve.map((value, index) => (
            <div key={`${plan.id}-${WEEKDAY_LABELS[index]}`} className="plan-capacity-bar">
              <div className="plan-capacity-track">
                <span style={{ height: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="plan-capacity-labels">
          {WEEKDAY_LABELS.map((day) => (
            <span key={`${plan.id}-${day}`}>{day}</span>
          ))}
        </div>
      </div>

      <p className="plan-capacity-note">Một key dùng được trên nhiều thiết bị, nhưng nên giữ ổn định ở 2-3 thiết bị để throughput và session usage đều hơn.</p>
    </div>
  );
}

function PricingCard({ plan, onScrollToChecker }) {
  return (
    <article className={`pricing-card reveal-item ${plan.featured ? "pricing-card-featured" : ""}`} data-reveal data-plan-card={plan.id}>
      <div className="pricing-card-header">
        <span className={`plan-badge ${plan.featured ? "plan-badge-accent" : ""}`}>{plan.badge}</span>
        {plan.featured ? <span className="value-badge">BEST VALUE</span> : null}
      </div>

      <div className="pricing-card-body">
        <h3 className="plan-price">{plan.price}</h3>
        <p className="plan-tokens">{plan.tokenLabel}</p>
        <p className="plan-duration">{plan.duration}</p>
        <div className="plan-divider" />
        <p className="plan-description">{plan.description}</p>
        <PlanCapacityChart plan={plan} />

        <ul className="plan-specs">
          {plan.specs.map((spec) => (
            <li key={spec}>
              <Icon name="check" className="h-3.5 w-3.5" />
              <span>{spec}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pricing-card-actions">
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className={`plan-cta ${plan.featured ? "plan-cta-primary" : "plan-cta-secondary"}`}
        >
          {plan.cta}
        </a>
        <button type="button" className="plan-link" onClick={onScrollToChecker}>
          Xem usage trước
        </button>
      </div>
    </article>
  );
}

function FeaturePills() {
  return (
    <div className="feature-pill-row">
      {FEATURE_PILLS.map((pill) => (
        <div key={pill.label} className="feature-pill">
          <Icon name={pill.icon} className="h-3.5 w-3.5" />
          <span>{pill.label}</span>
        </div>
      ))}
    </div>
  );
}

function UsagePlanRail({ onScrollToPlans }) {
  return (
    <aside className="usage-side-panel reveal-item" data-reveal>
      <div className="usage-side-head">
        <span className="mono-eyebrow">PLAN MATCHING</span>
        <span className="usage-side-status">LIVE FIT</span>
      </div>

      <h3 className="usage-side-title">See real usage first. Buy only the package that fits.</h3>
      <p className="usage-side-copy">
        ARouter exposes the public checker up front so buyers can compare burn rate, reset cadence, and headroom before paying.
      </p>

      <div className="usage-side-list">
        {PRICING_OPTIONS.map((plan) => (
          <div key={plan.id} className={`usage-side-item ${plan.featured ? "usage-side-item-featured" : ""}`}>
            <div>
              <p className="usage-side-plan">{plan.label}</p>
              <p className="usage-side-meta">{plan.tokenLabel} · 1 key · 1 tuần</p>
            </div>
            <div className="usage-side-price">{plan.price}</div>
          </div>
        ))}
      </div>

      <div className="usage-side-notes">
        <div className="usage-note">
          <Icon name="shield" className="h-4 w-4" />
          <span>Key lookup only. No account required.</span>
        </div>
        <div className="usage-note">
          <Icon name="pulse" className="h-4 w-4" />
          <span>Burn trend and reset timing stay visible before checkout.</span>
        </div>
      </div>

      <div className="usage-side-actions">
        <button type="button" className="ghost-button usage-side-button" onClick={onScrollToPlans}>
          Compare all plans
        </button>
        <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="plan-cta plan-cta-primary usage-side-cta">
          Buy via Telegram
        </a>
      </div>
    </aside>
  );
}

function AwaitingState() {
  return (
    <div className="result-state result-state-awaiting" id="state-awaiting">
      <div className="radar-shell" aria-hidden="true">
        <div className="radar-outer">
          <Icon name="radar" className="h-10 w-10" />
        </div>
        <div className="radar-inner" />
      </div>
      <p className="mono-eyebrow state-title">AWAITING KEY SIGNAL</p>
      <p className="state-copy">Check requests, token burn, limits, trend, and reset time.</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="result-state result-state-loading" id="state-loading">
      <div className="spinner" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="mono-eyebrow mono-accent state-title">SCANNING KEY...</p>
      <p className="state-copy">Fetching quota, burn rate, and reset window from ARouter...</p>
      <div className="loading-progress">
        <div className="loading-progress-bar" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="result-state result-state-error" id="state-error" role="alert">
      <Icon name="x-circle" className="h-8 w-8 text-[var(--danger)]" />
      <p className="error-title">Key not found or invalid</p>
      <p className="state-copy">{message || "Double-check your API key and try again. Ensure you're using a valid ARouter API key."}</p>
      <button type="button" className="retry-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function Sparkline({ values }) {
  const points = values?.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const width = 720;
  const height = 80;
  const { coords, linePath, areaPath } = getChartGeometry(points, width, height, { paddingTop: 5, paddingBottom: 0 });

  return (
    <div className="sparkline-wrap">
      <p className="sparkline-title">7-day token burn trend</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="sparkline">
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(20,210,150,0.2)" />
            <stop offset="100%" stopColor="rgba(20,210,150,0)" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#spark-fill)" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        {coords.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3.2" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

function UsageCapacityChart({ used, remaining, burnRate, recommendedPlan }) {
  const projectedNeed = Math.round(Math.max(burnRate * 7, used * 0.9));
  const bars = [
    { label: "Used", value: used, tone: "used" },
    { label: "Remaining", value: remaining, tone: "remaining" },
    { label: "7d Need", value: projectedNeed, tone: "forecast" },
  ];
  const scaleMax = Math.max(1, recommendedPlan.tokens, ...bars.map((bar) => Number(bar.value || 0)));

  return (
    <div className="usage-compare-wrap">
      <div className="usage-compare-head">
        <div>
          <p className="mono-eyebrow">HEADROOM MODEL</p>
          <p className="usage-compare-title">Current quota against projected weekly demand</p>
        </div>
        <span className="usage-compare-pill">{recommendedPlan.label} fit</span>
      </div>

      <div className="usage-compare-chart">
        {bars.map((bar) => (
          <div key={bar.label} className="usage-compare-column">
            <span className={`usage-compare-bar usage-compare-bar-${bar.tone}`} style={{ height: `${Math.max(14, (Number(bar.value || 0) / scaleMax) * 100)}%` }} />
            <strong>{formatTokens(bar.value)}</strong>
            <small>{bar.label}</small>
          </div>
        ))}
      </div>

      <p className="usage-compare-note">{`Projection benchmarked against ${formatTokens(recommendedPlan.tokens)} weekly headroom.`}</p>
    </div>
  );
}

function StatMiniChart({ values }) {
  const width = 120;
  const height = 44;
  const { linePath, areaPath } = getChartGeometry(values, width, height, { paddingTop: 6, paddingBottom: 6 });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="stat-chart" aria-hidden="true">
      <path d={areaPath} fill="rgba(20,210,150,0.12)" />
      <path d={linePath} className="stat-chart-line" />
    </svg>
  );
}

function UsageSuccessState({ result, apiKeyValue, onCopy, copyLabel }) {
  const usage = result?.usage || {};
  const quota = result?.key?.quota || {};
  const status = result?.status || {};
  const dailyTrend = result?.dailyTrend || [];
  const remainingTotal = status.remainingTotalTokens ?? getRemaining(usage.totalTokens, quota.maxTotalTokens);
  const usedPercent = quota.maxTotalTokens > 0 ? getPercent(usage.totalTokens, quota.maxTotalTokens) : 0;
  const burnRate = averageBurnRate(dailyTrend);
  const daysUntilEmpty = burnRate > 0 && Number.isFinite(remainingTotal) ? Math.floor(remainingTotal / burnRate) : Infinity;
  const recommendedPlan = pickRecommendedPlan({
    burnRate,
    weeklyLimit: quota.maxTotalTokens,
    usedTokens: usage.totalTokens,
  });
  const trendValues = dailyTrend.map((entry) => Number(entry.totalTokens || 0));
  const tone = getProjectionTone(daysUntilEmpty);

  return (
    <div className="usage-result" id="state-success">
      <div className="usage-result-bar">
        <div className="result-bar-left">
          <Icon name="check-circle" className="h-4 w-4 text-[var(--accent)]" />
          <span>Key verified</span>
        </div>
        <div className="result-bar-right">
          <span className="masked-key">{maskKey(apiKeyValue || result?.key?.id)}</span>
          <button type="button" className="copy-button" onClick={onCopy}>
            <Icon name="copy" className="h-3.5 w-3.5" />
            {copyLabel}
          </button>
        </div>
      </div>

      <div className="usage-metric-grid">
        <MetricCard label="Remaining" value={formatTokens(remainingTotal)} sub={`of ${formatTokens(quota.maxTotalTokens)} quota`} accent />
        <MetricCard
          label="Used"
          value={formatTokens(usage.totalTokens)}
          sub={`${Math.max(0, 100 - usedPercent).toFixed(1)}% remaining`}
          progress={usedPercent}
        />
        <MetricCard label="Burn Rate" value={`${formatTokens(burnRate)}/day`} sub="avg last 7 days" />
        <MetricCard
          label="Projected Empty"
          value={Number.isFinite(daysUntilEmpty) ? `${daysUntilEmpty} days` : "Stable"}
          sub="at current rate"
          tone={tone}
        />
        <MetricCard label="Reset In" value={formatDuration(status.resetInMs)} sub="Next daily reset" accent />
        <MetricCard label="Quota Limit" value={`${formatTokens(quota.maxTotalTokens)} / week`} sub="200 req/min limit" />
      </div>

      <div className="usage-detail-grid">
        <div className="usage-panel">
          <Sparkline values={trendValues} />
          <UsageCapacityChart
            used={usage.totalTokens}
            remaining={remainingTotal || 0}
            burnRate={burnRate}
            recommendedPlan={recommendedPlan}
          />
        </div>

        <div className="usage-panel usage-panel-meta">
          <MetaRow label="Created" value={formatDate(result?.key?.createdAt)} />
          <MetaRow label="Expires" value={formatDateTime(status.expiresAt)} />
          <MetaRow label="Reset Window" value={formatDateTime(status.resetAt)} />
          <MetaRow
            label="Allowed Models"
            value={result?.key?.allowedModels?.length ? result.key.allowedModels.join(", ") : "All models"}
            wide
          />
        </div>
      </div>

      <div className="usage-result-action">
        <span>Based on usage, we recommend:</span>
        <a href="#weekly-plans" className="recommend-pill">
          {`\u2192 ${recommendedPlan.label} Plan (${formatTokens(recommendedPlan.tokens)})`}
        </a>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, progress, tone, accent = false }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className={`metric-value ${accent ? "metric-value-accent" : ""} ${tone ? `metric-value-${tone}` : ""}`}>{value}</p>
      <p className="metric-sub">{sub}</p>
      {typeof progress === "number" ? (
        <div className="metric-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} className={progress < 50 ? "progress-success" : progress < 80 ? "progress-warning" : "progress-danger"} />
        </div>
      ) : null}
    </div>
  );
}

function MetaRow({ label, value, wide = false }) {
  return (
    <div className={`meta-row ${wide ? "meta-row-wide" : ""}`}>
      <p className="metric-label">{label}</p>
      <p className="meta-value">{value}</p>
    </div>
  );
}

export default function CheckUsageHomePage() {
  const inputRef = useRef(null);
  const { toggleTheme, isDark } = useTheme();
  const [apiKey, setApiKey] = useState("");
  const [phase, setPhase] = useState("awaiting");
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(() => getCountdownState());
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdownState());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const targets = document.querySelectorAll("[data-reveal]");
    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  const statusView = useMemo(() => {
    if (phase === "loading") return <LoadingState />;
    if (phase === "error") return <ErrorState message={errorMessage} onRetry={() => setPhase("awaiting")} />;
    if (phase === "success" && result?.found) {
      return (
        <UsageSuccessState
          result={result}
          apiKeyValue={apiKey.trim()}
          copyLabel={copyLabel}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(apiKey.trim());
              setCopyLabel("Copied");
              window.setTimeout(() => setCopyLabel("Copy"), 1500);
            } catch {
              setCopyLabel("Copy");
            }
          }}
        />
      );
    }
    return <AwaitingState />;
  }, [copyLabel, errorMessage, phase, result]);

  async function handleSubmit(event) {
    event?.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    setPhase("loading");
    setErrorMessage("");
    setResult(null);
    setCopyLabel("Copy");

    try {
      const response = await fetch("/api/public/key-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
        cache: "no-store",
      });

      const payload = await response.json();
      if (!response.ok || !payload?.found) {
        throw new Error(payload?.error || "Double-check your API key and try again. Ensure you're using a valid ARouter API key.");
      }

      setResult(payload);
      setPhase("success");
    } catch (error) {
      setErrorMessage(error?.message || "Double-check your API key and try again. Ensure you're using a valid ARouter API key.");
      setPhase("error");
    }
  }

  function scrollToId(id, focusInput = false) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusInput) {
      window.setTimeout(() => inputRef.current?.focus(), 500);
    }
  }

  return (
    <main className="router-home">
      <style jsx global>{`
        .router-home {
          --bg-base: #f4f8fb;
          --bg-surface: #ffffff;
          --bg-elevated: #edf3f8;
          --bg-subtle: #dce7f1;
          --border-default: rgba(15, 23, 42, 0.08);
          --border-strong: rgba(15, 23, 42, 0.14);
          --border-accent: rgba(20, 210, 150, 0.28);
          --text-primary: #0d1726;
          --text-secondary: #5c6a7b;
          --text-muted: #90a0b3;
          --text-inverse: #f7fbfd;
          --accent: #14d296;
          --accent-dim: rgba(20, 210, 150, 0.12);
          --accent-glow: rgba(20, 210, 150, 0.08);
          --success: #22c55e;
          --warning: #f59e0b;
          --danger: #ef4444;
          --info: #3b82f6;
          --text-xs: 11px;
          --text-sm: 13px;
          --text-base: 15px;
          --text-lg: 17px;
          --text-xl: 20px;
          --text-2xl: 28px;
          --text-3xl: 38px;
          --text-4xl: 52px;
          --text-hero: 72px;
          --space-page: 80px;
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 12px;
          --radius-xl: 16px;
          --nav-bg: rgba(244, 248, 251, 0.82);
          --hero-highlight: rgba(20, 210, 150, 0.12);
          --hero-soft: rgba(255, 255, 255, 0.72);
          --surface-tint: rgba(255, 255, 255, 0.92);
          --surface-tint-strong: rgba(255, 255, 255, 0.98);
          --surface-shadow: 0 22px 58px rgba(24, 39, 75, 0.08);
          --surface-shadow-strong: 0 28px 72px rgba(24, 39, 75, 0.12);
          --shine-color: rgba(255, 255, 255, 0.24);
          min-height: 100vh;
          background:
            radial-gradient(circle at 100% 0%, var(--hero-highlight), transparent 28%),
            radial-gradient(circle at 0% 0%, var(--hero-soft), transparent 22%),
            var(--bg-base);
          color: var(--text-primary);
          position: relative;
          overflow-x: clip;
        }

        .router-home::before,
        .router-home::after {
          content: "";
          position: fixed;
          inset: auto;
          pointer-events: none;
          z-index: 0;
          filter: blur(48px);
          opacity: 0.55;
        }

        .router-home::before {
          top: 10%;
          left: -4%;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          background: rgba(20, 210, 150, 0.08);
          animation: orbitDrift 16s ease-in-out infinite;
        }

        .router-home::after {
          right: -2%;
          bottom: 12%;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.08);
          animation: orbitDriftAlt 18s ease-in-out infinite;
        }

        .dark .router-home {
          --bg-base: #050709;
          --bg-surface: #0c0f14;
          --bg-elevated: #141920;
          --bg-subtle: #1c2330;
          --border-default: rgba(255, 255, 255, 0.06);
          --border-strong: rgba(255, 255, 255, 0.12);
          --border-accent: rgba(20, 210, 150, 0.35);
          --text-primary: #f0f2f5;
          --text-secondary: #8b95a3;
          --text-muted: #4a5568;
          --text-inverse: #050709;
          --nav-bg: rgba(5, 7, 9, 0.85);
          --hero-highlight: rgba(20, 210, 150, 0.1);
          --hero-soft: rgba(255, 255, 255, 0.05);
          --surface-tint: rgba(12, 15, 20, 0.94);
          --surface-tint-strong: rgba(12, 15, 20, 0.98);
          --surface-shadow: 0 24px 56px rgba(0, 0, 0, 0.2);
          --surface-shadow-strong: 0 28px 72px rgba(0, 0, 0, 0.28);
          --shine-color: rgba(255, 255, 255, 0.18);
          background:
            radial-gradient(circle at 100% 0%, var(--hero-highlight), transparent 28%),
            radial-gradient(circle at 0% 0%, var(--hero-soft), transparent 20%),
            var(--bg-base);
        }

        .dark .router-home .hero-label,
        .dark .router-home .section-pill {
          background: rgba(255, 255, 255, 0.02);
        }

        .dark .router-home .usage-side-item {
          background: rgba(255, 255, 255, 0.02);
        }

        .container-shell {
          margin: 0 auto;
          max-width: 1200px;
          padding-left: var(--space-page);
          padding-right: var(--space-page);
          position: relative;
          z-index: 1;
        }

        .mono-brand,
        .mono-eyebrow,
        .mono-hint,
        .nav-link,
        .public-badge,
        .terminal-line,
        .plan-tokens,
        .plan-duration,
        .stats-strip,
        .masked-key,
        .recommend-pill,
        .footer-brand,
        .ghost-button,
        .contact-button {
          font-family: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        }

        .sticky-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid var(--border-default);
          backdrop-filter: blur(12px);
          background: var(--nav-bg);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
        }

        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 52px;
          gap: 16px;
        }

        .brand-row,
        .brand-lockup,
        .nav-utility,
        .live-indicator,
        .hero-cta-row,
        .usage-input-shell,
        .usage-input-row,
        .result-bar-left,
        .result-bar-right,
        .feature-pill,
        .footer-top,
        .footer-links,
        .footer-bottom,
        .nav-center {
          display: flex;
          align-items: center;
        }

        .brand-lockup {
          gap: 12px;
        }

        .brand-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
          animation: livePulse 2s infinite;
        }

        .mono-brand {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.08em;
        }

        .public-badge,
        .nav-link,
        .mono-eyebrow,
        .terminal-line,
        .stats-strip,
        .plan-badge,
        .value-badge {
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .public-badge,
        .plan-badge {
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 10px;
          padding: 2px 8px;
        }

        .nav-center {
          gap: 28px;
        }

        .nav-link {
          appearance: none;
          border: 0;
          background: transparent;
          padding: 0;
          cursor: pointer;
          font-size: 11px;
          color: var(--text-muted);
          transition: color 150ms ease;
        }

        .nav-link:hover {
          color: var(--text-primary);
        }

        .nav-utility {
          gap: 10px;
        }

        .ghost-button,
        .hero-primary,
        .hero-secondary,
        .plan-cta,
        .check-button,
        .retry-button,
        .copy-button,
        .theme-toggle-button,
        .contact-button {
          border-radius: var(--radius-md);
          transition: transform 150ms ease, background 150ms ease, border-color 150ms ease, color 150ms ease, filter 150ms ease;
        }

        .ghost-button {
          border: 1px solid var(--border-strong);
          background: transparent;
          color: var(--text-primary);
          font-size: 11px;
          padding: 6px 16px;
        }

        .ghost-button:hover,
        .hero-secondary:hover,
        .retry-button:hover,
        .copy-button:hover,
        .theme-toggle-button:hover,
        .contact-button:hover {
          background: var(--bg-elevated);
        }

        .hero-primary,
        .check-button,
        .plan-cta-primary {
          background: var(--accent);
          color: var(--text-inverse);
        }

        .hero-primary:hover,
        .check-button:hover,
        .plan-cta-primary:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .theme-toggle-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: 1px solid var(--border-strong);
          background: transparent;
          color: var(--text-secondary);
        }

        .theme-toggle-button:hover {
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .contact-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border: 1px solid var(--border-strong);
          color: var(--text-primary);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          gap: 48px;
          padding-top: 96px;
          padding-bottom: 80px;
          align-items: center;
          position: relative;
        }

        .hero-label,
        .section-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border-strong);
          border-radius: 999px;
          padding: 4px 12px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.4);
        }

        .hero-title {
          margin-top: 20px;
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 600;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .hero-title-muted {
          display: block;
          color: var(--text-secondary);
        }

        .hero-copy {
          max-width: 520px;
          margin-top: 20px;
          color: var(--text-secondary);
          font-size: 16px;
          line-height: 1.75;
        }

        .hero-cta-row {
          gap: 12px;
          margin-top: 36px;
          flex-wrap: wrap;
        }

        .hero-primary,
        .hero-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          font-size: 14px;
          font-weight: 500;
        }

        .hero-secondary {
          border: 1px solid var(--border-strong);
          color: var(--text-secondary);
          background: transparent;
        }

        .hero-secondary:hover {
          color: var(--text-primary);
        }

        .terminal-line {
          margin-top: 32px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .hero-signal-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          max-width: 720px;
          margin-top: 28px;
        }

        .hero-signal-card {
          position: relative;
          overflow: hidden;
          padding: 16px 18px;
          border-radius: 14px;
          border: 1px solid var(--border-default);
          background: linear-gradient(180deg, var(--surface-tint-strong), var(--surface-tint));
          box-shadow: var(--surface-shadow);
          animation: signalFloat 7.5s ease-in-out infinite;
        }

        .hero-signal-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 20%, rgba(255, 255, 255, 0.16) 50%, transparent 80%);
          transform: translateX(-140%);
          opacity: 0;
          animation: signalSweep 8.5s ease-in-out infinite;
        }

        .hero-signal-value {
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }

        .hero-signal-label {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        .hero-signal-grid .hero-signal-card:nth-child(2) {
          animation-delay: 1.2s;
        }

        .hero-signal-grid .hero-signal-card:nth-child(2)::after {
          animation-delay: 1.6s;
        }

        .hero-signal-grid .hero-signal-card:nth-child(3) {
          animation-delay: 2.4s;
        }

        .hero-signal-grid .hero-signal-card:nth-child(3)::after {
          animation-delay: 2.8s;
        }

        .plan-capacity-head,
        .usage-compare-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .usage-compare-pill {
          border-radius: 999px;
          border: 1px solid var(--border-accent);
          background: rgba(20, 210, 150, 0.08);
          color: var(--accent);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 10px;
          white-space: nowrap;
        }

        .cursor {
          margin-left: 2px;
          animation: blink 1s step-end infinite;
        }

        .quota-widget {
          margin-left: auto;
          width: min(100%, 360px);
          padding: 20px;
          background: linear-gradient(180deg, var(--surface-tint-strong), var(--surface-tint));
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: var(--surface-shadow-strong);
          position: relative;
          overflow: hidden;
          animation: panelFloat 8.5s ease-in-out infinite;
        }

        .quota-widget::before,
        .pricing-card::before,
        .checker-panel::before,
        .usage-side-panel::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--shine-color), transparent);
        }

        .quota-widget::after,
        .checker-panel::after,
        .usage-side-panel::after,
        .stats-grid::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 20% 20%, rgba(20, 210, 150, 0.12), transparent 30%);
          opacity: 0.28;
          animation: ambientPulse 7s ease-in-out infinite;
        }

        .quota-header,
        .pricing-card-header,
        .usage-result-bar,
        .usage-result-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .mono-eyebrow {
          font-size: 11px;
          color: var(--text-muted);
        }

        .mono-accent {
          color: var(--accent);
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
          animation: livePulse 2s infinite;
        }

        .quota-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 16px;
        }

        .countdown-skeleton {
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 42px;
          font-weight: 500;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .quota-subtle,
        .footer-label,
        .metric-sub,
        .meta-value,
        .state-copy,
        .footer-copy {
          color: var(--text-secondary);
        }

        .quota-subtle,
        .footer-label,
        .footer-copy {
          font-size: 12px;
        }

        .progress-ring-shell {
          position: relative;
          width: 80px;
          height: 80px;
        }

        .progress-ring {
          transform: rotate(-90deg);
        }

        .progress-track,
        .progress-value {
          fill: none;
          stroke-width: 4px;
        }

        .progress-track {
          stroke: var(--border-default);
        }

        .progress-value {
          stroke: var(--accent);
          stroke-linecap: round;
          transition: stroke-dashoffset 300ms ease;
        }

        .progress-ring-label {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-size: 13px;
          color: var(--text-primary);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
        }

        .hourly-bars {
          display: grid;
          grid-template-columns: repeat(24, minmax(0, 1fr));
          gap: 4px;
          align-items: end;
          height: 48px;
          margin-top: 16px;
        }

        .hour-bar {
          display: flex;
          align-items: end;
          height: 100%;
        }

        .hour-bar span {
          width: 100%;
          border-radius: 2px 2px 0 0;
          background: var(--border-default);
        }

        .hour-bar-past span {
          background: rgba(20, 210, 150, 0.4);
        }

        .hour-bar-current span {
          background: var(--accent);
        }

        .hour-bar-future span {
          background: rgba(255, 255, 255, 0.08);
        }

        .quota-footer {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--border-default);
        }

        .footer-value {
          margin-top: 4px;
          color: var(--text-primary);
          font-size: 13px;
        }

        .section-divider {
          margin: 0 var(--space-page);
          border-top: 1px solid var(--border-default);
        }

        .pricing-section,
        .usage-section,
        .stats-section {
          padding-top: 80px;
          padding-bottom: 80px;
        }

        .pricing-section {
          text-align: center;
        }

        .section-heading {
          margin-top: 16px;
          font-size: 36px;
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }

        .section-copy {
          max-width: 520px;
          margin: 12px auto 0;
          color: var(--text-secondary);
          font-size: 16px;
          line-height: 1.6;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          max-width: 960px;
          margin: 48px auto 0;
          text-align: left;
        }

        .pricing-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 100%;
          padding: 28px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
          position: relative;
          overflow: hidden;
          box-shadow: var(--surface-shadow);
          animation: pricingGlow 6.8s ease-in-out infinite;
        }

        .pricing-card::after {
          content: "";
          position: absolute;
          inset: -20% auto auto -35%;
          width: 60%;
          height: 160%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
          transform: rotate(18deg);
          opacity: 0;
          pointer-events: none;
          animation: pricingSweep 7.5s ease-in-out infinite;
        }

        .pricing-card:hover {
          transform: translateY(-4px);
          border-color: var(--border-strong);
          box-shadow: var(--surface-shadow-strong);
        }

        .pricing-card-featured {
          border-color: var(--border-accent);
          background: linear-gradient(180deg, var(--surface-tint-strong), rgba(20, 210, 150, 0.07));
        }

        .pricing-card-featured:hover {
          border-color: var(--border-accent);
        }

        .pricing-grid .pricing-card:nth-child(2) {
          animation-delay: 1.1s;
        }

        .pricing-grid .pricing-card:nth-child(2)::after {
          animation-delay: 1.4s;
        }

        .pricing-grid .pricing-card:nth-child(3) {
          animation-delay: 2.2s;
        }

        .pricing-grid .pricing-card:nth-child(3)::after {
          animation-delay: 2.8s;
        }

        .value-badge {
          border-radius: var(--radius-sm);
          background: var(--accent);
          color: var(--text-inverse);
          font-size: 10px;
          padding: 3px 8px;
        }

        .plan-badge-accent {
          color: var(--accent);
          border-color: rgba(20, 210, 150, 0.4);
        }

        .plan-price {
          margin-top: 16px;
          font-size: 40px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        .plan-tokens {
          margin-top: 4px;
          color: var(--accent);
          font-size: 13px;
        }

        .plan-duration {
          margin-top: 6px;
          color: var(--text-muted);
          font-size: 11px;
        }

        .plan-divider {
          margin: 20px 0;
          border-top: 1px solid var(--border-default);
        }

        .plan-description {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.6;
        }

        .plan-capacity-panel {
          position: relative;
          overflow: hidden;
          margin-top: 18px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--border-strong);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 100%),
            color-mix(in srgb, var(--bg-elevated) 88%, transparent);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          display: grid;
          gap: 12px;
        }

        .plan-capacity-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(120deg, transparent 18%, rgba(255, 255, 255, 0.05) 50%, transparent 82%);
          transform: translateX(-120%);
          animation: chartSweep 16s ease-in-out infinite;
        }

        .plan-capacity-value {
          color: var(--accent);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 17px;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin-top: 6px;
        }

        .plan-capacity-badge {
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px solid var(--border-default);
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-secondary);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .plan-capacity-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          color: var(--text-muted);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .plan-capacity-meta span {
          position: relative;
          padding-left: 12px;
        }

        .plan-capacity-meta span::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: rgba(20, 210, 150, 0.5);
          transform: translateY(-50%);
        }

        .plan-capacity-visual {
          position: relative;
          overflow: hidden;
          padding: 14px 12px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-default);
          background:
            linear-gradient(180deg, rgba(20, 210, 150, 0.03), transparent 55%),
            rgba(255, 255, 255, 0.015);
        }

        .plan-capacity-grid {
          position: absolute;
          inset: 10px 12px 26px;
          border-radius: 8px;
          background-image:
            linear-gradient(to top, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 100% 25%, calc(100% / 7) 100%;
          opacity: 0.7;
        }

        .plan-capacity-bars {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
          align-items: end;
          height: 92px;
          position: relative;
        }

        .plan-capacity-bar {
          display: flex;
          justify-content: center;
          align-items: end;
          height: 100%;
        }

        .plan-capacity-track {
          position: relative;
          width: 8px;
          height: 100%;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
        }

        .plan-capacity-track span {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(20, 210, 150, 0.98), rgba(20, 210, 150, 0.26));
          box-shadow:
            0 0 0 1px rgba(20, 210, 150, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .plan-capacity-bar:nth-child(4) .plan-capacity-track span {
          background: linear-gradient(180deg, rgba(20, 210, 150, 1), rgba(20, 210, 150, 0.34));
        }

        .plan-capacity-labels {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
          color: var(--text-muted);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 10px;
          text-align: center;
          margin-top: 10px;
        }

        .plan-capacity-note {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.6;
        }

        .plan-specs {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .plan-specs li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .plan-specs li :global(svg) {
          margin-top: 2px;
          color: var(--accent);
          flex-shrink: 0;
        }

        .pricing-card-actions {
          margin-top: 24px;
        }

        .plan-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 44px;
          font-size: 14px;
          font-weight: 500;
        }

        .plan-cta-secondary {
          border: 1px solid var(--border-strong);
          background: transparent;
          color: var(--text-primary);
        }

        .plan-cta-secondary:hover {
          background: var(--bg-elevated);
        }

        .plan-link {
          appearance: none;
          border: 0;
          background: transparent;
          cursor: pointer;
          margin-top: 8px;
          width: 100%;
          color: var(--text-muted);
          font-size: 13px;
          text-align: center;
        }

        .plan-link:hover {
          color: var(--text-secondary);
        }

        .stats-strip {
          margin-top: 32px;
          color: var(--text-muted);
          font-size: 11px;
        }

        .usage-section {
          background:
            linear-gradient(180deg, var(--surface-tint-strong), var(--surface-tint)),
            var(--bg-surface);
          border-top: 1px solid var(--border-default);
          border-bottom: 1px solid var(--border-default);
        }

        .usage-head {
          max-width: 760px;
        }

        .usage-copy {
          max-width: 580px;
          margin-top: 12px;
          margin-bottom: 40px;
          color: var(--text-secondary);
          font-size: 16px;
          line-height: 1.6;
        }

        .feature-pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 32px;
        }

        .feature-pill {
          gap: 8px;
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid var(--border-default);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 12px;
        }

        .feature-pill :global(svg) {
          color: var(--text-muted);
        }

        .usage-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.7fr);
          gap: 24px;
          align-items: start;
        }

        .checker-panel,
        .usage-side-panel {
          position: relative;
          border: 1px solid var(--border-default);
          border-radius: 20px;
          background: linear-gradient(180deg, var(--surface-tint-strong), var(--surface-tint));
          box-shadow: var(--surface-shadow-strong);
          overflow: hidden;
          animation: surfaceDrift 10s ease-in-out infinite;
        }

        .checker-panel {
          padding: 24px;
        }

        .usage-form {
          max-width: none;
        }

        .usage-input-row {
          gap: 8px;
        }

        .usage-input-shell {
          position: relative;
          flex: 1;
          min-height: 48px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-strong);
          background: var(--bg-elevated);
        }

        .usage-input-shell :global(svg) {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .key-input {
          width: 100%;
          min-height: 48px;
          padding: 0 14px 0 44px;
          background: transparent;
          color: var(--text-primary);
          font-size: 14px;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          border-radius: var(--radius-md);
        }

        .key-input::placeholder {
          color: var(--text-muted);
        }

        .key-input:focus {
          outline: none;
          border-color: transparent;
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .usage-input-shell:focus-within {
          border-color: var(--border-accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .usage-input-shell:focus-within :global(svg) {
          color: var(--text-secondary);
        }

        .check-button {
          min-width: 120px;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .check-button:disabled {
          filter: grayscale(0.1);
          cursor: default;
        }

        .check-button .spinner {
          margin-bottom: 0;
          gap: 5px;
        }

        .check-button .spinner span {
          width: 7px;
          height: 7px;
        }

        .hint-text {
          margin-top: 8px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .result-wrap {
          margin-top: 24px;
        }

        .usage-side-panel {
          padding: 24px;
          display: grid;
          gap: 18px;
          animation-delay: 1.4s;
        }

        .usage-side-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .usage-side-status {
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-accent);
          background: rgba(20, 210, 150, 0.08);
          color: var(--accent);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
        }

        .usage-side-title {
          font-size: 22px;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: -0.03em;
        }

        .usage-side-copy {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.7;
        }

        .usage-side-list {
          display: grid;
          gap: 10px;
        }

        .usage-side-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid var(--border-default);
          background: rgba(255, 255, 255, 0.32);
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .usage-side-item:hover {
          transform: translateX(4px);
          border-color: var(--border-strong);
        }

        .usage-side-item-featured {
          border-color: var(--border-accent);
          background: rgba(20, 210, 150, 0.05);
        }

        .usage-side-plan {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .usage-side-meta {
          margin-top: 4px;
          font-size: 11px;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          text-transform: uppercase;
        }

        .usage-side-price {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .usage-side-notes {
          display: grid;
          gap: 10px;
        }

        .usage-note {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.6;
        }

        .usage-note :global(svg) {
          margin-top: 1px;
          color: var(--accent);
          flex: 0 0 auto;
        }

        .usage-side-actions {
          display: grid;
          gap: 10px;
        }

        .usage-side-button,
        .usage-side-cta {
          display: inline-flex;
          align-items: center;
          width: 100%;
          justify-content: center;
          min-height: 44px;
        }

        .usage-side-button {
          font-size: 13px;
        }

        .usage-side-cta {
          font-size: 13px;
        }

        .result-state {
          border-radius: var(--radius-xl);
          padding: 64px;
          text-align: center;
        }

        .result-state-awaiting {
          border: 1px dashed var(--border-default);
        }

        .radar-shell {
          display: inline-grid;
          place-items: center;
          width: 80px;
          height: 80px;
          margin: 0 auto;
          position: relative;
        }

        .radar-outer {
          display: grid;
          place-items: center;
          width: 80px;
          height: 80px;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          color: var(--border-strong);
          animation: rotateSlow 10s linear infinite;
        }

        .radar-inner {
          position: absolute;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid var(--border-default);
        }

        .state-title {
          margin-top: 20px;
        }

        .state-copy {
          max-width: 520px;
          margin: 8px auto 0;
          font-size: 16px;
          line-height: 1.6;
        }

        .result-state-loading,
        .usage-result {
          border: 1px solid var(--border-accent);
          background: rgba(20, 210, 150, 0.02);
        }

        .spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .spinner span {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: var(--accent);
          animation: bounce 1s infinite ease-in-out;
        }

        .spinner span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .spinner span:nth-child(3) {
          animation-delay: 0.3s;
        }

        .loading-progress {
          max-width: 360px;
          height: 4px;
          margin: 20px auto 0;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
          border-radius: 999px;
        }

        .loading-progress-bar {
          width: 40%;
          height: 100%;
          background: var(--accent);
          animation: loadingBar 1.4s ease-in-out infinite;
        }

        .result-state-error {
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.04);
        }

        .error-title {
          margin-top: 12px;
          font-size: 16px;
          font-weight: 500;
        }

        .retry-button {
          margin-top: 16px;
          padding: 11px 18px;
          border: 1px solid var(--border-strong);
          color: var(--text-primary);
        }

        .usage-result {
          overflow: hidden;
          text-align: left;
        }

        .usage-result-bar {
          padding: 14px 20px;
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border-default);
        }

        .result-bar-left {
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .result-bar-right {
          gap: 10px;
        }

        .masked-key {
          color: var(--text-muted);
          font-size: 12px;
        }

        .copy-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border-default);
          padding: 6px 10px;
          color: var(--text-secondary);
          font-size: 12px;
        }

        .usage-metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          padding: 20px;
        }

        .metric-card,
        .usage-panel,
        .meta-row {
          padding: 14px 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background: var(--bg-elevated);
        }

        .usage-panel {
          display: grid;
          gap: 16px;
        }

        .metric-label {
          color: var(--text-muted);
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .metric-value {
          margin-top: 8px;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 22px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .metric-value-accent {
          color: var(--accent);
        }

        .metric-value-success {
          color: var(--success);
        }

        .metric-value-warning {
          color: var(--warning);
        }

        .metric-value-danger {
          color: var(--danger);
        }

        .metric-sub {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.5;
        }

        .metric-progress {
          height: 4px;
          margin-top: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }

        .metric-progress span {
          display: block;
          height: 100%;
        }

        .progress-success {
          background: var(--success);
        }

        .progress-warning {
          background: var(--warning);
        }

        .progress-danger {
          background: var(--danger);
        }

        .usage-detail-grid {
          display: grid;
          grid-template-columns: 1.4fr 0.9fr;
          gap: 16px;
          padding: 0 20px 20px;
        }

        .sparkline-wrap {
          display: grid;
          gap: 12px;
        }

        .sparkline-title {
          color: var(--text-muted);
          font-size: 12px;
        }

        .sparkline {
          width: 100%;
          height: 80px;
        }

        .usage-compare-wrap {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid var(--border-default);
          background: rgba(255, 255, 255, 0.03);
          display: grid;
          gap: 14px;
        }

        .usage-compare-title {
          margin-top: 4px;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
        }

        .usage-compare-chart {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          align-items: end;
          min-height: 160px;
        }

        .usage-compare-column {
          display: flex;
          min-height: 160px;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .usage-compare-bar {
          display: block;
          width: 100%;
          max-width: 54px;
          min-height: 14px;
          border-radius: 14px 14px 6px 6px;
          animation: chartBarRise 6.4s ease-in-out infinite;
        }

        .usage-compare-bar-used {
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.85), rgba(59, 130, 246, 0.16));
        }

        .usage-compare-bar-remaining {
          background: linear-gradient(180deg, rgba(20, 210, 150, 0.95), rgba(20, 210, 150, 0.18));
        }

        .usage-compare-bar-forecast {
          background: linear-gradient(180deg, rgba(245, 158, 11, 0.9), rgba(245, 158, 11, 0.18));
        }

        .usage-compare-column strong {
          color: var(--text-primary);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 13px;
          font-weight: 500;
        }

        .usage-compare-column small {
          color: var(--text-muted);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .usage-compare-note {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.5;
        }

        .usage-panel-meta {
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .meta-row-wide .meta-value {
          display: -webkit-box;
          overflow: hidden;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .meta-value {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.5;
        }

        .usage-result-action {
          padding: 16px 20px;
          border-top: 1px solid var(--border-default);
          color: var(--text-secondary);
          font-size: 13px;
        }

        .recommend-pill {
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid var(--border-accent);
          color: var(--accent);
          font-size: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border: 1px solid var(--border-default);
          border-radius: 20px;
          overflow: hidden;
          background: linear-gradient(180deg, var(--surface-tint-strong), var(--surface-tint));
          position: relative;
        }

        .stat-item {
          padding: 40px 24px;
          text-align: center;
          border-right: 1px solid var(--border-default);
          position: relative;
          animation: statLift 8s ease-in-out infinite;
        }

        .stat-item:nth-child(2) {
          animation-delay: 1s;
        }

        .stat-item:nth-child(3) {
          animation-delay: 2s;
        }

        .stat-item:nth-child(4) {
          animation-delay: 3s;
        }

        .stat-item:last-child {
          border-right: 0;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        .stat-label {
          margin-top: 10px;
          color: var(--text-muted);
          font-size: 13px;
        }

        .stat-chart {
          display: block;
          width: 100%;
          height: 44px;
          margin: 16px auto 0;
        }

        .stat-chart-line {
          fill: none;
          stroke: var(--accent);
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .stat-note {
          max-width: 180px;
          margin: 12px auto 0;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.55;
        }

        .site-footer {
          border-top: 1px solid var(--border-default);
          padding-top: 40px;
          padding-bottom: 40px;
        }

        .footer-top {
          justify-content: space-between;
          gap: 24px;
        }

        .footer-brand {
          font-size: 13px;
          letter-spacing: 0.06em;
        }

        .footer-links {
          gap: 24px;
          color: var(--text-muted);
          font-size: 13px;
        }

        .footer-links a:hover {
          color: var(--text-secondary);
        }

        .footer-bottom {
          margin-top: 24px;
          padding-top: 16px;
          justify-content: space-between;
          gap: 16px;
          border-top: 1px solid var(--border-default);
          color: var(--text-muted);
          font-size: 12px;
        }

        .reveal-item {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .reveal-item.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .pricing-grid :global(.reveal-item:nth-child(2)) {
          transition-delay: 60ms;
        }

        .pricing-grid :global(.reveal-item:nth-child(3)) {
          transition-delay: 120ms;
        }

        @media (max-width: 1024px) {
          .container-shell {
            padding-left: 32px;
            padding-right: 32px;
          }

          .hero-grid {
            grid-template-columns: 1fr;
          }

          .quota-widget {
            margin-left: 0;
          }

          .pricing-grid {
            overflow-x: auto;
            grid-template-columns: repeat(3, minmax(280px, 1fr));
            padding-bottom: 4px;
            scroll-snap-type: x proximity;
          }

          .pricing-card {
            scroll-snap-align: start;
          }

          .usage-layout,
          .usage-metric-grid,
          .usage-detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .usage-side-panel {
            grid-column: span 2;
          }

          .usage-panel:first-child {
            grid-column: span 2;
          }

        }

        @media (max-width: 767px) {
          .container-shell {
            padding-left: 20px;
            padding-right: 20px;
          }

          .nav-center {
            display: none;
          }

          .hero-grid,
          .pricing-section,
          .usage-section,
          .stats-section {
            padding-top: 56px;
            padding-bottom: 56px;
          }

          .hero-title {
            font-size: clamp(32px, 8vw, 48px);
          }

          .hero-cta-row {
            flex-direction: column;
            align-items: stretch;
          }

          .hero-signal-grid {
            grid-template-columns: 1fr;
          }

          .usage-compare-head,
          .plan-capacity-head {
            flex-direction: column;
            align-items: flex-start;
          }

          .section-divider {
            margin: 0 20px;
          }

          .pricing-grid {
            grid-template-columns: 1fr;
            overflow: visible;
          }

          .pricing-card-featured {
            order: -1;
          }

          .usage-input-row {
            flex-direction: column;
          }

          .checker-panel,
          .usage-side-panel {
            padding: 20px;
          }

          .check-button {
            width: 100%;
          }

          .result-state {
            padding: 32px 20px;
          }

          .usage-metric-grid,
          .usage-detail-grid,
          .stats-grid,
          .footer-top,
          .footer-bottom {
            grid-template-columns: 1fr;
            flex-direction: column;
            align-items: flex-start;
          }

          .usage-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .usage-layout,
          .usage-detail-grid {
            display: grid;
            grid-template-columns: 1fr;
          }

          .usage-side-panel {
            grid-column: auto;
          }

          .usage-panel:first-child {
            grid-column: auto;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .stat-item:nth-child(2n) {
            border-right: 0;
          }

          .stat-item:nth-child(-n + 2) {
            border-bottom: 1px solid var(--border-default);
          }

          .usage-result-bar,
          .usage-result-action,
          .quota-main {
            flex-direction: column;
            align-items: flex-start;
          }

          .usage-compare-chart {
            min-height: 132px;
          }

          .result-bar-right {
            width: 100%;
            justify-content: space-between;
          }
        }

        @keyframes livePulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.72;
          }
        }

        @keyframes blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }

        @keyframes rotateSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          40% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }

        @keyframes loadingBar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(60%);
          }
          100% {
            transform: translateX(180%);
          }
        }

        @keyframes pricingGlow {
          0%,
          100% {
            border-color: var(--border-default);
            box-shadow: 0 24px 56px rgba(0, 0, 0, 0.2);
          }
          50% {
            border-color: rgba(255, 255, 255, 0.14);
            box-shadow: 0 30px 68px rgba(0, 0, 0, 0.28);
          }
        }

        @keyframes pricingSweep {
          0%,
          68%,
          100% {
            opacity: 0;
            transform: translateX(0) rotate(18deg);
          }
          12%,
          28% {
            opacity: 1;
          }
          36% {
            opacity: 0;
            transform: translateX(240%) rotate(18deg);
          }
        }

        @keyframes signalFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes signalSweep {
          0%,
          65%,
          100% {
            opacity: 0;
            transform: translateX(-140%);
          }
          14%,
          28% {
            opacity: 1;
          }
          36% {
            opacity: 0;
            transform: translateX(140%);
          }
        }

        @keyframes panelFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes surfaceDrift {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: var(--surface-shadow-strong);
          }
          50% {
            transform: translateY(-6px);
            box-shadow: 0 34px 82px rgba(0, 0, 0, 0.18);
          }
        }

        @keyframes ambientPulse {
          0%,
          100% {
            opacity: 0.16;
            transform: scale(1);
          }
          50% {
            opacity: 0.32;
            transform: scale(1.06);
          }
        }

        @keyframes statLift {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes orbitDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(18px, -24px, 0) scale(1.08);
          }
        }

        @keyframes orbitDriftAlt {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-20px, 18px, 0) scale(1.12);
          }
        }

        @keyframes chartDraw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes chartPulse {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes chartSweep {
          0%,
          70%,
          100% {
            opacity: 0;
            transform: translateX(-120%);
          }
          14%,
          28% {
            opacity: 1;
          }
          38% {
            opacity: 0;
            transform: translateX(120%);
          }
        }

        @keyframes chartBarRise {
          0%,
          100% {
            transform: translateY(0) scaleY(1);
            filter: saturate(1);
          }
          50% {
            transform: translateY(-3px) scaleY(1.02);
            filter: saturate(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .router-home::before,
          .router-home::after,
          .hero-signal-card,
          .hero-signal-card::after,
          .quota-widget,
          .quota-widget::after,
          .checker-panel,
          .checker-panel::after,
          .usage-side-panel,
          .usage-side-panel::after,
          .stats-grid::after,
          .stat-item,
          .stat-chart-line,
          .pricing-card,
          .pricing-card::after,
          .plan-capacity-panel::after,
          .plan-capacity-bar span,
          .usage-compare-bar {
            animation: none;
          }
        }
      `}</style>

      <nav className="sticky-nav">
        <div className="container-shell nav-inner">
          <div className="brand-lockup">
            <span className="brand-dot" />
            <span className="mono-brand">AROUTER</span>
            <span className="public-badge">PUBLIC ACCESS</span>
          </div>

          <div className="nav-center">
            <button type="button" className="nav-link" onClick={() => scrollToId("usage-checker", true)}>
              CHECK USAGE
            </button>
            <button type="button" className="nav-link" onClick={() => scrollToId("weekly-plans")}>
              WEEKLY PLANS
            </button>
            <Link href="/docs" className="nav-link">
              DOCS
            </Link>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="nav-link">
              CONTACT
            </a>
          </div>

          <div className="nav-utility">
            <button
              type="button"
              className="theme-toggle-button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              title={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
              <Icon name={isDark ? "sun" : "moon"} className="h-4 w-4" />
            </button>
            <Link href="/docs" className="contact-button">
              <Icon name="terminal" className="h-4 w-4" />
              <span>Docs</span>
            </Link>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="contact-button">
              <Icon name="arrow" className="h-4 w-4" />
              <span>Contact</span>
            </a>
          </div>
        </div>
      </nav>

      <section className="container-shell hero-grid">
        <div className="reveal-item is-visible">
          <div className="hero-label">
            <Icon name="terminal" className="h-4 w-4" />
            <span>Public token checker</span>
          </div>

          <h1 className="hero-title">
            Check your token usage.
            <span className="hero-title-muted">Pick the right weekly plan.</span>
          </h1>

          <p className="hero-copy">
            Paste your API key to inspect quota, token burn rate, and reset window - then choose a weekly package that matches your actual usage. No account required.
          </p>

          <div className="hero-cta-row">
            <button type="button" className="hero-primary" onClick={() => scrollToId("usage-checker", true)}>
              <Icon name="search" className="h-4 w-4" />
              <span>Check usage now</span>
            </button>
            <button type="button" className="hero-secondary" onClick={() => scrollToId("weekly-plans")}>
              <span>View plans</span>
            </button>
          </div>

          <p className="terminal-line">
            $ quota.inspect --api-key &lt;your-key&gt; --pricing-visible --daily-reset
            <span className="cursor">|</span>
          </p>

          <div className="hero-signal-grid">
            {HERO_SIGNAL_CARDS.map((item) => (
              <div key={item.label} className="hero-signal-card">
                <p className="hero-signal-value">{item.value}</p>
                <p className="hero-signal-label">{item.label}</p>
              </div>
            ))}
          </div>

        </div>

        <QuotaEpochWidget countdown={countdown} />
      </section>

      <div className="section-divider" />

      <section id="weekly-plans" className="container-shell pricing-section">
        <div className="section-pill">WEEKLY PLANS</div>
        <h2 className="section-heading">All packages. Transparent pricing. No upsells.</h2>
        <p className="section-copy">
          Compare before you commit. Each plan runs for exactly 7 days from activation.
        </p>

        <div className="pricing-grid">
          {PRICING_OPTIONS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} onScrollToChecker={() => scrollToId("usage-checker", true)} />
          ))}
        </div>

        <p className="stats-strip">WEEKLY ACCESS · VISIBLE PRICING · NO HIDDEN OPTIONS · CANCEL ANYTIME</p>
      </section>

      <section id="usage-checker" className="usage-section">
        <div className="container-shell">
          <div className="usage-head reveal-item" data-reveal>
            <div className="section-pill">USAGE CHECKER</div>
            <h2 className="section-heading">Check usage before you buy or top up.</h2>
            <p className="usage-copy">
              Paste your API key to inspect request volume, token burn, quota limits, expiry, and the next reset window. Secure scan - your key is never stored.
            </p>
          </div>

          <FeaturePills />

          <div className="usage-layout">
            <div className="checker-panel reveal-item" data-reveal>
              <form className="usage-form" onSubmit={handleSubmit}>
                <div className="usage-input-row">
                  <div className="usage-input-shell">
                    <Icon name="key" className="h-4 w-4" />
                    <input
                      id="api-key-input"
                      ref={inputRef}
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      className="key-input"
                      placeholder="Paste API key..."
                      autoComplete="off"
                    />
                  </div>
                  <button id="check-btn" type="submit" className="check-button" disabled={phase === "loading"}>
                    {phase === "loading" ? (
                      <>
                        <span className="spinner" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="search" className="h-4 w-4" />
                        <span>Check</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="hint-text">Your key is only used for this lookup and is never stored or logged.</p>
              </form>

              <div className="result-wrap" aria-live="polite">
                {statusView}
              </div>
            </div>

            <UsagePlanRail onScrollToPlans={() => scrollToId("weekly-plans")} />
          </div>
        </div>
      </section>

      <section className="container-shell stats-section">
        <div className="stats-grid">
          {STATS.map((item) => (
            <div key={item.label} className="stat-item">
              <p className="stat-value">{item.value}</p>
              <p className="stat-label">{item.label}</p>
              <StatMiniChart values={item.trend} />
              <p className="stat-note">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="container-shell">
          <div className="footer-top">
            <div>
              <div className="brand-lockup">
                <span className="brand-dot" />
                <span className="footer-brand">AROUTER</span>
                <span className="public-badge">PUBLIC ACCESS</span>
              </div>
              <p className="footer-copy">AI token distribution. Powered by ARouter.</p>
            </div>

            <div className="footer-links">
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                Contact
              </a>
            </div>
          </div>

          <div className="footer-bottom">
            <span>&copy; 2026 ARouter. All rights reserved.</span>
            <span>Vietnam · UTC+7</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
