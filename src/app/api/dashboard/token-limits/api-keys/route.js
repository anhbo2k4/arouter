import { NextResponse } from "next/server";
import { createTokenApiKey, getTokenApiKeyUsage, listTokenApiKeys } from "@/lib/tokenQuotaStore";
import { getApiKeyActivitySummary, getUsageStats } from "@/lib/usageDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const keys = await listTokenApiKeys();
  const enriched = await Promise.all(
    keys.map(async (key) => ({
      ...key,
      usage: await getTokenApiKeyUsage(key.id, key.quota?.window || "monthly"),
    }))
  );
  const [stats7d, statsAll, activity] = await Promise.all([
    getUsageStats("7d"),
    getUsageStats("all"),
    getApiKeyActivitySummary({ limit: 40 }),
  ]);
  return NextResponse.json(
    {
      keys: enriched,
      insights: {
        estimatedCharsSaved7d: Number(stats7d?.totalEstimatedCharsSaved || 0),
        estimatedCharsSavedAll: Number(statsAll?.totalEstimatedCharsSaved || 0),
        activeKeys: activity?.activeKeys || [],
        recentKeyLogs: activity?.recentKeyLogs || [],
      },
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

export async function POST(req) {
  const body = await req.json();
  const key = await createTokenApiKey(body);
  return NextResponse.json({ key, secret: key.key, warning: "API key generated from main key store." });
}
