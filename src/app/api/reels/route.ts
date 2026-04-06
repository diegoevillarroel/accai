import { NextRequest, NextResponse } from "next/server";
import { desc, avg } from "drizzle-orm";
import { db, reelsTable } from "@/lib/db";
import { ListReelsResponse, CreateReelBody, GetReelResponse } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";
import Anthropic from "@anthropic-ai/sdk";

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

export async function GET() {
  const reels = await db.select().from(reelsTable).orderBy(desc(reelsTable.fecha));
  return NextResponse.json(ListReelsResponse.parse(serialize(reels)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateReelBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
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
  return NextResponse.json(GetReelResponse.parse(serialize(reel)), { status: 201 });
}
