import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, reelsTable } from "@/lib/db";
import { GetReelResponse, PatchReelBody } from "@/lib/api-zod";
import { serialize } from "@/lib/serialize";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reelId = parseInt(id, 10);
  if (isNaN(reelId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, reelId));
  if (!reel) return NextResponse.json({ error: "Reel not found" }, { status: 404 });
  return NextResponse.json(GetReelResponse.parse(serialize(reel)));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reelId = parseInt(id, 10);
  if (isNaN(reelId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await request.json();
  const parsed = PatchReelBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const [updated] = await db.update(reelsTable).set(parsed.data).where(eq(reelsTable.id, reelId)).returning();
  if (!updated) return NextResponse.json({ error: "Reel not found" }, { status: 404 });
  return NextResponse.json(GetReelResponse.parse(serialize(updated)));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reelId = parseInt(id, 10);
  if (isNaN(reelId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await db.delete(reelsTable).where(eq(reelsTable.id, reelId));
  return new NextResponse(null, { status: 204 });
}
