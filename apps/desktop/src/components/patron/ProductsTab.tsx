import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { toast } from "sonner";
import { Plus, Edit2, Check, X } from "lucide-react";

type Category = { id: string, name: string }; 
type Product = { id: string, name: string, categoryId: string, price: number, isActive: boolean, type: string, portions?: { id: string, portion: string, price: number }[] };

function parsePortionsString(str?: string) {
  if (!str) return [];
  const parts = str.split(",").map(s => s.trim()).filter(Boolean);
  const portions: { portion: string, price: number }[] = [];
  for (const part of parts) {
    const [portion, priceStr] = part.split(":").map(s => s.trim());
    const price = Number(priceStr);
    if (portion && !isNaN(price)) {
      portions.push({ portion, price });
    }
  }
  return portions;
}

function portionsToString(portions?: { portion: string, price: number }[]) {
  if (!portions || portions.length === 0) return "";
  return portions.map(p => `${p.portion}: ${p.price}`).join(", ");
}

export function ProductsTab() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product & { portionsString: string }>>({});
  
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<Product & { type: string, portionsString: string }>>({ type: "FOOD" });
  
  const { data: productsData, isLoading: isLoadingProducts } = useQuery<{ products: Product[] }>({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data
  });
  
  const { data: categoriesData } = useQuery<{ categories: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post(`/products`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Ürün eklendi");
      setIsCreating(false);
      setCreateForm({ type: "FOOD", portionsString: "" });
    }
    });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string, payload: any }) => {
      await api.patch(`/products/${data.id}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Ürün güncellendi");
      setIsEditing(null);
    }
    });

  const handleEdit = (product: Product) => {
    setIsEditing(product.id);
    setEditForm({
      ...product,
      portionsString: portionsToString(product.portions)
    });
  };

  const handleSave = () => {
    if (!isEditing) return;
    updateMutation.mutate({
      id: isEditing,
      payload: {
        name: editForm.name,
        price: editForm.price,
        categoryId: editForm.categoryId,
        isActive: editForm.isActive,
        type: editForm.type,
        portions: parsePortionsString(editForm.portionsString)
      }
    });
  };

  const handleCreateSave = () => {
    if (!createForm.name || !createForm.price || !createForm.categoryId) {
      toast.error("Ürün adı, fiyatı ve kategorisi zorunludur");
      return;
    }
    createMutation.mutate({
      name: createForm.name,
      price: createForm.price,
      categoryId: createForm.categoryId,
      type: createForm.type || "FOOD",
      portions: parsePortionsString(createForm.portionsString)
    });
  };

  if (isLoadingProducts) return <div>Yükleniyor...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Ürün Yönetimi</h2>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Yeni Ürün
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-sm">
              <th className="pb-3 font-medium">Ürün Adı</th>
              <th className="pb-3 font-medium">Kategori</th>
              <th className="pb-3 font-medium">Fiyat (TAM) (₺)</th>
              <th className="pb-3 font-medium">Ek Porsiyonlar (Örn: AZ:100, 1.5:250)</th>
              <th className="pb-3 font-medium">Tip</th>
              <th className="pb-3 font-medium">Durum</th>
              <th className="pb-3 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {isCreating && (
              <tr className="border-b border-slate-100 bg-blue-50/50">
                <td className="py-3 px-2">
                  <input type="text" autoFocus className="border rounded px-2 py-1 w-full bg-white" placeholder="Ürün Adı" value={createForm.name || ""} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                </td>
                <td className="py-3 px-2">
                  <select className="border rounded px-2 py-1 bg-white w-full" value={createForm.categoryId || ""} onChange={e => setCreateForm({...createForm, categoryId: e.target.value})}>
                    <option value="" disabled>Kategori Seçin</option>
                    {categoriesData?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="py-3 px-2">
                  <input type="number" className="border rounded px-2 py-1 w-24 bg-white" placeholder="Fiyat" value={createForm.price || 0} onChange={e => setCreateForm({...createForm, price: Number(e.target.value)})} />
                </td>
                <td className="py-3 px-2">
                  <input type="text" className="border rounded px-2 py-1 w-full bg-white text-sm" placeholder="AZ:100, 1.5:250" value={createForm.portionsString || ""} onChange={e => setCreateForm({...createForm, portionsString: e.target.value})} />
                </td>
                <td className="py-3 px-2">
                  <select className="border rounded px-2 py-1 bg-white" value={createForm.type || "FOOD"} onChange={e => setCreateForm({...createForm, type: e.target.value})}>
                    <option value="FOOD">Yiyecek</option>
                    <option value="DRINK">İçecek</option>
                    <option value="OTHER">Diğer</option>
                  </select>
                </td>
                <td className="py-3 px-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={handleCreateSave} disabled={createMutation.isPending} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16} /></button>
                    <button onClick={() => { setIsCreating(false); setCreateForm({ type: "FOOD" }); }} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            )}
            {productsData?.products.map((product) => (
              <tr key={product.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3">
                  {isEditing === product.id ? (
                    <input 
                      type="text" 
                      className="border rounded px-2 py-1 w-full"
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    />
                  ) : (
                    <span className="font-medium">{product.name}</span>
                  )}
                </td>
                <td className="py-3 text-slate-600">
                  {isEditing === product.id ? (
                    <select 
                      className="border rounded px-2 py-1"
                      value={editForm.categoryId || ""}
                      onChange={(e) => setEditForm({...editForm, categoryId: e.target.value})}
                    >
                      {categoriesData?.categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    categoriesData?.categories.find(c => c.id === product.categoryId)?.name || "-"
                  )}
                </td>
                <td className="py-3 font-medium text-blue-600">
                  {isEditing === product.id ? (
                    <input 
                      type="number" 
                      className="border rounded px-2 py-1 w-24"
                      value={editForm.price || 0}
                      onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})}
                    />
                  ) : (
                    `₺${product.price}`
                  )}
                </td>
                <td className="py-3">
                  {isEditing === product.id ? (
                    <input 
                      type="text" 
                      className="border rounded px-2 py-1 w-full text-sm"
                      placeholder="AZ:100, 1.5:250"
                      value={editForm.portionsString || ""}
                      onChange={(e) => setEditForm({...editForm, portionsString: e.target.value})}
                    />
                  ) : (
                    <span className="text-sm text-slate-500">{portionsToString(product.portions) || "-"}</span>
                  )}
                </td>
                <td className="py-3">
                  {isEditing === product.id ? (
                    <select 
                      className="border rounded px-2 py-1"
                      value={editForm.type || "FOOD"}
                      onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                    >
                      <option value="FOOD">Yiyecek</option>
                      <option value="DRINK">İçecek</option>
                      <option value="OTHER">Diğer</option>
                    </select>
                  ) : (
                    product.type === "FOOD" ? "Yiyecek" : product.type === "DRINK" ? "İçecek" : "Diğer"
                  )}
                </td>
                <td className="py-3">
                  {isEditing === product.id ? (
                    <select 
                      className="border rounded px-2 py-1"
                      value={editForm.isActive ? "true" : "false"}
                      onChange={(e) => setEditForm({...editForm, isActive: e.target.value === "true"})}
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.isActive ? "Aktif" : "Pasif"}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  {isEditing === product.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={handleSave} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16} /></button>
                      <button onClick={() => setIsEditing(null)} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => handleEdit(product)} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
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
