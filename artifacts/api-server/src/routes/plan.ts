import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, planReelsTable, planObjectivesTable } from "@workspace/db";
import {
  ListPlanReelsResponse,
  UpsertPlanReelBody,
  UpsertPlanReelResponse,
  ListPlanObjectivesResponse,
  UpsertPlanObjectiveBody,
  UpsertPlanObjectiveResponse,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/plan/reels", async (_req, res): Promise<void> => {
  const reels = await db.select().from(planReelsTable);
  res.json(ListPlanReelsResponse.parse(serialize(reels)));
});

router.post("/plan/reels", async (req, res): Promise<void> => {
  const parsed = UpsertPlanReelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mes, semana, slot } = parsed.data;

  const [existing] = await db
    .select()
    .from(planReelsTable)
    .where(
      and(
        eq(planReelsTable.mes, mes),
        eq(planReelsTable.semana, semana),
        eq(planReelsTable.slot, slot),
      ),
    );

  let result;
  if (existing) {
    [result] = await db
      .update(planReelsTable)
      .set(parsed.data)
      .where(eq(planReelsTable.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(planReelsTable)
      .values(parsed.data)
      .returning();
  }

  res.json(UpsertPlanReelResponse.parse(serialize(result)));
});

router.get("/plan/objectives", async (_req, res): Promise<void> => {
  const objectives = await db.select().from(planObjectivesTable);
  res.json(ListPlanObjectivesResponse.parse(serialize(objectives)));
});

router.post("/plan/objectives", async (req, res): Promise<void> => {
  const parsed = UpsertPlanObjectiveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mes } = parsed.data;

  const [existing] = await db
    .select()
    .from(planObjectivesTable)
    .where(eq(planObjectivesTable.mes, mes));

  let result;
  if (existing) {
    [result] = await db
      .update(planObjectivesTable)
      .set(parsed.data)
      .where(eq(planObjectivesTable.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(planObjectivesTable)
      .values(parsed.data)
      .returning();
  }

  res.json(UpsertPlanObjectiveResponse.parse(serialize(result)));
});

export default router;
