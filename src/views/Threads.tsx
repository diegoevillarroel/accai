"use client";
import { useState } from "react";
import { 
  useListThreadsPosts, 
  useUpsertThreadsPost, 
  getListThreadsPostsQueryKey 
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccaiStream } from "@/lib/useAccaiStream";
import { 
  TrendingUp, 
  ChevronRight, 
  Zap, 
  Copy, 
  CheckCircle2, 
  Layers, 
  RefreshCcw,
  ExternalLink,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Threads() {
  const queryClient = useQueryClient();
  const { data: posts = [], isLoading } = useListThreadsPosts();
  const upsertPost = useUpsertThreadsPost();
  
  const [userInput, setUserInput] = useState("");
  const threadsStream = useAccaiStream();
  const [variations, setVariations] = useState<string[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const handleGenerate = async () => {
    setVariations([]);
    await threadsStream.stream({ mode: "THREADS", userInput });
  };

  const handleGenerateVariations = async () => {
    setIsGeneratingVariations(true);
    // Simulation: in production this calls /api/accai/stream with a variation prompt
    const newVariations = [
      "La aritmética es el único filtro que importa. El resto es ruido performativo.",
      "Operar bajo supuestos es la forma más rápida de quemar capital en Meta Ads.",
      "El landed cost es la métrica de la cual nadie habla porque nadie la entiende.",
      "Vender es fácil. Cobrar es el problema. El sistema resuelve el segundo.",
      "No busques clientes. Construye la infraestructura para ser encontrado."
    ];
    await new Promise(r => setTimeout(r, 1500));
    setVariations(newVariations);
    setIsGeneratingVariations(false);
  };

  const handlePublish = async (text: string, postId?: number) => {
    if (postId) setPublishingId(postId);
    try {
      const res = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success) {
        // Sync to update ID and status
        await fetch("/api/threads/sync", { method: "POST" });
        queryClient.invalidateQueries({ queryKey: getListThreadsPostsQueryKey() });
        alert("Publicado con éxito");
      }
    } catch (err) {
      console.error("Publish error:", err);
    } finally {
      if (postId) setPublishingId(null);
    }
  };

  const handlePromoteToReel = async (postId: number) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    await (upsertPost as any).mutateAsync({
      data: {
        id: post.id,
        promotedToReel: true
      }
    });
    queryClient.invalidateQueries({ queryKey: getListThreadsPostsQueryKey() });
  };

  const validatedHooks = posts
    .filter(p => p.promotedToReel || (p.engagementRate && p.engagementRate > 2))
    .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* THREADS LAB — THE GENERATOR */}
      <section>
        <div className="vc-section-title">// THREADS LAB — GENERATOR</div>
        <div className="vc-card p-8 space-y-6">
          <div className="space-y-4">
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">INPUT CONCEPTO / MÉTRICA</div>
            <div className="flex gap-3">
              <Input
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder="Escribe el concepto o pega un dato para convertir en disparo..."
                className="vc-input h-14 bg-white/[0.02] border-white/10 text-lg font-mono focus:border-[var(--accent)] transition-all"
              />
              <Button 
                onClick={handleGenerate} 
                disabled={threadsStream.isStreaming || !userInput}
                className="vc-btn-primary h-14 px-8"
              >
                {threadsStream.isStreaming ? <Loader2 className="animate-spin" /> : <Zap className="mr-2" size={20} />}
                GENERAR
              </Button>
            </div>
          </div>

          {(threadsStream.response || variations.length > 0) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="p-6 bg-[#0C2DF5]/5 border border-[#0C2DF5]/20 rounded-2xl relative group">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(threadsStream.response)} className="h-8 w-8 p-0 text-white/40 hover:text-white">
                    <Copy size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handlePublish(threadsStream.response)} className="h-8 text-[10px] font-mono text-[#00CC66] border border-[#00CC66]/20 bg-[#00CC66]/5">
                    PUBLICAR AHORA
                  </Button>
                </div>
                <p className="text-xl font-mono text-white leading-relaxed">
                  {threadsStream.response}
                  {threadsStream.isStreaming && <span className="animate-pulse text-[var(--accent)] ml-1">_</span>}
                </p>
              </div>

              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleGenerateVariations} 
                  disabled={isGeneratingVariations}
                  className="vc-input border-white/10 hover:border-white/20 h-10 px-8 rounded-full font-mono text-[10px] tracking-widest uppercase"
                >
                  {isGeneratingVariations ? <RefreshCcw className="animate-spin mr-2" size={14} /> : <Layers className="mr-2" size={14} />}
                  GENERAR 5 VARIACIONES
                </Button>
              </div>

              {variations.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {variations.map((v, i) => (
                    <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all flex items-center justify-between group">
                      <p className="text-sm font-mono text-white/70">{v}</p>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(v)} className="h-8 w-8 p-0 text-white/40 hover:text-white"><Copy size={13}/></Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePublish(v)} className="h-8 px-3 text-[9px] font-mono text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/5">USAR</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* HOOKS VALIDADOS — THE REEL PIPELINE */}
      <section>
        <div className="vc-section-title">// HOOKS VALIDADOS — REEL PIPELINE</div>
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="vc-card h-32 flex items-center justify-center text-white/20 font-mono tracking-widest text-xs">// CARGANDO DATOS VITALES...</div>
          ) : validatedHooks.length === 0 ? (
            <div className="vc-card h-32 flex items-center justify-center text-white/20 font-mono tracking-widest text-xs">// SIN MÉTRICAS PARA RECOMBINAR...</div>
          ) : (
            validatedHooks.map((post) => (
              <div key={post.id} className="vc-card p-6 flex items-center gap-8 group hover:border-[var(--accent)]/30 transition-all">
                {/* Metrics Badge */}
                <div className="flex flex-col items-center justify-center h-16 w-24 bg-white/[0.02] border border-white/5 rounded-xl">
                  <TrendingUp size={16} className="text-[#00CC66] mb-1" />
                  <span className="text-lg font-mono font-bold text-white leading-none">{post.engagementRate?.toFixed(1) || "0.0"}%</span>
                  <span className="text-[8px] font-mono text-white/30 tracking-tight mt-1">ENG RATE</span>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-mono text-white/80 leading-relaxed italic">
                    "{post.textContent}"
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-white/20 uppercase tracking-widest">
                    <span>Likes: {post.likes}</span>
                    <span>•</span>
                    <span>Views: {post.views?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex flex-col gap-2">
                   <Button 
                    className="vc-btn-primary h-10 px-6 text-[10px] tracking-widest uppercase"
                    onClick={() => {
                      window.location.href = `/reels?hook=${encodeURIComponent(post.textContent)}`;
                    }}
                  >
                    GENERAR REEL BRIEF
                    <ChevronRight className="ml-2" size={14} />
                  </Button>
                  <Button variant="outline" className="h-9 border-white/10 text-white/30 text-[9px] tracking-widest uppercase hover:text-white transition-all">
                    VER EN THREADS <ExternalLink className="ml-2" size={12} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* LIVE FEED */}
      <section>
        <div className="vc-section-title">// LIVE FEED</div>
        <div className="vc-card p-0 overflow-hidden border-glass-border">
          <table className="vc-table">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="font-mono text-[10px] tracking-widest text-white/40">FECHA</th>
                <th className="font-mono text-[10px] tracking-widest text-white/40 text-left">DISPARO</th>
                <th className="font-mono text-[10px] tracking-widest text-white/40">MÉTRICAS</th>
                <th className="font-mono text-[10px] tracking-widest text-white/40">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-white/[0.01] transition-colors border-t border-white/[0.05]">
                  <td className="w-24 text-center">
                    <div className="text-[10px] font-mono text-white/40">
                      {post.postedAt ? new Date(post.postedAt).toLocaleDateString("es-VE", { day: '2-digit', month: '2-digit' }) : "--/--"}
                    </div>
                  </td>
                  <td className="py-6 pr-8">
                    <p className="text-sm font-mono text-white/70 line-clamp-2 leading-relaxed">
                      {post.textContent}
                    </p>
                  </td>
                  <td className="w-40">
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-mono font-bold text-white">{post.engagementRate?.toFixed(1)}%</span>
                        <span className="text-[8px] font-mono text-white/20 uppercase">Eng</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-mono font-bold text-white">{(post.replies || 0).toLocaleString()}</span>
                        <span className="text-[8px] font-mono text-white/20 uppercase">Repl</span>
                      </div>
                    </div>
                  </td>
                  <td className="w-48">
                    <div className="flex items-center justify-center gap-2">
                       <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePromoteToReel(post.id)}
                        className={cn(
                          "h-8 px-3 text-[9px] font-mono tracking-widest uppercase transition-all",
                          post.promotedToReel 
                            ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20" 
                            : "border-white/10 text-white/40 hover:text-white"
                        )}
                      >
                         {post.promotedToReel ? <CheckCircle2 size={12} className="mr-2" /> : <Zap size={12} className="mr-2" />}
                         {post.promotedToReel ? "VALIDADO" : "PROMOVER"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
