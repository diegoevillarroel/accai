import { NextRequest, NextResponse } from "next/server";
import { db, reelsTable, accountSnapshotsTable, strategicDirectiveTable } from "@/lib/db";
import { desc, gt, and, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { subDays } from "date-fns";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

const MASTER_SYSTEM_PROMPT = `Eres ACCAI, el sistema de inteligencia estratégica de VILLACLUB™ operado por Diego Villarroel.
Tono: Dominante. Preciso. Intransigente. Sin padding. Sin bullet points decorativos. Directo al accionable.`;

const BRIEF_PARSER_PROMPT = `
Cada output DEBE seguir este formato exacto para ser parseado:

[VOICEOVER]
(Texto exacto para ElevenLabs)
[/VOICEOVER]

[VISUAL_DIRECTION]
(Instrucciones visuales)
[/VISUAL_DIRECTION]

[SUBTITLE_CUES]
(Frases clave para subtítulos)
[/SUBTITLE_CUES]

[HOOK]
(Hook de 3 segundos)
[/HOOK]

[CTA]
(Cierre con link villaclub.vip/pagar)
[/CTA]
`;

const BRIEF_PROMPT = `Modo BRIEF — ESTRUCTURA DE PRODUCCIÓN.
BRIEF output must have these exact sections:
- VOICEOVER (for ElevenLabs): exact words, cold authority tone, no filler, max 120 words for a 35s clip.
- VISUAL DIRECTION: what clips/screenrecording to show during each sentence of the voiceover.
- SUBTITLE CUES: key phrases to emphasize as centered subtitles on screen.
- HOOK (first 3 seconds isolated): standalone, testable as a Threads post before producing.
- CTA (final 5 seconds): exact words, always ends pointing to villaclub.vip/pagar.

Voice constraints for ALL voiceover output:
- Affirmations without hedging.
- At least one number or concrete data point.
- Venezuelan market context.
- Never: "escala", "comunidad", "estrategias probadas", income promises without visible process.

${BRIEF_PARSER_PROMPT}`;

const THREADS_PROMPT = `Modo THREADS. Genera exactly 2 disparos de Threads (operador statements).
REGLAS:
- 2-3 líneas máximo por disparo.
- Golpe lógico/aritmético. Sin CTA.
- No es una opinión, es una definición.
- Tono: Dominante, preciso.`;

export async function POST(request: NextRequest) {
  try {
    const { week_number, angles } = await request.json() as { week_number: number; angles?: string[] };

    const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
    
    const topPerformingAngles = await db
      .select({ 
        angulo: reelsTable.angulo, 
        avgSaves: sql<number>`avg(${reelsTable.savesPer1k})` 
      })
      .from(reelsTable)
      .where(gt(reelsTable.fecha, thirtyDaysAgo))
      .groupBy(reelsTable.angulo)
      .orderBy(desc(sql`avg(${reelsTable.savesPer1k})`))
      .limit(5);

    const availableAngles = topPerformingAngles.map(a => a.angulo).filter(Boolean);
    if (availableAngles.length === 0) availableAngles.push("Matemática innegable", "Proceso visible", "Contraste operador vs amateur", "Asimetría de mercado");

    const selectedAngles: string[] = [];
    if (angles && angles.length > 0) {
      for (let i = 0; i < 7; i++) {
        selectedAngles.push(angles[i % angles.length]);
      }
    } else {
      let lastAngle = "";
      for (let i = 0; i < 7; i++) {
        let current = availableAngles[i % availableAngles.length];
        if (current === lastAngle && availableAngles.length > 1) {
          current = availableAngles[(i + 1) % availableAngles.length];
        }
        selectedAngles.push(current as string);
        lastAngle = current as string;
      }
    }

    const [latestSnapshot, directive] = await Promise.all([
      db.select().from(accountSnapshotsTable).orderBy(desc(accountSnapshotsTable.createdAt)).limit(1),
      db.select().from(strategicDirectiveTable).orderBy(desc(strategicDirectiveTable.createdAt)).limit(1),
    ]);

    const context = `
[CONTEXTO ESTRATÉGICO]
DIRECTIVA: ${directive[0]?.content ?? "Sin directiva"}
ACCOUNT: ${latestSnapshot[0] ? `Seguidores ganados: ${latestSnapshot[0].followersGained} | Conversión: ${latestSnapshot[0].conversionPct.toFixed(1)}%` : "Sin datos"}
`;

    const briefs = [];
    for (let i = 0; i < 7; i++) {
      const angulo = selectedAngles[i];
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: `${MASTER_SYSTEM_PROMPT}\n\n${context}\n\n${BRIEF_PROMPT}`,
        messages: [{ role: "user", content: `Genera un BRIEF para el Día ${i + 1} de la Semana ${week_number}. Ángulo: ${angulo}.` }],
      });
      
      const content = (res.content[0] as any).text;
      
      const extract = (tag: string) => {
        const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`);
        const match = content.match(regex);
        return match ? match[1].trim() : "";
      };

      briefs.push({
        day: i + 1,
        angulo,
        voiceover: extract("VOICEOVER"),
        visualDirection: extract("VISUAL_DIRECTION"),
        subtitleCues: extract("SUBTITLE_CUES"),
        hook: extract("HOOK"),
        cta: extract("CTA"),
        rawContent: content
      });
    }

    const weekThreads = [];
    for (const brief of briefs) {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 512,
        system: `${MASTER_SYSTEM_PROMPT}\n\n${context}\n\n${THREADS_PROMPT}`,
        messages: [{ role: "user", content: `Genera el SEGUNDO disparo de Threads para acompañar este HOOK: "${brief.hook}". No repitas el hook, genera algo independiente pero complementario.` }],
      });
      
      const statement = (res.content[0] as any).text;
      weekThreads.push({
        day: brief.day,
        thread1: brief.hook,
        thread2: statement
      });
    }

    let plaintext = `// BATCH GENERATION WEEK ${week_number}\n\n`;
    briefs.forEach((b, i) => {
      plaintext += `--- DÍA ${b.day} [${b.angulo}] ---\n${b.rawContent}\n\n`;
      plaintext += `THREADS DÍA ${b.day}:\n1. ${weekThreads[i].thread1}\n2. ${weekThreads[i].thread2}\n\n`;
    });

    return NextResponse.json({
      briefs,
      threads: weekThreads,
      plaintext
    });

  } catch (error) {
    console.error("Batch brief error:", error);
    return NextResponse.json({ error: "Failed to generate batch briefs" }, { status: 500 });
  }
}
