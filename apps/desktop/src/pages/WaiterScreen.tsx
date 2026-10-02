import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";
import { toast } from "sonner";
import { LogOut, Plus, Minus, Send, ArrowLeft } from "lucide-react";
import type { Table, Category, Product, Order } from "../types/index.js";

function fetchTables(): Promise<{ tables: Table[] }> {
  return api.get("/tables").then((res) => res.data);
}

function fetchCategories(): Promise<{ categories: Category[] }> {
  return api.get("/categories").then((res) => res.data);
}

function fetchProducts(): Promise<{ products: Product[] }> {
  return api.get("/products").then((res) => res.data);
}

function fetchOrder(id: string): Promise<{ order: Order }> {
  return api.get(`/orders/${id}`).then((res) => res.data);
}

export function WaiterScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const { data: tableData, isLoading: tablesLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: fetchTables,
    refetchInterval: 5000
  });

  if (tablesLoading) {
    return <div className="p-8 flex justify-center">Yukleniyor...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          {selectedTable && (
            <button
              onClick={() => setSelectedTable(null)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-xl font-bold text-slate-800">
            {selectedTable ? `${selectedTable.name} Adisyon` : "Masa Seçimi"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-600">{user?.displayName} (Garson)</span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Cikis</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {!selectedTable ? (
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 overflow-y-auto h-full">
            {tableData?.tables.map((table) => {
              const isActive = table.status === "OCCUPIED" && table.orders && table.orders.length > 0;
              return (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`
                    flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm border-2 transition-all
                    ${
                      isActive
                        ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
                        : table.status === "AVAILABLE"
                        ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                        : "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed"
                    }
                  `}
                  disabled={table.status !== "AVAILABLE" && table.status !== "OCCUPIED"}
                >
                  <span className="text-2xl font-bold mb-2">{table.name}</span>
                  <span className="text-sm font-medium">
                    {isActive ? "Dolu" : table.status === "AVAILABLE" ? "Bos" : "Kapali"}
                  </span>
                  {isActive && table.orders?.[0] && (
                    <span className="text-xs mt-2 font-bold">
                      {Number(table.orders[0].total).toLocaleString("tr-TR")} ₺
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <OrderView table={selectedTable} onBack={() => setSelectedTable(null)} />
        )}
      </main>
    </div>
  );
}

function OrderView({ table, onBack }: { table: Table; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Local cart state for new items
  const [cart, setCart] = useState<Array<{ id: string; product: Product; quantity: number; portion: string; note?: string; isComplimentary?: boolean }>>([]);

  const activeOrderId = table.orders?.[0]?.id;

  const { data: orderData } = useQuery({
    queryKey: ["orders", activeOrderId],
    queryFn: () => fetchOrder(activeOrderId!),
    enabled: !!activeOrderId,
  });

  const { data: categoryData } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories
  });

  const { data: productData } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.portion === "TAM" && !item.isComplimentary && !item.note);
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: Math.random().toString(36).substring(7), product, quantity: 1, portion: "TAM", isComplimentary: false, note: "" }];
    });
  };

  const updateCartItem = (cartItemId: string, updates: { portion?: string, isComplimentary?: boolean, note?: string }) => {
    setCart((prev) => prev.map(item => 
      item.id === cartItemId ? { ...item, ...updates } : item
    ));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing?.quantity === 1) {
        return prev.filter((item) => item.id !== cartItemId);
      }
      return prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/orders/${activeOrderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders", activeOrderId] });
      toast.success("Adisyon tamamen iptal edildi!");
      onBack();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Adisyon iptal edilemedi.");
    }
  });

  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      const items = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        portion: item.portion,
        note: item.note,
        isComplimentary: item.isComplimentary
      }));
      
      if (activeOrderId) {
        // Add to existing order
        for (const item of items) {
          await api.post(`/orders/${activeOrderId}/items`, item);
        }
      } else {
        // Create new order
        await api.post("/orders", {
          tableId: table.id,
          items
        });
      }
    },
    onSuccess: () => {
      toast.success("Siparis mutfaga gonderildi!");
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      if (activeOrderId) {
        queryClient.invalidateQueries({ queryKey: ["orders", activeOrderId] });
      } else {
        onBack();
      }
    }
    });

  const categories = categoryData?.categories || [];
  const products = productData?.products || [];
  
  const currentCategoryId = activeCategory || categories[0]?.id;
  const visibleProducts = products.filter((p) => p.categoryId === currentCategoryId);
  const existingItems = orderData?.order.items || [];

  return (
    <div className="flex h-full">
      {/* Left side: Menu */}
      <div className="flex-1 flex flex-col border-r border-slate-200">
        {/* Category Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 gap-2 hide-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-medium transition-colors ${
                currentCategoryId === c.id
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        
        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 align-content-start">
          {visibleProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-primary hover:shadow-md transition-all h-32"
            >
              <span className="font-medium text-slate-800 text-center leading-tight">{p.name}</span>
              <span className="text-primary font-bold">{Number(p.price).toLocaleString("tr-TR")} ₺</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right side: Cart */}
      <div className="w-96 bg-white flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold">Adisyon Detayi</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Existing items from DB */}
          {existingItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mevcut Siparisler</h3>
              {existingItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {item.product?.name || "Urun"}
                      {item.portion !== "TAM" && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                          {item.portion}
                        </span>
                      )}
                      {item.isComplimentary && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">İKRAM</span>}
                    </div>
                    <div className="text-sm text-slate-500">{item.quantity} x {item.unitPrice} ₺</div>
                    {item.note && <div className="text-xs text-slate-400 mt-1 italic">Not: {item.note}</div>}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className={`font-bold ${item.isComplimentary ? 'text-slate-400 line-through' : ''}`}>{item.lineTotal} ₺</div>
                    <div className="flex items-center gap-2">
                      {item.status === 'PENDING' && (
                        <button 
                          onClick={async () => {
                            if (confirm('Bu ürünü iptal etmek istediğinize emin misiniz?')) {
                              await api.post(`/orders/${activeOrderId}/items/${item.id}/cancel`);
                              queryClient.invalidateQueries({ queryKey: ["orders", activeOrderId] });
                            }
                          }}
                          className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 rounded font-bold"
                        >
                          İPTAL
                        </button>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        item.status === 'SERVED' ? 'bg-green-100 text-green-700' :
                        item.status === 'READY' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'PREPARING' ? 'bg-orange-100 text-orange-700' :
                        item.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Cart Items */}
          {cart.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Yeni Eklenecekler</h3>
              {cart.map((item) => {
                let currentPrice = item.product.price;
                if (item.portion !== "TAM") {
                  const specificPortion = item.product.portions?.find(p => p.portion === item.portion);
                  if (specificPortion) currentPrice = specificPortion.price;
                }
                return (
                  <div key={item.id} className="flex flex-col bg-white p-3 rounded-lg border border-primary/20 shadow-sm gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium text-slate-800 flex items-center flex-wrap gap-1">
                          {item.product.name}
                          {item.isComplimentary && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">İKRAM</span>}
                        </div>
                        <div className={`font-bold ${item.isComplimentary ? 'text-slate-400 line-through' : 'text-primary'}`}>
                          {(currentPrice * item.quantity)} ₺
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-50 text-slate-600">
                          <Minus size={16} />
                        </button>
                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-50 text-slate-600">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <select 
                        className="text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-primary bg-white text-slate-700"
                        value={item.portion}
                        onChange={(e) => updateCartItem(item.id, { portion: e.target.value })}
                      >
                        <option value="TAM">TAM</option>
                        {item.product.portions?.map(p => (
                          <option key={p.id || p.portion} value={p.portion}>{p.portion}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Sipariş notu" 
                        className="flex-1 text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-primary w-full"
                        value={item.note || ""}
                        onChange={(e) => updateCartItem(item.id, { note: e.target.value })}
                      />
                      <button 
                        onClick={() => updateCartItem(item.id, { isComplimentary: !item.isComplimentary })}
                        className={`text-[11px] font-bold px-2 py-1.5 rounded transition-colors ${item.isComplimentary ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        İkram
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {existingItems.length === 0 && cart.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Adisyon bos
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 font-medium">Toplam</span>
            <span className="text-2xl font-bold text-slate-800">
              {(Number(orderData?.order.total || 0) + cart.reduce((acc, item) => {
                if (item.isComplimentary) return acc;
                let currentPrice = item.product.price;
                if (item.portion !== "TAM") {
                  const specificPortion = item.product.portions?.find(p => p.portion === item.portion);
                  if (specificPortion) currentPrice = specificPortion.price;
                }
                return acc + (currentPrice * item.quantity);
              }, 0)).toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <button
            onClick={() => submitOrderMutation.mutate()}
            disabled={cart.length === 0 || submitOrderMutation.isPending}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send size={20} />
            {submitOrderMutation.isPending ? "Gonderiliyor..." : "Mutfaga Gonder"}
          </button>
        </div>
      </div>
    </div>
  );
}
