import type { DecimalValue } from "../domain/shared/decimal.js";
import type { OrderItemStatus } from "../domain/orders/order-rules.js";

export interface OrderState {
  id: string;
  status: string;
}

export interface OrderItemState {
  id: string;
  status: OrderItemStatus;
  unitPrice: DecimalValue;
  productId?: string;
  quantity?: DecimalValue;
  portion?: string;
  lineTotal?: DecimalValue;
  isComplimentary?: boolean;
  complimentaryReason?: string | null;
  note?: string | null;
}

export interface NewOrderItem {
  productId: string;
  quantity: DecimalValue;
  portion: string;
  unitPrice: DecimalValue;
  lineTotal: DecimalValue;
  isComplimentary: boolean;
  complimentaryReason?: string | null;
  note?: string | null;
}

export interface OrderTotals {
  subtotal: DecimalValue;
  complimentaryTotal: DecimalValue;
  discountTotal: DecimalValue;
  total: DecimalValue;
}

export interface OrderTransaction {
  zero(): DecimalValue;
  decimal(value: number | string): DecimalValue;
  findTable(id: string): Promise<{ isActive: boolean; status: string } | null>;
  findActiveOrderForTable(tableId: string): Promise<OrderState | null>;
  findProducts(ids: string[]): Promise<Array<{ id: string; price: DecimalValue; portions: Array<{ portion: string; price: DecimalValue }> }>>;
  createOrder(data: {
    tableId?: string;
    note?: string;
    createdById: string;
    totals: OrderTotals;
    items: Array<NewOrderItem & { addedById: string }>;
  }): Promise<unknown>;
  findOrderState(id: string): Promise<OrderState | null>;
  findOrderItem(orderId: string, itemId: string): Promise<OrderItemState | null>;
  createOrderItem(orderId: string, data: NewOrderItem & { addedById: string }): Promise<void>;
  updateOrderItem(orderId: string, itemId: string, data: Partial<NewOrderItem> & { status?: OrderItemStatus; complimentaryReason?: string | null; note?: string | null }): Promise<void>;
  cancelOrderItem(orderId: string, itemId: string): Promise<void>;
  createKitchenEvent(data: {
    orderId: string;
    orderItemId: string;
    fromStatus: OrderItemStatus;
    toStatus: OrderItemStatus;
    changedById: string;
  }): Promise<void>;
  listOrderItems(orderId: string): Promise<Array<{ status: OrderItemStatus; lineTotal: DecimalValue; isComplimentary: boolean }>>;
  updateOrderTotals(orderId: string, totals: OrderTotals): Promise<void>;
  updateOrderStatus(orderId: string, status: "OPEN" | "IN_PREPARATION" | "READY" | "SERVED" | "CANCELLED"): Promise<void>;
  markTableOccupied(tableId: string): Promise<void>;
  markTableAvailable(tableId: string): Promise<void>;
  moveOrderToTable(orderId: string, newTableId: string): Promise<void>;
  moveOrderItems(sourceOrderId: string, targetOrderId: string, itemIds?: string[]): Promise<void>;
  deleteOrder(orderId: string): Promise<void>;
  getOrder(id: string): Promise<unknown | null>;
}

export interface OrderDto {
  id: string;
  tableId: string | null;
  orderNumber: number;
  status: string;
  total: DecimalValue;
  subtotal: DecimalValue;
  discountTotal: DecimalValue;
  complimentaryTotal: DecimalValue;
  openedAt: Date;
  closedAt: Date | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: DecimalValue;
    portion: string;
    unitPrice: DecimalValue;
    lineTotal: DecimalValue;
    status: string;
    isComplimentary: boolean;
    complimentaryReason: string | null;
    note: string | null;
    createdAt: Date;
    product?: { id: string; name: string };
  }>;
  payments?: Array<{
    id: string;
    method: string;
    amount: DecimalValue;
    paidAt: Date;
  }>;
  table?: { id: string; name: string } | null;
}

export interface OrderRepository {
  transaction<T>(work: (transaction: OrderTransaction) => Promise<T>, serializable?: boolean): Promise<T>;
  getOrder(id: string): Promise<OrderDto | null>;
  listOrders(filter?: { status?: string[] }, options?: { skip?: number; take?: number }): Promise<{ data: OrderDto[]; total: number }>;
  listKitchenOrders(options?: { skip?: number; take?: number }): Promise<{ data: OrderDto[]; total: number }>;
}
