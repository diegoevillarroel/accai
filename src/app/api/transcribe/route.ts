import { NextRequest, NextResponse } from "next/server";
import { eq, isNull, and, isNotNull } from "drizzle-orm";
import { db, reelsTable } from "@/lib/db";
import { transcribeReel } from "@/lib/apify";

export async function POST(request: NextRequest) {
  const body = await request.json() as { reelId?: number; url?: string; batch?: boolean };

  if (body.batch) {
    const reels = await db.select().from(reelsTable).where(and(isNull(reelsTable.transcripcion), isNotNull(reelsTable.permalink)));
    let transcribed = 0;
    const failed: string[] = [];

    for (const reel of reels) {
      try {
        const result = await transcribeReel(reel.permalink!);
        if (result?.transcript) {
          await db.update(reelsTable).set({ transcripcion: result.transcript }).where(eq(reelsTable.id, reel.id));
          transcribed++;
        } else {
          failed.push(`reel ${reel.id}: no transcript returned`);
        }
      } catch (e: any) {
        failed.push(`reel ${reel.id}: ${e.message}`);
      }
    }

    return NextResponse.json({ transcribed, failed: failed.length, errors: failed, total: reels.length });
  }

  let targetUrl: string | null = null;
  let targetId: number | null = null;

  if (body.reelId) {
    const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, body.reelId));
    if (!reel) return NextResponse.json({ error: "Reel not found" }, { status: 404 });
    targetUrl = reel.permalink;
    targetId = reel.id;
  } else if (body.url) {
    targetUrl = body.url;
  }

  if (!targetUrl) return NextResponse.json({ error: "reelId or url required" }, { status: 400 });

  try {
    const result = await transcribeReel(targetUrl);
    if (!result) return NextResponse.json({ error: "Transcription failed or APIFY_API_TOKEN not set" }, { status: 500 });

    if (targetId) {
      await db.update(reelsTable).set({ transcripcion: result.transcript }).where(eq(reelsTable.id, targetId));
    }

    return NextResponse.json({ success: true, transcript: result.transcript, language: result.language });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
