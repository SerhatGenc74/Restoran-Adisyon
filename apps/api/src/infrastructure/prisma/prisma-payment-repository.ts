import { Prisma, PrismaClient } from "@prisma/client";
import type { DecimalValue } from "../../domain/shared/decimal.js";
import type { PaymentRepository, PaymentTransaction } from "../../interfaces/payment-repository.js";
import { mapOrder, mapPayment } from "./mappers/domain-mappers.js";

type Database = PrismaClient | Prisma.TransactionClient;

function decimal(value: DecimalValue) {
  return value as unknown as Prisma.Decimal;
}

function applicationDecimal(value: Prisma.Decimal): DecimalValue {
  return value as unknown as DecimalValue;
}

export class PrismaPaymentRepository implements PaymentRepository, PaymentTransaction {
  constructor(private readonly db: Database) {}

  zero() {
    return new Prisma.Decimal(0) as unknown as DecimalValue;
  }

  decimal(value: number | string) {
    return new Prisma.Decimal(value) as unknown as DecimalValue;
  }

  async transaction<T>(work: (transaction: PaymentTransaction) => Promise<T>) {
    const client = this.db as PrismaClient;
    return client.$transaction(
      async (tx) => work(new PrismaPaymentRepository(tx)),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async findOrderForPayment(orderId: string) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { status: "COMPLETED" },
          select: {
            id: true,
            orderId: true,
            receivedById: true,
            method: true,
            amount: true,
            transactionRef: true,
            note: true,
            status: true
          }
        }
      }
    });
    if (!order) return null;
    const domainOrder = mapOrder(order);
    return {
      id: domainOrder.id,
      status: domainOrder.status,
      total: domainOrder.total,
      tableId: domainOrder.tableId,
      payments: domainOrder.payments.map((payment) => ({ amount: payment.amount }))
    };
  }

  async createPayment(data: {
    orderId: string;
    receivedById: string;
    method: string;
    amount: DecimalValue;
    transactionRef?: string;
    note?: string;
  }) {
    return this.db.payment.create({
      data: {
        orderId: data.orderId,
        receivedById: data.receivedById,
        method: data.method as "CASH" | "CARD" | "OTHER",
        amount: decimal(data.amount),
        transactionRef: data.transactionRef,
        note: data.note
      }
    });
  }

  async markOrderPaid(orderId: string) {
    return this.db.order.update({
      where: { id: orderId },
      data: { status: "PAID", closedAt: new Date() },
      include: { payments: true, table: true }
    });
  }

  async releaseTable(tableId: string) {
    await this.db.diningTable.update({ where: { id: tableId }, data: { status: "AVAILABLE" } });
  }

  async getOrder(id: string) {
    return this.db.order.findUnique({
      where: { id },
      include: { payments: true, table: true }
    });
  }

  async listOrderPayments(orderId: string) {
    return this.db.payment.findMany({ where: { orderId }, orderBy: { paidAt: "asc" } });
  }

  async orderExists(orderId: string) {
    return Boolean(await this.db.order.findUnique({ where: { id: orderId }, select: { id: true } }));
  }

  async markOrderOpen(orderId: string) {
    return this.db.order.update({
      where: { id: orderId },
      data: { status: "OPEN", closedAt: null },
      include: { payments: true, table: true }
    });
  }

  async occupyTable(tableId: string) {
    await this.db.diningTable.update({ where: { id: tableId }, data: { status: "OCCUPIED" } });
  }

  async findPayment(paymentId: string) {
    const payment = await this.db.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return null;
    return {
      id: payment.id,
      amount: applicationDecimal(payment.amount),
      orderId: payment.orderId,
      status: payment.status
    };
  }

  async refundPayment(paymentId: string, data: { refundedById: string, note?: string }) {
    return this.db.payment.update({
      where: { id: paymentId },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        isRefund: true, // We'll just mark the existing payment as refunded
        note: data.note
      }
    });
  }
}
