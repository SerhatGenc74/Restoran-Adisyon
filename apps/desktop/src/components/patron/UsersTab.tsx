import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { toast } from "sonner";
import { Plus, Edit2, Check, X, ShieldAlert } from "lucide-react";
import type { UserRole } from "@adisyon/shared";

type User = { id: string; username: string; displayName: string; role: UserRole; isActive: boolean; lastLoginAt: string | null };

export function UsersTab() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<User & { password?: string }>>({ role: "WAITER" });
  
  const { data, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post(`/users`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Kullanıcı eklendi");
      setIsCreating(false);
      setCreateForm({ role: "WAITER" });
    }
    });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string, role?: UserRole, isActive?: boolean }) => {
      await api.patch(`/users/${payload.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Kullanıcı güncellendi");
      setIsEditing(null);
    }
    });

  const handleEdit = (user: User) => {
    setIsEditing(user.id);
    setEditForm(user);
  };

  const handleSave = () => {
    if (!isEditing) return;
    updateMutation.mutate({
      id: isEditing,
      role: editForm.role,
      isActive: editForm.isActive
    });
  };

  const handleCreateSave = () => {
    if (!createForm.username || !createForm.password || !createForm.displayName || !createForm.role) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    createMutation.mutate({
      username: createForm.username,
      password: createForm.password,
      displayName: createForm.displayName,
      role: createForm.role
    });
  };

  if (isLoading) return <div>Yükleniyor...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Kullanıcı Yönetimi</h2>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Yeni Kullanıcı
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-sm">
              <th className="pb-3 font-medium">Kullanıcı Adı</th>
              <th className="pb-3 font-medium">İsim</th>
              <th className="pb-3 font-medium">Parola</th>
              <th className="pb-3 font-medium">Yetki (Rol)</th>
              <th className="pb-3 font-medium">Durum</th>
              <th className="pb-3 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {isCreating && (
              <tr className="border-b border-slate-100 bg-blue-50/50">
                <td className="py-3 px-2">
                  <input type="text" autoFocus className="border rounded px-2 py-1 w-full bg-white" placeholder="Kullanıcı Adı" value={createForm.username || ""} onChange={e => setCreateForm({...createForm, username: e.target.value})} />
                </td>
                <td className="py-3 px-2">
                  <input type="text" className="border rounded px-2 py-1 w-full bg-white" placeholder="İsim" value={createForm.displayName || ""} onChange={e => setCreateForm({...createForm, displayName: e.target.value})} />
                </td>
                <td className="py-3 px-2">
                  <input type="password" className="border rounded px-2 py-1 w-full bg-white" placeholder="Parola" value={createForm.password || ""} onChange={e => setCreateForm({...createForm, password: e.target.value})} />
                </td>
                <td className="py-3 px-2">
                  <select className="border rounded px-2 py-1 w-full bg-white" value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value as UserRole})}>
                    <option value="WAITER">Garson</option>
                    <option value="KITCHEN">Mutfak</option>
                    <option value="CASHIER">Kasa</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OWNER">Patron</option>
                  </select>
                </td>
                <td className="py-3 px-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={handleCreateSave} disabled={createMutation.isPending} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16} /></button>
                    <button onClick={() => { setIsCreating(false); setCreateForm({ role: "WAITER" }); }} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            )}
            {data?.users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3 font-medium">{user.username}</td>
                <td className="py-3 text-slate-600">{user.displayName}</td>
                <td className="py-3 text-slate-400 italic text-xs">
                  {isEditing === user.id ? "Şifre değiştirilemez" : "Gizli"}
                </td>
                <td className="py-3">
                  {isEditing === user.id ? (
                    <select 
                      className="border rounded px-2 py-1"
                      value={editForm.role}
                      onChange={(e) => setEditForm({...editForm, role: e.target.value as UserRole})}
                    >
                      <option value="WAITER">Garson</option>
                      <option value="KITCHEN">Mutfak</option>
                      <option value="CASHIER">Kasa</option>
                      <option value="ADMIN">Admin</option>
                      <option value="OWNER">Patron</option>
                    </select>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-lg w-fit">
                      <ShieldAlert size={14} />
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="py-3">
                  {isEditing === user.id ? (
                    <select 
                      className="border rounded px-2 py-1"
                      value={editForm.isActive ? "true" : "false"}
                      onChange={(e) => setEditForm({...editForm, isActive: e.target.value === "true"})}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.isActive ? "Aktif" : "Pasif"}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  {isEditing === user.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={handleSave} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16} /></button>
                      <button onClick={() => setIsEditing(null)} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => handleEdit(user)} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
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
