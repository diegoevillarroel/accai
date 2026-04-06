import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, accountSnapshotsTable } from "@/lib/db";
import { GetLatestSnapshotResponse } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET() {
  const [snapshot] = await db.select().from(accountSnapshotsTable).orderBy(desc(accountSnapshotsTable.createdAt)).limit(1);
  if (!snapshot) return NextResponse.json({ error: "No snapshot found" }, { status: 404 });
  return NextResponse.json(GetLatestSnapshotResponse.parse(serialize(snapshot)));
}
