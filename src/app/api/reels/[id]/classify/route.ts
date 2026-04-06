import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, reelsTable } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reelId = parseInt(id, 10);
  if (isNaN(reelId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, reelId));
  if (!reel) return NextResponse.json({ error: "Reel not found" }, { status: 404 });

  const caption = reel.transcripcion || reel.notas || "";
  if (!caption) return NextResponse.json({ error: "No caption/transcripcion to classify" }, { status: 400 });

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
  } catch {
    return NextResponse.json({ error: "Failed to parse classification JSON" }, { status: 500 });
  }

  const [updated] = await db.update(reelsTable).set({
    ...(classification.tema && { tema: classification.tema }),
    ...(classification.angulo && { angulo: classification.angulo }),
    ...(classification.formato && { formato: classification.formato }),
  }).where(eq(reelsTable.id, reelId)).returning();

  return NextResponse.json({ ...classification, reelId, updated: !!updated });
}
