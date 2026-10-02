import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { toast } from "sonner";
import { Plus, Edit2, Check, X } from "lucide-react";

type Category = { id: string, name: string }; 
type Product = { id: string, name: string, categoryId: string, price: number, isActive: boolean, type: string, portions?: { id: string, portion: string, price: number }[] };

function portionsToString(portions?: { portion: string, price: number }[]) {
  if (!portions || portions.length === 0) return "";
  return portions.map(p => `${p.portion}: ${p.price}`).join(", ");
}

function PortionEditor({ 
  basePrice,
  onBasePriceChange,
  portionsMap, 
  onPortionsChange 
}: { 
  basePrice: number,
  onBasePriceChange: (v: number) => void,
  portionsMap: Record<string, number | undefined>, 
  onPortionsChange: (v: Record<string, number | undefined>) => void 
}) {
  const keys = Array.from(new Set(["AZ", "1.5", "DUBLE", ...Object.keys(portionsMap)]));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-800 w-12">TAM:</span>
        <input 
          type="number" 
          className="border rounded px-2 py-0.5 w-20 text-xs font-bold" 
          placeholder="Fiyat"
          value={basePrice || ""}
          onChange={e => onBasePriceChange(Number(e.target.value))}
        />
      </div>
      {keys.map(port => (
        <div key={port} className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 w-12">{port}:</span>
          <input 
            type="number" 
            className="border rounded px-2 py-0.5 w-20 text-xs" 
            placeholder="Fiyat"
            value={portionsMap[port] || ""}
            onChange={e => {
              const val = e.target.value;
              onPortionsChange({
                ...portionsMap,
                [port]: val ? Number(val) : undefined
              });
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function ProductsTab() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product & { portionsMap: Record<string, number | undefined> }>>({});
  
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<Product & { portionsMap: Record<string, number | undefined> }>>({ type: "FOOD", portionsMap: {}, price: 0 });
  
  const { data: productsData, isLoading: isLoadingProducts } = useQuery<{ products: Product[] }>({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products?includeInactive=true")).data
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
      setCreateForm({ type: "FOOD", portionsMap: {}, price: 0 });
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
    const pMap: Record<string, number> = {};
    if (product.portions) {
      product.portions.forEach(p => pMap[p.portion] = Number(p.price));
    }
    setEditForm({
      ...product,
      portionsMap: pMap
    });
  };

  const handleSave = () => {
    if (!isEditing) return;
    const portions = Object.entries(editForm.portionsMap || {})
      .filter(([_, price]) => price !== undefined && price > 0)
      .map(([portion, price]) => ({ portion, price: price as number }));

    updateMutation.mutate({
      id: isEditing,
      payload: {
        name: editForm.name,
        price: editForm.price,
        categoryId: editForm.categoryId,
        isActive: editForm.isActive,
        type: editForm.type,
        portions
      }
    });
  };

  const handleCreateSave = () => {
    if (!createForm.name || !createForm.price || !createForm.categoryId) {
      toast.error("Ürün adı, fiyatı ve kategorisi zorunludur");
      return;
    }
    const portions = Object.entries(createForm.portionsMap || {})
      .filter(([_, price]) => price !== undefined && price > 0)
      .map(([portion, price]) => ({ portion, price: price as number }));

    createMutation.mutate({
      name: createForm.name,
      price: createForm.price,
      categoryId: createForm.categoryId,
      type: createForm.type || "FOOD",
      portions
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
              <th className="pb-3 font-medium">Porsiyonlar & Fiyatlar</th>
              <th className="pb-3 font-medium">Tip</th>
              <th className="pb-3 font-medium">Durum</th>
              <th className="pb-3 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {isCreating && (
              <tr className="border-b border-slate-100 bg-blue-50/50">
                <td className="py-3 px-2 align-top">
                  <input type="text" autoFocus className="border rounded px-2 py-1 w-full bg-white" placeholder="Ürün Adı" value={createForm.name || ""} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                </td>
                <td className="py-3 px-2 align-top">
                  <select className="border rounded px-2 py-1 bg-white w-full" value={createForm.categoryId || ""} onChange={e => setCreateForm({...createForm, categoryId: e.target.value})}>
                    <option value="" disabled>Kategori Seçin</option>
                    {categoriesData?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="py-3 px-2 align-top">
                  <PortionEditor 
                    basePrice={createForm.price || 0}
                    onBasePriceChange={v => setCreateForm({...createForm, price: v})}
                    portionsMap={createForm.portionsMap || {}} 
                    onPortionsChange={v => setCreateForm({...createForm, portionsMap: v})} 
                  />
                </td>
                <td className="py-3 px-2 align-top">
                  <select className="border rounded px-2 py-1 bg-white" value={createForm.type || "FOOD"} onChange={e => setCreateForm({...createForm, type: e.target.value})}>
                    <option value="FOOD">Yiyecek</option>
                    <option value="DRINK">İçecek</option>
                    <option value="OTHER">Diğer</option>
                  </select>
                </td>
                <td className="py-3 px-2 align-top">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktif</span>
                </td>
                <td className="py-3 px-2 text-right align-top">
                  <div className="flex justify-end gap-2">
                    <button onClick={handleCreateSave} disabled={createMutation.isPending} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={16} /></button>
                    <button onClick={() => { setIsCreating(false); setCreateForm({ type: "FOOD", portionsMap: {}, price: 0 }); }} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            )}
            {productsData?.products.map((product) => (
              <tr key={product.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3 align-top">
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
                <td className="py-3 text-slate-600 align-top">
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
                <td className="py-3 align-top">
                  {isEditing === product.id ? (
                    <PortionEditor 
                      basePrice={editForm.price || 0}
                      onBasePriceChange={v => setEditForm({...editForm, price: v})}
                      portionsMap={editForm.portionsMap || {}} 
                      onPortionsChange={v => setEditForm({...editForm, portionsMap: v})} 
                    />
                  ) : (
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span className="font-bold text-slate-800">TAM: ₺{product.price}</span>
                      {product.portions?.map(p => (
                        <span key={p.id} className="text-slate-500">{p.portion}: ₺{p.price}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 align-top">
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
                <td className="py-3 align-top">
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
                <td className="py-3 text-right align-top">
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
