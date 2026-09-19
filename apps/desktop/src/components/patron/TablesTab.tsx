import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../lib/api.js";
import { Plus } from "lucide-react";
type DiningTable = { id: string, name: string, status: string };

export function TablesTab() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string }>({ name: "" });

  const { data, isLoading } = useQuery<{ tables: DiningTable[] }>({
    queryKey: ["tables"],
    queryFn: async () => (await api.get("/tables")).data
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string, capacity?: number }) => {
      await api.post(`/tables`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Masa eklendi");
      setIsCreating(false);
      setCreateForm({ name: "" });
    }
    });

  const handleCreateSave = () => {
    if (!createForm.name) {
      toast.error("Masa adı zorunludur");
      return;
    }
    createMutation.mutate({ name: createForm.name });
  };

  if (isLoading) return <div>Yükleniyor...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Masa Yönetimi</h2>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Yeni Masa
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {isCreating && (
          <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
            <input 
              type="text" 
              autoFocus 
              className="border border-slate-300 rounded px-2 py-1 w-full text-center text-sm font-bold bg-white" 
              placeholder="Masa Adı"
              value={createForm.name}
              onChange={e => setCreateForm({ name: e.target.value })}
            />
            <div className="flex gap-2 mt-2 w-full">
              <button onClick={handleCreateSave} disabled={createMutation.isPending} className="flex-1 bg-green-500 text-white rounded py-1 text-xs font-bold hover:bg-green-600">Kaydet</button>
              <button onClick={() => { setIsCreating(false); setCreateForm({ name: "" }); }} className="flex-1 bg-slate-400 text-white rounded py-1 text-xs font-bold hover:bg-slate-500">İptal</button>
            </div>
          </div>
        )}
        {data?.tables.map((table) => (
          <div key={table.id} className="border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative group">
            <div className={`w-3 h-3 rounded-full ${
              table.status === 'AVAILABLE' ? 'bg-green-500' :
              table.status === 'OCCUPIED' ? 'bg-red-500' :
              table.status === 'RESERVED' ? 'bg-blue-500' : 'bg-slate-500'
            }`} />
            <span className="font-bold text-lg">{table.name}</span>
            <span className="text-xs text-slate-500">{table.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
