import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, accaiSessionsTable } from "@/lib/db";
import { ListAccaiSessionsResponse, CreateAccaiSessionBody } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET() {
  const sessions = await db.select().from(accaiSessionsTable).orderBy(desc(accaiSessionsTable.createdAt));
  return NextResponse.json(ListAccaiSessionsResponse.parse(serialize(sessions)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateAccaiSessionBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const [session] = await db.insert(accaiSessionsTable).values(parsed.data).returning();
  return NextResponse.json(serialize(session), { status: 201 });
}
