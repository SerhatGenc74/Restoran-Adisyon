import { Prisma, PrismaClient } from "@prisma/client";
import type {
  NewOrderItem,
  OrderRepository,
  OrderDto,
  OrderTotals,
  OrderTransaction
} from "../../interfaces/order-repository.js";
import type { DecimalValue } from "../../domain/shared/decimal.js";
import { mapOrderItem } from "./mappers/domain-mappers.js";

const orderInclude = {
  table: true,
  items: {
    include: { product: true, kitchenEvents: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" as const }
  },
  payments: { orderBy: { paidAt: "asc" as const } },
  kitchenEvents: { orderBy: { createdAt: "asc" as const } }
} as const;

type Database = PrismaClient | Prisma.TransactionClient;

function decimal(value: DecimalValue): Prisma.Decimal {
  return value as unknown as Prisma.Decimal;
}

function applicationDecimal(value: Prisma.Decimal): DecimalValue {
  return value as unknown as DecimalValue;
}

export class PrismaOrderRepository implements OrderRepository, OrderTransaction {
  constructor(private readonly db: Database) {}

  zero() {
    return new Prisma.Decimal(0) as unknown as DecimalValue;
  }

  decimal(value: number | string) {
    return new Prisma.Decimal(value) as unknown as DecimalValue;
  }

  async transaction<T>(work: (transaction: OrderTransaction) => Promise<T>, serializable = false) {
    const client = this.db as PrismaClient;
    return client.$transaction(
      async (tx) => work(new PrismaOrderRepository(tx)),
      serializable ? { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } : undefined
    );
  }

  async findTable(id: string) {
    return this.db.diningTable.findUnique({ where: { id }, select: { isActive: true, status: true } });
  }

  async findActiveOrderForTable(tableId: string) {
    const order = await this.db.order.findFirst({
      where: { tableId, status: { in: ["OPEN", "IN_PREPARATION", "READY", "SERVED"] } },
      select: { id: true, status: true }
    });
    return order;
  }

  async findProducts(ids: string[]) {
    const products = await this.db.product.findMany({
      where: { id: { in: ids }, isActive: true, category: { isActive: true } },
      select: { id: true, price: true, portions: { select: { portion: true, price: true } } }
    });
    return products.map((product) => ({ 
      id: product.id, 
      price: applicationDecimal(product.price),
      portions: product.portions.map(p => ({ portion: p.portion, price: applicationDecimal(p.price) }))
    }));
  }

  async createOrder(data: {
    tableId?: string;
    note?: string;
    createdById: string;
    totals: OrderTotals;
    items: Array<NewOrderItem & { addedById: string }>;
  }) {
    return this.db.order.create({
      data: {
        tableId: data.tableId,
        note: data.note,
        createdById: data.createdById,
        subtotal: decimal(data.totals.subtotal),
        complimentaryTotal: decimal(data.totals.complimentaryTotal),
        discountTotal: decimal(data.totals.discountTotal),
        total: decimal(data.totals.total),
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            addedById: item.addedById,
            quantity: decimal(item.quantity),
            portion: item.portion,
            unitPrice: decimal(item.unitPrice),
            lineTotal: decimal(item.lineTotal),
            isComplimentary: item.isComplimentary,
            complimentaryReason: item.complimentaryReason,
            note: item.note
          }))
        }
      },
      include: orderInclude
    });
  }

  async findOrderState(id: string) {
    return this.db.order.findUnique({ where: { id }, select: { id: true, status: true } });
  }

  async findOrderItem(orderId: string, itemId: string) {
    const item = await this.db.orderItem.findFirst({
      where: { id: itemId, orderId },
      select: {
        id: true,
        productId: true,
        status: true,
        quantity: true,
        portion: true,
        unitPrice: true,
        lineTotal: true,
        isComplimentary: true,
        complimentaryReason: true,
        note: true
      }
    });
    if (!item) return null;
    const domainItem = mapOrderItem(item);
    const snapshot = domainItem.toSnapshot();
    return {
      id: snapshot.id,
      productId: snapshot.productId,
      status: snapshot.status,
      quantity: snapshot.quantity,
      portion: snapshot.portion,
      unitPrice: snapshot.unitPrice,
      lineTotal: snapshot.lineTotal,
      isComplimentary: snapshot.isComplimentary,
      complimentaryReason: snapshot.complimentaryReason,
      note: snapshot.note
    };
  }

  async createOrderItem(orderId: string, data: NewOrderItem & { addedById: string }) {
    await this.db.orderItem.create({
      data: {
        orderId,
        productId: data.productId,
        addedById: data.addedById,
        quantity: decimal(data.quantity),
        portion: data.portion,
        unitPrice: decimal(data.unitPrice),
        lineTotal: decimal(data.lineTotal),
        isComplimentary: data.isComplimentary,
        complimentaryReason: data.complimentaryReason,
        note: data.note
      }
    });
  }

  async updateOrderItem(_orderId: string, itemId: string, data: Partial<NewOrderItem> & { status?: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED"; complimentaryReason?: string | null; note?: string | null }) {
    await this.db.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: data.quantity ? decimal(data.quantity) : undefined,
        portion: data.portion,
        unitPrice: data.unitPrice ? decimal(data.unitPrice) : undefined,
        lineTotal: data.lineTotal ? decimal(data.lineTotal) : undefined,
        status: data.status,
        isComplimentary: data.isComplimentary,
        complimentaryReason: data.complimentaryReason,
        note: data.note
      }
    });
  }

  async cancelOrderItem(_orderId: string, itemId: string) {
    await this.db.orderItem.update({ where: { id: itemId }, data: { status: "CANCELLED" } });
  }

  async createKitchenEvent(data: {
    orderId: string;
    orderItemId: string;
    fromStatus: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
    toStatus: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
    changedById: string;
  }) {
    await this.db.kitchenEvent.create({ data });
  }

  async listOrderItems(orderId: string) {
    const items = await this.db.orderItem.findMany({
      where: { orderId },
      select: { status: true, lineTotal: true, isComplimentary: true }
    });
    return items.map((item) => ({
      status: item.status,
      lineTotal: applicationDecimal(item.lineTotal),
      isComplimentary: item.isComplimentary
    }));
  }

  async updateOrderTotals(orderId: string, totals: OrderTotals) {
    await this.db.order.update({
      where: { id: orderId },
      data: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, decimal(value)]))
    });
  }

  async updateOrderStatus(orderId: string, status: "OPEN" | "IN_PREPARATION" | "READY" | "SERVED" | "CANCELLED") {
    await this.db.order.update({ where: { id: orderId }, data: { status } });
  }

  async markTableOccupied(tableId: string) {
    await this.db.diningTable.update({ where: { id: tableId }, data: { status: "OCCUPIED" } });
  }

  async markTableAvailable(tableId: string) {
    await this.db.diningTable.update({ where: { id: tableId }, data: { status: "AVAILABLE" } });
  }

  async moveOrderToTable(orderId: string, newTableId: string) {
    await this.db.order.update({ where: { id: orderId }, data: { tableId: newTableId } });
  }

  async moveOrderItems(sourceOrderId: string, targetOrderId: string, itemIds?: string[]) {
    const whereClause = itemIds ? { orderId: sourceOrderId, id: { in: itemIds } } : { orderId: sourceOrderId };
    await this.db.orderItem.updateMany({
      where: whereClause,
      data: { orderId: targetOrderId }
    });
    
    if (itemIds) {
      await this.db.kitchenEvent.updateMany({
        where: { orderId: sourceOrderId, orderItemId: { in: itemIds } },
        data: { orderId: targetOrderId }
      });
    } else {
      await this.db.kitchenEvent.updateMany({
        where: { orderId: sourceOrderId },
        data: { orderId: targetOrderId }
      });
    }
  }

  async deleteOrder(orderId: string) {
    await this.db.order.delete({ where: { id: orderId } });
  }

  async getOrder(id: string) {
    const order = await this.db.order.findUnique({ where: { id }, include: orderInclude });
    return order as unknown as OrderDto | null;
  }

  async listOrders(filter?: { status?: string[] }, options?: { skip?: number; take?: number }) {
    const where = filter?.status && filter.status.length > 0 ? { status: { in: filter.status as any[] } } : undefined;
    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where,
        include: orderInclude,
        orderBy: { openedAt: "desc" },
        skip: options?.skip,
        take: options?.take
      }),
      this.db.order.count({ where })
    ]);
    return { data: orders as unknown as OrderDto[], total };
  }

  async listKitchenOrders(options?: { skip?: number; take?: number }) {
    // Only return orders that have items in PENDING or PREPARING status
    const where = {
      items: {
        some: {
          status: { in: ["PENDING", "PREPARING"] as any[] }
        }
      }
    };
    const [orders, total] = await Promise.all([
      this.db.order.findMany({
        where,
        include: {
          table: true,
          items: {
            where: {
              status: { in: ["PENDING", "PREPARING", "READY"] as any[] }
            },
            include: { product: true },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { openedAt: "asc" },
        skip: options?.skip,
        take: options?.take
      }),
      this.db.order.count({ where })
    ]);
    return { data: orders as unknown as OrderDto[], total };
  }
}
