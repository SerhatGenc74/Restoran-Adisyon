import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { LogOut, LayoutDashboard, Utensils, Users, LayoutGrid, FileText } from "lucide-react";
import { useAuthStore } from "../store/auth.js";
import { useNavigate } from "react-router-dom";
import { ProductsTab } from "../components/patron/ProductsTab.js";
import { CategoriesTab } from "../components/patron/CategoriesTab.js";
import { UsersTab } from "../components/patron/UsersTab.js";
import { TablesTab } from "../components/patron/TablesTab.js";
import { ReportsTab } from "../components/patron/ReportsTab.js";

export function PatronScreen() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "categories" | "users" | "tables" | "reports">("dashboard");
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const tabs = [
    { id: "dashboard", label: "Özet Tablo", icon: LayoutDashboard },
    { id: "reports", label: "Günlük / Z Raporu", icon: FileText },
    { id: "products", label: "Ürün Yönetimi", icon: Utensils },
    { id: "categories", label: "Kategori Yönetimi", icon: LayoutGrid },
    { id: "users", label: "Kullanıcı Yönetimi", icon: Users },
    { id: "tables", label: "Masa Yönetimi", icon: LayoutGrid },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold">Patron Paneli</h1>
          <p className="text-slate-400 text-sm mt-1">Hoşgeldin, {user?.displayName}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "tables" && <TablesTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const queryClient = useQueryClient();
  const dateStr = new Date().toISOString().split("T")[0];

  const { data: report, isLoading } = useQuery({
    queryKey: ["daily-report", dateStr],
    queryFn: async () => {
      const res = await api.get(`/reports/daily?date=${dateStr}`);
      return res.data;
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/reports/daily?date=${dateStr}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-report", dateStr] });
    }
  });

  if (isLoading) return <div>Yükleniyor...</div>;

  const data = report?.report;
  
  if (!data) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
        <h2 className="text-2xl font-bold mb-4">Bugün Henüz Rapor Oluşturulmamış</h2>
        <p className="text-slate-500 mb-6">Satış verilerini görmek için gün sonu raporu (Z raporu) almanız veya gün içinde rapor oluşturmanız gerekir.</p>
        <button 
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50"
          onClick={() => generateReportMutation.mutate()}
          disabled={generateReportMutation.isPending}
        >
          {generateReportMutation.isPending ? "Oluşturuluyor..." : "Şimdi Günlük Rapor Oluştur"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Günün Özeti ({data.reportDate.split("T")[0]})</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium mb-1">Toplam Ciro</h3>
          <p className="text-3xl font-bold">₺{Number(data.totalRevenue).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium mb-1">Nakit</h3>
          <p className="text-3xl font-bold text-green-600">₺{Number(data.cashRevenue).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium mb-1">Kredi Kartı</h3>
          <p className="text-3xl font-bold text-blue-600">₺{Number(data.cardRevenue).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-slate-500 text-sm font-medium mb-1">İkram & İndirim</h3>
          <p className="text-3xl font-bold text-orange-500">₺{Number(data.complimentaryTotal).toFixed(2)}</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-4">Adisyon İstatistikleri</h3>
        <p className="text-slate-600">Toplam Kapanan Adisyon: <strong>{data.orderCount}</strong></p>
        {data.orderCount > 0 && (
          <p className="text-slate-600 mt-2">Ortalama Adisyon Tutarı: <strong>₺{(Number(data.totalRevenue) / data.orderCount).toFixed(2)}</strong></p>
        )}
      </div>

      {report?.topProducts && report.topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4">En Çok Satılan Ürünler</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="pb-3 font-medium">Ürün</th>
                  <th className="pb-3 font-medium text-right">Adet</th>
                  <th className="pb-3 font-medium text-right">Ciro</th>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.map((p: any) => (
                  <tr key={p.productId} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium">{p.name}</td>
                    <td className="py-3 text-right">{p.quantity}</td>
                    <td className="py-3 text-right font-bold text-primary">₺{Number(p.listedTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
