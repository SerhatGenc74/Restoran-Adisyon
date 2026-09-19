import { Prisma, PrismaClient } from "@prisma/client";
import type { DecimalValue } from "../../domain/shared/decimal.js";
import type { ReportRepository } from "../../interfaces/report-repository.js";

function applicationDecimal(value: Prisma.Decimal): DecimalValue {
  return value as unknown as DecimalValue;
}

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly db: PrismaClient) {}

  zero() {
    return new Prisma.Decimal(0) as unknown as DecimalValue;
  }

  async findCompletedPayments(start: Date, end: Date) {
    const payments = await this.db.payment.findMany({
      where: {
        paidAt: { gte: start, lt: end },
        status: "COMPLETED",
        order: { status: "PAID" }
      },
      select: { amount: true, method: true, orderId: true }
    });
    return payments.map((payment) => ({
      amount: applicationDecimal(payment.amount),
      method: payment.method,
      orderId: payment.orderId
    }));
  }

  async findPaidOrderItems(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    const items = await this.db.orderItem.findMany({
      where: { orderId: { in: orderIds }, status: { not: "CANCELLED" } },
      select: {
        productId: true,
        quantity: true,
        lineTotal: true,
        isComplimentary: true,
        product: { select: { name: true, type: true } }
      }
    });
    return items.map((item) => ({
      productId: item.productId,
      quantity: applicationDecimal(item.quantity),
      lineTotal: applicationDecimal(item.lineTotal),
      isComplimentary: item.isComplimentary,
      product: item.product
    }));
  }

  async upsertDailyReport(values: {
    reportDate: Date;
    generatedById: string;
    totalRevenue: DecimalValue;
    cashRevenue: DecimalValue;
    cardRevenue: DecimalValue;
    otherRevenue: DecimalValue;
    complimentaryTotal: DecimalValue;
    orderCount: number;
  }) {
    const data = {
      generatedById: values.generatedById,
      totalRevenue: values.totalRevenue as unknown as Prisma.Decimal,
      cashRevenue: values.cashRevenue as unknown as Prisma.Decimal,
      cardRevenue: values.cardRevenue as unknown as Prisma.Decimal,
      otherRevenue: values.otherRevenue as unknown as Prisma.Decimal,
      complimentaryTotal: values.complimentaryTotal as unknown as Prisma.Decimal,
      orderCount: values.orderCount
    };
    return this.db.dailyReport.upsert({
      where: { reportDate: values.reportDate },
      update: data,
      create: { reportDate: values.reportDate, ...data }
    });
  }
}
