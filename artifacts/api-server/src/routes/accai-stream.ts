import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  reelsTable,
  accountSnapshotsTable,
  strategicDirectiveTable,
  competitorReelsTable,
  competitorsTable,
} from "@workspace/db";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-3-5-sonnet-20241022";

async function buildContext(): Promise<string> {
  const [reels, latestSnapshot, directive, compReels, competitors] =
    await Promise.all([
      db
        .select()
        .from(reelsTable)
        .orderBy(desc(reelsTable.fecha))
        .limit(30),
      db
        .select()
        .from(accountSnapshotsTable)
        .orderBy(desc(accountSnapshotsTable.createdAt))
        .limit(1),
      db
        .select()
        .from(strategicDirectiveTable)
        .orderBy(desc(strategicDirectiveTable.createdAt))
        .limit(1),
      db.select().from(competitorReelsTable),
      db.select().from(competitorsTable),
    ]);

  const top5Saves = [...reels]
    .sort((a, b) => b.savesPct - a.savesPct)
    .slice(0, 5);
  const bottom5Views = [...reels]
    .sort((a, b) => a.views - b.views)
    .slice(0, 5);

  const anguloCount: Record<string, number> = {};
  const firmaCount: Record<string, number> = {};
  for (const r of reels) {
    anguloCount[r.angulo] = (anguloCount[r.angulo] ?? 0) + 1;
    firmaCount[r.firma] = (firmaCount[r.firma] ?? 0) + 1;
  }

  return `
[CONTEXTO VILLACLUB LIVE]

ACCOUNT SNAPSHOT (más reciente):
${latestSnapshot[0] ? `Views: ${latestSnapshot[0].views} | Seguidores ganados: ${latestSnapshot[0].followersGained} | Visitas al perfil: ${latestSnapshot[0].profileVisits} | Conversión: ${latestSnapshot[0].conversionPct.toFixed(1)}%` : "Sin datos"}

ÚLTIMOS 30 REELS:
${reels.map((r) => `- ${r.fecha} | ${r.tema} | ${r.angulo} | Views: ${r.views} | SavesPct: ${r.savesPct.toFixed(1)}% | S/1K: ${r.savesPer1k.toFixed(2)} | Firma: ${r.firma}`).join("\n")}

TOP 5 POR SAVES:
${top5Saves.map((r) => `- ${r.tema} | SavesPct: ${r.savesPct.toFixed(1)}%`).join("\n")}

BOTTOM 5 POR VIEWS:
${bottom5Views.map((r) => `- ${r.tema} | Views: ${r.views}`).join("\n")}

DISTRIBUCIÓN POR ÁNGULO: ${JSON.stringify(anguloCount)}
DISTRIBUCIÓN POR FIRMA: ${JSON.stringify(firmaCount)}

COMPETIDORES (${competitors.length}):
${competitors.map((c) => `- ${c.handle} | ${c.nicho} | ~${c.followersApprox ?? "?"} seguidores`).join("\n")}

VIDEOS COMPETIDORES (${compReels.length}):
${compReels.map((cr) => `- [Competidor ID:${cr.competitorId}] ${cr.tema} | Hook: ${cr.hook} | Engagement: ${cr.engagementLevel}${cr.transcripcion ? ` | Transcripción: ${cr.transcripcion.slice(0, 200)}` : ""}`).join("\n")}
`;
}

const MASTER_SYSTEM_PROMPT = `Eres ACCAI, el sistema de inteligencia estratégica de VILLACLUB™ operado por Diego Villarroel.

Diego Villarroel: 23 años, Lechería Venezuela, abogado, operador de e-commerce físico con 4+ años de experiencia. CPC documentado $0.018 en Meta Ads Venezuela.

Arquitectura de oferta:
- Front-end $20: directorio de proveedores (China/USA/Colombia)
- VILLACLUB OS $97: sistema completo con Meta Ads + ingeniería de percepción
- Consultoría $300-500: acceso por DM cualificado
- Setup completo $1000-2000: servicio done-for-you

Mercado Venezuela:
- 93% gana $240-510/mes
- CPC promedio Venezuela: $0.018 vs $1.50 USA
- Engaged Shoppers: 8.2% — base compradora baja, exige calidad en creativo y cierre
- Ciclo de conversión: 2-7 días
- Compra por validación racional, no impulso. Necesita prueba en SU contexto.
- WhatsApp no es fricción — es validación emocional

Los 4 ángulos de contenido:
1. Matemática innegable: aritmética pura, costos reales, sin promesas de ingreso
2. Proceso visible: screenrecordings, dashboards, chats con proveedores reales
3. Contraste operador vs amateur: posicionamiento UP
4. Asimetría de mercado: CPC VE vs USA, datos duros

Formato: cara a cámara, 1:1, fondo negro, subtítulos al pecho, sin edits complejos.

Tono de marca: Dominante. Preciso. Intransigente.
NUNCA: entusiasmo performativo, lenguaje de coach, promesas de ingreso, comparación con competencia.
SIEMPRE: afirmaciones sin hedging, números como argumento, vocabulario operacional.

Avatar A — El Buscador: 18-28, $100-500 capital, miedo a ser estafado, busca el contacto mágico.
Avatar B — El Operador Estancado: 25-45, factura $1k-10k/mes, problema de adquisición predecible, esclavo de su WhatsApp.

REGLA DE OUTPUT: Máximo una página por respuesta. Diagnóstico frío. Sin padding. Sin bullet points decorativos. Directo al accionable.`;

const MODE_PROMPTS: Record<string, string> = {
  AUTOPSIA:
    "Modo AUTOPSIA. Analiza este reel específico contra el historial completo. Identifica exactamente qué combinación de variables (hook, ángulo, formato, tema, timing) produjo el resultado. Determina si es replicable y cómo, sin repetir el tema. Output: diagnóstico de por qué funcionó o falló + 2 conceptos derivados listos para ejecutar.",
  BRIEF:
    "Modo BRIEF. Con el contexto de la semana y el historial de rendimiento, genera exactamente 3 conceptos de video. Cada uno: Hook (primeros 3 segundos exactos — lo que digo y lo que se ve), Ángulo (cuál de los 4), Estructura (qué mostrar, qué decir, en qué orden), CTA específico. Evita temas ya cubiertos en los últimos 30 días según el contexto.",
  DIAGNOSTICO:
    "Modo DIAGNÓSTICO. Analiza el rendimiento de los últimos 7 días en orden estricto: Hook → Ángulo → Distribución → Oferta. Identifica el bottleneck real. No menciones el siguiente nivel hasta resolver el anterior. Una acción concreta por nivel de diagnóstico.",
  COMPETENCIA:
    "Modo COMPETENCIA. Analiza los videos de los competidores seleccionados contra los de Diego. Identifica: 1) qué temas cubren que Diego no, 2) qué ángulos tienen mayor engagement en el mercado VE actualmente, 3) qué vacíos estratégicos existen que nadie está cubriendo. Output: mapa de brechas + 2 ataques concretos para los próximos 14 días.",
  "FUNNEL CHECK":
    "Modo FUNNEL CHECK. Evalúa el mix de contenido de las últimas 2 semanas. Clasifica cada reel en: Autoridad (instalar quién es Diego), Confianza (prueba y casos), Conversión (activar compra). Determina el porcentaje actual en cada fase. El balance objetivo es 40% Autoridad / 35% Confianza / 25% Conversión para fase de crecimiento. Indica desequilibrio y qué tipo de pieza producir para corregirlo.",
  CIERRE:
    "Modo CIERRE. Recibes un fragmento de conversación de DM o WhatsApp con un prospecto. Ejecuta: 1) Identifica el avatar (Buscador o Operador Estancado) y justifica en una línea. 2) Identifica la fase actual del cierre: Investigación / Apertura / Dolor / Gap / Calificación / Enrutamiento / Gameplan / Cierre. 3) Genera la respuesta exacta que Diego debe enviar — en su tono, con su vocabulario, lista para copiar y pegar. 4) Si el prospecto no está listo para cerrar, indica qué información extraer antes de avanzar. Tono: Diego Villarroel. Sin coaching, sin suavización, sin explicaciones innecesarias al prospecto.",
};

router.post("/accai/stream", async (req, res): Promise<void> => {
  const { mode, userInput, reelId, competitorIds } = req.body as {
    mode: string;
    userInput?: string;
    reelId?: number;
    competitorIds?: number[];
  };

  if (!mode) {
    res.status(400).json({ error: "mode is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const context = await buildContext();

    // Build directive
    const [directiveRow] = await db
      .select()
      .from(strategicDirectiveTable)
      .orderBy(desc(strategicDirectiveTable.createdAt))
      .limit(1);

    const directive = directiveRow
      ? `[DIRECTIVA ACTIVA]\n${directiveRow.content}`
      : "[DIRECTIVA ACTIVA]\nSin directiva definida.";

    // Build user message
    let userMessage = userInput ?? "";

    if (mode === "AUTOPSIA" && reelId) {
      const [reel] = await db
        .select()
        .from(reelsTable)
        .where(eq(reelsTable.id, reelId));
      if (reel) {
        userMessage = `Analizar el siguiente reel:\nFecha: ${reel.fecha}\nTema: ${reel.tema}\nÁngulo: ${reel.angulo}\nFormato: ${reel.formato}\nViews: ${reel.views}\nLikes: ${reel.likes} (${reel.likesPct.toFixed(1)}%)\nComments: ${reel.comments} (${reel.commentsPct.toFixed(1)}%)\nSaves: ${reel.saves} (${reel.savesPct.toFixed(1)}%)\nShares: ${reel.shares} (${reel.sharesPct.toFixed(1)}%)\nS/1K: ${reel.savesPer1k.toFixed(2)}\nFirma: ${reel.firma}${reel.transcripcion ? `\nTranscripción: ${reel.transcripcion}` : ""}${reel.notas ? `\nNotas: ${reel.notas}` : ""}`;
      }
    }

    const modePrompt = MODE_PROMPTS[mode] ?? `Modo ${mode}.`;
    const systemPrompt = `${MASTER_SYSTEM_PROMPT}\n\n${directive}\n\n${context}\n\n${modePrompt}`;

    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage || "Ejecutar análisis.",
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    const finalMessage = await stream.finalMessage();
    const tokensInput = finalMessage.usage.input_tokens;
    const tokensOutput = finalMessage.usage.output_tokens;

    res.write(
      `data: ${JSON.stringify({ tokensInput, tokensOutput })}\n\n`,
    );
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    logger.error({ err }, "ACCAI stream error");
    res.write(
      `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`,
    );
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

export default router;
