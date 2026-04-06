import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, competitorsTable, competitorReelsTable } from "@/lib/db";
import { getCompetitorData } from "@/lib/instagram";

export async function POST(request: NextRequest) {
  const { handle } = await request.json();
  if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });

  try {
    const data = await getCompetitorData(handle);
    const profile = data?.business_discovery;
    if (!profile) return NextResponse.json({ error: "Competitor not found via Business Discovery" }, { status: 404 });

    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const [existing] = await db.select().from(competitorsTable).where(eq(competitorsTable.handle, cleanHandle));

    const followersCount = profile.followers_count ?? 0;
    const engagementRateAvg = profile.media?.data
      ? (profile.media.data.reduce((s: number, m: any) => s + ((m.like_count ?? 0) + (m.comments_count ?? 0)) / Math.max(followersCount, 1) * 100, 0) / (profile.media.data.length || 1))
      : null;

    let competitorId: number;
    if (existing) {
      await db.update(competitorsTable).set({ bio: profile.biography, followersApprox: followersCount, engagementRateAvg, lastSynced: new Date() }).where(eq(competitorsTable.id, existing.id));
      competitorId = existing.id;
    } else {
      const [created] = await db.insert(competitorsTable).values({ handle: cleanHandle, nicho: '(auto-imported)', followersApprox: followersCount, bio: profile.biography, engagementRateAvg, lastSynced: new Date() }).returning();
      competitorId = created.id;
    }

    const posts = (profile.media?.data || [])
      .map((m: any) => ({ ...m, engagementRate: ((m.like_count ?? 0) + (m.comments_count ?? 0)) / Math.max(followersCount, 1) * 100 }))
      .sort((a: any, b: any) => b.engagementRate - a.engagementRate);

    for (const post of posts) {
      const [existingReel] = await db.select().from(competitorReelsTable).where(eq(competitorReelsTable.url, post.permalink ?? ''));
      if (!existingReel && post.permalink) {
        const level = post.engagementRate > 5 ? 'ALTO' : post.engagementRate > 2 ? 'MEDIO' : 'BAJO';
        await db.insert(competitorReelsTable).values({ competitorId, url: post.permalink, tema: post.caption?.split('\n')[0]?.slice(0, 100) || '(sin clasificar)', hook: post.caption?.split('\n')[0]?.slice(0, 80) || '(sin hook)', viewsApprox: null, engagementLevel: level, anguloDetectado: null });
      }
    }

    return NextResponse.json({ profile, posts });
  } catch (e: any) {
    console.error("Instagram competitor sync failed", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
