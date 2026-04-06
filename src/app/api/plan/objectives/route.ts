import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, planObjectivesTable } from "@/lib/db";
import { ListPlanObjectivesResponse, UpsertPlanObjectiveBody, UpsertPlanObjectiveResponse } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET() {
  const objectives = await db.select().from(planObjectivesTable);
  return NextResponse.json(ListPlanObjectivesResponse.parse(serialize(objectives)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = UpsertPlanObjectiveBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { mes } = parsed.data;
  const [existing] = await db.select().from(planObjectivesTable).where(eq(planObjectivesTable.mes, mes));

  let result;
  if (existing) {
    [result] = await db.update(planObjectivesTable).set(parsed.data).where(eq(planObjectivesTable.id, existing.id)).returning();
  } else {
    [result] = await db.insert(planObjectivesTable).values(parsed.data).returning();
  }

  return NextResponse.json(UpsertPlanObjectiveResponse.parse(serialize(result)));
}
