import { NextResponse } from "next/server";
import { getRequestDetails } from "@/lib/usageDb";
import { listTokenApiKeys } from "@/lib/tokenQuotaStore";
import { getSettings } from "@/lib/localDb";
import { aggregateRtkStats } from "@/lib/rtkStats";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const selectedKeyId = searchParams.get("keyId") || "all";
  const window = searchParams.get("window") || "7d";

  const [detailsResult, tokenKeys, settings] = await Promise.all([
    getRequestDetails({ page: 1, pageSize: 1000 }),
    listTokenApiKeys(),
    getSettings(),
  ]);

  const stats = aggregateRtkStats({
    details: detailsResult?.details || [],
    tokenKeys,
    selectedKeyId,
    window,
  });

  return NextResponse.json(
    {
      enabled: settings.rtkEnabled !== false,
      summary: stats.summary,
      topFilters: stats.topFilters,
      rejectedReasons: stats.rejectedReasons,
      byKey: stats.byKey,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
