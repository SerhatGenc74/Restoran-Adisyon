import {
  entityIdParamsSchema,
  orderCreateSchema,
  orderItemCreateSchema,
  orderItemStatusUpdateSchema,
  orderItemUpdateSchema
} from "@adisyon/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuthentication, requireRoles } from "../middleware/authorization-middleware.js";
import { application } from "../../composition.js";
import { OrderUseCases, OrderBusinessError } from "../../application/orders/order-use-cases.js";
import { z } from "zod";

import { paginationQuerySchema, getOffset, paginate } from "../../shared/pagination.js";

const itemParamsSchema = z.object({ id: z.string().uuid(), itemId: z.string().uuid() });

export async function orderRoutes(app: FastifyInstance, useCases: OrderUseCases = application.orders) {
  app.get(
    "/orders",
    { onRequest: [requireRoles("WAITER", "CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const querySchema = paginationQuerySchema.extend({ status: z.string().optional() });
      const query = querySchema.safeParse(request.query);
      if (!query.success) return reply.badRequest("Geçersiz sorgu parametreleri.");
      const statusFilter = query.data.status ? query.data.status.split(",") : undefined;
      const options = { skip: getOffset(query.data), take: query.data.limit };
      const result = await useCases.listOrders({ status: statusFilter }, options);
      return { orders: paginate(result.data, result.total, query.data) };
    }
  );

  app.get(
    "/orders/kitchen",
    { onRequest: [requireRoles("KITCHEN", "WAITER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const query = paginationQuerySchema.safeParse(request.query);
      if (!query.success) return reply.badRequest("Geçersiz sayfalama parametreleri.");
      const options = { skip: getOffset(query.data), take: query.data.limit };
      const result = await useCases.listKitchenOrders(options);
      return { orders: paginate(result.data, result.total, query.data) };
    }
  );

  app.post(
    "/orders",
    { onRequest: [requireRoles("WAITER", "CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const body = orderCreateSchema.safeParse(request.body);
      if (!body.success) return reply.badRequest("Adisyon bilgileri geçersiz.");
      try {
        return { order: await useCases.createOrder(body.data, request.user.id) };
      } catch (error) {
        return handleOrderError(error, reply);
      }
    }
  );

  app.get("/orders/:id", { onRequest: [requireAuthentication] }, async (request, reply) => {
    const params = entityIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.badRequest("Adisyon numarası geçersiz.");
    const order = await useCases.getOrder(params.data.id);
    if (!order) return reply.notFound("Adisyon bulunamadı.");
    return { order };
  });

  app.post(
    "/orders/:id/items",
    { onRequest: [requireRoles("WAITER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      const body = orderItemCreateSchema.safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Adisyon kalemi geçersiz.");
      try {
        return { order: await useCases.addOrderItem(params.data.id, body.data, request.user.id) };
      } catch (error) {
        return handleOrderError(error, reply);
      }
    }
  );

  app.patch(
    "/orders/:id/items/:itemId",
    { onRequest: [requireRoles("WAITER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = itemParamsSchema.safeParse(request.params);
      const body = orderItemUpdateSchema.safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Adisyon kalemi geçersiz.");
      try {
        return { order: await useCases.updateOrderItem(params.data.id, params.data.itemId, body.data) };
      } catch (error) {
        return handleOrderError(error, reply);
      }
    }
  );

  const cancelHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = itemParamsSchema.safeParse(request.params);
    if (!params.success) return reply.badRequest("Adisyon kalemi geçersiz.");
    try {
      return { order: await useCases.cancelOrderItem(params.data.id, params.data.itemId, request.user.id) };
    } catch (error) {
      return handleOrderError(error, reply);
    }
  };
  app.post(
    "/orders/:id/items/:itemId/cancel",
    { onRequest: [requireRoles("WAITER", "KITCHEN", "OWNER", "ADMIN")] },
    cancelHandler
  );
  app.patch(
    "/orders/:id/items/:itemId/cancel",
    { onRequest: [requireRoles("WAITER", "KITCHEN", "OWNER", "ADMIN")] },
    cancelHandler
  );
  app.delete(
    "/orders/:id/items/:itemId",
    { onRequest: [requireRoles("WAITER", "KITCHEN", "OWNER", "ADMIN")] },
    cancelHandler
  );

  app.patch(
    "/orders/:id/items/:itemId/status",
    { onRequest: [requireRoles("KITCHEN", "WAITER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = itemParamsSchema.safeParse(request.params);
      const body = orderItemStatusUpdateSchema.safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Mutfak durumu geçersiz.");
      try {
        return {
          order: await useCases.transitionOrderItem(
            params.data.id,
            params.data.itemId,
            body.data.status,
            request.user.id
          )
        };
      } catch (error) {
        return handleOrderError(error, reply);
      }
    }
  );

  app.post(
    "/orders/move",
    { onRequest: [requireRoles("WAITER", "CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const body = z.object({ sourceTableId: z.string().uuid(), targetTableId: z.string().uuid() }).safeParse(request.body);
      if (!body.success) return reply.badRequest("Masa ID'leri geçersiz.");
      try {
        await useCases.moveTable(body.data.sourceTableId, body.data.targetTableId);
        return { success: true };
      } catch (error) {
        return handleOrderError(error, reply);
      }
    }
  );

  app.post(
    "/orders/merge",
    { onRequest: [requireRoles("CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const body = z.object({ sourceTableId: z.string().uuid(), targetTableId: z.string().uuid() }).safeParse(request.body);
      if (!body.success) return reply.badRequest("Masa ID'leri geçersiz.");
      try {
        await useCases.mergeTables(body.data.sourceTableId, body.data.targetTableId);
        return { success: true };
      } catch (error) {
        return handleOrderError(error, reply);
      }
    }
  );

  app.post(
    "/orders/:id/split",
    { onRequest: [requireRoles("CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      const body = z.object({ itemIds: z.array(z.string().uuid()), targetTableId: z.string().uuid() }).safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Parametreler geçersiz.");
      try {
        await useCases.splitOrder(params.data.id, body.data.itemIds, body.data.targetTableId, request.user.id);
        return { success: true };
      } catch (error) {
        return handleOrderError(error, reply);
      }
    }
  );
}

function handleOrderError(error: unknown, reply: FastifyReply) {
  if (error instanceof OrderBusinessError) {
    switch (error.code) {
      case "ORDER_NOT_FOUND":
      case "ITEM_NOT_FOUND":
      case "PRODUCT_NOT_FOUND":
      case "TABLE_NOT_FOUND":
        return reply.notFound(error.message);
      case "TABLE_OCCUPIED":
      case "TABLE_UNAVAILABLE":
      case "ORDER_NOT_EDITABLE":
      case "ITEM_NOT_EDITABLE":
      case "INVALID_TRANSITION":
        return reply.conflict(error.message);
      default:
        return reply.badRequest(error.message);
    }
  }
  if (isPrismaError(error, "P2025")) return reply.notFound("Kayıt bulunamadı.");
  if (isPrismaError(error, "P2002") || isPrismaError(error, "P2034")) {
    return reply.conflict("Kayıt çakışması oluştu, lütfen tekrar deneyin.");
  }
  throw error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
