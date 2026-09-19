import {
  entityIdParamsSchema,
  paymentCreateSchema,
  paymentForOrderCreateSchema
} from "@adisyon/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuthentication, requireRoles } from "../authentication/authorization-middleware.js";
import { application } from "../composition.js";
import { PaymentUseCases, PaymentBusinessError } from "../application/payments/payment-use-cases.js";

export async function paymentRoutes(app: FastifyInstance, useCases: PaymentUseCases = application.payments) {
  app.post(
    "/payments",
    { onRequest: [requireRoles("CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const body = paymentForOrderCreateSchema.safeParse(request.body);
      if (!body.success) return reply.badRequest("Ödeme bilgileri geçersiz.");
      try {
        const { orderId, ...payment } = body.data;
        return await useCases.completePayment(orderId, payment, request.user.id);
      } catch (error) {
        return handlePaymentError(error, reply);
      }
    }
  );

  app.post(
    "/orders/:id/pay",
    { onRequest: [requireRoles("CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      const body = paymentCreateSchema.safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Ödeme bilgileri geçersiz.");
      try {
        return await useCases.completePayment(params.data.id, body.data, request.user.id);
      } catch (error) {
        return handlePaymentError(error, reply);
      }
    }
  );

  app.get(
    "/orders/:id/payments",
    { onRequest: [requireAuthentication] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      if (!params.success) return reply.badRequest("Adisyon numarası geçersiz.");
      try {
        return { payments: await useCases.listOrderPayments(params.data.id) };
      } catch (error) {
        return handlePaymentError(error, reply);
      }
    }
  );

  app.post(
    "/payments/:id/refund",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      const body = z.object({ note: z.string().optional() }).safeParse(request.body);
      if (!params.success) return reply.badRequest("Geçersiz ödeme ID'si.");
      try {
        return await useCases.refundPayment(params.data.id, request.user.id, body.success ? body.data.note : undefined);
      } catch (error) {
        return handlePaymentError(error, reply);
      }
    }
  );
}

function handlePaymentError(error: unknown, reply: FastifyReply) {
  if (error instanceof PaymentBusinessError) {
    switch (error.code) {
      case "ORDER_NOT_FOUND":
        return reply.notFound(error.message);
      case "ORDER_ALREADY_PAID":
      case "ORDER_CLOSED":
      case "AMOUNT_EXCEEDS_REMAINING":
        return reply.conflict(error.message);
      default:
        return reply.badRequest(error.message);
    }
  }
  if (isPrismaError(error, "P2025")) return reply.notFound("Adisyon bulunamadı.");
  if (isPrismaError(error, "P2034")) return reply.conflict("Eş zamanlı ödeme çakışması oluştu, lütfen tekrar deneyin.");
  throw error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
