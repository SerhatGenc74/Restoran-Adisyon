import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { Calendar, Search, FileText, Banknote, CreditCard, Gift, TrendingUp, Printer } from "lucide-react";
import { toast } from "sonner";

export function ReportsTab() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0] || "");

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["daily-report", selectedDate],
    queryFn: async () => {
      try {
        const res = await api.get(`/reports/daily?date=${selectedDate}`);
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/reports/daily?date=${selectedDate}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-report", selectedDate] });
      toast.success("Rapor başarıyla oluşturuldu.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Rapor oluşturulamadı.");
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-primary" /> Z Raporu & Analiz
          </h2>
          <p className="text-slate-500 text-sm mt-1">Seçilen günün tüm satış, tahsilat ve mutfak analizleri</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split("T")[0] || ""}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-700 font-medium"
            />
          </div>
          {reportData?.report && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors print:hidden"
            >
              <Printer size={18} /> Yazdır
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">Rapor yükleniyor...</div>
      ) : !reportData?.report ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <Search size={48} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">{selectedDate} Tarihli Rapor Bulunamadı</h3>
          <p className="text-slate-500 mb-6 max-w-md">
            Bu tarihe ait bir gün sonu raporu henüz oluşturulmamış veya o gün sistemde hiç işlem yapılmamış olabilir.
          </p>
          <button
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generateReportMutation.isPending ? "Oluşturuluyor..." : "Bu Tarih İçin Rapor Oluştur"}
          </button>
        </div>
      ) : (
        <div className="space-y-6 print-container">
          {/* Ciro Özeti */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 font-medium mb-2">
                <TrendingUp size={18} /> Toplam Ciro
              </div>
              <div className="text-3xl font-black text-slate-800">₺{Number(reportData.report.totalRevenue).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-600 font-medium mb-2">
                <Banknote size={18} /> Nakit Tahsilat
              </div>
              <div className="text-3xl font-black text-emerald-700">₺{Number(reportData.report.cashRevenue).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-blue-600 font-medium mb-2">
                <CreditCard size={18} /> Kart Tahsilat
              </div>
              <div className="text-3xl font-black text-blue-700">₺{Number(reportData.report.cardRevenue).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-orange-600 font-medium mb-2">
                <Gift size={18} /> İkramlar
              </div>
              <div className="text-3xl font-black text-orange-700">₺{Number(reportData.report.complimentaryTotal).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sol Kolon: Performans ve Satış */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">En Çok Satan Ürünler</h3>
                {reportData.topProducts && reportData.topProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 text-sm">
                          <th className="pb-3 font-medium">Sıra</th>
                          <th className="pb-3 font-medium">Ürün Adı</th>
                          <th className="pb-3 font-medium text-right">Satış Adedi</th>
                          <th className="pb-3 font-medium text-right">Toplam Ciro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topProducts.map((p: any, idx: number) => (
                          <tr key={p.productId} className="border-t border-slate-100">
                            <td className="py-3 font-bold text-slate-400">#{idx + 1}</td>
                            <td className="py-3 font-medium text-slate-700">{p.name}</td>
                            <td className="py-3 text-right font-medium">{p.quantity}</td>
                            <td className="py-3 text-right font-bold text-primary">₺{Number(p.listedTotal).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Satış verisi bulunmuyor.</p>
                )}
              </div>
              
              {/* İkram Edilen Ürünler Tablosu (Varsa) */}
              {reportData.topProducts && reportData.topProducts.some((p: any) => p.complimentaryQuantity && p.complimentaryQuantity > 0) && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">İkram Analizi</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 text-sm">
                          <th className="pb-3 font-medium">Ürün Adı</th>
                          <th className="pb-3 font-medium text-right">İkram Adedi</th>
                          <th className="pb-3 font-medium text-right">Kayıp Ciro (Değeri)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topProducts.filter((p: any) => p.complimentaryQuantity > 0).map((p: any) => (
                          <tr key={`comp-${p.productId}`} className="border-t border-slate-100">
                            <td className="py-3 font-medium text-slate-700">{p.name}</td>
                            <td className="py-3 text-right font-medium text-orange-600">{p.complimentaryQuantity}</td>
                            <td className="py-3 text-right font-bold text-orange-600">₺{Number(p.complimentaryTotal || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Sağ Kolon: Genel İstatistikler */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Adisyon İstatistikleri</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Kapanan Adisyon</span>
                    <span className="font-bold text-lg">{reportData.report.orderCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Ort. Adisyon Tutarı</span>
                    <span className="font-bold text-lg">
                      ₺{reportData.report.orderCount > 0 
                        ? (Number(reportData.report.totalRevenue) / reportData.report.orderCount).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) 
                        : "0,00"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 p-6 rounded-2xl text-white shadow-sm">
                <h3 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2">Özet Bilgi</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  Bu rapor, <strong className="text-white">{selectedDate}</strong> tarihinde gece yarısına kadar yapılan tüm ödemeleri ve mutfakta hazırlanan tüm siparişleri kapsar. 
                </p>
                <div className="text-xs text-slate-400">
                  Oluşturulma: {new Date(reportData.report.createdAt).toLocaleString("tr-TR")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
