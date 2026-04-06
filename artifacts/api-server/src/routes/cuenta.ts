import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, accountSnapshotsTable, strategicDirectiveTable } from "@workspace/db";
import {
  ListSnapshotsResponse,
  GetLatestSnapshotResponse,
  CreateSnapshotBody,
  GetDirectiveResponse,
  SaveDirectiveBody,
  SaveDirectiveResponse,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/cuenta/snapshots", async (_req, res): Promise<void> => {
  const snapshots = await db
    .select()
    .from(accountSnapshotsTable)
    .orderBy(desc(accountSnapshotsTable.createdAt));
  res.json(ListSnapshotsResponse.parse(serialize(snapshots)));
});

router.post("/cuenta/snapshots", async (req, res): Promise<void> => {
  const parsed = CreateSnapshotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { views, followersGained, profileVisits } = parsed.data;
  const conversionPct = profileVisits > 0 ? (followersGained / profileVisits) * 100 : 0;

  const [snapshot] = await db
    .insert(accountSnapshotsTable)
    .values({ ...parsed.data, conversionPct })
    .returning();

  res.status(201).json(GetLatestSnapshotResponse.parse(serialize(snapshot)));
});

router.get("/cuenta/latest", async (_req, res): Promise<void> => {
  const [snapshot] = await db
    .select()
    .from(accountSnapshotsTable)
    .orderBy(desc(accountSnapshotsTable.createdAt))
    .limit(1);

  if (!snapshot) {
    res.status(404).json({ error: "No snapshot found" });
    return;
  }

  res.json(GetLatestSnapshotResponse.parse(serialize(snapshot)));
});

router.get("/cuenta/directive", async (_req, res): Promise<void> => {
  const [directive] = await db
    .select()
    .from(strategicDirectiveTable)
    .orderBy(desc(strategicDirectiveTable.createdAt))
    .limit(1);

  if (!directive) {
    res.status(404).json({ error: "No directive found" });
    return;
  }

  res.json(GetDirectiveResponse.parse(serialize(directive)));
});

router.post("/cuenta/directive", async (req, res): Promise<void> => {
  const parsed = SaveDirectiveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.delete(strategicDirectiveTable);
  const [directive] = await db
    .insert(strategicDirectiveTable)
    .values(parsed.data)
    .returning();

  res.json(SaveDirectiveResponse.parse(serialize(directive)));
});

export default router;
