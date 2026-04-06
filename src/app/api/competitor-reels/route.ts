import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, competitorReelsTable } from "@/lib/db";
import { ListCompetitorReelsResponse, CreateCompetitorReelBody } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET() {
  const reels = await db.select().from(competitorReelsTable).orderBy(desc(competitorReelsTable.createdAt));
  return NextResponse.json(ListCompetitorReelsResponse.parse(serialize(reels)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateCompetitorReelBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const [reel] = await db.insert(competitorReelsTable).values(parsed.data).returning();
  return NextResponse.json(serialize(reel), { status: 201 });
}
