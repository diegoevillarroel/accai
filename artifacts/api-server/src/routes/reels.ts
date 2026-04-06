import { Router, type IRouter } from "express";
import { desc, eq, avg, count, isNull } from "drizzle-orm";
import { db, reelsTable } from "@workspace/db";
import {
  ListReelsResponse,
  GetReelsStatsResponse,
  CreateReelBody,
  GetReelParams,
  GetReelResponse,
  DeleteReelParams,
  PatchReelBody,
} from "@workspace/api-zod";
import { serialize } from "../lib/serialize";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function classifyFirma(
  reel: { savesPct: number; views: number },
  avgViews: number,
  avgSavesPct: number,
): string {
  if (reel.savesPct > avgSavesPct * 1.3 && reel.views > 5000) return "CONVERTIDOR";
  if (reel.views > avgViews * 1.5 && reel.savesPct < avgSavesPct) return "VIRAL";
  if (reel.views > avgViews * 1.2 && reel.savesPct > avgSavesPct) return "EDUCATIVO";
  return "MUERTO";
}

router.get("/reels", async (_req, res): Promise<void> => {
  const reels = await db.select().from(reelsTable).orderBy(desc(reelsTable.fecha));
  res.json(ListReelsResponse.parse(serialize(reels)));
});

router.post("/reels", async (req, res): Promise<void> => {
  const parsed = CreateReelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { views, likes, comments, saves, shares, followersAtPublish } = parsed.data;
  const likesPct = views > 0 ? (likes / views) * 100 : 0;
  const commentsPct = views > 0 ? (comments / views) * 100 : 0;
  const savesPct = views > 0 ? (saves / views) * 100 : 0;
  const sharesPct = views > 0 ? (shares / views) * 100 : 0;
  const savesPer1k = followersAtPublish > 0 ? (saves / followersAtPublish) * 1000 : 0;

  const [stats] = await db.select({ avgViews: avg(reelsTable.views), avgSavesPct: avg(reelsTable.savesPct) }).from(reelsTable);
  const avgViews = Number(stats?.avgViews ?? 0);
  const avgSavesPctVal = Number(stats?.avgSavesPct ?? 0);
  const firma = classifyFirma({ savesPct, views }, avgViews, avgSavesPctVal);

  const [reel] = await db.insert(reelsTable).values({ ...parsed.data, likesPct, commentsPct, savesPct, sharesPct, savesPer1k, firma }).returning();
  res.status(201).json(GetReelResponse.parse(serialize(reel)));
});

router.get("/reels/stats", async (_req, res): Promise<void> => {
  const [stats] = await db.select({ totalReels: count(reelsTable.id), avgViews: avg(reelsTable.views), avgSavesPct: avg(reelsTable.savesPct), avgLikesPct: avg(reelsTable.likesPct) }).from(reelsTable);
  const reels = await db.select().from(reelsTable);

  const firmaBreakdown = { CONVERTIDOR: 0, VIRAL: 0, EDUCATIVO: 0, MUERTO: 0 };
  const anguloBreakdown = { matematica: 0, proceso: 0, contraste: 0, asimetria: 0 };

  for (const r of reels) {
    const firma = r.firma as keyof typeof firmaBreakdown;
    if (firma in firmaBreakdown) firmaBreakdown[firma]++;
    if (!r.angulo) continue;
    if (r.angulo.toLowerCase().includes("matem")) anguloBreakdown.matematica++;
    else if (r.angulo.toLowerCase().includes("proceso")) anguloBreakdown.proceso++;
    else if (r.angulo.toLowerCase().includes("contraste")) anguloBreakdown.contraste++;
    else if (r.angulo.toLowerCase().includes("asimetr")) anguloBreakdown.asimetria++;
  }

  res.json(GetReelsStatsResponse.parse({
    totalReels: Number(stats?.totalReels ?? 0),
    avgViews: Number(stats?.avgViews ?? 0),
    avgSavesPct: Number(stats?.avgSavesPct ?? 0),
    avgLikesPct: Number(stats?.avgLikesPct ?? 0),
    firmaBreakdown,
    anguloBreakdown,
  }));
});

router.get("/reels/:id", async (req, res): Promise<void> => {
  const params = GetReelParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, params.data.id));
  if (!reel) { res.status(404).json({ error: "Reel not found" }); return; }
  res.json(GetReelResponse.parse(serialize(reel)));
});

router.patch("/reels/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params['id'], 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = PatchReelBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(reelsTable).set(parsed.data).where(eq(reelsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Reel not found" }); return; }
  res.json(GetReelResponse.parse(serialize(updated)));
});

router.post("/reels/:id/classify", async (req, res): Promise<void> => {
  const id = parseInt(req.params['id'], 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, id));
  if (!reel) { res.status(404).json({ error: "Reel not found" }); return; }

  const caption = reel.transcripcion || reel.notas || "";
  if (!caption) { res.status(400).json({ error: "No caption/transcripcion to classify" }); return; }

  const prompt = `Clasifica este reel de VILLACLUB. Caption: ${caption}. Responde SOLO en JSON válido sin markdown: {"tema": "string", "angulo": "Matemática innegable" | "Proceso visible" | "Contraste operador-amateur" | "Asimetría de mercado", "formato": "Cara a cámara" | "Screenrecording" | "Mixto"}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  let classification: { tema?: string; angulo?: string; formato?: string } = {};
  try {
    const text = (message.content[0] as any).text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) classification = JSON.parse(jsonMatch[0]);
  } catch (e) {
    res.status(500).json({ error: "Failed to parse classification JSON" });
    return;
  }

  const [updated] = await db.update(reelsTable).set({
    tema: classification.tema || null,
    angulo: classification.angulo || null,
    formato: classification.formato || null,
  }).where(eq(reelsTable.id, id)).returning();

  res.json({ ...classification, reelId: id, updated: !!updated });
});

router.delete("/reels/:id", async (req, res): Promise<void> => {
  const params = DeleteReelParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(reelsTable).where(eq(reelsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
