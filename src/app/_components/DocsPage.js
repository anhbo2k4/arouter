"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTheme } from "@/shared/hooks/useTheme";
import { AROUTER_BASE_URL, DOCS_TOOLS, TELEGRAM_URL } from "./docs/docsData";

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
    case "copy":
      return (
        <svg {...props}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
      );
    case "link":
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10.5 5.43" />
          <path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 7.07 7.07l.91-.9" />
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
    case "download":
      return (
        <svg {...props}>
          <path d="M12 3v11" />
          <path d="m8 10 4 4 4-4" />
          <path d="M4 20h16" />
        </svg>
      );
    case "folder":
      return (
        <svg {...props}>
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
        </svg>
      );
    case "checklist":
      return (
        <svg {...props}>
          <path d="m8 7 1.5 1.5L12 6" />
          <path d="M14 7h4" />
          <path d="m8 12 1.5 1.5L12 11" />
          <path d="M14 12h4" />
          <path d="m8 17 1.5 1.5L12 16" />
          <path d="M14 17h4" />
        </svg>
      );
    case "info":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v5" />
          <path d="M12 7h.01" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...props}>
          <path d="M5 12h14" />
          <path d="m13 5 7 7-7 7" />
        </svg>
      );
    default:
      return null;
  }
}

function ToolCard({ tool, onCopy, copiedKey }) {
  return (
    <article id={tool.id} className="docs-tool-card">
      <div className="docs-tool-header">
        <div className="docs-tool-title-wrap">
          <div className="docs-tool-icon">
            <Icon name={tool.icon} className="h-4 w-4" />
          </div>
          <div>
            <h2 className="docs-tool-title">{tool.name}</h2>
            <p className="docs-tool-summary">{tool.summary}</p>
          </div>
        </div>
        <span className="docs-tool-badge">{tool.setupType}</span>
      </div>

      <div className="docs-meta-row">
        <div className="docs-meta-item">
          <Icon name="folder" className="h-4 w-4" />
          <span>{tool.configPath}</span>
        </div>
        {tool.installCommand ? (
          <div className="docs-meta-item">
            <Icon name="download" className="h-4 w-4" />
            <code>{tool.installCommand}</code>
          </div>
        ) : null}
      </div>

      <div className="docs-section">
        <div className="docs-section-head">
          <Icon name="checklist" className="h-4 w-4" />
          <span>Setup Steps</span>
        </div>
        <ol className="docs-steps">
          {tool.steps.map((step) => (
            <li key={step}>
              <span className="docs-step-index" />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {tool.notes?.length ? (
        <div className="docs-notes">
          {tool.notes.map((note) => (
            <div key={note.text} className="docs-note">
              <Icon name="info" className="h-4 w-4" />
              <span>{note.text}</span>
            </div>
          ))}
        </div>
      ) : null}

      {tool.snippets?.length ? (
        <div className="docs-snippets">
          {tool.snippets.map((snippet, index) => {
            const copyId = `${tool.id}-${index}`;
            return (
              <section key={copyId} className="docs-code-card">
                <div className="docs-code-top">
                  <div>
                    <p className="docs-code-language">{snippet.language.toUpperCase()}</p>
                    <p className="docs-code-file">{snippet.filename}</p>
                  </div>
                  <button type="button" className="docs-copy-button" onClick={() => onCopy(copyId, snippet.code)}>
                    <Icon name="copy" className="h-4 w-4" />
                    <span>{copiedKey === copyId ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="docs-code-block">
                  <code>{snippet.code}</code>
                </pre>
              </section>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

export default function DocsPage() {
  const { toggleTheme, isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return DOCS_TOOLS;

    return DOCS_TOOLS.filter((tool) => {
      const haystack = [
        tool.name,
        tool.setupType,
        tool.configPath,
        tool.summary,
        ...(tool.tags || []),
        ...(tool.steps || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [query]);

  async function handleCopy(key, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1400);
    } catch {
      setCopiedKey("");
    }
  }

  return (
    <main className="router-docs">
      <style jsx global>{`
        .router-docs {
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
          --accent-glow: rgba(20, 210, 150, 0.08);
          --surface-tint: rgba(255, 255, 255, 0.92);
          --surface-tint-strong: rgba(255, 255, 255, 0.98);
          --surface-shadow: 0 22px 58px rgba(24, 39, 75, 0.08);
          --surface-shadow-strong: 0 28px 72px rgba(24, 39, 75, 0.12);
          min-height: 100vh;
          background:
            radial-gradient(circle at 100% 0%, rgba(20, 210, 150, 0.12), transparent 28%),
            radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.72), transparent 22%),
            var(--bg-base);
          color: var(--text-primary);
        }

        .dark .router-docs {
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
          --surface-tint: rgba(12, 15, 20, 0.94);
          --surface-tint-strong: rgba(12, 15, 20, 0.98);
          --surface-shadow: 0 24px 56px rgba(0, 0, 0, 0.2);
          --surface-shadow-strong: 0 28px 72px rgba(0, 0, 0, 0.28);
          background:
            radial-gradient(circle at 100% 0%, rgba(20, 210, 150, 0.1), transparent 28%),
            radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.05), transparent 20%),
            var(--bg-base);
        }

        .docs-shell {
          width: min(1200px, calc(100% - 48px));
          margin: 0 auto;
        }

        .docs-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(12px);
          background: color-mix(in srgb, var(--bg-base) 82%, transparent);
          border-bottom: 1px solid var(--border-default);
        }

        .docs-nav-inner,
        .docs-brand,
        .docs-nav-actions,
        .docs-base-row,
        .docs-search-shell,
        .docs-tool-title-wrap,
        .docs-tool-header,
        .docs-meta-row,
        .docs-meta-item,
        .docs-section-head,
        .docs-code-top,
        .docs-note,
        .docs-footer {
          display: flex;
          align-items: center;
        }

        .docs-nav-inner {
          justify-content: space-between;
          min-height: 58px;
          gap: 16px;
        }

        .docs-brand {
          gap: 12px;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 14px;
          letter-spacing: 0.08em;
        }

        .docs-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 0 6px rgba(20, 210, 150, 0.12);
        }

        .docs-status {
          padding: 4px 10px;
          border: 1px solid var(--border-strong);
          border-radius: 999px;
          color: var(--text-muted);
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
        }

        .docs-nav-actions {
          gap: 10px;
        }

        .docs-theme-toggle,
        .docs-nav-link,
        .docs-copy-button,
        .docs-base-copy {
          border-radius: 10px;
          transition: background 150ms ease, color 150ms ease, border-color 150ms ease, transform 150ms ease;
        }

        .docs-theme-toggle {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-strong);
          color: var(--text-secondary);
        }

        .docs-nav-link,
        .docs-base-copy,
        .docs-copy-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border-strong);
          color: var(--text-primary);
          font-size: 12px;
          padding: 9px 14px;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
        }

        .docs-theme-toggle:hover,
        .docs-nav-link:hover,
        .docs-base-copy:hover,
        .docs-copy-button:hover {
          background: var(--bg-elevated);
          transform: translateY(-1px);
        }

        .docs-hero {
          padding: 80px 0 40px;
        }

        .docs-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
          gap: 28px;
          align-items: start;
        }

        .docs-hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          color: var(--text-secondary);
          background: color-mix(in srgb, var(--bg-surface) 70%, transparent);
          font-size: 12px;
        }

        .docs-title {
          margin-top: 18px;
          font-size: clamp(38px, 5vw, 62px);
          line-height: 1.04;
          letter-spacing: -0.04em;
          font-weight: 600;
        }

        .docs-title span {
          display: block;
          color: var(--text-secondary);
        }

        .docs-copy {
          max-width: 720px;
          margin-top: 20px;
          font-size: 16px;
          line-height: 1.75;
          color: var(--text-secondary);
        }

        .docs-base-card,
        .docs-search-card,
        .docs-tool-card {
          border: 1px solid var(--border-default);
          border-radius: 20px;
          background: linear-gradient(180deg, var(--surface-tint-strong), var(--surface-tint));
          box-shadow: var(--surface-shadow);
        }

        .docs-base-card {
          padding: 22px;
        }

        .docs-base-label {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
        }

        .docs-base-row {
          justify-content: space-between;
          gap: 16px;
          margin-top: 12px;
        }

        .docs-base-url {
          font-size: 16px;
          color: var(--text-primary);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          word-break: break-all;
        }

        .docs-search-wrap {
          padding: 0 0 40px;
        }

        .docs-search-card {
          padding: 20px;
        }

        .docs-search-shell {
          gap: 10px;
          min-height: 52px;
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          padding: 0 16px;
          background: var(--bg-elevated);
        }

        .docs-search-shell input {
          flex: 1;
          background: transparent;
          color: var(--text-primary);
          font-size: 14px;
        }

        .docs-search-shell input::placeholder {
          color: var(--text-muted);
        }

        .docs-search-shell input:focus {
          outline: none;
        }

        .docs-search-help {
          margin-top: 12px;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .docs-jump-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .docs-jump-list a {
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          background: var(--bg-surface);
          font-size: 12px;
        }

        .docs-jump-list a:hover {
          color: var(--text-primary);
          border-color: var(--border-strong);
        }

        .docs-list {
          display: grid;
          gap: 22px;
          padding-bottom: 52px;
        }

        .docs-tool-card {
          padding: 28px;
          scroll-margin-top: 80px;
        }

        .docs-tool-header {
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .docs-tool-title-wrap {
          align-items: flex-start;
          gap: 14px;
        }

        .docs-tool-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border-default);
          background: var(--bg-elevated);
          color: var(--accent);
          flex: 0 0 auto;
        }

        .docs-tool-title {
          font-size: 24px;
          line-height: 1.2;
          font-weight: 600;
          letter-spacing: -0.03em;
        }

        .docs-tool-summary {
          margin-top: 8px;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.7;
          max-width: 720px;
        }

        .docs-tool-badge {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-accent);
          background: rgba(20, 210, 150, 0.08);
          color: var(--accent);
          font-size: 11px;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          white-space: nowrap;
        }

        .docs-meta-row {
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
        }

        .docs-meta-item {
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid var(--border-default);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.5;
        }

        .docs-meta-item code {
          color: var(--text-primary);
          word-break: break-all;
        }

        .docs-section,
        .docs-notes,
        .docs-snippets {
          margin-top: 22px;
        }

        .docs-section-head {
          gap: 8px;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
        }

        .docs-steps {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }

        .docs-steps li {
          display: grid;
          grid-template-columns: 12px minmax(0, 1fr);
          gap: 12px;
          align-items: flex-start;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.75;
        }

        .docs-step-index {
          width: 10px;
          height: 10px;
          margin-top: 8px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 0 6px rgba(20, 210, 150, 0.12);
        }

        .docs-steps code,
        .docs-note code {
          padding: 2px 6px;
          border-radius: 6px;
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
          font-size: 12px;
        }

        .docs-notes {
          display: grid;
          gap: 12px;
        }

        .docs-note {
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--border-default);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.7;
          align-items: flex-start;
        }

        .docs-note :global(svg) {
          margin-top: 2px;
          color: var(--accent);
          flex: 0 0 auto;
        }

        .docs-snippets {
          display: grid;
          gap: 16px;
        }

        .docs-code-card {
          border: 1px solid var(--border-default);
          border-radius: 16px;
          overflow: hidden;
          background: color-mix(in srgb, var(--bg-elevated) 76%, var(--bg-surface));
        }

        .docs-code-top {
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-default);
          background: color-mix(in srgb, var(--bg-elevated) 86%, var(--bg-surface));
        }

        .docs-code-language {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
        }

        .docs-code-file {
          margin-top: 5px;
          color: var(--text-primary);
          font-size: 13px;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
        }

        .docs-code-block {
          overflow-x: auto;
          padding: 16px;
          color: var(--text-primary);
          font-size: 13px;
          line-height: 1.7;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
        }

        .docs-empty {
          padding: 48px 24px;
          border: 1px dashed var(--border-default);
          border-radius: 18px;
          text-align: center;
          color: var(--text-secondary);
          background: color-mix(in srgb, var(--bg-surface) 70%, transparent);
        }

        .docs-footer {
          justify-content: space-between;
          gap: 18px;
          padding: 30px 0 46px;
          border-top: 1px solid var(--border-default);
          color: var(--text-muted);
          font-size: 12px;
        }

        @media (max-width: 1024px) {
          .docs-hero-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767px) {
          .docs-shell {
            width: min(100% - 32px, 1200px);
          }

          .docs-nav-inner,
          .docs-base-row,
          .docs-tool-header,
          .docs-code-top,
          .docs-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .docs-nav-actions {
            width: 100%;
            justify-content: space-between;
          }

          .docs-nav-link {
            flex: 1;
            justify-content: center;
          }

          .docs-base-copy,
          .docs-copy-button {
            width: 100%;
            justify-content: center;
          }

          .docs-tool-card {
            padding: 22px 18px;
          }

          .docs-title {
            font-size: clamp(32px, 10vw, 46px);
          }

          .docs-jump-list {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 4px;
          }
        }
      `}</style>

      <nav className="docs-nav">
        <div className="docs-shell docs-nav-inner">
          <div className="docs-brand">
            <span className="docs-dot" />
            <span>AROUTER</span>
            <span className="docs-status">Docs Hub</span>
          </div>

          <div className="docs-nav-actions">
            <button
              type="button"
              className="docs-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              title={`Switch to ${isDark ? "light" : "dark"} mode`}
            >
              <Icon name={isDark ? "sun" : "moon"} className="h-4 w-4" />
            </button>
            <Link href="/" className="docs-nav-link">
              <Icon name="arrow" className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="docs-nav-link">
              <Icon name="link" className="h-4 w-4" />
              <span>Contact</span>
            </a>
          </div>
        </div>
      </nav>

      <section className="docs-shell docs-hero">
        <div className="docs-hero-grid">
          <div>
            <div className="docs-hero-pill">
              <Icon name="terminal" className="h-4 w-4" />
              <span>CLI Tool Setup Guides</span>
            </div>
            <h1 className="docs-title">
              Connect your favorite tools.
              <span>Route them through ARouter.</span>
            </h1>
            <p className="docs-copy">
              Step-by-step setup guides for Claude Code, Codex CLI, Cursor, Continue, MITM tools, and more. All
              guides are written for the same ARouter endpoint so teams can copy, paste, and connect fast.
            </p>
          </div>

          <aside className="docs-base-card">
            <p className="docs-base-label">Base URL for all tools</p>
            <div className="docs-base-row">
              <code className="docs-base-url">{AROUTER_BASE_URL}</code>
              <button type="button" className="docs-base-copy" onClick={() => handleCopy("base-url", AROUTER_BASE_URL)}>
                <Icon name="copy" className="h-4 w-4" />
                <span>{copiedKey === "base-url" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </aside>
        </div>
      </section>

      <section className="docs-shell docs-search-wrap">
        <div className="docs-search-card">
          <div className="docs-search-shell">
            <Icon name="search" className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools, paths, setup types, or config keywords..."
              aria-label="Search setup guides"
            />
          </div>
          <p className="docs-search-help">
            {filteredTools.length} guide{filteredTools.length === 1 ? "" : "s"} available. Search by tool name,
            config file, or setup type.
          </p>
          <div className="docs-jump-list">
            {filteredTools.map((tool) => (
              <a key={tool.id} href={`#${tool.id}`}>
                {tool.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="docs-shell docs-list">
        {filteredTools.length ? (
          filteredTools.map((tool) => <ToolCard key={tool.id} tool={tool} onCopy={handleCopy} copiedKey={copiedKey} />)
        ) : (
          <div className="docs-empty">
            <p>No setup guide matched your search.</p>
            <p>Try searching by tool name like `Codex`, `Cursor`, `Claude`, or `MITM`.</p>
          </div>
        )}
      </section>

      <div className="docs-shell docs-footer">
        <span>ARouter public setup guides · Endpoint-first onboarding for coding tools.</span>
        <span>Need help connecting a tool? Contact via Telegram.</span>
      </div>
    </main>
  );
}
