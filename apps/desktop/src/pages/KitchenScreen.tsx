import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";
import { toast } from "sonner";
import { LogOut, ChefHat, Check, Clock } from "lucide-react";
import type { Order, OrderItem } from "../types/index.js";

function fetchKitchenOrders(): Promise<{ orders: Order[] }> {
  return api.get("/orders/kitchen").then((res) => res.data);
}

export function KitchenScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: fetchKitchenOrders,
    refetchInterval: 10000
  });

  useEffect(() => {
    // Setup WebSocket connection
    const defaultWsUrl = import.meta.env.VITE_API_URL?.startsWith("/") 
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}${import.meta.env.VITE_API_URL}/ws/kitchen`
      : "ws://localhost:3000/ws/kitchen";

    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;
    
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "KITCHEN_UPDATE") {
            queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
            toast.info("Mutfak siparisleri guncellendi.");
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, itemId, status }: { orderId: string; itemId: string; status: string }) => {
      await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    }
    });

  const orders = data?.orders || [];

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100">
      <header className="bg-slate-800 shadow-sm px-6 py-4 flex justify-between items-center z-10 border-b border-slate-700">
        <div className="flex items-center gap-3 text-primary">
          <ChefHat size={28} />
          <h1 className="text-xl font-bold text-white">Mutfak Ekrani</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-300">{user?.displayName} (Mutfak)</span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Cikis</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">Yukleniyor...</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <ChefHat size={64} className="mb-4 opacity-20" />
            <p className="text-xl">Bekleyen siparis yok.</p>
          </div>
        ) : (
          <div className="flex gap-6 h-full items-start">
            {orders.map((order) => (
              <div key={order.id} className="bg-slate-800 border border-slate-700 rounded-xl w-80 shrink-0 flex flex-col overflow-hidden max-h-full shadow-lg">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {(order as any).table?.name || "Paket Siparis"}
                    </h2>
                    <span className="text-sm text-slate-400">Adisyon #{order.orderNumber}</span>
                  </div>
                  <div className="text-xs font-mono bg-slate-700 px-2 py-1 rounded text-slate-300">
                    {new Date((order as any).openedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {order.items.map((item) => (
                    <OrderItemCard 
                      key={item.id} 
                      item={item} 
                      onUpdate={(status) => updateStatusMutation.mutate({ orderId: order.id, itemId: item.id, status })}
                      isUpdating={updateStatusMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OrderItemCard({ item, onUpdate, isUpdating }: { item: OrderItem; onUpdate: (s: string) => void, isUpdating: boolean }) {
  if (item.status === "READY" || item.status === "SERVED" || item.status === "CANCELLED") return null;

  const isPending = item.status === "PENDING";
  const isPreparing = item.status === "PREPARING";

  return (
    <div className={`p-4 rounded-lg border-l-4 shadow-sm ${
      isPending ? "bg-slate-700 border-red-500" : "bg-slate-700 border-yellow-500"
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="font-bold text-white text-lg leading-tight">
          {item.quantity}x {item.product?.name}
        </div>
      </div>
      
      {item.note && (
        <div className="text-sm text-amber-200 bg-amber-900/30 p-2 rounded mb-3 border border-amber-900/50">
          <span className="font-bold">Not:</span> {item.note}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {isPending && (
          <button
            onClick={() => onUpdate("PREPARING")}
            disabled={isUpdating}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Clock size={18} /> Hazirla
          </button>
        )}
        
        {isPreparing && (
          <button
            onClick={() => onUpdate("READY")}
            disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Check size={18} /> Hazir
          </button>
        )}
      </div>
    </div>
  );
}
