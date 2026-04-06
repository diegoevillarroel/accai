import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, competitorsTable } from "@/lib/db";
import { ListCompetitorsResponse, CreateCompetitorBody } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET() {
  const competitors = await db.select().from(competitorsTable).orderBy(desc(competitorsTable.createdAt));
  return NextResponse.json(ListCompetitorsResponse.parse(serialize(competitors)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateCompetitorBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const existing = await db.select().from(competitorsTable);
  if (existing.length >= 8) return NextResponse.json({ error: "Maximum 8 competitors allowed" }, { status: 400 });

  const handle = parsed.data.handle.startsWith("@") ? parsed.data.handle : `@${parsed.data.handle}`;
  const [competitor] = await db.insert(competitorsTable).values({ ...parsed.data, handle }).returning();
  return NextResponse.json(serialize(competitor), { status: 201 });
}
