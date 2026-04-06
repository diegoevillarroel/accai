import { NextRequest, NextResponse } from "next/server";
import { eq, isNull, isNotNull, and } from "drizzle-orm";
import { db, competitorReelsTable } from "@/lib/db";
import { transcribeReel } from "@/lib/apify";

export async function POST(request: NextRequest) {
  const { competitorId } = await request.json() as { competitorId: number };
  if (!competitorId) return NextResponse.json({ error: "competitorId required" }, { status: 400 });

  const reels = await db.select().from(competitorReelsTable).where(and(eq(competitorReelsTable.competitorId, competitorId), isNull(competitorReelsTable.transcripcion), isNotNull(competitorReelsTable.url)));

  let transcribed = 0;
  let failed = 0;

  for (const reel of reels) {
    try {
      const result = await transcribeReel(reel.url!);
      if (result?.transcript) {
        await db.update(competitorReelsTable).set({ transcripcion: result.transcript }).where(eq(competitorReelsTable.id, reel.id));
        transcribed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ transcribed, failed, total: reels.length });
}
