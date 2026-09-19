import { remainingBalance, sumAmounts } from "../../domain/payments/payment-rules.js";
import { Payment } from "../../domain/payments/payment.js";
import { Order } from "../../domain/orders/order.js";
import { DomainError } from "../../domain/shared/domain-error.js";
import type { PaymentRepository } from "../../interfaces/payment-repository.js";

export interface PaymentInput {
  method: "CASH" | "CARD" | "OTHER";
  amount: number;
  transactionRef?: string;
  note?: string;
}

export class PaymentBusinessError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export class PaymentUseCases {
  constructor(private readonly repository: PaymentRepository) {}

  async completePayment(orderId: string, input: PaymentInput, receivedById: string) {
    return this.repository.transaction(async (tx) => {
      const order = await tx.findOrderForPayment(orderId);
      if (!order) throw new PaymentBusinessError("ORDER_NOT_FOUND", "Adisyon bulunamadı.");
      if (order.status === "CANCELLED") throw new PaymentBusinessError("ORDER_CLOSED", "İptal edilmiş adisyona ödeme alınamaz.");
      if (order.status === "PAID") throw new PaymentBusinessError("ORDER_ALREADY_PAID", "Adisyon zaten tamamen ödendi.");

      const amount = tx.decimal(input.amount.toString());
      let payment: Payment;
      try {
        payment = Payment.create({
          id: "new",
          orderId,
          receivedById,
          method: input.method,
          amount,
          transactionRef: input.transactionRef,
          note: input.note
        });
      } catch (error) {
        throw this.toPaymentError(error);
      }
      const paidPayments = order.payments.map((existing, index) =>
        Payment.create({
          id: `existing-${index}`,
          orderId,
          receivedById: "",
          method: "OTHER",
          amount: existing.amount
        })
      );
      const domainOrder = new Order({
        id: order.id,
        tableId: order.tableId,
        status: order.status as "OPEN" | "IN_PREPARATION" | "READY" | "SERVED" | "PAID" | "CANCELLED",
        total: order.total,
        payments: paidPayments
      });
      const paid = sumAmounts(order.payments.map((existing) => existing.amount), tx.zero());
      const remaining = remainingBalance(order.total, paid);
      try {
        domainOrder.receivePayment(payment);
      } catch (error) {
        throw this.toPaymentError(error);
      }

      const persistedPayment = await tx.createPayment({
        orderId,
        receivedById,
        method: input.method,
        amount: payment.amount,
        transactionRef: input.transactionRef,
        note: input.note
      });
      const newPaid = domainOrder.paidTotal;
      const fullyPaid = domainOrder.status === "PAID";
      const updatedOrder = fullyPaid ? await tx.markOrderPaid(orderId) : await tx.getOrder(orderId);
      if (fullyPaid && order.tableId) await tx.releaseTable(order.tableId);
      return { payment: persistedPayment, order: updatedOrder, remaining: remainingBalance(order.total, newPaid) };
    });
  }

  async listOrderPayments(orderId: string) {
    if (!(await this.repository.orderExists(orderId))) {
      throw new PaymentBusinessError("ORDER_NOT_FOUND", "Adisyon bulunamadı.");
    }
    return this.repository.listOrderPayments(orderId);
  }

  async refundPayment(paymentId: string, refundedById: string, note?: string) {
    return this.repository.transaction(async (tx) => {
      const payment = await tx.findPayment(paymentId);
      if (!payment) throw new PaymentBusinessError("PAYMENT_NOT_FOUND", "Ödeme bulunamadı.");
      if (payment.status === "REFUNDED") throw new PaymentBusinessError("ALREADY_REFUNDED", "Bu ödeme zaten iade edilmiş.");

      const orderId = payment.orderId;
      const order = await tx.findOrderForPayment(orderId);
      if (!order) throw new PaymentBusinessError("ORDER_NOT_FOUND", "Adisyon bulunamadı.");

      await tx.refundPayment(paymentId, { refundedById, note });
      
      // If order was PAID, it should be changed back to OPEN since the balance is no longer 0
      if (order.status === "PAID") {
        await tx.markOrderOpen(orderId);
        if (order.tableId) {
          await tx.occupyTable(order.tableId);
        }
      }

      return tx.getOrder(orderId);
    });
  }

  private toPaymentError(error: unknown): PaymentBusinessError {
    if (error instanceof DomainError) return new PaymentBusinessError(error.code, error.message);
    if (error instanceof PaymentBusinessError) return error;
    return new PaymentBusinessError("INVALID_AMOUNT", "Ödeme tutarı geçersiz.");
  }
}
