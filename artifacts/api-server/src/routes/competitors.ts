import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, competitorsTable, competitorReelsTable } from "@workspace/db";
import {
  ListCompetitorsResponse,
  CreateCompetitorBody,
  DeleteCompetitorParams,
  ListCompetitorReelsResponse,
  CreateCompetitorReelBody,
  DeleteCompetitorReelParams,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/competitors", async (_req, res): Promise<void> => {
  const competitors = await db
    .select()
    .from(competitorsTable)
    .orderBy(desc(competitorsTable.createdAt));
  res.json(ListCompetitorsResponse.parse(serialize(competitors)));
});

router.post("/competitors", async (req, res): Promise<void> => {
  const parsed = CreateCompetitorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(competitorsTable);
  if (existing.length >= 8) {
    res.status(400).json({ error: "Maximum 8 competitors allowed" });
    return;
  }

  const handle = parsed.data.handle.startsWith("@")
    ? parsed.data.handle
    : `@${parsed.data.handle}`;

  const [competitor] = await db
    .insert(competitorsTable)
    .values({ ...parsed.data, handle })
    .returning();

  res.status(201).json(serialize(competitor));
});

router.delete("/competitors/:id", async (req, res): Promise<void> => {
  const params = DeleteCompetitorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(competitorReelsTable)
    .where(eq(competitorReelsTable.competitorId, params.data.id));
  await db
    .delete(competitorsTable)
    .where(eq(competitorsTable.id, params.data.id));

  res.sendStatus(204);
});

router.get("/competitor-reels", async (_req, res): Promise<void> => {
  const reels = await db
    .select()
    .from(competitorReelsTable)
    .orderBy(desc(competitorReelsTable.createdAt));
  res.json(ListCompetitorReelsResponse.parse(serialize(reels)));
});

router.post("/competitor-reels", async (req, res): Promise<void> => {
  const parsed = CreateCompetitorReelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reel] = await db
    .insert(competitorReelsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(serialize(reel));
});

router.delete("/competitor-reels/:id", async (req, res): Promise<void> => {
  const params = DeleteCompetitorReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(competitorReelsTable)
    .where(eq(competitorReelsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
