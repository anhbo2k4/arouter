import { describe, it, expect } from "vitest";
import { aggregateRtkStats } from "../../src/lib/rtkStats.js";

describe("aggregateRtkStats", () => {
  it("summarizes savings, hits, filters, and unsafe fallbacks", () => {
    const details = [
      {
        timestamp: "2026-05-03T10:00:00.000Z",
        apiKey: "sk-live-alpha",
        rtk: {
          enabled: true,
          applied: true,
          bytesBefore: 5000,
          bytesAfter: 3200,
          savedBytes: 1800,
          savedPercent: 36,
          hitCount: 2,
          filters: ["git-diff", "smart-truncate"],
          quality: {
            unsafeFallbackCount: 1,
            unsafeFallbackTriggered: true,
            rejectedCandidates: {
              "anchor-loss": 1,
            },
          },
        },
      },
      {
        timestamp: "2026-05-03T11:00:00.000Z",
        apiKey: "sk-live-beta",
        rtk: {
          enabled: true,
          applied: true,
          bytesBefore: 3000,
          bytesAfter: 2100,
          savedBytes: 900,
          savedPercent: 30,
          hitCount: 1,
          filters: ["test-runner"],
          quality: {
            unsafeFallbackCount: 0,
            unsafeFallbackTriggered: false,
            rejectedCandidates: {},
          },
        },
      },
      {
        timestamp: "2026-05-03T12:00:00.000Z",
        apiKey: "sk-live-alpha",
        rtk: {
          enabled: true,
          applied: false,
          bytesBefore: 400,
          bytesAfter: 400,
          savedBytes: 0,
          savedPercent: 0,
          hitCount: 0,
          filters: [],
          quality: {
            unsafeFallbackCount: 0,
            unsafeFallbackTriggered: false,
            rejectedCandidates: {
              "not-smaller": 1,
            },
          },
        },
      },
    ];

    const tokenKeys = [
      { id: "key-1", name: "Alpha", key: "sk-live-alpha" },
      { id: "key-2", name: "Beta", key: "sk-live-beta" },
    ];

    const stats = aggregateRtkStats({ details, tokenKeys });

    expect(stats.summary.totalRequests).toBe(3);
    expect(stats.summary.rtkSeen).toBe(3);
    expect(stats.summary.compressedRequests).toBe(2);
    expect(stats.summary.savedBytes).toBe(2700);
    expect(stats.summary.bytesBefore).toBe(8400);
    expect(stats.summary.bytesAfter).toBe(5700);
    expect(stats.summary.hitCount).toBe(3);
    expect(stats.summary.unsafeFallbackCount).toBe(1);
    expect(stats.summary.lastSeenAt).toBe("2026-05-03T12:00:00.000Z");
    expect(stats.topFilters[0]).toEqual({ name: "git-diff", count: 1, savedBytes: 1800 });
    expect(stats.topFilters[1]).toEqual({ name: "smart-truncate", count: 1, savedBytes: 1800 });
    expect(stats.rejectedReasons["anchor-loss"]).toBe(1);
    expect(stats.rejectedReasons["not-smaller"]).toBe(1);
    expect(stats.byKey[0]).toMatchObject({
      keyId: "key-1",
      keyName: "Alpha",
      savedBytes: 1800,
      compressedRequests: 1,
      unsafeFallbackCount: 1,
    });
  });

  it("supports per-key filtering and 24h timeline buckets", () => {
    const details = [
      {
        timestamp: "2026-05-03T09:15:00.000Z",
        apiKey: "sk-live-alpha",
        rtk: {
          enabled: true,
          applied: true,
          bytesBefore: 2000,
          bytesAfter: 1200,
          savedBytes: 800,
          savedPercent: 40,
          hitCount: 1,
          filters: ["git-diff"],
          quality: { unsafeFallbackCount: 0, unsafeFallbackTriggered: false, rejectedCandidates: {} },
        },
      },
      {
        timestamp: "2026-05-03T10:30:00.000Z",
        apiKey: "sk-live-alpha",
        rtk: {
          enabled: true,
          applied: true,
          bytesBefore: 1000,
          bytesAfter: 700,
          savedBytes: 300,
          savedPercent: 30,
          hitCount: 1,
          filters: ["smart-truncate"],
          quality: { unsafeFallbackCount: 0, unsafeFallbackTriggered: false, rejectedCandidates: {} },
        },
      },
      {
        timestamp: "2026-05-03T10:45:00.000Z",
        apiKey: "sk-live-beta",
        rtk: {
          enabled: true,
          applied: true,
          bytesBefore: 3000,
          bytesAfter: 2100,
          savedBytes: 900,
          savedPercent: 30,
          hitCount: 2,
          filters: ["test-runner"],
          quality: { unsafeFallbackCount: 0, unsafeFallbackTriggered: false, rejectedCandidates: {} },
        },
      },
    ];

    const tokenKeys = [
      { id: "key-1", name: "Alpha", key: "sk-live-alpha" },
      { id: "key-2", name: "Beta", key: "sk-live-beta" },
    ];

    const stats = aggregateRtkStats({
      details,
      tokenKeys,
      selectedKeyId: "key-1",
      window: "24h",
      now: "2026-05-03T12:00:00.000Z",
    });

    expect(stats.summary.savedBytes).toBe(1100);
    expect(stats.summary.compressedRequests).toBe(2);
    expect(stats.availableKeys).toEqual([
      { id: "all", name: "All keys" },
      { id: "key-1", name: "Alpha" },
      { id: "key-2", name: "Beta" },
    ]);
    expect(stats.timeline).toHaveLength(24);
    expect(stats.timeline.some((bucket) => bucket.savedBytes === 800 && bucket.compressedRequests === 1)).toBe(true);
    expect(stats.timeline.some((bucket) => bucket.savedBytes === 300 && bucket.compressedRequests === 1)).toBe(true);
    expect(stats.timeline.every((bucket) => bucket.savedBytes !== 900)).toBe(true);
  });
});
