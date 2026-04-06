import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, threadsPostsTable } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [updated] = await db.update(threadsPostsTable).set({ promotedToReel: true }).where(eq(threadsPostsTable.id, postId)).returning();
    if (!updated) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(serialize(updated));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
