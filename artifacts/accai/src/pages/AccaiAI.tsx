import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  useListReels,
  useListCompetitors,
  useListAccaiSessions,
  useCreateAccaiSession,
  getListAccaiSessionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const MODES = [
  "AUTOPSIA", "BRIEF", "DIAGNOSTICO", "COMPETENCIA", "FUNNEL CHECK", "CIERRE"
] as const;
type Mode = typeof MODES[number];

export function AccaiAI() {
  const queryClient = useQueryClient();
  const { data: reels = [] } = useListReels();
  const { data: competitors = [] } = useListCompetitors();
  const { data: sessions = [], isLoading: isLoadingSessions } = useListAccaiSessions();
  const createSession = useCreateAccaiSession();

  const [activeMode, setActiveMode] = useState<Mode>("AUTOPSIA");
  const [selectedReelId, setSelectedReelId] = useState<string>("");
  const [briefInput, setBriefInput] = useState("");
  const [diagViews, setDiagViews] = useState("");
  const [diagSaves, setDiagSaves] = useState("");
  const [diagDMs, setDiagDMs] = useState("");
  const [diagVentas, setDiagVentas] = useState("");
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  const [cierreInput, setCierreInput] = useState("");

  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [currentTokensInput, setCurrentTokensInput] = useState<number | null>(null);
  const [currentTokensOutput, setCurrentTokensOutput] = useState<number | null>(null);
  const [currentInputText, setCurrentInputText] = useState("");

  // Read URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") as Mode;
    const reelId = params.get("reelId");
    if (mode && MODES.includes(mode)) {
      setActiveMode(mode);
    }
    if (reelId) {
      setSelectedReelId(reelId);
    }
  }, []);

  const handleExecute = async () => {
    setIsStreaming(true);
    setStreamingResponse("");
    setStreamError(false);
    setCurrentTokensInput(null);
    setCurrentTokensOutput(null);

    let userInput = "";
    if (activeMode === "BRIEF") userInput = briefInput;
    else if (activeMode === "DIAGNOSTICO") userInput = `Views: ${diagViews}, Saves: ${diagSaves}, DMs: ${diagDMs}, Ventas: ${diagVentas}`;
    else if (activeMode === "CIERRE") userInput = cierreInput;
    setCurrentInputText(userInput || "(Sin input directo)");

    const payload = {
      mode: activeMode,
      userInput,
      reelId: selectedReelId ? parseInt(selectedReelId, 10) : undefined,
      competitorIds: selectedComps.map(id => parseInt(id, 10))
    };

    try {
      const response = await fetch('/api/accai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setStreamError(true);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setStreamingResponse(fullText);
              }
              if (parsed.tokensInput) {
                setCurrentTokensInput(parsed.tokensInput);
                setCurrentTokensOutput(parsed.tokensOutput || 0);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error(error);
      setStreamError(true);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSaveAnalysis = () => {
    if (!streamingResponse) return;
    
    // Estimate cost: Claude 3.5 Sonnet: $3/M input, $15/M output approx
    const estCost = ((currentTokensInput || 0) * 3 / 1000000) + ((currentTokensOutput || 0) * 15 / 1000000);

    createSession.mutate({
      data: {
        mode: activeMode,
        input: currentInputText,
        response: streamingResponse,
        tokensInput: currentTokensInput,
        tokensOutput: currentTokensOutput,
        costEstimate: estCost
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAccaiSessionsQueryKey() });
        setStreamingResponse("");
        setCurrentTokensInput(null);
        setCurrentTokensOutput(null);
      }
    });
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* TABS */}
      <div className="flex border-b border-[#1A1A1A]">
        {MODES.map(mode => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className={`flex-1 py-4 font-mono text-sm tracking-widest uppercase transition-colors ${
              activeMode === mode 
                ? "text-[#0C2DF5] border-b-2 border-[#0C2DF5]" 
                : "text-[#666666] hover:text-white"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* INPUTS AREA */}
      <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-6">
        {activeMode === "AUTOPSIA" && (
          <div className="space-y-4">
            <label className="text-[#666666] text-xs block font-mono uppercase tracking-widest">// SELECCIONAR REEL PARA ANALISIS</label>
            <Select value={selectedReelId} onValueChange={setSelectedReelId}>
              <SelectTrigger className="bg-[#080808] border-[#1A1A1A] rounded-none focus:ring-0 focus:border-[#0C2DF5] text-white">
                <SelectValue placeholder="Elige un reel" />
              </SelectTrigger>
              <SelectContent className="bg-[#080808] border-[#1A1A1A] rounded-none text-white">
                {reels.map(r => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {format(new Date(r.fecha), "dd/MM/yyyy")} - {r.tema} ({r.views} views)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {activeMode === "BRIEF" && (
          <div className="space-y-4">
            <label className="text-[#666666] text-xs block font-mono uppercase tracking-widest">// CONTEXTO SEMANAL</label>
            <Textarea 
              value={briefInput}
              onChange={e => setBriefInput(e.target.value)}
              placeholder="Describe tu semana, aprendizajes, problemas con clientes, etc..." 
              className="bg-[#080808] border-[#1A1A1A] rounded-none min-h-[150px] focus-visible:ring-0 focus-visible:border-[#0C2DF5] text-white font-sans" 
            />
          </div>
        )}

        {activeMode === "DIAGNOSTICO" && (
          <div className="space-y-6">
            <label className="text-[#666666] text-xs block font-mono uppercase tracking-widest">// METRICAS DE DIAGNOSTICO (ULTIMOS 7 DIAS)</label>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-[#666666] text-[10px] mb-2 block font-mono">VIEWS</label>
                <Input type="number" value={diagViews} onChange={e => setDiagViews(e.target.value)} className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
              </div>
              <div>
                <label className="text-[#666666] text-[10px] mb-2 block font-mono">SAVES</label>
                <Input type="number" value={diagSaves} onChange={e => setDiagSaves(e.target.value)} className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
              </div>
              <div>
                <label className="text-[#666666] text-[10px] mb-2 block font-mono">DMs</label>
                <Input type="number" value={diagDMs} onChange={e => setDiagDMs(e.target.value)} className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
              </div>
              <div>
                <label className="text-[#666666] text-[10px] mb-2 block font-mono">VENTAS</label>
                <Input type="number" value={diagVentas} onChange={e => setDiagVentas(e.target.value)} className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
              </div>
            </div>
          </div>
        )}

        {activeMode === "COMPETENCIA" && (
          <div className="space-y-4">
            <label className="text-[#666666] text-xs block font-mono uppercase tracking-widest">// SELECCIONAR COMPETIDORES A INCLUIR</label>
            <div className="grid grid-cols-3 gap-4">
              {competitors.map(c => (
                <div key={c.id} className="flex items-center space-x-2 border border-[#1A1A1A] p-3 bg-[#080808]">
                  <Checkbox 
                    id={`comp-${c.id}`} 
                    checked={selectedComps.includes(c.id.toString())}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedComps([...selectedComps, c.id.toString()]);
                      else setSelectedComps(selectedComps.filter(id => id !== c.id.toString()));
                    }}
                    className="border-[#666666] data-[state=checked]:bg-[#0C2DF5] data-[state=checked]:border-[#0C2DF5] rounded-none"
                  />
                  <label htmlFor={`comp-${c.id}`} className="text-sm font-mono cursor-pointer">{c.handle}</label>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMode === "FUNNEL CHECK" && (
          <div className="py-8 text-center text-[#666666] font-mono text-sm">
            // Analisis automatico basado en datos actuales de la cuenta
          </div>
        )}

        {activeMode === "CIERRE" && (
          <div className="space-y-4">
            <label className="text-[#666666] text-xs block font-mono uppercase tracking-widest">// CONVERSACION DE DM / WHATSAPP</label>
            <Textarea 
              value={cierreInput}
              onChange={e => setCierreInput(e.target.value)}
              placeholder="Pega el fragmento de la conversacion..." 
              className="bg-[#080808] border-[#1A1A1A] rounded-none min-h-[200px] focus-visible:ring-0 focus-visible:border-[#0C2DF5] text-white font-sans" 
            />
          </div>
        )}
      </div>

      <Button 
        onClick={handleExecute}
        disabled={isStreaming}
        className="w-full bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-[0.2em] font-mono py-8 text-lg"
      >
        EJECUTAR ACCAI
      </Button>

      {/* RESULTS AREA */}
      {(isStreaming || streamingResponse || streamError) && (
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] flex flex-col">
          <div className="p-8 font-mono text-base whitespace-pre-wrap leading-relaxed text-[#F0F0F0] min-h-[200px]">
            {streamingResponse}
            {isStreaming && <span className="text-[#0C2DF5] ml-2 animate-pulse">_</span>}
            {streamError && <span className="text-[#FF2D20]">// ERROR DE CONEXION — verifica ANTHROPIC_API_KEY</span>}
          </div>
          
          {!isStreaming && streamingResponse && (
            <div className="border-t border-[#1A1A1A] p-4 flex justify-between items-center bg-[#080808]">
              <div className="text-[#666666] font-mono text-xs">
                // tokens: {currentTokensInput} in / {currentTokensOutput} out 
                {currentTokensInput && currentTokensOutput && ` (~$${(((currentTokensInput * 3) + (currentTokensOutput * 15)) / 1000000).toFixed(4)})`}
              </div>
              <Button 
                onClick={handleSaveAnalysis}
                disabled={createSession.isPending}
                className="bg-transparent border border-[#0C2DF5] text-[#0C2DF5] hover:bg-[#0C2DF5] hover:text-white rounded-none uppercase tracking-widest font-mono text-xs h-8"
              >
                {createSession.isPending ? "GUARDANDO..." : "GUARDAR ANALISIS"}
              </Button>
            </div>
          )}
          {isStreaming && (
            <div className="border-t border-[#1A1A1A] p-4 bg-[#080808]">
              <div className="text-[#0C2DF5] font-mono text-xs">// cargando...</div>
            </div>
          )}
        </div>
      )}

      {/* HISTORIAL */}
      <section className="pt-8">
        <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest mb-6" data-testid="title-session-history">// HISTORIAL DE SESIONES</h2>
        <div className="border border-[#1A1A1A]">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#1A1A1A] text-[#666666] font-mono text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-normal w-[120px]">Fecha</th>
                <th className="py-4 px-6 font-normal w-[150px]">Modo</th>
                <th className="py-4 px-6 font-normal">Input</th>
                <th className="py-4 px-6 font-normal w-[150px]">Tokens</th>
                <th className="py-4 px-6 font-normal w-[100px]">Costo</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {isLoadingSessions ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#0C2DF5]">// cargando...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-[#666666]">// Sin datos registrados</td></tr>
              ) : (
                sessions.map((sess, idx) => (
                  <tr key={sess.id} className={idx % 2 === 0 ? "bg-[#0D0D0D]" : "bg-[#111111]"}>
                    <td className="py-4 px-6 border-b border-[#1A1A1A] whitespace-nowrap">{format(new Date(sess.createdAt), "dd/MM/yyyy")}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A] text-[#0C2DF5]">{sess.mode}</td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A] text-[#666666] truncate max-w-[300px]">
                      {sess.input.length > 60 ? sess.input.substring(0, 60) + "..." : sess.input}
                    </td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">
                      {sess.tokensInput ? `${sess.tokensInput} / ${sess.tokensOutput}` : "-"}
                    </td>
                    <td className="py-4 px-6 border-b border-[#1A1A1A]">
                      {sess.costEstimate ? `$${sess.costEstimate.toFixed(4)}` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
