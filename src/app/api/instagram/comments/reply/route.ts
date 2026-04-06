import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, commentCacheTable } from "@/lib/db";
import { replyToComment } from "@/lib/instagram";

export async function POST(request: NextRequest) {
  const { commentId, message } = await request.json();
  if (!commentId || !message) return NextResponse.json({ error: "commentId and message are required" }, { status: 400 });

  try {
    const result = await replyToComment(commentId, message);
    await db.update(commentCacheTable).set({ replied: true, replyText: message }).where(eq(commentCacheTable.instagramCommentId, commentId));
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
