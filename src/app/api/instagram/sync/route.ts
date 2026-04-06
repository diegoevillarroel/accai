import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, reelsTable } from "@/lib/db";
import { getAllMedia, getMediaInsights, delay } from "@/lib/instagram";

function classifyFirma(savesPct: number, views: number, avgViews: number, avgSavesPct: number): string {
  if (savesPct > avgSavesPct * 1.3 && views > 5000) return "CONVERTIDOR";
  if (views > avgViews * 1.5 && savesPct < avgSavesPct) return "VIRAL";
  if (views > avgViews * 1.2 && savesPct > avgSavesPct) return "EDUCATIVO";
  return "MUERTO";
}

function parseInsights(data: any[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of data) {
    result[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
  }
  return result;
}

export async function POST() {
  const errors: string[] = [];
  let newCount = 0;
  let updatedCount = 0;
  let rateLimitWarning = false;

  try {
    const allMedia = await getAllMedia();
    const reels = allMedia.filter((m: any) => m.media_type === 'VIDEO');

    for (const media of reels) {
      if (rateLimitWarning) break;
      await delay(200);

      try {
        const insightsRes = await getMediaInsights(media.id);
        if ((insightsRes as any)._rateLimitWarning) rateLimitWarning = true;

        const insights = parseInsights(insightsRes.data || []);
        const views = insights['views'] ?? insights['reach'] ?? 0;
        const saves = insights['saved'] ?? 0;
        const shares = insights['shares'] ?? 0;
        const likes = insights['likes'] ?? media.like_count ?? 0;
        const comments = insights['comments'] ?? media.comments_count ?? 0;
        const watchTimeAvg = insights['ig_reels_avg_watch_time'] ?? null;
        const replays = insights['clips_replays_count'] ?? 0;

        const [existing] = await db.select().from(reelsTable).where(eq(reelsTable.instagramMediaId, media.id));

        if (existing) {
          const followersAtPublish = existing.followersAtPublish || 1;
          const likesPct = views > 0 ? (likes / views) * 100 : 0;
          const commentsPct = views > 0 ? (comments / views) * 100 : 0;
          const savesPct = views > 0 ? (saves / views) * 100 : 0;
          const sharesPct = views > 0 ? (shares / views) * 100 : 0;
          const savesPer1k = followersAtPublish > 0 ? (saves / followersAtPublish) * 1000 : 0;
          const firma = classifyFirma(savesPct, views, 0, 0);

          await db.update(reelsTable).set({ views, likes, comments, saves, shares, likesPct, commentsPct, savesPct, sharesPct, savesPer1k, watchTimeAvg, replays, firma, permalink: media.permalink, caption: media.caption, thumbnailUrl: media.thumbnail_url ?? existing.thumbnailUrl, syncedAt: new Date() }).where(eq(reelsTable.id, existing.id));
          updatedCount++;
        } else {
          const fecha = media.timestamp ? new Date(media.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          const likesPct = views > 0 ? (likes / views) * 100 : 0;
          const commentsPct = views > 0 ? (comments / views) * 100 : 0;
          const savesPct = views > 0 ? (saves / views) * 100 : 0;
          const sharesPct = views > 0 ? (shares / views) * 100 : 0;

          await db.insert(reelsTable).values({ fecha, tema: media.caption?.split('\n')[0]?.slice(0, 100) || '(sin clasificar)', angulo: '(sin clasificar)', formato: '(sin clasificar)', followersAtPublish: 0, views, likes, comments, saves, shares, likesPct, commentsPct, savesPct, sharesPct, savesPer1k: 0, firma: "MUERTO", instagramMediaId: media.id, permalink: media.permalink, caption: media.caption, thumbnailUrl: media.thumbnail_url ?? null, watchTimeAvg, replays, syncedAt: new Date() });
          newCount++;
        }
      } catch (e: any) {
        errors.push(`${media.id}: ${e.message}`);
      }
    }

    const allReels = await db.select().from(reelsTable);
    const avgViews = allReels.reduce((s, r) => s + r.views, 0) / (allReels.length || 1);
    const avgSavesPct = allReels.reduce((s, r) => s + r.savesPct, 0) / (allReels.length || 1);
    const unclassified = allReels.filter(r => r.angulo === '(sin clasificar)' || r.tema === '(sin clasificar)').length;

    for (const reel of allReels) {
      const firma = classifyFirma(reel.savesPct, reel.views, avgViews, avgSavesPct);
      if (firma !== reel.firma) {
        await db.update(reelsTable).set({ firma }).where(eq(reelsTable.id, reel.id));
      }
    }

    return NextResponse.json({ synced: newCount + updatedCount, new: newCount, updated: updatedCount, unclassified, rateLimitWarning, errors });
  } catch (e: any) {
    console.error("Instagram sync failed", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
