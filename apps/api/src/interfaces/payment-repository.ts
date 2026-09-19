import type { DecimalValue } from "../domain/shared/decimal.js";

export interface PaymentOrder {
  id: string;
  status: string;
  total: DecimalValue;
  tableId: string | null;
  payments: Array<{ amount: DecimalValue }>;
}

export interface PaymentTransaction {
  zero(): DecimalValue;
  decimal(value: number | string): DecimalValue;
  findOrderForPayment(orderId: string): Promise<PaymentOrder | null>;
  createPayment(data: {
    orderId: string;
    receivedById: string;
    method: string;
    amount: DecimalValue;
    transactionRef?: string;
    note?: string;
  }): Promise<unknown>;
  markOrderPaid(orderId: string): Promise<unknown>;
  markOrderOpen(orderId: string): Promise<unknown>;
  releaseTable(tableId: string): Promise<void>;
  occupyTable(tableId: string): Promise<void>;
  getOrder(id: string): Promise<unknown | null>;
  findPayment(paymentId: string): Promise<{ id: string; amount: DecimalValue; orderId: string; status: string } | null>;
  refundPayment(paymentId: string, data: { refundedById: string, note?: string }): Promise<unknown>;
}

export interface PaymentRepository {
  transaction<T>(work: (transaction: PaymentTransaction) => Promise<T>): Promise<T>;
  listOrderPayments(orderId: string): Promise<unknown[]>;
  orderExists(orderId: string): Promise<boolean>;
}
