import { dateRange, sumBy } from "../../domain/reports/report-rules.js";
import type { ReportRepository } from "../../interfaces/report-repository.js";

export class ReportBusinessError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export class ReportUseCases {
  constructor(private readonly repository: ReportRepository) {}

  async aggregateDailyReport(date: string, generatedById: string) {
    let range: { start: Date; end: Date };
    try {
      range = dateRange(date);
    } catch {
      throw new ReportBusinessError("INVALID_DATE", "Tarih geçersiz.");
    }
    const payments = await this.repository.findCompletedPayments(range.start, range.end);
    const paidOrderIds = [...new Set(payments.map((payment) => payment.orderId))];
    const items = await this.repository.findPaidOrderItems(paidOrderIds);
    const zero = this.repository.zero();
    const cashRevenue = sumBy(payments.filter((payment) => payment.method === "CASH").map((payment) => payment.amount), zero);
    const cardRevenue = sumBy(payments.filter((payment) => payment.method === "CARD").map((payment) => payment.amount), zero);
    const otherRevenue = sumBy(payments.filter((payment) => payment.method === "OTHER").map((payment) => payment.amount), zero);
    const totalRevenue = sumBy(payments.map((payment) => payment.amount), zero);
    const complimentaryTotal = sumBy(items.filter((item) => item.isComplimentary).map((item) => item.lineTotal), zero);

    const productMap = new Map<string, {
      productId: string;
      name: string;
      type: string;
      quantity: typeof zero;
      listedTotal: typeof zero;
      complimentaryTotal: typeof zero;
    }>();
    for (const item of items) {
      const existing = productMap.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.name,
        type: item.product.type,
        quantity: zero,
        listedTotal: zero,
        complimentaryTotal: zero
      };
      existing.quantity = existing.quantity.add(item.quantity);
      existing.listedTotal = existing.listedTotal.add(item.lineTotal);
      if (item.isComplimentary) existing.complimentaryTotal = existing.complimentaryTotal.add(item.lineTotal);
      productMap.set(item.productId, existing);
    }
    const topProducts = [...productMap.values()].sort((a, b) => b.quantity.comparedTo(a.quantity)).slice(0, 100);
    const report = await this.repository.upsertDailyReport({
      reportDate: range.start,
      generatedById,
      totalRevenue,
      cashRevenue,
      cardRevenue,
      otherRevenue,
      complimentaryTotal,
      orderCount: paidOrderIds.length
    });
    return { report, topProducts };
  }
}
