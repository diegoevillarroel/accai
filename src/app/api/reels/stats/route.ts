import { NextResponse } from "next/server";
import { avg, count } from "drizzle-orm";
import { db, reelsTable } from "@/lib/db";
import { GetReelsStatsResponse } from "@/lib/api-zod";

export async function GET() {
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

  return NextResponse.json(GetReelsStatsResponse.parse({
    totalReels: Number(stats?.totalReels ?? 0),
    avgViews: Number(stats?.avgViews ?? 0),
    avgSavesPct: Number(stats?.avgSavesPct ?? 0),
    avgLikesPct: Number(stats?.avgLikesPct ?? 0),
    firmaBreakdown,
    anguloBreakdown,
  }));
}
