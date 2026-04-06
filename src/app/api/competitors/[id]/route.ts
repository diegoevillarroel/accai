import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, competitorsTable, competitorReelsTable } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitorId = parseInt(id, 10);
  if (isNaN(competitorId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(competitorReelsTable).where(eq(competitorReelsTable.competitorId, competitorId));
  await db.delete(competitorsTable).where(eq(competitorsTable.id, competitorId));
  return new NextResponse(null, { status: 204 });
}
