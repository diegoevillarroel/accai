import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, accountSnapshotsTable } from "@/lib/db";
import { ListSnapshotsResponse, CreateSnapshotBody, GetLatestSnapshotResponse } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET() {
  const snapshots = await db.select().from(accountSnapshotsTable).orderBy(desc(accountSnapshotsTable.createdAt));
  return NextResponse.json(ListSnapshotsResponse.parse(serialize(snapshots)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateSnapshotBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { views, followersGained, profileVisits } = parsed.data;
  const conversionPct = profileVisits > 0 ? (followersGained / profileVisits) * 100 : 0;

  const [snapshot] = await db.insert(accountSnapshotsTable).values({ ...parsed.data, conversionPct }).returning();
  return NextResponse.json(GetLatestSnapshotResponse.parse(serialize(snapshot)), { status: 201 });
}
