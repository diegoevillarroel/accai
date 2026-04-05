import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useGetReel, useDeleteReel, getListReelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Cpu } from "lucide-react";

export function ReelDetail() {
  const [, params] = useRoute("/reels/:id");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const reelId = params?.id ? parseInt(params.id, 10) : 0;

  const { data: reel, isLoading } = useGetReel(reelId);
  const deleteReel = useDeleteReel();

  const handleDelete = () => {
    if (confirm("¿Estás seguro de que deseas eliminar este reel?")) {
      deleteReel.mutate({ id: reelId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          setLocation("/reels");
        }
      });
    }
  };

  const getFirmaBadgeStyle = (firma: string) => {
    switch (firma) {
      case "CONVERTIDOR": return "bg-[#0C2DF5] text-white";
      case "VIRAL": return "bg-[#CC8800] text-white";
      case "EDUCATIVO": return "bg-[#00CC66] text-white";
      case "MUERTO": return "bg-[#333333] text-[#666666]";
      default: return "bg-[#333333] text-[#666666]";
    }
  };

  if (isLoading) {
    return <div className="text-[#0C2DF5] font-mono text-center mt-20">// cargando...</div>;
  }

  if (!reel) {
    return <div className="text-[#FF2D20] font-mono text-center mt-20">// REEL NO ENCONTRADO</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-6">
        <div className="flex flex-col gap-2">
          <button onClick={() => setLocation("/reels")} className="text-[#666666] hover:text-white flex items-center gap-2 text-xs font-mono uppercase tracking-widest transition-colors w-fit">
            <ArrowLeft size={14} /> Volver a Reels
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-mono uppercase text-white tracking-wide">{reel.tema}</h1>
            <span className={`px-2 py-1 text-xs uppercase font-bold tracking-wider ${getFirmaBadgeStyle(reel.firma)} font-mono`}>
              {reel.firma}
            </span>
          </div>
          <div className="text-[#666666] font-mono text-sm uppercase">
            {format(new Date(reel.fecha), "dd/MM/yyyy")} • {reel.angulo} • {reel.formato}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setLocation(`/accai-ai?mode=AUTOPSIA&reelId=${reel.id}`)}
            className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono flex items-center gap-2"
          >
            <Cpu size={16} /> Analizar con ACCAI
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDelete}
            disabled={deleteReel.isPending}
            className="border-[#FF2D20] text-[#FF2D20] hover:bg-[#FF2D20] hover:text-white rounded-none uppercase font-mono px-3"
            title="Eliminar Reel"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="border border-[#1A1A1A] p-4 bg-[#0D0D0D]">
          <div className="text-[#666666] text-[10px] uppercase tracking-wider mb-1 font-mono">Views</div>
          <div className="text-xl font-mono">{reel.views.toLocaleString()}</div>
        </div>
        <div className="border border-[#1A1A1A] p-4 bg-[#0D0D0D]">
          <div className="text-[#666666] text-[10px] uppercase tracking-wider mb-1 font-mono">Likes</div>
          <div className="text-xl font-mono">{reel.likes.toLocaleString()} <span className="text-xs text-[#666666]">({reel.likesPct.toFixed(1)}%)</span></div>
        </div>
        <div className="border border-[#1A1A1A] p-4 bg-[#0D0D0D]">
          <div className="text-[#666666] text-[10px] uppercase tracking-wider mb-1 font-mono">Comments</div>
          <div className="text-xl font-mono">{reel.comments.toLocaleString()} <span className="text-xs text-[#666666]">({reel.commentsPct.toFixed(1)}%)</span></div>
        </div>
        <div className="border border-[#1A1A1A] p-4 bg-[#0D0D0D]">
          <div className="text-[#666666] text-[10px] uppercase tracking-wider mb-1 font-mono">Saves</div>
          <div className="text-xl font-mono">{reel.saves.toLocaleString()} <span className="text-xs text-[#666666]">({reel.savesPct.toFixed(1)}%)</span></div>
        </div>
        <div className="border border-[#1A1A1A] p-4 bg-[#0D0D0D]">
          <div className="text-[#666666] text-[10px] uppercase tracking-wider mb-1 font-mono">Shares</div>
          <div className="text-xl font-mono">{reel.shares.toLocaleString()} <span className="text-xs text-[#666666]">({reel.sharesPct.toFixed(1)}%)</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <section>
          <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest mb-4">// TRANSCRIPCION</h2>
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 text-[#F0F0F0] whitespace-pre-wrap font-sans text-sm min-h-[300px]">
            {reel.transcripcion ? reel.transcripcion : <span className="text-[#666666] font-mono">// Sin transcripcion</span>}
          </div>
        </section>
        <section>
          <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest mb-4">// NOTAS / APRENDIZAJES</h2>
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 text-[#F0F0F0] whitespace-pre-wrap font-sans text-sm min-h-[300px]">
            {reel.notas ? reel.notas : <span className="text-[#666666] font-mono">// Sin notas</span>}
          </div>
        </section>
      </div>
      
      {reel.url && (
        <div className="mt-8">
          <a href={reel.url} target="_blank" rel="noopener noreferrer" className="text-[#0C2DF5] hover:underline font-mono uppercase tracking-wider text-sm flex items-center gap-2">
            // VER EN INSTAGRAM
          </a>
        </div>
      )}
    </div>
  );
}
