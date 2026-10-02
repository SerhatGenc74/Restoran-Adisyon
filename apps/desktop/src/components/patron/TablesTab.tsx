import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../lib/api.js";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
type DiningTable = { id: string, name: string, status: string, capacity?: number };

export function TablesTab() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string, capacity: string }>({ name: "", capacity: "" });

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string, capacity: string }>({ name: "", capacity: "" });

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
      setCreateForm({ name: "", capacity: "" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string, payload: { name: string, capacity?: number } }) => {
      await api.patch(`/tables/${data.id}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Masa güncellendi");
      setIsEditing(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Masa silindi");
    }
  });

  const handleCreateSave = () => {
    if (!createForm.name) return toast.error("Masa adı zorunludur");
    createMutation.mutate({ 
      name: createForm.name, 
      capacity: createForm.capacity ? Number(createForm.capacity) : undefined 
    });
  };

  const handleEditSave = () => {
    if (!isEditing || !editForm.name) return toast.error("Masa adı zorunludur");
    updateMutation.mutate({ 
      id: isEditing,
      payload: { 
        name: editForm.name, 
        capacity: editForm.capacity ? Number(editForm.capacity) : undefined 
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`'${name}' masasını silmek istediğinize emin misiniz?`)) {
      deleteMutation.mutate(id);
    }
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {isCreating && (
          <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
            <input 
              type="text" 
              autoFocus 
              className="border border-slate-300 rounded px-2 py-1.5 w-full text-center text-sm font-bold bg-white outline-none focus:border-blue-400" 
              placeholder="Masa Adı"
              value={createForm.name}
              onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
            />
            <input 
              type="number" 
              className="border border-slate-300 rounded px-2 py-1.5 w-full text-center text-sm bg-white outline-none focus:border-blue-400" 
              placeholder="Kapasite (Kişi)"
              value={createForm.capacity}
              onChange={e => setCreateForm({ ...createForm, capacity: e.target.value })}
            />
            <div className="flex gap-2 mt-2 w-full">
              <button onClick={handleCreateSave} disabled={createMutation.isPending} className="flex-1 flex justify-center bg-green-500 text-white rounded py-1.5 hover:bg-green-600"><Check size={16} /></button>
              <button onClick={() => { setIsCreating(false); setCreateForm({ name: "", capacity: "" }); }} className="flex-1 flex justify-center bg-slate-400 text-white rounded py-1.5 hover:bg-slate-500"><X size={16} /></button>
            </div>
          </div>
        )}
        {data?.tables.map((table) => {
          if (isEditing === table.id) {
            return (
              <div key={table.id} className="border-2 border-orange-200 bg-orange-50 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
                <input 
                  type="text" 
                  autoFocus 
                  className="border border-slate-300 rounded px-2 py-1.5 w-full text-center text-sm font-bold bg-white outline-none focus:border-orange-400" 
                  placeholder="Masa Adı"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
                <input 
                  type="number" 
                  className="border border-slate-300 rounded px-2 py-1.5 w-full text-center text-sm bg-white outline-none focus:border-orange-400" 
                  placeholder="Kapasite (Kişi)"
                  value={editForm.capacity}
                  onChange={e => setEditForm({ ...editForm, capacity: e.target.value })}
                />
                <div className="flex gap-2 mt-2 w-full">
                  <button onClick={handleEditSave} disabled={updateMutation.isPending} className="flex-1 flex justify-center bg-green-500 text-white rounded py-1.5 hover:bg-green-600"><Check size={16} /></button>
                  <button onClick={() => setIsEditing(null)} className="flex-1 flex justify-center bg-slate-400 text-white rounded py-1.5 hover:bg-slate-500"><X size={16} /></button>
                </div>
              </div>
            );
          }

          return (
            <div key={table.id} className="border-2 border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative group hover:border-blue-300 transition-colors bg-white">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button 
                  onClick={() => {
                    setIsEditing(table.id);
                    setEditForm({ name: table.name, capacity: table.capacity?.toString() || "" });
                  }}
                  className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(table.id, table.name)}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className={`w-3 h-3 rounded-full mt-2 ${
                table.status === 'AVAILABLE' ? 'bg-green-500' :
                table.status === 'OCCUPIED' ? 'bg-red-500' :
                table.status === 'RESERVED' ? 'bg-blue-500' : 'bg-slate-500'
              }`} />
              <span className="font-bold text-lg mt-1">{table.name}</span>
              <span className="text-xs text-slate-500">
                {table.status === 'AVAILABLE' ? 'Müsait' : 
                 table.status === 'OCCUPIED' ? 'Dolu' : 
                 table.status === 'RESERVED' ? 'Rezerve' : 'Servis Dışı'}
              </span>
              {table.capacity && (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                  {table.capacity} Kişilik
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
