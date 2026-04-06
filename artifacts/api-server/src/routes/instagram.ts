import { Router, type IRouter } from "express";
import { eq, desc, isNotNull } from "drizzle-orm";
import {
  db,
  reelsTable,
  competitorsTable,
  competitorReelsTable,
  commentCacheTable,
  accountSnapshotsTable,
} from "@workspace/db";
import {
  getAllMedia,
  getMediaInsights,
  getAccountProfile,
  getAccountInsights,
  getCompetitorData,
  getMediaComments,
  replyToComment,
  getConversations,
  getMessages,
  getOnlineFollowers,
  delay,
} from "../lib/instagram";
import { logger } from "../lib/logger";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

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

router.post("/instagram/sync", async (_req, res): Promise<void> => {
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
        if (insightsRes._rateLimitWarning) {
          rateLimitWarning = true;
        }

        const insights = parseInsights(insightsRes.data || []);
        const views = insights['views'] ?? insights['reach'] ?? 0;
        const saves = insights['saved'] ?? 0;
        const shares = insights['shares'] ?? 0;
        const likes = insights['likes'] ?? media.like_count ?? 0;
        const comments = insights['comments'] ?? media.comments_count ?? 0;
        const watchTimeAvg = insights['ig_reels_avg_watch_time'] ?? null;
        const replays = insights['clips_replays_count'] ?? 0;

        const [existing] = await db
          .select()
          .from(reelsTable)
          .where(eq(reelsTable.instagramMediaId, media.id));

        if (existing) {
          const followersAtPublish = existing.followersAtPublish || 1;
          const likesPct = views > 0 ? (likes / views) * 100 : 0;
          const commentsPct = views > 0 ? (comments / views) * 100 : 0;
          const savesPct = views > 0 ? (saves / views) * 100 : 0;
          const sharesPct = views > 0 ? (shares / views) * 100 : 0;
          const savesPer1k = followersAtPublish > 0 ? (saves / followersAtPublish) * 1000 : 0;

          const [avgStats] = await db
            .select()
            .from(reelsTable);
          const avgViews = 0;
          const avgSavesPct = 0;
          const firma = classifyFirma(savesPct, views, avgViews, avgSavesPct);

          await db
            .update(reelsTable)
            .set({
              views,
              likes,
              comments,
              saves,
              shares,
              likesPct,
              commentsPct,
              savesPct,
              sharesPct,
              savesPer1k,
              watchTimeAvg,
              replays,
              firma,
              permalink: media.permalink,
              caption: media.caption,
              syncedAt: new Date(),
            })
            .where(eq(reelsTable.id, existing.id));
          updatedCount++;
        } else {
          const fecha = media.timestamp
            ? new Date(media.timestamp).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          const followersAtPublish = 0;
          const likesPct = views > 0 ? (likes / views) * 100 : 0;
          const commentsPct = views > 0 ? (comments / views) * 100 : 0;
          const savesPct = views > 0 ? (saves / views) * 100 : 0;
          const sharesPct = views > 0 ? (shares / views) * 100 : 0;
          const savesPer1k = 0;
          const firma = "MUERTO";

          await db.insert(reelsTable).values({
            fecha,
            tema: media.caption?.split('\n')[0]?.slice(0, 100) || '(sin clasificar)',
            angulo: '(sin clasificar)',
            formato: '(sin clasificar)',
            followersAtPublish,
            views,
            likes,
            comments,
            saves,
            shares,
            likesPct,
            commentsPct,
            savesPct,
            sharesPct,
            savesPer1k,
            firma,
            instagramMediaId: media.id,
            permalink: media.permalink,
            caption: media.caption,
            watchTimeAvg,
            replays,
            syncedAt: new Date(),
          });
          newCount++;
        }
      } catch (e: any) {
        errors.push(`${media.id}: ${e.message}`);
      }
    }

    const allReels = await db.select().from(reelsTable);
    const avgViews = allReels.reduce((s, r) => s + r.views, 0) / (allReels.length || 1);
    const avgSavesPct = allReels.reduce((s, r) => s + r.savesPct, 0) / (allReels.length || 1);
    const unclassified = allReels.filter(r =>
      r.angulo === '(sin clasificar)' || r.tema === '(sin clasificar)'
    ).length;

    for (const reel of allReels) {
      const firma = classifyFirma(reel.savesPct, reel.views, avgViews, avgSavesPct);
      if (firma !== reel.firma) {
        await db.update(reelsTable).set({ firma }).where(eq(reelsTable.id, reel.id));
      }
    }

    res.json({
      synced: newCount + updatedCount,
      new: newCount,
      updated: updatedCount,
      unclassified,
      rateLimitWarning,
      errors,
    });
  } catch (e: any) {
    logger.error({ err: e }, "Instagram sync failed");
    res.status(500).json({ error: e.message });
  }
});

router.post("/instagram/sync-account", async (_req, res): Promise<void> => {
  try {
    const profile = await getAccountProfile();
    const insightsRes = await getAccountInsights('days_28');

    const insightsMap: Record<string, number> = {};
    for (const item of (insightsRes.data || [])) {
      // Sum all daily values for the 28-day period
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

    const [snapshot] = await db
      .insert(accountSnapshotsTable)
      .values({
        periodStart,
        periodEnd,
        views,
        followersGained,
        profileVisits,
        conversionPct,
      })
      .returning();

    res.json(serialize(snapshot));
  } catch (e: any) {
    logger.error({ err: e }, "Instagram sync-account failed");
    res.status(500).json({ error: e.message });
  }
});

router.post("/instagram/competitor", async (req, res): Promise<void> => {
  const { handle } = req.body;
  if (!handle) {
    res.status(400).json({ error: "handle is required" });
    return;
  }

  try {
    const data = await getCompetitorData(handle);
    const profile = data?.business_discovery;
    if (!profile) {
      res.status(404).json({ error: "Competitor not found via Business Discovery" });
      return;
    }

    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const [existing] = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.handle, cleanHandle));

    const followersCount = profile.followers_count ?? 0;
    const engagementRateAvg = profile.media?.data
      ? (profile.media.data.reduce((s: number, m: any) =>
          s + ((m.like_count ?? 0) + (m.comments_count ?? 0)) / Math.max(followersCount, 1) * 100, 0) /
        (profile.media.data.length || 1))
      : null;

    let competitorId: number;
    if (existing) {
      await db
        .update(competitorsTable)
        .set({
          bio: profile.biography,
          followersApprox: followersCount,
          engagementRateAvg,
          lastSynced: new Date(),
        })
        .where(eq(competitorsTable.id, existing.id));
      competitorId = existing.id;
    } else {
      const [created] = await db
        .insert(competitorsTable)
        .values({
          handle: cleanHandle,
          nicho: '(auto-imported)',
          followersApprox: followersCount,
          bio: profile.biography,
          engagementRateAvg,
          lastSynced: new Date(),
        })
        .returning();
      competitorId = created.id;
    }

    const posts = (profile.media?.data || [])
      .map((m: any) => ({
        ...m,
        engagementRate: ((m.like_count ?? 0) + (m.comments_count ?? 0)) / Math.max(followersCount, 1) * 100,
      }))
      .sort((a: any, b: any) => b.engagementRate - a.engagementRate);

    for (const post of posts) {
      const [existingReel] = await db
        .select()
        .from(competitorReelsTable)
        .where(eq(competitorReelsTable.url, post.permalink ?? ''));

      if (!existingReel && post.permalink) {
        const level = post.engagementRate > 5 ? 'ALTO' : post.engagementRate > 2 ? 'MEDIO' : 'BAJO';
        await db.insert(competitorReelsTable).values({
          competitorId,
          url: post.permalink,
          tema: post.caption?.split('\n')[0]?.slice(0, 100) || '(sin clasificar)',
          hook: post.caption?.split('\n')[0]?.slice(0, 80) || '(sin hook)',
          viewsApprox: null,
          engagementLevel: level,
          anguloDetectado: null,
        });
      }
    }

    res.json({ profile, posts });
  } catch (e: any) {
    logger.error({ err: e }, "Instagram competitor sync failed");
    res.status(500).json({ error: e.message });
  }
});

router.get("/instagram/comments/mine", async (req, res): Promise<void> => {
  const limit = parseInt(req.query['limit'] as string || '20', 10);
  try {
    const reels = await db
      .select()
      .from(reelsTable)
      .where(isNotNull(reelsTable.instagramMediaId))
      .orderBy(desc(reelsTable.fecha))
      .limit(limit);

    const igReels = reels.filter(r => r.instagramMediaId);
    const grouped: Record<string, any[]> = {};

    for (const reel of igReels) {
      await delay(200);
      try {
        const commentsRes = await getMediaComments(reel.instagramMediaId!);
        const comments = commentsRes.data || [];
        grouped[reel.instagramMediaId!] = comments;

        for (const comment of comments) {
          await db
            .insert(commentCacheTable)
            .values({
              mediaId: reel.instagramMediaId!,
              instagramCommentId: comment.id,
              username: comment.username,
              text: comment.text,
              commentTimestamp: comment.timestamp ? new Date(comment.timestamp) : null,
              likeCount: comment.like_count ?? 0,
            })
            .onConflictDoUpdate({
              target: commentCacheTable.instagramCommentId,
              set: { likeCount: comment.like_count ?? 0 },
            });
        }
      } catch (e: any) {
        grouped[reel.instagramMediaId!] = [];
      }
    }

    res.json(grouped);
  } catch (e: any) {
    logger.error({ err: e }, "Comments fetch failed");
    res.status(500).json({ error: e.message });
  }
});

router.post("/instagram/comments/reply", async (req, res): Promise<void> => {
  const { commentId, message } = req.body;
  if (!commentId || !message) {
    res.status(400).json({ error: "commentId and message are required" });
    return;
  }

  try {
    const result = await replyToComment(commentId, message);

    await db
      .update(commentCacheTable)
      .set({ replied: true, replyText: message })
      .where(eq(commentCacheTable.instagramCommentId, commentId));

    res.json(result);
  } catch (e: any) {
    logger.error({ err: e }, "Comment reply failed");
    res.status(500).json({ error: e.message });
  }
});

router.get("/instagram/conversations", async (_req, res): Promise<void> => {
  try {
    const data = await getConversations();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/instagram/conversations/:id", async (req, res): Promise<void> => {
  try {
    const data = await getMessages(req.params['id']);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/instagram/timing", async (_req, res): Promise<void> => {
  try {
    const data = await getOnlineFollowers();
    const hourlyData = data?.data?.[0]?.values || [];

    const byHour: Record<number, number[]> = {};
    for (const entry of hourlyData) {
      const val = typeof entry.value === 'object'
        ? Object.values(entry.value as Record<string, number>)
        : [entry.value];

      if (typeof entry.value === 'object' && entry.value !== null) {
        // hour-keyed object: { "0": 12, "1": 34, ... }
        for (const [h, count] of Object.entries(entry.value as Record<string, number>)) {
          const hour = parseInt(h);
          if (!byHour[hour]) byHour[hour] = [];
          byHour[hour].push(count as number);
        }
      } else {
        const hour = new Date(entry.end_time).getUTCHours();
        if (!byHour[hour]) byHour[hour] = [];
        byHour[hour].push(entry.value ?? 0);
      }
    }

    const avgByHour = Object.entries(byHour).map(([hour, vals]) => ({
      hour: parseInt(hour),
      avg: vals.reduce((s, v) => s + v, 0) / vals.length,
    })).sort((a, b) => b.avg - a.avg);

    const topWindows = avgByHour.slice(0, 3).map(h => ({
      hour: h.hour,
      label: `${h.hour.toString().padStart(2, '0')}:00 — ${(h.hour + 1).toString().padStart(2, '0')}:00`,
      avgOnline: Math.round(h.avg),
    }));

    res.json({ hourly: avgByHour, recommendedWindows: topWindows, raw: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/instagram/token-status", async (_req, res): Promise<void> => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    res.json({ valid: false, error: "INSTAGRAM_ACCESS_TOKEN not set" });
    return;
  }

  try {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;

    const url = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`;
    const resp = await fetch(url);
    const debug = await resp.json();

    const tokenData = debug.data;
    if (!tokenData?.is_valid) {
      res.json({ valid: false, error: "Token is invalid" });
      return;
    }

    const expiresAt = tokenData.expires_at
      ? new Date(tokenData.expires_at * 1000).toISOString()
      : null;
    const daysRemaining = tokenData.expires_at
      ? Math.floor((tokenData.expires_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      valid: true,
      expiresAt,
      daysRemaining,
      scopes: tokenData.scopes || [],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
