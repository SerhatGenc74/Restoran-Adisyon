import type { Order } from "../../types/index.js";

interface ReceiptProps {
  order: Order;
  tableName: string;
}

export function Receipt({ order, tableName }: ReceiptProps) {
  const date = new Date().toLocaleString("tr-TR");

  return (
    <div className="receipt-print hidden">
      <div className="text-center font-bold text-xl mb-1">RESTORAN ADİSYON</div>
      <div className="text-center text-xs mb-2">Hoşgeldiniz</div>
      
      <div className="text-sm mb-1">Tarih: {date}</div>
      <div className="text-sm mb-1">Masa: {tableName}</div>
      <div className="text-sm mb-2">Adisyon No: #{order.orderNumber}</div>
      
      <div className="dashed-line"></div>
      
      <table className="w-full text-sm my-2">
        <thead>
          <tr className="text-left font-bold">
            <th className="pb-1 w-8">Ad.</th>
            <th className="pb-1">Ürün</th>
            <th className="pb-1 text-right">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => {
            if (item.status === "CANCELLED") return null;
            return (
              <tr key={idx}>
                <td className="py-1 align-top">{item.quantity}</td>
                <td className="py-1">
                  {item.product?.name}
                  {item.portion !== "TAM" && <div className="text-[10px]">* {item.portion}</div>}
                  {item.isComplimentary && <div className="text-[10px] uppercase">* İkram</div>}
                </td>
                <td className="py-1 text-right align-top">
                  {item.isComplimentary ? "0.00" : Number(item.lineTotal).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="dashed-line"></div>
      
      <div className="flex justify-between font-bold text-lg mt-2">
        <span>TOPLAM:</span>
        <span>{Number(order.total).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
      </div>

      {order.payments && order.payments.length > 0 && (
        <div className="mt-4">
          <div className="font-bold mb-1">Tahsilatlar:</div>
          {order.payments.map((p, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{p.method === "CASH" ? "NAKİT" : p.method === "CARD" ? "KREDİ KARTI" : p.method}</span>
              <span>{Number(p.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center text-xs italic">
        Bizi tercih ettiğiniz için teşekkür ederiz.
        <br />
        Afiyet Olsun!
      </div>
      <div className="h-8"></div> {/* Bottom spacing for cutter */}
    </div>
  );
}
