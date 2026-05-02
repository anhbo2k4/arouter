"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function LoginIcon({ name, className = "h-4 w-4" }) {
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
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3 5 6v6c0 4.4 2.9 8.4 7 9 4.1-.6 7-4.6 7-9V6l-7-3Z" />
          <path d="m9.5 12 1.7 1.7L14.8 10" />
        </svg>
      );
    case "lock":
      return (
        <svg {...props}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 1 1 8 0v3" />
        </svg>
      );
    case "spark":
      return (
        <svg {...props}>
          <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...props}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      try {
        const res = await fetch(`${baseUrl}/api/settings`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.requireLogin === false) {
            router.push("/dashboard");
            router.refresh();
            return;
          }
          setHasPassword(!!data.hasPassword);
        } else {
          setHasPassword(true);
        }
      } catch {
        clearTimeout(timeoutId);
        setHasPassword(true);
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (hasPassword === null) {
    return (
      <div className="login-shell">
        <style jsx>{`
          .login-shell {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at top, rgba(20, 210, 150, 0.08), transparent 32%),
              linear-gradient(180deg, #050709 0%, #0b0f15 100%);
            color: #f0f2f5;
          }
          .loader {
            width: 32px;
            height: 32px;
            border-radius: 999px;
            border: 2px solid rgba(255, 255, 255, 0.08);
            border-top-color: #14d296;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px;
          }
          p {
            color: #8b95a3;
            font-size: 14px;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <div>
          <div className="loader" />
          <p>Preparing secure access...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="login-shell">
      <style jsx>{`
        .login-shell {
          --bg-base: #050709;
          --bg-surface: #0c0f14;
          --bg-elevated: #141920;
          --bg-subtle: #1c2330;
          --border-default: rgba(255, 255, 255, 0.06);
          --border-strong: rgba(255, 255, 255, 0.12);
          --border-accent: rgba(20, 210, 150, 0.3);
          --text-primary: #f0f2f5;
          --text-secondary: #8b95a3;
          --text-muted: #4a5568;
          --text-inverse: #050709;
          --accent: #14d296;
          --accent-glow: rgba(20, 210, 150, 0.08);
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20, 210, 150, 0.08), transparent 28%),
            radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.08), transparent 26%),
            linear-gradient(180deg, #050709 0%, #0b0f15 100%);
          color: var(--text-primary);
        }

        .container {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 440px);
          gap: 40px;
          align-items: center;
          max-width: 1180px;
          margin: 0 auto;
          padding: 40px;
        }

        .brand-link,
        .mono,
        .chip,
        .meta {
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
        }

        .brand-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .brand-link:hover {
          color: var(--text-primary);
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 0 6px rgba(20, 210, 150, 0.08);
        }

        .left-panel {
          max-width: 620px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid var(--border-strong);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
        }

        .title {
          margin-top: 24px;
          font-size: clamp(36px, 4.8vw, 60px);
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 600;
        }

        .title span {
          display: block;
          color: var(--text-secondary);
        }

        .copy {
          margin-top: 20px;
          max-width: 520px;
          color: var(--text-secondary);
          font-size: 16px;
          line-height: 1.7;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 32px;
        }

        .feature-card {
          padding: 16px;
          border-radius: 14px;
          border: 1px solid var(--border-default);
          background: rgba(12, 15, 20, 0.72);
          backdrop-filter: blur(12px);
        }

        .feature-card :global(svg) {
          color: var(--accent);
          margin-bottom: 12px;
        }

        .feature-card h3 {
          font-size: 14px;
          font-weight: 500;
        }

        .feature-card p {
          margin-top: 8px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.55;
        }

        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .chip {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-default);
          color: var(--text-muted);
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .login-card {
          border: 1px solid var(--border-strong);
          background: rgba(12, 15, 20, 0.92);
          backdrop-filter: blur(16px);
          border-radius: 18px;
          padding: 28px;
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.35);
        }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
        }

        .card-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .card-brand strong {
          display: block;
          font-size: 14px;
          letter-spacing: 0.12em;
          font-weight: 500;
        }

        .card-brand span {
          display: block;
          color: var(--text-secondary);
          font-size: 12px;
          margin-top: 4px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-accent);
          background: rgba(20, 210, 150, 0.08);
          color: var(--accent);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .card-title {
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: -0.03em;
          font-weight: 600;
        }

        .card-copy {
          margin-top: 10px;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.65;
        }

        .form {
          margin-top: 24px;
          display: grid;
          gap: 18px;
        }

        .label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .input-shell {
          position: relative;
        }

        .input-shell :global(svg) {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .input {
          width: 100%;
          min-height: 48px;
          border-radius: 10px;
          border: 1px solid var(--border-strong);
          background: var(--bg-elevated);
          color: var(--text-primary);
          padding: 0 14px 0 44px;
          font-size: 15px;
          transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
        }

        .input::placeholder {
          color: var(--text-muted);
        }

        .input:focus {
          outline: none;
          border-color: var(--border-accent);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .input-shell:focus-within :global(svg) {
          color: var(--text-secondary);
        }

        .hint,
        .error,
        .footnote {
          font-size: 12px;
          line-height: 1.55;
        }

        .hint,
        .footnote {
          color: var(--text-muted);
        }

        .error {
          color: #f87171;
        }

        .submit {
          min-height: 48px;
          border-radius: 10px;
          background: var(--accent);
          color: var(--text-inverse);
          font-size: 14px;
          font-weight: 500;
          transition: transform 150ms ease, filter 150ms ease;
        }

        .submit:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }

        .submit:disabled {
          opacity: 0.72;
          cursor: default;
        }

        .form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 8px;
        }

        .home-link {
          color: var(--text-secondary);
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .home-link:hover {
          color: var(--text-primary);
        }

        .footnote code {
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-primary);
        }

        @media (max-width: 960px) {
          .container {
            grid-template-columns: 1fr;
            padding: 28px 20px 32px;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .left-panel {
            max-width: none;
          }
        }

        @media (max-width: 640px) {
          .login-card {
            padding: 22px;
          }

          .card-top,
          .form-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="container">
        <section className="left-panel">
          <Link href="/" className="brand-link">
            <span className="dot" />
            <span className="mono">AROUTER</span>
          </Link>

          <div className="eyebrow">
            <LoginIcon name="shield" className="h-4 w-4" />
            <span>Protected dashboard access</span>
          </div>

          <h1 className="title">
            Secure access for your routing control plane.
            <span>Public checker stays open. Dashboard stays private.</span>
          </h1>

          <p className="copy">
            Sign in to manage provider routing, token limits, tunnel settings, and usage analytics. The public landing page remains accessible, but the dashboard requires an active session.
          </p>

          <div className="feature-grid">
            <article className="feature-card">
              <LoginIcon name="lock" className="h-5 w-5" />
              <h3>Private control layer</h3>
              <p>Provider settings, API key management, and traffic controls stay behind authentication.</p>
            </article>

            <article className="feature-card">
              <LoginIcon name="spark" className="h-5 w-5" />
              <h3>Fast operational access</h3>
              <p>Jump straight into quota rules, usage dashboards, and route orchestration once authenticated.</p>
            </article>

            <article className="feature-card">
              <LoginIcon name="shield" className="h-5 w-5" />
              <h3>Session-aware protection</h3>
              <p>Unauthenticated requests are redirected here before they ever reach the protected dashboard.</p>
            </article>
          </div>

          <div className="meta-row">
            <span className="chip">Dashboard login</span>
            <span className="chip">Session required</span>
            <span className="chip">ARouter control panel</span>
          </div>
        </section>

        <section className="login-card">
          <div className="card-top">
            <div className="card-brand">
              <span className="dot" />
              <div>
                <strong className="mono">AROUTER</strong>
                <span>Access the protected dashboard</span>
              </div>
            </div>
            <span className="status-pill">Secure login</span>
          </div>

          <h2 className="card-title">Enter your password to continue.</h2>
          <p className="card-copy">
            Use the dashboard password configured for this instance. After login, you will be redirected to <span className="mono">/dashboard</span>.
          </p>

          <form className="form" onSubmit={handleLogin}>
            <div>
              <label className="label" htmlFor="password">
                Dashboard password
              </label>
              <div className="input-shell">
                <LoginIcon name="lock" className="h-4 w-4" />
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error ? <p className="error">{error}</p> : null}
              {!error ? (
                <p className="hint">
                  {hasPassword
                    ? "This dashboard is protected. Enter the current password to manage ARouter."
                    : "No password has been configured yet, so the default instance password may still be active."}
                </p>
              ) : null}
            </div>

            <button type="submit" className="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login to dashboard"}
            </button>

            <div className="form-footer">
              <Link href="/" className="home-link">
                <LoginIcon name="arrow" className="h-4 w-4" />
                <span>Back to public checker</span>
              </Link>
              <p className="footnote">
                Default password: <code>123456</code>
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
