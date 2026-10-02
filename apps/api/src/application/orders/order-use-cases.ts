import type { OrderRepository, OrderTransaction, NewOrderItem } from "../../interfaces/order-repository.js";
import {
  calculateOrderTotals,
  orderStatusFromItems,
  type OrderItemStatus
} from "../../domain/orders/order-rules.js";
import { Order } from "../../domain/orders/order.js";
import { OrderItem } from "../../domain/orders/order-item.js";
import { DomainError } from "../../domain/shared/domain-error.js";
import { eventBus } from "../../shared/event-bus.js";

export interface OrderItemCreateInput {
  productId: string;
  quantity: number;
  portion?: string;
  isComplimentary?: boolean;
  complimentaryReason?: string;
  note?: string;
}

export interface OrderCreateInput {
  tableId?: string;
  note?: string;
  items: OrderItemCreateInput[];
}

export interface OrderItemUpdateInput {
  quantity?: number;
  portion?: string;
  isComplimentary?: boolean;
  complimentaryReason?: string | null;
  note?: string | null;
}

export class OrderBusinessError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export class OrderUseCases {
  constructor(private readonly repository: OrderRepository) {}

  getOrder(id: string) {
    return this.repository.getOrder(id);
  }

  listOrders(filter?: { status?: string[] }, options?: { skip?: number; take?: number }) {
    return this.repository.listOrders(filter, options);
  }

  listKitchenOrders(options?: { skip?: number; take?: number }) {
    return this.repository.listKitchenOrders(options);
  }

  async createOrder(input: OrderCreateInput, userId: string) {
    return this.repository.transaction(async (tx) => {
      if (input.tableId) {
        const table = await tx.findTable(input.tableId);
        if (!table || !table.isActive) throw new OrderBusinessError("TABLE_NOT_FOUND", "Masa bulunamadı.");
        if (table.status === "OUT_OF_SERVICE" || table.status === "RESERVED") {
          throw new OrderBusinessError("TABLE_UNAVAILABLE", "Masa kullanıma kapalı.");
        }
        if (await tx.findActiveOrderForTable(input.tableId)) {
          throw new OrderBusinessError("TABLE_OCCUPIED", "Masanın aktif adisyonu var.");
        }
      }

      const products = new Map((await tx.findProducts(input.items.map((item) => item.productId))).map((product) => [product.id, product]));
      const items = input.items.map((item) => {
        const product = products.get(item.productId);
        if (!product) throw new OrderBusinessError("PRODUCT_NOT_FOUND", "Ürün bulunamadı veya pasif.");
        
        let unitPrice = product.price;
        if (item.portion && item.portion !== "TAM") {
          const specificPortion = product.portions.find((p) => p.portion === item.portion);
          if (specificPortion) {
            unitPrice = specificPortion.price;
          }
        }
        
        return this.itemValues(tx, item, unitPrice);
      });
      const domainOrder = Order.create({
        id: "new",
        tableId: input.tableId,
        items: items.map((item, index) => OrderItem.create({ id: `new-${index}`, ...item })),
        zero: tx.zero()
      });
      const totals = domainOrder.calculateTotals(tx.zero());
      const order = await tx.createOrder({
        tableId: input.tableId,
        note: input.note,
        createdById: userId,
        totals,
        items: items.map((item) => ({ ...item, addedById: userId }))
      });
      if (input.tableId) await tx.markTableOccupied(input.tableId);
      eventBus.emit("kitchen-update");
      return order;
    }, true);
  }

  async addOrderItem(orderId: string, input: OrderItemCreateInput, userId: string) {
    return this.repository.transaction(async (tx) => {
      this.ensureEditableOrder(await tx.findOrderState(orderId));
      const product = (await tx.findProducts([input.productId]))[0];
      if (!product) throw new OrderBusinessError("PRODUCT_NOT_FOUND", "Ürün bulunamadı veya pasif.");
      
      let unitPrice = product.price;
      if (input.portion && input.portion !== "TAM") {
        const specificPortion = product.portions.find((p) => p.portion === input.portion);
        if (specificPortion) {
          unitPrice = specificPortion.price;
        }
      }
      
      const values = this.itemValues(tx, input, unitPrice);
      await tx.createOrderItem(orderId, { ...values, addedById: userId });
      await this.recalculateOrder(tx, orderId);
      eventBus.emit("kitchen-update");
      return tx.getOrder(orderId);
    });
  }

  async updateOrderItem(orderId: string, itemId: string, input: OrderItemUpdateInput) {
    return this.repository.transaction(async (tx) => {
      this.ensureEditableOrder(await tx.findOrderState(orderId));
      const item = await tx.findOrderItem(orderId, itemId);
      if (!item) throw new OrderBusinessError("ITEM_NOT_FOUND", "Adisyon kalemi bulunamadı.");
      const data: Partial<NewOrderItem> & { complimentaryReason?: string | null; note?: string | null } = {};
      const domainItem = this.toDomainItem(tx, item);
      
      let newUnitPrice = undefined;
      if (input.portion !== undefined && input.portion !== domainItem.portion && item.productId) {
        const product = (await tx.findProducts([item.productId]))[0];
        if (product) {
          let resolvedPrice = product.price;
          if (input.portion !== "TAM") {
            const specificPortion = product.portions.find((p) => p.portion === input.portion);
            if (specificPortion) {
              resolvedPrice = specificPortion.price;
            }
          }
          newUnitPrice = resolvedPrice;
        }
      }

      try {
        domainItem.update({
          quantity: input.quantity === undefined ? undefined : tx.decimal(input.quantity.toFixed(3)),
          portion: input.portion,
          unitPrice: newUnitPrice,
          isComplimentary: input.isComplimentary,
          complimentaryReason: input.complimentaryReason,
          note: input.note
        });
      } catch (error) {
        throw this.toOrderError(error);
      }
      const snapshot = domainItem.toSnapshot();
      if (input.quantity !== undefined) {
        data.quantity = snapshot.quantity;
      }
      if (input.portion !== undefined) {
        data.portion = snapshot.portion;
      }
      if (newUnitPrice !== undefined) {
        data.unitPrice = snapshot.unitPrice;
      }
      if (input.quantity !== undefined || input.portion !== undefined || newUnitPrice !== undefined) {
        data.lineTotal = snapshot.lineTotal;
      }
      if (input.isComplimentary !== undefined) data.isComplimentary = snapshot.isComplimentary;
      if (input.complimentaryReason !== undefined) data.complimentaryReason = snapshot.complimentaryReason;
      if (input.note !== undefined) data.note = snapshot.note;
      await tx.updateOrderItem(orderId, itemId, data);
      await this.recalculateOrder(tx, orderId);
      eventBus.emit("kitchen-update");
      return tx.getOrder(orderId);
    });
  }

  async cancelOrder(orderId: string, changedById: string) {
    return this.repository.transaction(async (tx) => {
      const order = await tx.findOrderState(orderId);
      if (!order) throw new OrderBusinessError("ORDER_NOT_FOUND", "Adisyon bulunamadı.");
      this.ensureEditableOrder(order);

      const items = await tx.listOrderItems(orderId);
      
      // Iptal edilmemis tum kalemleri iptal et
      const orderDto = await tx.getOrder(orderId) as any;
      if (orderDto && orderDto.items) {
        for (const item of orderDto.items) {
          if (item.status !== "CANCELLED") {
            await tx.cancelOrderItem(orderId, item.id);
            await tx.createKitchenEvent({ orderId, orderItemId: item.id, fromStatus: item.status, toStatus: "CANCELLED", changedById });
          }
        }
      }

      await tx.updateOrderStatus(orderId, "CANCELLED");
      
      if (orderDto && orderDto.tableId) {
        await tx.markTableAvailable(orderDto.tableId);
      }
      
      await this.recalculateOrder(tx, orderId);
      eventBus.emit("kitchen-update");
      return tx.getOrder(orderId);
    });
  }

  async cancelOrderItem(orderId: string, itemId: string, changedById: string) {
    return this.repository.transaction(async (tx) => {
      this.ensureEditableOrder(await tx.findOrderState(orderId));
      const item = await tx.findOrderItem(orderId, itemId);
      if (!item) throw new OrderBusinessError("ITEM_NOT_FOUND", "Adisyon kalemi bulunamadı.");
      try {
        this.toDomainItem(tx, item).cancel();
      } catch (error) {
        throw this.toOrderError(error);
      }
      await tx.cancelOrderItem(orderId, itemId);
      await tx.createKitchenEvent({ orderId, orderItemId: itemId, fromStatus: item.status, toStatus: "CANCELLED", changedById });
      await this.recalculateOrder(tx, orderId);
      eventBus.emit("kitchen-update");
      return tx.getOrder(orderId);
    });
  }

  async transitionOrderItem(orderId: string, itemId: string, toStatus: OrderItemStatus, changedById: string) {
    return this.repository.transaction(async (tx) => {
      const order = await tx.findOrderState(orderId);
      if (!order) throw new OrderBusinessError("ORDER_NOT_FOUND", "Adisyon bulunamadı.");
      this.ensureEditableOrder(order);
      const item = await tx.findOrderItem(orderId, itemId);
      if (!item) throw new OrderBusinessError("ITEM_NOT_FOUND", "Adisyon kalemi bulunamadı.");
      try {
        this.toDomainItem(tx, item).transitionTo(toStatus);
      } catch (error) {
        throw this.toOrderError(error);
      }
      await tx.updateOrderItem(orderId, itemId, { status: toStatus } as Partial<NewOrderItem>);
      await tx.createKitchenEvent({ orderId, orderItemId: itemId, fromStatus: item.status, toStatus, changedById });
      const status = orderStatusFromItems(await tx.listOrderItems(orderId));
      await tx.updateOrderStatus(orderId, status);
      eventBus.emit("kitchen-update");
      return tx.getOrder(orderId);
    });
  }

  async moveTable(sourceTableId: string, targetTableId: string) {
    return this.repository.transaction(async (tx) => {
      const sourceOrder = await tx.findActiveOrderForTable(sourceTableId);
      if (!sourceOrder) throw new OrderBusinessError("ORDER_NOT_FOUND", "Kaynak masada aktif adisyon yok.");
      
      const targetTable = await tx.findTable(targetTableId);
      if (!targetTable || !targetTable.isActive) throw new OrderBusinessError("TABLE_NOT_FOUND", "Hedef masa bulunamadı.");
      if (targetTable.status !== "AVAILABLE") throw new OrderBusinessError("TABLE_UNAVAILABLE", "Hedef masa boş değil.");

      await tx.moveOrderToTable(sourceOrder.id, targetTableId);
      await tx.markTableAvailable(sourceTableId);
      await tx.markTableOccupied(targetTableId);
      
      eventBus.emit("kitchen-update");
    });
  }

  async mergeTables(sourceTableId: string, targetTableId: string) {
    return this.repository.transaction(async (tx) => {
      const sourceOrder = await tx.findActiveOrderForTable(sourceTableId);
      if (!sourceOrder) throw new OrderBusinessError("ORDER_NOT_FOUND", "Kaynak masada aktif adisyon yok.");
      
      const targetOrder = await tx.findActiveOrderForTable(targetTableId);
      if (!targetOrder) throw new OrderBusinessError("ORDER_NOT_FOUND", "Hedef masada aktif adisyon yok.");

      await tx.moveOrderItems(sourceOrder.id, targetOrder.id);
      await tx.deleteOrder(sourceOrder.id);
      await tx.markTableAvailable(sourceTableId);
      
      await this.recalculateOrder(tx, targetOrder.id);
      eventBus.emit("kitchen-update");
    });
  }

  async splitOrder(sourceOrderId: string, itemIds: string[], targetTableId: string, userId: string) {
    return this.repository.transaction(async (tx) => {
      const sourceOrder = await tx.findOrderState(sourceOrderId);
      if (!sourceOrder) throw new OrderBusinessError("ORDER_NOT_FOUND", "Kaynak adisyon bulunamadı.");
      this.ensureEditableOrder(sourceOrder);

      const targetTable = await tx.findTable(targetTableId);
      if (!targetTable || !targetTable.isActive) throw new OrderBusinessError("TABLE_NOT_FOUND", "Hedef masa bulunamadı.");
      if (targetTable.status !== "AVAILABLE") throw new OrderBusinessError("TABLE_UNAVAILABLE", "Hedef masa boş değil.");

      // Create an empty order on target table
      const newOrder = await tx.createOrder({
        tableId: targetTableId,
        createdById: userId,
        totals: {
          total: tx.zero(), subtotal: tx.zero(), discountTotal: tx.zero(), complimentaryTotal: tx.zero()
        },
        items: []
      }) as { id: string };

      // Move items
      await tx.moveOrderItems(sourceOrderId, newOrder.id, itemIds);
      
      // Recalculate both
      await this.recalculateOrder(tx, sourceOrderId);
      await this.recalculateOrder(tx, newOrder.id);
      
      await tx.markTableOccupied(targetTableId);
      eventBus.emit("kitchen-update");
    });
  }

  private itemValues(tx: OrderTransaction, item: OrderItemCreateInput, price: NewOrderItem["unitPrice"]): NewOrderItem {
    const quantity = tx.decimal(item.quantity.toFixed(3));
    const domainItem = OrderItem.create({
      id: "new",
      productId: item.productId,
      quantity,
      portion: item.portion ?? "TAM",
      unitPrice: price,
      isComplimentary: item.isComplimentary ?? false,
      complimentaryReason: item.complimentaryReason,
      note: item.note
    });
    const snapshot = domainItem.toSnapshot();
    return {
      productId: snapshot.productId,
      quantity: snapshot.quantity,
      portion: snapshot.portion,
      unitPrice: snapshot.unitPrice,
      lineTotal: snapshot.lineTotal,
      isComplimentary: snapshot.isComplimentary,
      complimentaryReason: snapshot.complimentaryReason,
      note: snapshot.note
    };
  }

  private async recalculateOrder(tx: OrderTransaction, orderId: string) {
    const items = await tx.listOrderItems(orderId);
    await tx.updateOrderTotals(orderId, calculateOrderTotals(items, tx.zero()));
  }

  private ensureEditableOrder(order: { status: string } | null): asserts order is { status: string } {
    if (!order) throw new OrderBusinessError("ORDER_NOT_FOUND", "Adisyon bulunamadı.");
    try {
      Order.assertEditableStatus(order.status);
    } catch (error) {
      throw this.toOrderError(error);
    }
  }

  private toDomainItem(tx: OrderTransaction, item: NonNullable<Awaited<ReturnType<OrderTransaction["findOrderItem"]>>>) {
    const quantity = item.quantity ?? tx.decimal("1");
    const portion = item.portion ?? "TAM";
    return OrderItem.restore({
      id: item.id,
      productId: item.productId ?? "",
      quantity,
      portion,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal ?? quantity.mul(item.unitPrice).toDecimalPlaces(2),
      status: item.status,
      isComplimentary: item.isComplimentary,
      complimentaryReason: item.complimentaryReason,
      note: item.note
    });
  }

  private toOrderError(error: unknown): OrderBusinessError {
    if (error instanceof DomainError) return new OrderBusinessError(error.code, error.message);
    if (error instanceof OrderBusinessError) return error;
    return new OrderBusinessError("INVALID_ORDER", "Adisyon işlemi geçersiz.");
  }
}

