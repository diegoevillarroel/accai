import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, planReelsTable } from "@/lib/db";
import { ListPlanReelsResponse, UpsertPlanReelBody, UpsertPlanReelResponse } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET() {
  const reels = await db.select().from(planReelsTable);
  return NextResponse.json(ListPlanReelsResponse.parse(serialize(reels)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = UpsertPlanReelBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { mes, semana, slot } = parsed.data;
  const [existing] = await db.select().from(planReelsTable).where(and(eq(planReelsTable.mes, mes), eq(planReelsTable.semana, semana), eq(planReelsTable.slot, slot)));

  let result;
  if (existing) {
    [result] = await db.update(planReelsTable).set(parsed.data).where(eq(planReelsTable.id, existing.id)).returning();
  } else {
    [result] = await db.insert(planReelsTable).values(parsed.data).returning();
  }

  return NextResponse.json(UpsertPlanReelResponse.parse(serialize(result)));
}
