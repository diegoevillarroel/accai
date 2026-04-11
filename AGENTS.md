# ACCAI — Agent Rules
# Herramienta de inteligencia de contenido para @diegoevillarroel / VILLACLUB™
# Stack: Next.js · Railway · Claude Sonnet 4 · Instagram Graph API · 
#        Threads API · Apify
# Mantenido por Diego Villarroel vía Antigravity + GitHub + Railway

## Propósito único
ACCAI genera dos outputs y solo dos:
1. Guiones de Reels listos para grabar
2. Posts de Threads listos para publicar

Todo lo demás (análisis, métricas, competidores, Q&A) existe 
exclusivamente para que esos dos outputs sean infalibles.
No agregar features que no apunten directamente a eso.

## Posicionamiento de contenido (nunca romper esto)
Voz: Dominante · Preciso · Intransigente
Tono: declarativo, no opinativo. Números como argumento principal.
Vocabulario operacional: infraestructura, arbitraje, ecosistema, sistema, 
fricción, landed cost, margen, apalancamiento.
Nunca: entusiasmo performativo, lenguaje de curso/coaching, emojis 
decorativos, promesas de ingreso sin proceso visible, "escala tu negocio".
El "//" como marca visual cuando aplique.

## Stack técnico
- Framework: Next.js (App Router)
- Deploy: Railway (nixpacks, npm ci)
- AI: Claude claude-sonnet-4-5 via Anthropic API
- Data: Instagram Graph API + Threads API (tokens en env)
- Scraping/transcripciones: Apify
- Estructura de vistas: src/app/ (accai-ai, competidores, cuenta, 
  plan-90d, reels, threads)
- Componentes: src/components/
- Hooks: src/hooks/
- Lib/utils: src/lib/ y /lib (raíz)

## Secciones y su función
- /cuenta — métricas reales de @diegoevillarroel (reach, saves, DMs, 
  CTR, engagement). Fuente de verdad para calibrar contenido.
- /competidores — transcripciones + análisis de reels vía Apify. 
  Extrae patrones estructurales, no temas.
- /reels — generación de guiones. Input: data de /cuenta + patrones 
  de /competidores. Output: hook + estructura + CTA + justificación.
- /threads — generación de posts. Mismo input. Output: texto completo 
  listo para pegar + justificación de por qué va a funcionar.
- /accai-ai — chat con contexto completo de cuenta y estrategia. 
  Responde preguntas con datos reales, no opiniones genéricas.
- /plan-90d — contexto estratégico. No modificar sin instrucción 
  explícita de Diego.

## Reglas de generación de contenido (para el AI layer)
Guiones de Reels:
- Estructura fija: HOOK (0-3s) → RETENCIÓN (math/prueba/proceso) → CTA
- Hook debe ser validado contra métricas de retención antes de presentar
- CTA siempre dirige a link en bio o "Escríbeme" — NUNCA "comenta X"
- Justificación: máximo 3 líneas. Por qué este hook retiene, 
  por qué este ángulo convierte en VE.

Posts de Threads:
- 2-3 líneas máximo. Golpe lógico. Sin CTA forzado.
- Statements de operador — suenan a definición, no a opinión.
- Validar hook como Thread antes de proponer como Reel.

## Reglas de código

### Comportamiento del agente
- Leer AGENTS.md + package.json al inicio de cada sesión.
- Planning Mode para cualquier cambio que toque API routes, 
  AI prompts, o lógica de análisis.
- Fast Mode solo para UI/estilos/copy estático.
- NUNCA modificar prompts de Claude sin mostrar el prompt 
  anterior vs el nuevo para aprobación.
- NUNCA pushear sin verificación visual primero.

### Estética (no romper esto)
Background: #060608
Glass surfaces: rgba(255,255,255,0.03) con backdrop-blur
Accent: #0C2DF5 — quirúrgico, nunca decorativo
Borders: rgba(255,255,255,0.07)
Fonts: Space Mono (headings/datos), Inter (body)
Border-radius: 6-8px
Motion: 150ms transitions, zero animaciones decorativas
El "//" como marca visual en headings

### Git
- Commits: feat/fix/chore/style: descripción en inglés
- Un commit por cambio lógico
- NUNCA forzar push
- Rama main = producción en Railway

### Performance / tokens
- Claude: no hacer llamadas redundantes. Si el mismo análisis 
  se necesita dos veces en una sesión, cachear el resultado.
- Apify: transcripciones solo cuando el usuario las solicita 
  explícitamente — no en background automático.
- Graph API: respetar rate limits. Usar datos cacheados cuando 
  la data tiene menos de 1 hora de antigüedad.

### Lo que NO hacer
- No agregar secciones nuevas sin instrucción de Diego
- No modificar /plan-90d sin instrucción explícita
- No instalar librerías sin confirmar
- No generar contenido que contradiga el posicionamiento de VILLACLUB
- No responder preguntas de estrategia con información genérica — 
  siempre anclar en datos reales de la cuenta

## Flujo de sesión estándar
1. Leer AGENTS.md + package.json
2. Confirmar stack y estado actual
3. Recibir task
4. Planning Mode si toca lógica/AI → revisar plan
5. Ejecutar → dev server → screenshot → Artifact
6. Diego aprueba → commit → push → Railway redeploy automático

## Variables de entorno requeridas
ANTHROPIC_API_KEY — Claude Sonnet 4
INSTAGRAM_ACCESS_TOKEN — Graph API
THREADS_ACCESS_TOKEN — Threads API  
APIFY_API_TOKEN — transcripciones
(verificar que todas estén en Railway antes de cualquier deploy)