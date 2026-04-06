import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, accountSnapshotsTable } from "@/lib/db";
import { GetLatestSnapshotResponse } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

const EMPTY_SNAPSHOT = {
  id: 0,
  periodStart: "1970-01-01",
  periodEnd: "1970-01-01",
  views: 0,
  followersGained: 0,
  profileVisits: 0,
  conversionPct: 0,
  createdAt: new Date(0).toISOString(),
};

export async function GET() {
  const [snapshot] = await db.select().from(accountSnapshotsTable).orderBy(desc(accountSnapshotsTable.createdAt)).limit(1);
  if (!snapshot) {
    return NextResponse.json(GetLatestSnapshotResponse.parse(EMPTY_SNAPSHOT));
  }
  return NextResponse.json(GetLatestSnapshotResponse.parse(serialize(snapshot)));
}
