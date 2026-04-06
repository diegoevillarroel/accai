import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, strategicDirectiveTable } from "@/lib/db";
import { GetDirectiveResponse, SaveDirectiveBody, SaveDirectiveResponse } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET() {
  const [directive] = await db.select().from(strategicDirectiveTable).orderBy(desc(strategicDirectiveTable.createdAt)).limit(1);
  if (!directive) return NextResponse.json({ error: "No directive found" }, { status: 404 });
  return NextResponse.json(GetDirectiveResponse.parse(serialize(directive)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = SaveDirectiveBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await db.delete(strategicDirectiveTable);
  const [directive] = await db.insert(strategicDirectiveTable).values(parsed.data).returning();
  return NextResponse.json(SaveDirectiveResponse.parse(serialize(directive)));
}
