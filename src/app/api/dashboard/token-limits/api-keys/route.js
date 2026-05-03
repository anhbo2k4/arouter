import { NextResponse } from "next/server";
import { createTokenApiKey, getTokenApiKeyUsage, listTokenApiKeys } from "@/lib/tokenQuotaStore";
import { getApiKeyActivitySummary, getRequestDetails, getUsageStats } from "@/lib/usageDb";
import { getSettings } from "@/lib/localDb";
import { aggregateGovernorStats } from "@/lib/governorStats";

export const dynamic = "force-dynamic";

export async function GET() {
  const keys = await listTokenApiKeys();
  const enriched = await Promise.all(
    keys.map(async (key) => ({
      ...key,
      usage: await getTokenApiKeyUsage(key.id, key.quota?.window || "monthly"),
    }))
  );
  const [stats7d, statsAll, activity, settings, requestDetailsResult] = await Promise.all([
    getUsageStats("7d"),
    getUsageStats("all"),
    getApiKeyActivitySummary({ limit: 40 }),
    getSettings(),
    getRequestDetails({ page: 1, pageSize: 1000 }),
  ]);
  const governorStats = aggregateGovernorStats({
    details: requestDetailsResult?.details || [],
    tokenKeys: keys,
  });
  const governorSettings = {
    enabled: settings.softModelGovernorEnabled !== false,
    mode: settings.softModelGovernorMode || "safe",
    fallbackModel: settings.softModelGovernorFallbackModel || "openai/gpt-4o-mini",
    maxPromptCharsForTrivial: Number(settings.softModelGovernorMaxPromptCharsForTrivial || 180),
    premiumModels: Array.isArray(settings.softModelGovernorPremiumModels) ? settings.softModelGovernorPremiumModels : ["gpt-5.5", "gpt-5.4", "gpt-5.3-codex"],
  };
  return NextResponse.json(
    {
      keys: enriched,
      insights: {
        estimatedCharsSaved7d: Number(stats7d?.totalEstimatedCharsSaved || 0),
        estimatedCharsSavedAll: Number(statsAll?.totalEstimatedCharsSaved || 0),
        activeKeys: activity?.activeKeys || [],
        recentKeyLogs: activity?.recentKeyLogs || [],
      },
      governor: {
        settings: governorSettings,
        summary: {
          ...governorStats.summary,
          keysTouched: governorStats.byKey.length,
        },
        byKey: governorStats.byKey,
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
