import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, competitorReelsTable } from "@/lib/db";
import { transcribeReel } from "@/lib/apify";

export async function POST(request: NextRequest) {
  const { competitorReelId } = await request.json() as { competitorReelId: number };
  if (!competitorReelId) return NextResponse.json({ error: "competitorReelId required" }, { status: 400 });

  const [compReel] = await db.select().from(competitorReelsTable).where(eq(competitorReelsTable.id, competitorReelId));
  if (!compReel) return NextResponse.json({ error: "Competitor reel not found" }, { status: 404 });
  if (!compReel.url) return NextResponse.json({ error: "Competitor reel has no URL" }, { status: 400 });

  try {
    const result = await transcribeReel(compReel.url);
    if (!result) return NextResponse.json({ error: "Transcription failed or APIFY_API_TOKEN not set" }, { status: 500 });

    await db.update(competitorReelsTable).set({ transcripcion: result.transcript }).where(eq(competitorReelsTable.id, competitorReelId));
    return NextResponse.json({ success: true, transcript: result.transcript });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
