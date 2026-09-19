import type { DecimalValue } from "../domain/shared/decimal.js";

export interface ReportPayment {
  amount: DecimalValue;
  method: "CASH" | "CARD" | "OTHER";
  orderId: string;
}

export interface ReportItem {
  productId: string;
  quantity: DecimalValue;
  lineTotal: DecimalValue;
  isComplimentary: boolean;
  product: { name: string; type: string };
}

export interface DailyReportValues {
  reportDate: Date;
  generatedById: string;
  totalRevenue: DecimalValue;
  cashRevenue: DecimalValue;
  cardRevenue: DecimalValue;
  otherRevenue: DecimalValue;
  complimentaryTotal: DecimalValue;
  orderCount: number;
}

export interface ReportRepository {
  zero(): DecimalValue;
  findCompletedPayments(start: Date, end: Date): Promise<ReportPayment[]>;
  findPaidOrderItems(orderIds: string[]): Promise<ReportItem[]>;
  upsertDailyReport(values: DailyReportValues): Promise<unknown>;
}
