"use client";

/* eslint-disable @next/next/no-img-element -- reason: provider logos are dynamic local files with fallback handling inside React Flow nodes. */

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  ReactFlow,
  Background,
  Handle,
  MarkerType,
  Position,
} from "@xyflow/react";
import { AI_PROVIDERS } from "@/shared/constants/providers";

function getProviderConfig(providerId) {
  return AI_PROVIDERS[providerId] || { color: "#6b7280", name: providerId };
}

function getProviderIconId(providerId = "") {
  if (providerId.startsWith("openai-compatible")) return "openai";
  if (providerId.startsWith("anthropic-compatible")) return "anthropic";
  if (providerId.startsWith("gemini-compatible")) return "gemini";
  return providerId;
}

// Use local provider images from /public/providers/. Dynamic connection ids map to base logos.
function getProviderImageUrl(providerId) {
  return `/providers/${getProviderIconId(providerId)}.png`;
}

// Custom provider node - rectangle with image + name
function ProviderNode({ data }) {
  const { label, color, imageUrl, textIcon, active, last, error, providerId } = data;
  const isCodex = providerId === "codex";
  const [imgError, setImgError] = useState(false);
  const statusLabel = error ? "error" : active ? "live" : last ? "recent" : "idle";
  const statusColor = error ? "#ef4444" : active ? "#22c55e" : last ? "#f59e0b" : "var(--color-text-muted)";

  return (
    <div
      className="group relative flex min-h-[64px] items-center gap-3 overflow-hidden rounded-2xl border bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-300 dark:bg-white/[0.06]"
      style={{
        borderColor: error || active || last ? color : "var(--color-border)",
        boxShadow: active ? `0 18px 42px -22px ${color}, 0 0 0 1px ${color}28` : "0 10px 26px -22px rgba(0,0,0,.35)",
        minWidth: isCodex ? "226px" : "212px",
        maxWidth: "246px",
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1"
        style={{ background: `linear-gradient(180deg, ${color}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 15% 20%, ${color}18, transparent 42%)` }}
      />
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />

      <div
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
        style={{ backgroundColor: `${color}12`, borderColor: `${color}24` }}
      >
        {!imgError ? (
          <img src={imageUrl} alt={label} className="h-6 w-6 rounded-sm object-contain" onError={() => setImgError(true)} />
        ) : (
          <span className="text-sm font-bold" style={{ color }}>{textIcon}</span>
        )}
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-tight text-text-main">
          {label}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: statusColor }}>
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {(active || error) && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: statusColor }} />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          </span>
          {statusLabel}
        </div>
      </div>

      {active && (
        <span
          className="relative rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: color }}
        >
          RT
        </span>
      )}
    </div>
  );
}

ProviderNode.propTypes = {
  data: PropTypes.object.isRequired,
};

// Center Arouter node
function RouterNode({ data }) {
  return (
    <div className="relative flex h-[82px] min-w-[210px] items-center justify-center overflow-hidden rounded-[22px] border border-primary/40 bg-white px-6 shadow-elevated dark:bg-white/[0.08]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,87,0.22),transparent_64%)]" />
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="absolute -inset-10 animate-pulse rounded-full border border-primary/15" />
      <Handle type="source" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />

      <img src="/favicon.svg" alt="Arouter" className="relative mr-3 h-9 w-9" />
      <div className="relative leading-tight">
        <div className="text-base font-bold text-primary">Arouter</div>
        <div className="text-[10px] font-medium uppercase tracking-wide text-text-muted">routing core</div>
      </div>
      {data.activeCount > 0 && (
        <span className="relative ml-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-none text-white shadow-warm">
          {data.activeCount}
        </span>
      )}
    </div>
  );
}

RouterNode.propTypes = {
  data: PropTypes.object.isRequired,
};

const nodeTypes = { provider: ProviderNode, router: RouterNode };

// Place N nodes evenly along an ellipse around the router center.
function buildLayout(providers, activeSet, lastSet, errorSet) {
  const nodeW = 226;
  const nodeH = 64;
  const routerW = 210;
  const routerH = 82;

  const count = providers.length;
  if (count === 0) {
    return {
      nodes: [{ id: "router", type: "router", position: { x: 0, y: 0 }, data: { activeCount: 0 }, draggable: false }],
      edges: [],
    };
  }

  const nodes = [];
  const edges = [];

  nodes.push({
    id: "router",
    type: "router",
    position: { x: 430 - routerW / 2, y: 230 - routerH / 2 },
    data: { activeCount: activeSet.size },
    draggable: false,
  });

  const edgeStyle = (active, last, error, color) => {
    if (error) return { stroke: "#ef4444", strokeWidth: 2.5, opacity: 0.95 };
    if (active) return { stroke: color || "#22c55e", strokeWidth: 2.5, opacity: 0.95 };
    if (last) return { stroke: "#f59e0b", strokeWidth: 2, opacity: 0.75 };
    return { stroke: "rgba(117, 115, 110, 0.35)", strokeWidth: 1.4, opacity: 0.7 };
  };

  const leftCount = Math.ceil(count / 2);
  const rightCount = count - leftCount;
  const leftX = 28;
  const rightX = 860 - nodeW - 28;
  const rowGap = 86;
  const centerY = 230 - nodeH / 2;
  const yFor = (index, total) => centerY + (index - (total - 1) / 2) * rowGap;

  providers.forEach((p, i) => {
    const config = getProviderConfig(p.provider);
    const active = activeSet.has(p.provider?.toLowerCase());
    const last = !active && lastSet.has(p.provider?.toLowerCase());
    const error = !active && errorSet.has(p.provider?.toLowerCase());
    const nodeId = `provider-${p.provider}`;
    const data = {
      label: (config.name !== p.provider ? config.name : null) || p.name || p.provider,
      color: config.color || "#6b7280",
      imageUrl: getProviderImageUrl(p.provider),
      textIcon: config.textIcon || (p.provider || "?").slice(0, 2).toUpperCase(),
      active,
      last,
      error,
      providerId: p.provider,
    };

    const onLeft = i < leftCount;
    const sideIndex = onLeft ? i : i - leftCount;
    const sideTotal = onLeft ? leftCount : rightCount;
    const x = onLeft ? leftX : rightX;
    const y = yFor(sideIndex, sideTotal || 1);
    const sourceHandle = onLeft ? "left" : "right";
    const targetHandle = onLeft ? "right" : "left";

    nodes.push({
      id: nodeId,
      type: "provider",
      position: { x, y },
      data,
      draggable: false,
    });

    edges.push({
      id: `e-${nodeId}`,
      source: "router",
      sourceHandle,
      target: nodeId,
      targetHandle,
      animated: active,
      type: "smoothstep",
      style: edgeStyle(active, last, error, config.color),
      markerEnd: active ? { type: MarkerType.ArrowClosed, color: config.color || "#22c55e", width: 14, height: 14 } : undefined,
    });
  });

  return { nodes, edges };
}

export default function ProviderTopology({ providers = [], activeRequests = [], lastProvider = "", errorProvider = "" }) {
  // Serialize to stable string keys so useMemo only re-runs when values actually change
  const activeKey = useMemo(
    () => activeRequests.map((r) => r.provider?.toLowerCase()).filter(Boolean).sort().join(","),
    [activeRequests]
  );
  const lastKey = lastProvider?.toLowerCase() || "";
  const errorKey = errorProvider?.toLowerCase() || "";

  const activeSet = useMemo(() => new Set(activeKey ? activeKey.split(",") : []), [activeKey]);
  const lastSet = useMemo(() => new Set(lastKey ? [lastKey] : []), [lastKey]);
  const errorSet = useMemo(() => new Set(errorKey ? [errorKey] : []), [errorKey]);

  const { nodes, edges } = useMemo(
    () => buildLayout(providers, activeSet, lastSet, errorSet),
    [providers, activeSet, lastSet, errorSet]
  );

  // Stable key — only remount when provider list changes
  const providersKey = useMemo(
    () => providers.map((p) => p.provider).sort().join(","),
    [providers]
  );

  const rfInstance = useRef(null);
  const onInit = useCallback((instance) => {
    rfInstance.current = instance;
    setTimeout(() => instance.fitView({ padding: 0.16, duration: 360 }), 80);
  }, []);

  useEffect(() => {
    if (!rfInstance.current || providers.length === 0) return;
    const id = setTimeout(() => {
      rfInstance.current.fitView({ padding: 0.16, duration: 360 });
    }, 80);
    return () => clearTimeout(id);
  }, [providersKey, activeKey, lastKey, errorKey, providers.length]);

  return (
    <div className="flex h-[500px] w-full flex-col overflow-hidden rounded-2xl border border-primary/15 bg-surface shadow-elevated">
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-[linear-gradient(90deg,rgba(217,119,87,0.12),rgba(255,255,255,0.72),rgba(34,197,94,0.08))] px-5 py-4 dark:bg-[linear-gradient(90deg,rgba(217,119,87,0.16),rgba(255,255,255,0.04),rgba(34,197,94,0.08))]">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-text-main">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(217,119,87,.7)]" />
            Provider Mesh
          </div>
          <div className="mt-0.5 text-[11px] text-text-muted">Realtime routing topology · compact light view</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
          <span className="rounded-full border border-border bg-bg px-2 py-1 text-text-muted">{providers.length} providers</span>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-primary">{activeSet.size} live</span>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-[radial-gradient(circle_at_50%_45%,rgba(217,119,87,0.16),transparent_36%),radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,var(--color-bg),var(--color-surface))]">
      {providers.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-text-muted">
          No providers connected.
        </div>
      ) : (
        <ReactFlow
          key={providersKey}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.16, duration: 360 }}
          onInit={onInit}
          proOptions={{ hideAttribution: true }}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.35}
          maxZoom={1.15}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background color="rgba(117,115,110,0.22)" gap={22} size={1} />
        </ReactFlow>
      )}
      </div>
    </div>
  );
}

ProviderTopology.propTypes = {
  providers: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    provider: PropTypes.string,
    name: PropTypes.string,
  })),
  activeRequests: PropTypes.arrayOf(PropTypes.shape({
    provider: PropTypes.string,
    model: PropTypes.string,
    account: PropTypes.string,
  })),
  lastProvider: PropTypes.string,
  errorProvider: PropTypes.string,
};
