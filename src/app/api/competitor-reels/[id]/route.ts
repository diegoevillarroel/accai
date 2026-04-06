import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, competitorReelsTable } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reelId = parseInt(id, 10);
  if (isNaN(reelId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(competitorReelsTable).where(eq(competitorReelsTable.id, reelId));
  return new NextResponse(null, { status: 204 });
}
