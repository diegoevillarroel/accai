import { useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { 
  useListReels, 
  useGetReelsStats, 
  useCreateReel,
  getListReelsQueryKey,
  getGetReelsStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

export function Reels() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: reels = [], isLoading: isLoadingReels } = useListReels();
  const { data: stats, isLoading: isLoadingStats } = useGetReelsStats();
  const createReel = useCreateReel();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    url: "",
    fecha: "",
    tema: "",
    angulo: "",
    formato: "",
    followersAtPublish: "",
    views: "",
    likes: "",
    comments: "",
    saves: "",
    shares: "",
    alcance: "",
    transcripcion: "",
    notas: ""
  });

  const handleSaveReel = (e: React.FormEvent) => {
    e.preventDefault();
    createReel.mutate({
      data: {
        url: formData.url || null,
        fecha: new Date(formData.fecha).toISOString(),
        tema: formData.tema,
        angulo: formData.angulo,
        formato: formData.formato,
        followersAtPublish: Number(formData.followersAtPublish),
        views: Number(formData.views),
        likes: Number(formData.likes),
        comments: Number(formData.comments),
        saves: Number(formData.saves),
        shares: Number(formData.shares),
        alcance: formData.alcance ? Number(formData.alcance) : null,
        transcripcion: formData.transcripcion || null,
        notas: formData.notas || null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReelsStatsQueryKey() });
        setIsDrawerOpen(false);
        setFormData({
          url: "", fecha: "", tema: "", angulo: "", formato: "", followersAtPublish: "", views: "", likes: "", comments: "", saves: "", shares: "", alcance: "", transcripcion: "", notas: ""
        });
      }
    });
  };

  const renderVsPromedio = (views: number) => {
    if (!stats || stats.avgViews === 0) return "-";
    const vs = ((views - stats.avgViews) / stats.avgViews) * 100;
    const sign = vs >= 0 ? "+" : "";
    const colorClass = vs >= 0 ? "text-[#00CC66]" : "text-[#FF2D20]";
    return <span className={colorClass}>{sign}{vs.toFixed(0)}%</span>;
  };

  const renderSaves1kColor = (val: number) => {
    if (val > 5.0) return "text-[#0C2DF5]";
    if (val < 1.0) return "text-[#FF2D20]";
    return "text-[#F0F0F0]";
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-[#0C2DF5] font-mono text-sm uppercase tracking-widest" data-testid="title-reels">// RENDIMIENTO DE CONTENIDO</h2>
        
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <Button className="bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono" data-testid="button-add-reel">
              AGREGAR REEL
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[500px] sm:max-w-none bg-[#080808] border-l border-[#1A1A1A] p-0 overflow-y-auto">
            <SheetHeader className="p-6 border-b border-[#1A1A1A] text-left">
              <SheetTitle className="text-white font-mono uppercase tracking-widest text-sm">// NUEVO REEL</SheetTitle>
              <SheetDescription className="hidden">Añadir un nuevo reel al sistema</SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSaveReel} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">URL (Opcional)</label>
                  <Input value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                </div>
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">FECHA DE PUBLICACION *</label>
                  <Input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                </div>
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">TEMA CENTRAL *</label>
                  <Input required value={formData.tema} onChange={e => setFormData({...formData, tema: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                </div>
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">ANGULO DE VENTA *</label>
                  <Select required value={formData.angulo} onValueChange={v => setFormData({...formData, angulo: v})}>
                    <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus:ring-0 focus:border-[#0C2DF5]">
                      <SelectValue placeholder="Selecciona angulo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                      <SelectItem value="Matematica innegable">Matematica innegable</SelectItem>
                      <SelectItem value="Proceso visible">Proceso visible</SelectItem>
                      <SelectItem value="Contraste operador-amateur">Contraste operador-amateur</SelectItem>
                      <SelectItem value="Asimetria de mercado">Asimetria de mercado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">FORMATO *</label>
                  <Select required value={formData.formato} onValueChange={v => setFormData({...formData, formato: v})}>
                    <SelectTrigger className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus:ring-0 focus:border-[#0C2DF5]">
                      <SelectValue placeholder="Selecciona formato" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none text-white">
                      <SelectItem value="Cara a camara">Cara a camara</SelectItem>
                      <SelectItem value="Screenrecording">Screenrecording</SelectItem>
                      <SelectItem value="Mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#666666] text-xs mb-2 block font-mono">SEGUIDORES BASE *</label>
                    <Input type="number" min="0" required value={formData.followersAtPublish} onChange={e => setFormData({...formData, followersAtPublish: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                  </div>
                  <div>
                    <label className="text-[#666666] text-xs mb-2 block font-mono">VIEWS *</label>
                    <Input type="number" min="0" required value={formData.views} onChange={e => setFormData({...formData, views: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                  </div>
                  <div>
                    <label className="text-[#666666] text-xs mb-2 block font-mono">LIKES *</label>
                    <Input type="number" min="0" required value={formData.likes} onChange={e => setFormData({...formData, likes: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                  </div>
                  <div>
                    <label className="text-[#666666] text-xs mb-2 block font-mono">COMMENTS *</label>
                    <Input type="number" min="0" required value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                  </div>
                  <div>
                    <label className="text-[#666666] text-xs mb-2 block font-mono">SAVES *</label>
                    <Input type="number" min="0" required value={formData.saves} onChange={e => setFormData({...formData, saves: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                  </div>
                  <div>
                    <label className="text-[#666666] text-xs mb-2 block font-mono">SHARES *</label>
                    <Input type="number" min="0" required value={formData.shares} onChange={e => setFormData({...formData, shares: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                  </div>
                </div>

                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">ALCANCE NO SEGUIDORES (Opcional)</label>
                  <Input type="number" min="0" value={formData.alcance} onChange={e => setFormData({...formData, alcance: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                </div>
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">TRANSCRIPCION (Opcional)</label>
                  <Textarea value={formData.transcripcion} onChange={e => setFormData({...formData, transcripcion: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5] min-h-[100px]" />
                </div>
                <div>
                  <label className="text-[#666666] text-xs mb-2 block font-mono">NOTAS (Opcional)</label>
                  <Textarea value={formData.notas} onChange={e => setFormData({...formData, notas: e.target.value})} className="bg-[#0D0D0D] border-[#1A1A1A] rounded-none focus-visible:ring-0 focus-visible:border-[#0C2DF5]" />
                </div>
              </div>
              <Button type="submit" disabled={createReel.isPending} className="w-full bg-[#0C2DF5] hover:bg-[#0C2DF5]/90 text-white rounded-none uppercase tracking-widest font-mono py-6">
                {createReel.isPending ? "GUARDANDO..." : "GUARDAR REEL"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="border border-[#1A1A1A]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[#1A1A1A] text-[#666666] font-mono text-xs uppercase tracking-wider">
              <th className="py-4 px-6 font-normal">Fecha</th>
              <th className="py-4 px-6 font-normal">Tema</th>
              <th className="py-4 px-6 font-normal">Angulo</th>
              <th className="py-4 px-6 font-normal">Views</th>
              <th className="py-4 px-6 font-normal">Likes%</th>
              <th className="py-4 px-6 font-normal">Comments%</th>
              <th className="py-4 px-6 font-normal">Saves%</th>
              <th className="py-4 px-6 font-normal">S/1K</th>
              <th className="py-4 px-6 font-normal">Shares%</th>
              <th className="py-4 px-6 font-normal">vs_promedio</th>
              <th className="py-4 px-6 font-normal">Firma</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {isLoadingReels || isLoadingStats ? (
              <tr><td colSpan={11} className="py-8 text-center text-[#0C2DF5]">// cargando...</td></tr>
            ) : reels.length === 0 ? (
              <tr><td colSpan={11} className="py-8 text-center text-[#666666]">// Sin datos registrados</td></tr>
            ) : (
              reels.map((reel, idx) => (
                <tr 
                  key={reel.id} 
                  className={`cursor-pointer hover:border hover:border-[#0C2DF5] transition-colors ${idx % 2 === 0 ? "bg-[#0D0D0D]" : "bg-[#111111]"}`}
                  onClick={() => setLocation(`/reels/${reel.id}`)}
                  data-testid={`row-reel-${reel.id}`}
                >
                  <td className="py-4 px-6 border-b border-[#1A1A1A] whitespace-nowrap">{format(new Date(reel.fecha), "dd/MM/yyyy")}</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A] max-w-[200px] truncate" title={reel.tema}>{reel.tema}</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A] text-[#666666] truncate max-w-[150px]">{reel.angulo}</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A]">{reel.views.toLocaleString()}</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A]">{reel.likesPct.toFixed(1)}%</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A]">{reel.commentsPct.toFixed(1)}%</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A]">{reel.savesPct.toFixed(1)}%</td>
                  <td className={`py-4 px-6 border-b border-[#1A1A1A] font-bold ${renderSaves1kColor(reel.savesPer1k)}`}>{reel.savesPer1k.toFixed(2)}</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A]">{reel.sharesPct.toFixed(1)}%</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A]">{renderVsPromedio(reel.views)}</td>
                  <td className="py-4 px-6 border-b border-[#1A1A1A]">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider ${getFirmaBadgeStyle(reel.firma)}`}>
                      {reel.firma}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
