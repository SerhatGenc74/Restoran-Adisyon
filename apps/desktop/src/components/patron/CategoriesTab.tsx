import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { toast } from "sonner";
import { Plus, Edit2, Check, X } from "lucide-react";
type Category = { id: string, name: string, sortOrder: number, isActive: boolean };

export function CategoriesTab() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<Category>>({});
  
  const { data, isLoading } = useQuery<{ categories: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string, sortOrder?: number }) => {
      await api.post(`/categories`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori eklendi");
      setIsCreating(false);
      setCreateForm({});
    }
    });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string, name?: string, sortOrder?: number, isActive?: boolean }) => {
      await api.patch(`/categories/${payload.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori güncellendi");
      setIsEditing(null);
    }
    });

  const handleEdit = (category: Category) => {
    setIsEditing(category.id);
    setEditForm(category);
  };

  const handleSave = () => {
    if (!isEditing) return;
    updateMutation.mutate({
      id: isEditing,
      name: editForm.name,
      sortOrder: editForm.sortOrder,
      isActive: editForm.isActive
    });
  };

  const handleCreateSave = () => {
    if (!createForm.name) {
      toast.error("Kategori adı zorunludur");
      return;
    }
    createMutation.mutate({
      name: createForm.name,
      sortOrder: createForm.sortOrder || 0
    });
  };

  if (isLoading) return <div>Yükleniyor...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Kategori Yönetimi</h2>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Yeni Kategori
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-sm">
              <th className="pb-3 font-medium">Sıra</th>
              <th className="pb-3 font-medium">Kategori Adı</th>
              <th className="pb-3 font-medium">Durum</th>
              <th className="pb-3 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {isCreating && (
              <tr className="border-b border-slate-100 bg-blue-50/50">
                <td className="py-3 px-2 w-16">
                  <input type="number" className="border rounded px-2 py-1 w-full bg-white" placeholder="Sıra" value={createForm.sortOrder || 0} onChange={e => setCreateForm({...createForm, sortOrder: Number(e.target.value)})} />
                </td>
                <td className="py-3 px-2">
                  <input type="text" autoFocus className="border rounded px-2 py-1 w-full max-w-xs bg-white" placeholder="Kategori Adı" value={createForm.name || ""} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                </td>
                <td className="py-3 px-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={handleCreateSave} disabled={createMutation.isPending} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16} /></button>
                    <button onClick={() => { setIsCreating(false); setCreateForm({}); }} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            )}
            {data?.categories.map((cat) => (
              <tr key={cat.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3 text-slate-500 font-medium w-16">
                  {isEditing === cat.id ? (
                    <input 
                      type="number" 
                      className="border rounded px-2 py-1 w-full"
                      value={editForm.sortOrder || 0}
                      onChange={(e) => setEditForm({...editForm, sortOrder: Number(e.target.value)})}
                    />
                  ) : (
                    cat.sortOrder
                  )}
                </td>
                <td className="py-3 font-medium">
                  {isEditing === cat.id ? (
                    <input 
                      type="text" 
                      className="border rounded px-2 py-1 w-full max-w-xs"
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    />
                  ) : (
                    cat.name
                  )}
                </td>
                <td className="py-3">
                  {isEditing === cat.id ? (
                    <select 
                      className="border rounded px-2 py-1"
                      value={editForm.isActive ? "true" : "false"}
                      onChange={(e) => setEditForm({...editForm, isActive: e.target.value === "true"})}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {cat.isActive ? "Aktif" : "Pasif"}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  {isEditing === cat.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={handleSave} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16} /></button>
                      <button onClick={() => setIsEditing(null)} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => handleEdit(cat)} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
                      <Edit2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
