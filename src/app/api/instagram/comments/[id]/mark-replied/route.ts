import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, commentCacheTable } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const commentId = parseInt(id, 10);
  if (isNaN(commentId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { replyText } = await request.json();
  try {
    const [updated] = await db.update(commentCacheTable).set({ replied: true, replyText: replyText || null }).where(eq(commentCacheTable.id, commentId)).returning();
    if (!updated) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    return NextResponse.json(serialize(updated));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
