import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, accaiSessionsTable } from "@workspace/db";
import {
  ListAccaiSessionsResponse,
  CreateAccaiSessionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/accai/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(accaiSessionsTable)
    .orderBy(desc(accaiSessionsTable.createdAt));
  res.json(ListAccaiSessionsResponse.parse(sessions));
});

router.post("/accai/sessions", async (req, res): Promise<void> => {
  const parsed = CreateAccaiSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(accaiSessionsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(session);
});

export default router;
