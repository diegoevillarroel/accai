import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, threadsPostsTable } from "@workspace/db";
import {
  getAllThreads,
  getThreadInsights,
  publishThread,
  searchThreads,
  getThreadReplies,
  delay,
} from "../lib/threads";
import { logger } from "../lib/logger";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.post("/threads/sync", async (_req, res): Promise<void> => {
  let newCount = 0;
  let updatedCount = 0;

  try {
    const threadsRes = await getAllThreads();
    const posts = threadsRes.data || [];

    for (const post of posts) {
      await delay(200);

      let insights: Record<string, number> = {};
      try {
        const insightsRes = await getThreadInsights(post.id);
        for (const item of (insightsRes.data || [])) {
          insights[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
        }
      } catch (_e) {}

      const views = insights['views'] ?? 0;
      const likes = insights['likes'] ?? 0;
      const replies = insights['replies'] ?? 0;
      const reposts = insights['reposts'] ?? 0;
      const quotes = insights['quotes'] ?? 0;
      const engagementRate = views > 0
        ? ((likes + replies + reposts + quotes) / views) * 100
        : 0;
      const postedAt = post.timestamp ? new Date(post.timestamp) : null;

      const [existing] = await db
        .select()
        .from(threadsPostsTable)
        .where(eq(threadsPostsTable.threadsMediaId, post.id));

      if (existing) {
        await db
          .update(threadsPostsTable)
          .set({ views, likes, replies, reposts, quotes, engagementRate, syncedAt: new Date() })
          .where(eq(threadsPostsTable.id, existing.id));
        updatedCount++;
      } else {
        await db.insert(threadsPostsTable).values({
          threadsMediaId: post.id,
          textContent: post.text,
          permalink: post.permalink,
          postType: post.media_type,
          views,
          likes,
          replies,
          reposts,
          quotes,
          engagementRate,
          postedAt,
          syncedAt: new Date(),
        });
        newCount++;
      }
    }

    res.json({ synced: newCount + updatedCount, new: newCount, updated: updatedCount });
  } catch (e: any) {
    logger.error({ err: e }, "Threads sync failed");
    res.status(500).json({ error: e.message });
  }
});

router.post("/threads/publish", async (req, res): Promise<void> => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  try {
    const result = await publishThread(text);
    res.json({
      success: !!result.id,
      threadId: result.id,
      permalink: result.permalink,
    });
  } catch (e: any) {
    logger.error({ err: e }, "Thread publish failed");
    res.status(500).json({ error: e.message });
  }
});

router.post("/threads/search", async (req, res): Promise<void> => {
  const { query } = req.body;
  if (!query) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  try {
    const results = await searchThreads(query);
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/threads/replies/:id", async (req, res): Promise<void> => {
  try {
    const replies = await getThreadReplies(req.params['id']);
    res.json(replies);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/threads/posts", async (_req, res): Promise<void> => {
  try {
    const posts = await db
      .select()
      .from(threadsPostsTable)
      .orderBy(desc(threadsPostsTable.postedAt));
    res.json(serialize(posts));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/threads/:id/promote", async (req, res): Promise<void> => {
  const id = parseInt(req.params['id'], 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [updated] = await db
      .update(threadsPostsTable)
      .set({ promotedToReel: true })
      .where(eq(threadsPostsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Post not found" }); return; }
    res.json(serialize(updated));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
