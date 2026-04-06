import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, threadsPostsTable } from "@/lib/db";
import { getAllThreads, getThreadInsights, delay } from "@/lib/threads";

export async function POST() {
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
      } catch {}

      const views = insights['views'] ?? 0;
      const likes = insights['likes'] ?? 0;
      const replies = insights['replies'] ?? 0;
      const reposts = insights['reposts'] ?? 0;
      const quotes = insights['quotes'] ?? 0;
      const engagementRate = views > 0 ? ((likes + replies + reposts + quotes) / views) * 100 : 0;
      const postedAt = post.timestamp ? new Date(post.timestamp) : null;

      const [existing] = await db.select().from(threadsPostsTable).where(eq(threadsPostsTable.threadsMediaId, post.id));

      if (existing) {
        await db.update(threadsPostsTable).set({ views, likes, replies, reposts, quotes, engagementRate, syncedAt: new Date() }).where(eq(threadsPostsTable.id, existing.id));
        updatedCount++;
      } else {
        await db.insert(threadsPostsTable).values({ threadsMediaId: post.id, textContent: post.text, permalink: post.permalink, postType: post.media_type, views, likes, replies, reposts, quotes, engagementRate, postedAt, syncedAt: new Date() });
        newCount++;
      }
    }

    return NextResponse.json({ synced: newCount + updatedCount, new: newCount, updated: updatedCount });
  } catch (e: any) {
    console.error("Threads sync failed", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
