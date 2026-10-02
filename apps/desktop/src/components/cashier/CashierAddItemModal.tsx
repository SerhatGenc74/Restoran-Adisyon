import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { X, Plus, Minus } from "lucide-react";
import type { Product, Category } from "../../types/index.js";
import { toast } from "sonner";

export function CashierAddItemModal({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Eklenecek urun secimi
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [portion, setPortion] = useState("TAM");
  const [note, setNote] = useState("");
  const [isComplimentary, setIsComplimentary] = useState(false);

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then(res => res.data)
  });

  const { data: prodData } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get("/products").then(res => res.data)
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      await api.post(`/orders/${orderId}/items`, {
        productId: selectedProduct.id,
        quantity,
        portion,
        note: note || undefined,
        isComplimentary
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Ürün eklendi");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Ürün eklenemedi");
    }
  });

  const categories: Category[] = catData?.categories || [];
  const products: Product[] = prodData?.products || [];
  
  const filteredProducts = selectedCategory 
    ? products.filter(p => p.categoryId === selectedCategory)
    : products.filter(p => true);

  let currentPrice = selectedProduct?.price || 0;
  if (selectedProduct && portion !== "TAM") {
    const specificPortion = selectedProduct.portions?.find(p => p.portion === portion);
    if (specificPortion) currentPrice = specificPortion.price;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Adisyona Ürün Ekle</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Categories & Products */}
          <div className="flex-1 flex flex-col border-r border-slate-200">
            <div className="p-2 bg-slate-100 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap font-bold text-sm transition-colors ${!selectedCategory ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}
              >
                Tümü
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap font-bold text-sm transition-colors ${selectedCategory === c.id ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3 align-content-start">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProduct(p);
                    setQuantity(1);
                    setPortion("TAM");
                    setNote("");
                    setIsComplimentary(false);
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-sm border-2 transition-all h-24 ${selectedProduct?.id === p.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <span className="font-bold text-center text-sm mb-1">{p.name}</span>
                  <span className="text-xs text-primary font-bold">{p.price} ₺</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Selected Product Form */}
          <div className="w-[320px] bg-slate-50 flex flex-col">
            {selectedProduct ? (
              <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedProduct.name}</h3>
                  <p className="text-primary font-bold text-lg">{currentPrice} ₺</p>
                </div>

                {/* Adet */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Adet</label>
                  <div className="flex items-center gap-4 bg-white rounded-xl p-2 border border-slate-200">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700">
                      <Minus size={20} />
                    </button>
                    <span className="flex-1 text-center text-2xl font-bold">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {/* Porsiyon */}
                {selectedProduct.portions && selectedProduct.portions.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Porsiyon</label>
                    <select 
                      value={portion} 
                      onChange={(e) => setPortion(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-primary text-slate-700"
                    >
                      <option value="TAM">TAM</option>
                      {selectedProduct.portions.map(p => (
                        <option key={p.id || p.portion} value={p.portion}>{p.portion}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* İkram & Not */}
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ekstra</label>
                   <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 mb-3">
                     <span className="font-bold text-slate-700">İkram (Ücretsiz)</span>
                     <input type="checkbox" checked={isComplimentary} onChange={(e) => setIsComplimentary(e.target.checked)} className="w-5 h-5 accent-primary" />
                   </div>
                   <input 
                     type="text" 
                     placeholder="Sipariş notu (opsiyonel)" 
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                   />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 p-8 text-center">
                Sol taraftan adisyona eklemek istediğiniz ürünü seçin.
              </div>
            )}

            {/* Footer Action */}
            <div className="p-4 bg-white border-t border-slate-200">
              <button
                disabled={!selectedProduct || addItemMutation.isPending}
                onClick={() => addItemMutation.mutate()}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {addItemMutation.isPending ? "Ekleniyor..." : "Adisyona Ekle"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
