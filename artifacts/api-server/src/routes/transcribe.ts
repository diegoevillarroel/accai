import { Router, type IRouter } from "express";
import { eq, isNull, and, isNotNull } from "drizzle-orm";
import { db, reelsTable, competitorReelsTable } from "@workspace/db";
import { transcribeReel } from "../lib/apify";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/transcribe", async (req, res): Promise<void> => {
  const { reelId, url, batch } = req.body as { reelId?: number; url?: string; batch?: boolean };

  if (batch) {
    // Batch mode: transcribe all reels missing a transcript
    const reels = await db
      .select()
      .from(reelsTable)
      .where(and(isNull(reelsTable.transcripcion), isNotNull(reelsTable.permalink)));

    let transcribed = 0;
    const failed: string[] = [];

    for (const reel of reels) {
      try {
        const result = await transcribeReel(reel.permalink!);
        if (result && result.transcript) {
          await db
            .update(reelsTable)
            .set({ transcripcion: result.transcript })
            .where(eq(reelsTable.id, reel.id));
          transcribed++;
        } else {
          failed.push(`reel ${reel.id}: no transcript returned`);
        }
      } catch (e: any) {
        failed.push(`reel ${reel.id}: ${e.message}`);
        logger.error({ err: e, reelId: reel.id }, "Batch transcription failed for reel");
      }
    }

    res.json({ transcribed, failed: failed.length, errors: failed, total: reels.length });
    return;
  }

  // Single reel mode
  let targetUrl: string | null = null;
  let targetId: number | null = null;

  if (reelId) {
    const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, reelId));
    if (!reel) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    targetUrl = reel.permalink;
    targetId = reel.id;
  } else if (url) {
    targetUrl = url;
  }

  if (!targetUrl) {
    res.status(400).json({ error: "reelId or url required" });
    return;
  }

  try {
    const result = await transcribeReel(targetUrl);
    if (!result) {
      res.status(500).json({ error: "Transcription failed or APIFY_API_TOKEN not set" });
      return;
    }

    if (targetId) {
      await db
        .update(reelsTable)
        .set({ transcripcion: result.transcript })
        .where(eq(reelsTable.id, targetId));
    }

    res.json({ success: true, transcript: result.transcript, language: result.language });
  } catch (e: any) {
    logger.error({ err: e }, "Transcription error");
    res.status(500).json({ error: e.message });
  }
});

router.post("/transcribe/competitor", async (req, res): Promise<void> => {
  const { competitorReelId } = req.body as { competitorReelId: number };
  if (!competitorReelId) {
    res.status(400).json({ error: "competitorReelId required" });
    return;
  }

  const [compReel] = await db
    .select()
    .from(competitorReelsTable)
    .where(eq(competitorReelsTable.id, competitorReelId));

  if (!compReel) {
    res.status(404).json({ error: "Competitor reel not found" });
    return;
  }

  if (!compReel.url) {
    res.status(400).json({ error: "Competitor reel has no URL" });
    return;
  }

  try {
    const result = await transcribeReel(compReel.url);
    if (!result) {
      res.status(500).json({ error: "Transcription failed or APIFY_API_TOKEN not set" });
      return;
    }

    await db
      .update(competitorReelsTable)
      .set({ transcripcion: result.transcript })
      .where(eq(competitorReelsTable.id, competitorReelId));

    res.json({ success: true, transcript: result.transcript });
  } catch (e: any) {
    logger.error({ err: e }, "Competitor transcription error");
    res.status(500).json({ error: e.message });
  }
});

router.post("/transcribe/competitor-batch", async (req, res): Promise<void> => {
  const { competitorId } = req.body as { competitorId: number };
  if (!competitorId) {
    res.status(400).json({ error: "competitorId required" });
    return;
  }

  const reels = await db
    .select()
    .from(competitorReelsTable)
    .where(
      and(
        eq(competitorReelsTable.competitorId, competitorId),
        isNull(competitorReelsTable.transcripcion),
        isNotNull(competitorReelsTable.url),
      )
    );

  let transcribed = 0;
  let failed = 0;

  for (const reel of reels) {
    try {
      const result = await transcribeReel(reel.url!);
      if (result && result.transcript) {
        await db
          .update(competitorReelsTable)
          .set({ transcripcion: result.transcript })
          .where(eq(competitorReelsTable.id, reel.id));
        transcribed++;
      } else {
        failed++;
      }
    } catch (e: any) {
      failed++;
      logger.error({ err: e, compReelId: reel.id }, "Competitor batch transcription failed");
    }
  }

  res.json({ transcribed, failed, total: reels.length });
});

export default router;
