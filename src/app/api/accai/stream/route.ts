import { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import {
  db,
  reelsTable,
  accountSnapshotsTable,
  strategicDirectiveTable,
  competitorReelsTable,
  competitorsTable,
  threadsPostsTable,
  commentCacheTable,
} from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

async function buildChatContext(): Promise<string> {
  const [reels, latestSnapshot, directive, threads, comments] = await Promise.all([
    db.select().from(reelsTable).orderBy(desc(reelsTable.fecha)).limit(10),
    db.select().from(accountSnapshotsTable).orderBy(desc(accountSnapshotsTable.createdAt)).limit(1),
    db.select().from(strategicDirectiveTable).orderBy(desc(strategicDirectiveTable.createdAt)).limit(1),
    db.select().from(threadsPostsTable).orderBy(desc(threadsPostsTable.postedAt)).limit(5),
    db.select().from(commentCacheTable).orderBy(desc(commentCacheTable.createdAt)).limit(50),
  ]);

  const firmaCount: Record<string, number> = {};
  for (const r of reels) {
    if (r.firma) firmaCount[r.firma] = (firmaCount[r.firma] ?? 0) + 1;
  }
  const total = reels.length || 1;
  const funnelPct = {
    CONVERTIDOR: Math.round(((firmaCount["CONVERTIDOR"] ?? 0) / total) * 100),
    VIRAL: Math.round(((firmaCount["VIRAL"] ?? 0) / total) * 100),
    EDUCATIVO: Math.round(((firmaCount["EDUCATIVO"] ?? 0) / total) * 100),
    MUERTO: Math.round(((firmaCount["MUERTO"] ?? 0) / total) * 100),
  };

  const commentTexts = comments.map(c => c.text).filter(Boolean);
  const topThemes = commentTexts.slice(0, 5).join(" | ") || "Sin comentarios";

  return `[CONTEXTO CHAT — DATOS LIVE]

ÚLTIMOS 10 REELS:
${reels.map(r => `- ${r.fecha} | ${r.tema ?? "?"} | ${r.angulo ?? "?"} | Views:${r.views} | Saves:${r.savesPct.toFixed(1)}% | Firma:${r.firma}${r.transcripcion ? ` | Transcripcion: "${r.transcripcion.slice(0, 200)}"` : ""}`).join("\n")}

BALANCE DE FUNNEL (10 reels más recientes):
${JSON.stringify(funnelPct)} — Objetivo: 40% Autoridad/35% Confianza/25% Conversión

CUENTA (más reciente):
${latestSnapshot[0] ? `Seguidores ganados: ${latestSnapshot[0].followersGained} | Visitas al perfil: ${latestSnapshot[0].profileVisits} | Conversión: ${latestSnapshot[0].conversionPct.toFixed(1)}%` : "Sin datos"}

THREADS (últimos 5):
${threads.map(t => `- ${t.postedAt ? new Date(t.postedAt).toLocaleDateString("es") : "?"} | Likes:${t.likes ?? 0} | Views:${t.views ?? 0} | Eng:${t.engagementRate ? t.engagementRate.toFixed(1) : "?"}%`).join("\n") || "Sin posts"}

DIRECTIVA ACTIVA:
${directive[0]?.content ?? "Sin directiva"}

COMENTARIOS RECIENTES (temas): ${topThemes}`;
}

async function buildContext(): Promise<string> {
  const [reels, latestSnapshot, directive, compReels, competitors] = await Promise.all([
    db.select().from(reelsTable).orderBy(desc(reelsTable.fecha)).limit(30),
    db.select().from(accountSnapshotsTable).orderBy(desc(accountSnapshotsTable.createdAt)).limit(1),
    db.select().from(strategicDirectiveTable).orderBy(desc(strategicDirectiveTable.createdAt)).limit(1),
    db.select().from(competitorReelsTable),
    db.select().from(competitorsTable),
  ]);

  const top5Saves = [...reels].sort((a, b) => b.savesPct - a.savesPct).slice(0, 5);
  const bottom5Views = [...reels].sort((a, b) => a.views - b.views).slice(0, 5);

  const anguloCount: Record<string, number> = {};
  const firmaCount: Record<string, number> = {};
  for (const r of reels) {
    anguloCount[r.angulo] = (anguloCount[r.angulo] ?? 0) + 1;
    firmaCount[r.firma] = (firmaCount[r.firma] ?? 0) + 1;
  }

  const topAngles = Object.entries(anguloCount)
    .sort((a, b) => {
      const avgA = reels.filter(r => r.angulo === a[0]).reduce((s, r) => s + r.savesPct, 0) / (anguloCount[a[0]] || 1);
      const avgB = reels.filter(r => r.angulo === b[0]).reduce((s, r) => s + r.savesPct, 0) / (anguloCount[b[0]] || 1);
      return avgB - avgA;
    })
    .slice(0, 2);

  return `
[CONTEXTO VILLACLUB LIVE]

ACCOUNT SNAPSHOT (más reciente):
${latestSnapshot[0] ? `Views: ${latestSnapshot[0].views} | Seguidores ganados: ${latestSnapshot[0].followersGained} | Visitas al perfil: ${latestSnapshot[0].profileVisits} | Conversión: ${latestSnapshot[0].conversionPct.toFixed(1)}%` : "Sin datos"}

VALIDACIÓN DE RETENCIÓN (Benchmarks):
- Ángulos que más SAVES generan: ${topAngles.map(a => `${a[0]}`).join(", ")}
- Promedio de Saves en "CONVERTIDOR": ${(reels.filter(r => r.firma === "CONVERTIDOR").reduce((s, r) => s + r.savesPct, 0) / (firmaCount["CONVERTIDOR"] || 1)).toFixed(2)}%
- Promedio de Saves en "VIRAL": ${(reels.filter(r => r.firma === "VIRAL").reduce((s, r) => s + r.savesPct, 0) / (firmaCount["VIRAL"] || 1)).toFixed(2)}%

ÚLTIMOS 30 REELS:
${reels.map((r) => `- ${r.fecha} | ${r.tema} | ${r.angulo} | Views: ${r.views} | SavesPct: ${r.savesPct.toFixed(1)}% | S/1K: ${r.savesPer1k.toFixed(2)} | Firma: ${r.firma}`).join("\n")}

TOP 5 POR SAVES:
${top5Saves.map((r) => `- ${r.tema} | SavesPct: ${r.savesPct.toFixed(1)}%${r.transcripcion ? `\n  TRANSCRIPCION: ${r.transcripcion}` : ""}`).join("\n")}

BOTTOM 5 POR VIEWS:
${bottom5Views.map((r) => `- ${r.tema} | Views: ${r.views}${r.transcripcion ? `\n  TRANSCRIPCION: ${r.transcripcion}` : ""}`).join("\n")}

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

const CHAT_MODE_ADDITION = `

Modo CHAT. Eres ACCAI en modo conversacional directo con Diego Villarroel.

Tienes acceso a las transcripciones de los reels de Diego y de sus competidores. Cuando generes hooks o conceptos de contenido, basa tus sugerencias en los PATRONES LINGÜÍSTICOS que han demostrado generar saves y engagement en el mercado venezolano según la data real. No inventes — extrae de lo que ya funcionó y recombina.

REGLAS ABSOLUTAS:
1. Máximo 5 líneas por respuesta. Diego quiere velocidad, no ensayos. Si necesita profundidad, abrirá un modo específico.
2. Tienes acceso al contexto completo inyectado: reels recientes con métricas, balance de funnel, comentarios frecuentes, directiva estratégica, posts de Threads con engagement. ÚSALO en cada respuesta.
3. Si pregunta "qué grabo" o variante: da UN concepto exacto. Hook (qué dice en los primeros 3 segundos), qué muestra, estructura, CTA. UNA opción. La mejor según el balance de funnel y los datos.
4. Si pega texto de DM o comentario: responde con el mensaje EXACTO que debe enviar. Listo para copiar. En su tono.
5. Si pega una URL de reel o menciona un reel: analízalo contra el historial. Diagnóstico en 3 líneas.
6. Tono: Diego Villarroel siempre. Dominante, preciso, sin coaching, sin suavización, sin hedging.
7. Si la pregunta requiere análisis de más de 5 líneas: responde con diagnóstico corto + "Abre AUTOPSIA" o "Abre BRIEF" según corresponda.
8. Nunca digas "no tengo suficiente data". Usa lo que hay y sé definitivo.`;

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

const MODE_PROMPTS: Record<string, string> = {
  AUTOPSIA: "Modo AUTOPSIA. Analiza este reel específico contra el historial completo. Identifica exactamente qué combinación de variables (hook, ángulo, formato, tema, timing) produjo el resultado. Determina si es replicable y cómo, sin repetir el tema. Output: diagnóstico de por qué funcionó o falló + 2 conceptos derivados listos para ejecutar.",
  BRIEF: `Modo BRIEF — ESTRUCTURA DE PRODUCCIÓN.
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

${BRIEF_PARSER_PROMPT}`,
  ESTRATEGIA: "Modo ESTRATEGIA. Given the last 30 days of reel performance data (saves_per_1k, engagement by angulo, follower growth from account_snapshots), output a prioritized content plan for the next 7 days. Format: which 4 angles to use, in what order, with the specific hook concept for each. Base decisions only on what has highest saves_per_1k in the reels table. No general advice. Pure data-driven sequencing.",
  WEEKLY_BRIEF: `Modo BRIEF SEMANAL. Analiza los últimos 7 días de rendimiento (saves, reach, conversiones a DM).
REGLA DE SALIDA: 5-8 líneas máximo. Sin narrativa.
1. DIAGNÓSTICO: Qué funcionó y qué falló (frío).
2. PRIORIDAD: Tipo de pieza a priorizar esta semana (Autoridad/Confianza/Conversión).
3. TESTEO: 3 ángulos de hook específicos para probar.
Mantenlo quirúrgico. Solo datos y dirección.`,
  DIAGNOSTICO: "Modo DIAGNÓSTICO. Analiza el rendimiento de los últimos 7 días en orden estricto: Hook → Ángulo → Distribución → Oferta. Identifica el bottleneck real. No menciones el siguiente nivel hasta resolver el anterior. Una acción concreta por nivel de diagnóstico.",
  COMPETENCIA: "Modo COMPETENCIA. Analiza los videos de los competidores seleccionados contra los de Diego. Identifica: 1) qué temas cubren que Diego no, 2) qué ángulos tienen mayor engagement en el mercado VE actualmente, 3) qué vacíos estratégicos existen que nadie está cubriendo. Output: mapa de brechas + 2 ataques concretos para los próximos 14 días.",
  "FUNNEL CHECK": "Modo FUNNEL CHECK. Evalúa el mix de contenido de las últimas 2 semanas. Clasifica cada reel en: Autoridad (instalar quién es Diego), Confianza (prueba y casos), Conversión (activar compra). Determina el porcentaje actual en cada fase. El balance objetivo es 40% Autoridad / 35% Confianza / 25% Conversión para fase de crecimiento. Indica desequilibrio y qué tipo de pieza producir para corregirlo.",
  CIERRE: "Modo CIERRE. Recibes un fragmento de conversación de DM o WhatsApp con un prospecto. Ejecuta: 1) Identifica el avatar (Buscador o Operador Estancado) y justifica en una línea. 2) Identifica la fase actual del cierre: Investigación / Apertura / Dolor / Gap / Calificación / Enrutamiento / Gameplan / Cierre. 3) Genera la respuesta exacta que Diego debe enviar — en su tono, con su vocabulario, lista para copiar y pegar. 4) Si el prospecto no está listo para cerrar, indica qué información extraer antes de avanzar. Tono: Diego Villarroel. Sin coaching, sin suavización, sin explicaciones innecesarias al prospecto.",
  THREADS: `Modo THREADS. Genera exactly 1 disparo de Threads (operador statement).
REGLAS:
- 2-3 líneas máximo.
- Golpe lógico/aritmético. Sin CTA.
- No es una opinión, es una definición.
- Tono: Dominante, preciso.`,
  ESTRUCTURA: `Modo ESTRUCTURA. Analiza la transcripción de un competidor y extrae su arquitectura exacta.
REGLAS DE SALIDA:
1. HOOK: Tipo de apertura (ej: "Ataque al ego", "Dato contraintuitivo") + frase exacta.
2. RETENCIÓN: Cuál es el mecanismo que mantiene el interés (ej: "Proceso acelerado", "Pantalla con números").
3. CIERRE/CTA: Cómo termina y qué acción pide.
4. PATRÓN: Por qué este video funcionó en su nicho.
Sin redacción narrativa. Solo arquitectura.`,
  PATRONES: `Modo PATRONES. Analiza TODAS las transcripciones disponibles (propias y de competidores) cruzadas con métricas de engagement. Identifica:

1. HOOKS QUE ABREN SAVES: Las primeras 10 palabras de los reels con mayor save rate. ¿Qué patrón lingüístico comparten? ¿Pregunta, afirmación, número, contraste?

2. VOCABULARIO DE CONVERSIÓN: Palabras y frases que aparecen consistentemente en reels de alto engagement pero NO en reels de bajo engagement.

3. ESTRUCTURA GANADORA: ¿Los reels exitosos siguen problema→solución, dato→implicación, pregunta→respuesta? ¿Cuál estructura domina?

4. BRECHAS LINGÜÍSTICAS: Palabras/temas que los competidores usan con éxito que Diego no ha usado.

5. FÓRMULA REPLICABLE: Basándote en todo lo anterior, dame exactamente: el hook de apertura (palabras exactas), la estructura del cuerpo, y el CTA — para un reel que maximice saves esta semana.

Output: diagnóstico frío, datos concretos, fórmula ejecutable. Sin teoría.`,
};

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    mode: string;
    userInput?: string;
    reelId?: number;
    competitorIds?: number[];
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  const { mode, userInput, reelId, messages: historyMessages } = body;

  if (!mode) {
    return new Response(JSON.stringify({ error: "mode is required" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (mode === "CHAT") {
          const chatContext = await buildChatContext();
          const systemPrompt = `${MASTER_SYSTEM_PROMPT}${CHAT_MODE_ADDITION}\n\n${chatContext}`;

          const msgs: Array<{ role: "user" | "assistant"; content: string }> =
            historyMessages && historyMessages.length > 0
              ? historyMessages
              : [{ role: "user", content: userInput || "Hola" }];

          const anthropicStream = await anthropic.messages.stream({
            model: MODEL,
            max_tokens: 512,
            system: systemPrompt,
            messages: msgs,
          });

          for await (const event of anthropicStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              send({ text: event.delta.text });
            }
          }

          const finalMessage = await anthropicStream.finalMessage();
          send({ tokensInput: finalMessage.usage.input_tokens, tokensOutput: finalMessage.usage.output_tokens });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        const context = await buildContext();

        const [directiveRow] = await db
          .select()
          .from(strategicDirectiveTable)
          .orderBy(desc(strategicDirectiveTable.createdAt))
          .limit(1);

        const directive = directiveRow
          ? `[DIRECTIVA ACTIVA]\n${directiveRow.content}`
          : "[DIRECTIVA ACTIVA]\nSin directiva definida.";

        let userMessage = userInput ?? "";

        if (mode === "AUTOPSIA" && reelId) {
          const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, reelId));
          if (reel) {
            userMessage = `Analizar el siguiente reel:\nFecha: ${reel.fecha}\nTema: ${reel.tema}\nÁngulo: ${reel.angulo}\nFormato: ${reel.formato}\nViews: ${reel.views}\nLikes: ${reel.likes} (${reel.likesPct.toFixed(1)}%)\nComments: ${reel.comments} (${reel.commentsPct.toFixed(1)}%)\nSaves: ${reel.saves} (${reel.savesPct.toFixed(1)}%)\nShares: ${reel.shares} (${reel.sharesPct.toFixed(1)}%)\nS/1K: ${reel.savesPer1k.toFixed(2)}\nFirma: ${reel.firma}${reel.transcripcion ? `\nTranscripción: ${reel.transcripcion}` : ""}${reel.notas ? `\nNotas: ${reel.notas}` : ""}`;
          }
        }

        const modePrompt = MODE_PROMPTS[mode] ?? `Modo ${mode}.`;
        const systemPrompt = `${MASTER_SYSTEM_PROMPT}\n\n${directive}\n\n${context}\n\n${modePrompt}`;

        const anthropicStream = await anthropic.messages.stream({
          model: MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage || "Ejecutar análisis." }],
        });

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ text: event.delta.text });
          }
        }

        const finalMessage = await anthropicStream.finalMessage();
        send({ tokensInput: finalMessage.usage.input_tokens, tokensOutput: finalMessage.usage.output_tokens });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("ACCAI stream error", err);
        send({ error: "Stream failed" });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
