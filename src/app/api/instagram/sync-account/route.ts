import { NextResponse } from "next/server";
import { db, accountSnapshotsTable } from "@/lib/db";
import { getAccountProfile, getAccountInsights } from "@/lib/instagram";
import { serialize } from "@/lib/serialize";

export async function POST() {
  try {
    const profile = await getAccountProfile();
    const insightsRes = await getAccountInsights('days_28');

    const insightsMap: Record<string, number> = {};
    for (const item of (insightsRes.data || [])) {
      let total = 0;
      if (item.values && Array.isArray(item.values)) {
        for (const v of item.values) {
          const val = v.value ?? 0;
          total += typeof val === 'number' ? val : 0;
        }
      } else if (item.total_value?.value !== undefined) {
        total = item.total_value.value;
      }
      insightsMap[item.name] = total;
    }

    const followersGained = insightsMap['follows_and_unfollows'] ?? 0;
    const profileVisits = insightsMap['profile_views'] ?? 1;
    const views = insightsMap['reach'] ?? 0;
    const conversionPct = profileVisits > 0 ? (followersGained / profileVisits) * 100 : 0;

    const now = new Date();
    const periodEnd = now.toISOString().split('T')[0];
    const periodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [snapshot] = await db.insert(accountSnapshotsTable).values({ periodStart, periodEnd, views, followersGained, profileVisits, conversionPct }).returning();
    return NextResponse.json(serialize(snapshot));
  } catch (e: any) {
    console.error("Instagram sync-account failed", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
