import { DiningTable, type DiningTableStatus } from "../../../domain/tables/dining-table.js";
import { OrderItem, type OrderItemStatus } from "../../../domain/orders/order-item.js";
import { Order, type OrderStatus } from "../../../domain/orders/order.js";
import { Payment, type PaymentMethod, type PaymentStatus } from "../../../domain/payments/payment.js";
import type { DecimalValue } from "../../../domain/shared/decimal.js";

function applicationDecimal(value: unknown): DecimalValue {
  return value as DecimalValue;
}

export function mapDiningTable(record: {
  id: string;
  name: string;
  capacity: number | null;
  status: string;
  isActive: boolean;
}) {
  return new DiningTable({
    id: record.id,
    name: record.name,
    capacity: record.capacity,
    status: record.status as DiningTableStatus,
    isActive: record.isActive
  });
}

export interface PrismaOrderItemRecord {
  id: string;
  productId: string;
  quantity: unknown;
  portion: number;
  unitPrice: unknown;
  lineTotal: unknown;
  status: string;
  isComplimentary: boolean;
  complimentaryReason: string | null;
  note: string | null;
}

export function mapOrderItem(record: PrismaOrderItemRecord) {
  return OrderItem.restore({
    id: record.id,
    productId: record.productId,
    quantity: applicationDecimal(record.quantity),
    portion: String(record.portion),
    unitPrice: applicationDecimal(record.unitPrice),
    lineTotal: applicationDecimal(record.lineTotal),
    status: record.status as OrderItemStatus,
    isComplimentary: record.isComplimentary,
    complimentaryReason: record.complimentaryReason,
    note: record.note
  });
}

export interface PrismaPaymentRecord {
  id: string;
  orderId: string;
  receivedById: string;
  method: string;
  amount: unknown;
  transactionRef: string | null;
  note: string | null;
  status: string;
}

export function mapPayment(record: PrismaPaymentRecord) {
  return Payment.restore({
    id: record.id,
    orderId: record.orderId,
    receivedById: record.receivedById,
    method: record.method as PaymentMethod,
    amount: applicationDecimal(record.amount),
    transactionRef: record.transactionRef,
    note: record.note,
    status: record.status as PaymentStatus
  });
}

export interface PrismaOrderRecord {
  id: string;
  tableId: string | null;
  status: string;
  subtotal: unknown;
  complimentaryTotal: unknown;
  discountTotal: unknown;
  total: unknown;
  items?: PrismaOrderItemRecord[];
  payments?: PrismaPaymentRecord[];
}

export function mapOrder(record: PrismaOrderRecord) {
  return Order.restore({
    id: record.id,
    tableId: record.tableId,
    status: record.status as OrderStatus,
    subtotal: applicationDecimal(record.subtotal),
    complimentaryTotal: applicationDecimal(record.complimentaryTotal),
    discountTotal: applicationDecimal(record.discountTotal),
    total: applicationDecimal(record.total),
    items: record.items?.map(mapOrderItem),
    payments: record.payments?.map(mapPayment)
  });
}
