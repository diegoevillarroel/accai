import { NextRequest, NextResponse } from "next/server";
import { desc, isNotNull } from "drizzle-orm";
import { db, reelsTable, commentCacheTable } from "@/lib/db";
import { getMediaComments, delay } from "@/lib/instagram";

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);
  try {
    const reels = await db.select().from(reelsTable).where(isNotNull(reelsTable.instagramMediaId)).orderBy(desc(reelsTable.fecha)).limit(limit);
    const igReels = reels.filter(r => r.instagramMediaId);
    const grouped: Record<string, any[]> = {};

    for (const reel of igReels) {
      await delay(200);
      try {
        const commentsRes = await getMediaComments(reel.instagramMediaId!);
        const comments = commentsRes.data || [];
        grouped[reel.instagramMediaId!] = comments;

        for (const comment of comments) {
          await db.insert(commentCacheTable).values({ mediaId: reel.instagramMediaId!, instagramCommentId: comment.id, username: comment.username, text: comment.text, commentTimestamp: comment.timestamp ? new Date(comment.timestamp) : null, likeCount: comment.like_count ?? 0 }).onConflictDoUpdate({ target: commentCacheTable.instagramCommentId, set: { likeCount: comment.like_count ?? 0 } });
        }
      } catch {
        grouped[reel.instagramMediaId!] = [];
      }
    }

    return NextResponse.json(grouped);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
