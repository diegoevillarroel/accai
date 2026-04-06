import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, threadsPostsTable } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export async function GET() {
  try {
    const posts = await db.select().from(threadsPostsTable).orderBy(desc(threadsPostsTable.postedAt));
    return NextResponse.json(serialize(posts));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
