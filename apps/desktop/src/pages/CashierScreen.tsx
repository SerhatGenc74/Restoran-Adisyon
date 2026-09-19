import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";
import { toast } from "sonner";
import { LogOut, Calculator, Banknote, CreditCard } from "lucide-react";
import type { Table, Order } from "../types/index.js";

function fetchTables(): Promise<{ tables: Table[] }> {
  return api.get("/tables").then((res) => res.data);
}

function fetchOrder(id: string): Promise<{ order: Order }> {
  return api.get(`/orders/${id}`).then((res) => res.data);
}

export function CashierScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tableData, isLoading: tablesLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: fetchTables,
    refetchInterval: 5000
  });

  const occupiedTables = tableData?.tables.filter(
    (t) => (t.status === "OCCUPIED" && t.orders && t.orders.length > 0) && t.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-800 shadow-sm px-6 py-4 flex justify-between items-center z-10 border-b border-slate-700">
        <div className="flex items-center gap-3 text-primary">
          <Calculator size={28} />
          <h1 className="text-xl font-bold text-white">Kasa Ekrani</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-300">{user?.displayName} (Kasa)</span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Cikis</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Occupied Tables */}
        <div className="flex-1 flex flex-col border-r border-slate-200">
          <div className="p-4 bg-white border-b border-slate-200">
            <input 
              type="text"
              placeholder="Masa ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 align-content-start">
            {tablesLoading ? (
              <div className="col-span-full flex justify-center text-slate-500">Yükleniyor...</div>
            ) : (
              occupiedTables.map((table) => {
                  const isSelected = selectedTable?.id === table.id;
                  return (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      className={`
                        flex flex-col items-center justify-center p-6 rounded-2xl shadow-sm border-2 transition-all h-32
                        ${isSelected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                        }
                      `}
                    >
                      <span className="text-2xl font-bold mb-2">{table.name}</span>
                      <span className="text-xs font-bold text-slate-500">
                        {Number(table.orders?.[0]?.total || 0).toLocaleString("tr-TR")} ₺
                      </span>
                    </button>
                  );
                })
            )}
            {occupiedTables.length === 0 && !tablesLoading && (
              <div className="col-span-full flex flex-col items-center justify-center text-slate-500 h-64">
                <Calculator size={48} className="mb-4 opacity-20" />
                <p>Aranan kriterde açık masa bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment Details */}
        <div className="w-[450px] bg-white flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
          {selectedTable ? (
            <PaymentView table={selectedTable} onPaymentComplete={() => setSelectedTable(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <p>Odeme almak icin sol taraftan masa secin.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PaymentView({ table, onPaymentComplete }: { table: Table; onPaymentComplete: () => void }) {
  const queryClient = useQueryClient();
  const activeOrderId = table.orders?.[0]?.id;
  const [partialAmount, setPartialAmount] = useState<string>("");

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["orders", activeOrderId],
    queryFn: () => fetchOrder(activeOrderId!),
    enabled: !!activeOrderId,
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ method, amount }: { method: "CASH" | "CARD", amount: number }) => {
      await api.post(`/orders/${activeOrderId}/pay`, {
        method,
        amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders", activeOrderId] });
      toast.success("Odeme alindi!");
    }
    });

  const total = orderData ? Number(orderData.order.total) : 0;
  const paid = orderData?.order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
  const remaining = total - paid;

  // If order is paid somehow, close this view
  useEffect(() => {
    if (orderData && remaining <= 0) {
      const timer = setTimeout(onPaymentComplete, 100);
      return () => clearTimeout(timer);
    }
  }, [orderData, remaining, onPaymentComplete]);

  if (isLoading || !orderData) {
    return <div className="flex-1 flex justify-center p-8 text-slate-500">Adisyon yukleniyor...</div>;
  }

  const order = orderData.order;

  const handlePayment = (method: "CASH" | "CARD") => {
    const amount = partialAmount ? Number(partialAmount) : remaining;
    if (amount > 0 && amount <= remaining) {
      paymentMutation.mutate({ method, amount }, {
        onSuccess: () => setPartialAmount("")
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-xl font-bold">{table.name} Tahsilat</h2>
          <span className="text-sm text-slate-500">Adisyon #{order.orderNumber}</span>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500 font-medium">Toplam Tutar</div>
          <div className="text-xl font-bold text-slate-800">{total.toLocaleString("tr-TR")} ₺</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Adisyon Detayi</h3>
        <div className="space-y-3 mb-8">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
              <div>
                {item.status === "CANCELLED" && <span className="mr-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">İPTAL</span>}
                <span className="font-medium mr-2">{item.quantity}x</span>
                <span className={item.status === "CANCELLED" ? "line-through text-slate-400" : ""}>{item.product?.name}</span>
                {item.isComplimentary && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">İKRAM</span>}
                {item.note && <div className="text-xs text-slate-400 mt-0.5 italic">Not: {item.note}</div>}
              </div>
              <div className={`font-medium ${item.isComplimentary || item.status === "CANCELLED" ? 'line-through text-slate-400' : ''}`}>{Number(item.lineTotal).toLocaleString("tr-TR")} ₺</div>
            </div>
          ))}
        </div>

        {order.payments && order.payments.length > 0 && (
          <>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Alinan Odemeler</h3>
            <div className="space-y-2 mb-8">
              {order.payments.map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-green-50 text-green-700 px-3 py-2 rounded">
                  <span className="text-sm font-bold">{p.method === "CASH" ? "Nakit" : p.method === "CARD" ? "Kredi Karti" : p.method}</span>
                  <span className="font-bold">{Number(p.amount).toLocaleString("tr-TR")} ₺</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-6 border-t border-slate-200 bg-white shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-6">
          <span className="text-slate-500 font-medium text-lg">Kalan Bakiye</span>
          <span className="text-3xl font-bold text-primary">
            {remaining.toLocaleString("tr-TR")} ₺
          </span>
        </div>

        <div className="flex flex-col gap-4 mb-4">
          <label className="text-sm font-bold text-slate-500">Kısmi Ödeme (Opsiyonel)</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              id={`partial-amount-${activeOrderId}`}
              placeholder={`Örn: ${remaining}`}
              className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800"
              max={remaining}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handlePayment("CASH")}
            disabled={paymentMutation.isPending || remaining <= 0}
            className="flex flex-col items-center justify-center p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors disabled:opacity-50 gap-2"
          >
            <Banknote size={24} />
            <span className="font-bold">Nakit</span>
          </button>
          
          <button
            onClick={() => handlePayment("CARD")}
            disabled={paymentMutation.isPending || remaining <= 0}
            className="flex flex-col items-center justify-center p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50 gap-2"
          >
            <CreditCard size={24} />
            <span className="font-bold">Kredi Karti</span>
          </button>
        </div>
      </div>
    </div>
  );
}
