import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, commentCacheTable } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export async function GET() {
  try {
    const comments = await db.select().from(commentCacheTable).orderBy(desc(commentCacheTable.commentTimestamp));
    return NextResponse.json(serialize(comments));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
