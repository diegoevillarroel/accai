import React, { useState, useEffect, useCallback } from "react";
import { format, isThisWeek, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { ThreadsPost } from "@workspace/api-client-react";
import { useAccaiStream } from "@/lib/useAccaiStream";

export function Threads() {
  const [posts, setPosts] = useState<ThreadsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{synced:number;new:number} | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishText, setPublishText] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  const [prospOpen, setProspOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [replyModal, setReplyModal] = useState<{postId: number; text: string} | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [convertResult, setConvertResult] = useState<{id: number; text: string} | null>(null);
  const accaiStream = useAccaiStream();

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/threads/posts");
      const data = await r.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await fetch("/api/threads/sync", { method: "POST" });
      const d = await r.json();
      setSyncResult(d);
      setLastSync(new Date().toISOString());
      await loadPosts();
    } catch {}
    setSyncing(false);
  };

  const handlePublish = async () => {
    if (!publishText.trim()) return;
    setPublishing(true);
    setPublishMsg("");
    try {
      const r = await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: publishText }),
      });
      const d = await r.json();
      if (d.success) {
        setPublishMsg("// publicado con éxito");
        setPublishText("");
        setTimeout(() => { setPublishOpen(false); setPublishMsg(""); }, 2000);
        await loadPosts();
      } else {
        setPublishMsg(`// error: ${d.error || "falló"}`);
      }
    } catch (e: any) {
      setPublishMsg(`// error: ${e.message}`);
    }
    setPublishing(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const r = await fetch("/api/threads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const d = await r.json();
      setSearchResults(d.data || []);
    } catch {}
    setSearching(false);
  };

  const handleConvertToReel = async (post: ThreadsPost) => {
    setConvertingId(post.id);
    const avgEngagement = posts.reduce((s, p) => s + (p.engagementRate || 0), 0) / Math.max(posts.length, 1);
    const xAbove = avgEngagement > 0 ? (post.engagementRate || 0) / avgEngagement : 1;
    const prompt = `Este texto se publicó en Threads y generó ${(post.engagementRate || 0).toFixed(2)}% de engagement, que es ${xAbove.toFixed(1)}x por encima de la media. Conviértelo en un guion de Reel: Hook exacto (primeros 3 segundos — qué digo y qué se ve), Retención (estructura), CTA. Mantén el mismo ángulo y tono que hizo viral el Thread.\n\nTexto: ${post.textContent}`;
    const result = await accaiStream.stream({ mode: "BRIEF", userInput: prompt });
    setConvertResult({ id: post.id, text: result });
    // Mark as promoted
    try {
      await fetch(`/api/threads/${post.id}/promote`, { method: "PUT" });
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, promotedToReel: true } : p));
    } catch {}
    setConvertingId(null);
  };

  const handleReply = async () => {
    if (!replyModal || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await fetch("/api/threads/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText }),
      });
      setReplyModal(null);
      setReplyText("");
    } catch {}
    setSendingReply(false);
  };

  const avgEngagement = posts.length > 0
    ? posts.reduce((s, p) => s + (p.engagementRate || 0), 0) / posts.length
    : 0;
  const bestPost = posts.reduce<ThreadsPost | null>((best, p) => {
    if (!best || (p.engagementRate || 0) > (best.engagementRate || 0)) return p;
    return best;
  }, null);
  const postsThisWeek = posts.filter(p => {
    try { return p.postedAt && isThisWeek(new Date(p.postedAt)); } catch { return false; }
  }).length;

  return (
    <div className="space-y-8">
      {/* SYNC BAR */}
      <div className="border border-[#1A1A1A] bg-[#0D0D0D] p-4">
        <div className="flex items-center gap-4">
          <span className="text-[#666666] font-mono text-xs">// THREADS SYNC</span>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6"
          >
            {syncing ? "// sincronizando..." : "SINCRONIZAR"}
          </Button>
          {lastSync && (
            <span className="text-[#666666] font-mono text-xs">
              último sync: {formatDistanceToNow(new Date(lastSync), { locale: es })} | {posts.length} posts
              {syncResult && syncResult.new > 0 && ` | ${syncResult.new} nuevos`}
            </span>
          )}
          <div className="ml-auto">
            <Button
              onClick={() => setPublishOpen(!publishOpen)}
              className="bg-transparent border border-[#0C2DF5] text-[#0C2DF5] hover:bg-[#0C2DF5] hover:text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6"
            >
              PUBLICAR NUEVO
            </Button>
          </div>
        </div>

        {publishOpen && (
          <div className="mt-4 border-t border-[#1A1A1A] pt-4 space-y-3">
            <Textarea
              value={publishText}
              onChange={e => setPublishText(e.target.value)}
              placeholder="Escribe tu Thread..."
              className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] text-white font-mono min-h-[80px]"
            />
            <div className="flex items-center gap-4">
              <Button
                onClick={handlePublish}
                disabled={publishing || !publishText.trim()}
                className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6"
              >
                {publishing ? "// publicando..." : "PUBLICAR"}
              </Button>
              {publishMsg && (
                <span className={`font-mono text-xs ${publishMsg.includes("éxito") ? "text-[#00CC66]" : "text-[#FF2D20]"}`}>
                  {publishMsg}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-3 gap-6">
        <div className="border border-[#1A1A1A] p-6">
          <div className="text-[#666666] text-xs uppercase tracking-wider mb-2 font-mono">Engagement Promedio</div>
          <div className="text-3xl font-mono text-[#0C2DF5]">{avgEngagement.toFixed(2)}%</div>
        </div>
        <div className="border border-[#1A1A1A] p-6">
          <div className="text-[#666666] text-xs uppercase tracking-wider mb-2 font-mono">Mejor Post</div>
          <div className="text-lg font-mono text-[#0C2DF5]">{bestPost ? `${(bestPost.engagementRate || 0).toFixed(2)}%` : "-"}</div>
          {bestPost?.textContent && (
            <div className="text-[#666666] font-mono text-xs mt-1 truncate">{bestPost.textContent.substring(0, 60)}...</div>
          )}
        </div>
        <div className="border border-[#1A1A1A] p-6">
          <div className="text-[#666666] text-xs uppercase tracking-wider mb-2 font-mono">Posts Esta Semana</div>
          <div className="text-3xl font-mono">{postsThisWeek}</div>
        </div>
      </div>

      {/* THREADS TABLE */}
      <div className="border border-[#1A1A1A]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[#1A1A1A] text-[#666666] font-mono text-xs uppercase tracking-wider">
              <th className="py-4 px-4 font-normal">Fecha</th>
              <th className="py-4 px-4 font-normal">Texto</th>
              <th className="py-4 px-4 font-normal">Likes</th>
              <th className="py-4 px-4 font-normal">Replies</th>
              <th className="py-4 px-4 font-normal">Reposts</th>
              <th className="py-4 px-4 font-normal">Views</th>
              <th className="py-4 px-4 font-normal">Eng%</th>
              <th className="py-4 px-4 font-normal">Estado</th>
              <th className="py-4 px-4 font-normal">Acciones</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center text-[#0C2DF5]">// cargando...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-[#666666]">// Sin posts. Sincroniza primero.</td></tr>
            ) : (
              posts.map((post, idx) => {
                const isViral = (post.engagementRate || 0) > avgEngagement * 2;
                const isConverting = convertingId === post.id;
                return (
                  <React.Fragment key={post.id}>
                    <tr
                      className={`${idx % 2 === 0 ? "bg-[#0D0D0D]" : "bg-[#111111]"} ${isViral ? "border-l-2 border-l-[#0C2DF5]" : ""}`}
                    >
                      <td className="py-3 px-4 border-b border-[#1A1A1A] whitespace-nowrap text-[#666666] text-xs">
                        {post.postedAt ? format(new Date(post.postedAt), "dd/MM/yy") : "-"}
                      </td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] max-w-[300px]">
                        <span className="truncate block text-xs" title={post.textContent || ""}>
                          {(post.textContent || "").substring(0, 80)}{(post.textContent || "").length > 80 ? "..." : ""}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs">{post.likes}</td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs">{post.replies}</td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs">{post.reposts}</td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs">{post.views.toLocaleString()}</td>
                      <td className={`py-3 px-4 border-b border-[#1A1A1A] text-xs font-bold ${isViral ? "text-[#0C2DF5]" : ""}`}>
                        {(post.engagementRate || 0).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A] text-xs">
                        {post.promotedToReel && (
                          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider bg-[#00CC66]/20 text-[#00CC66]">ESCALADO</span>
                        )}
                      </td>
                      <td className="py-3 px-4 border-b border-[#1A1A1A]">
                        <div className="flex items-center gap-2">
                          {isViral && !post.promotedToReel && (
                            <button
                              onClick={() => handleConvertToReel(post)}
                              disabled={isConverting}
                              className="flex items-center gap-1 text-[#0C2DF5] hover:text-white border border-[#0C2DF5] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors"
                              title="Convertir a Reel"
                            >
                              <Zap size={10} />
                              {isConverting ? "..." : "REEL"}
                            </button>
                          )}
                          <button
                            onClick={() => { setReplyModal({ postId: post.id, text: post.textContent || "" }); setReplyText(""); }}
                            className="text-[#666666] hover:text-white border border-[#333333] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors"
                          >
                            REPLY
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Convert to reel inline result */}
                    {convertResult?.id === post.id && (
                      <tr key={`convert-${post.id}`} className="bg-[#080808]">
                        <td colSpan={9} className="px-4 py-4 border-b border-[#0C2DF5]/30">
                          <div className="font-mono text-xs text-[#666666] mb-2">// GUION DE REEL GENERADO</div>
                          <pre className="font-mono text-sm text-[#F0F0F0] whitespace-pre-wrap leading-relaxed">{convertResult.text}</pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Streaming indicator for convert */}
      {accaiStream.isStreaming && (
        <div className="border border-[#1A1A1A] p-6 bg-[#0D0D0D] font-mono text-sm whitespace-pre-wrap text-[#F0F0F0]">
          {accaiStream.response}
          <span className="text-[#0C2DF5] animate-pulse ml-1">_</span>
        </div>
      )}

      {/* PROSPECCIÓN */}
      <section className="border border-[#1A1A1A]">
        <button
          onClick={() => setProspOpen(!prospOpen)}
          className="w-full flex items-center justify-between p-4 text-left bg-[#0D0D0D] hover:bg-[#111111] transition-colors"
        >
          <span className="text-[#666666] font-mono text-xs uppercase tracking-widest">// PROSPECCIÓN — BUSCAR EN THREADS</span>
          {prospOpen ? <ChevronUp size={16} className="text-[#666666]" /> : <ChevronDown size={16} className="text-[#666666]" />}
        </button>

        {prospOpen && (
          <div className="p-4 space-y-4 border-t border-[#1A1A1A]">
            <div className="flex gap-3">
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Buscar en Threads..."
                className="bg-[#080808] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] font-mono"
              />
              <Button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono text-xs h-10 px-6"
              >
                {searching ? "..." : "BUSCAR"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((r: any, i: number) => (
                  <div key={i} className="border border-[#1A1A1A] p-4 bg-[#0D0D0D]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[#0C2DF5] font-mono text-xs mb-1">@{r.username}</div>
                        <div className="font-mono text-sm text-[#F0F0F0]">{r.text}</div>
                        <div className="text-[#666666] font-mono text-[10px] mt-1">{r.timestamp ? format(new Date(r.timestamp), "dd/MM/yyyy") : ""}</div>
                      </div>
                      <button
                        onClick={() => { setReplyModal({ postId: -1, text: r.text }); setReplyText(""); }}
                        className="text-[#666666] hover:text-white border border-[#333333] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap"
                      >
                        RESPONDER
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* REPLY MODAL */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#080808] border border-[#1A1A1A] p-6 w-[500px] space-y-4">
            <div className="text-[#0C2DF5] font-mono text-xs uppercase tracking-widest">// RESPONDER</div>
            <div className="text-[#666666] font-mono text-xs border border-[#1A1A1A] p-3 max-h-24 overflow-y-auto">
              {replyModal.text}
            </div>
            <Textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Tu respuesta..."
              className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] text-white font-mono min-h-[80px]"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleReply}
                disabled={sendingReply || !replyText.trim()}
                className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6"
              >
                {sendingReply ? "ENVIANDO..." : "PUBLICAR RESPUESTA"}
              </Button>
              <Button
                onClick={() => setReplyModal(null)}
                className="bg-transparent border border-[#333333] text-[#666666] hover:text-white rounded-none uppercase tracking-widest font-mono text-xs h-9 px-6"
              >
                CANCELAR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
