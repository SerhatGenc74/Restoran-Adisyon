import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { requireAuthentication, requireRoles } from "../middleware/authorization-middleware.js";
import { application } from "../../composition.js";
import { CashierBusinessError, CashierUseCases } from "../../application/cashier/cashier-use-cases.js";

const openSessionSchema = z.object({
  openingBalance: z.number().min(0)
});

const closeSessionSchema = z.object({
  countedBalance: z.number().min(0)
});

export async function cashierRoutes(app: FastifyInstance, useCases: CashierUseCases = application.cashier) {
  app.get(
    "/cashier-sessions/active",
    { onRequest: [requireRoles("CASHIER", "OWNER", "ADMIN")] },
    async () => {
      const session = await useCases.getActiveSession();
      return { session };
    }
  );

  app.post(
    "/cashier-sessions/open",
    { onRequest: [requireRoles("CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const body = openSessionSchema.safeParse(request.body);
      if (!body.success) return reply.badRequest("Gecersiz veri.");
      try {
        const session = await useCases.openSession(request.user.id, body.data.openingBalance);
        return { session };
      } catch (error) {
        return handleCashierError(error, reply);
      }
    }
  );

  app.post(
    "/cashier-sessions/close",
    { onRequest: [requireRoles("CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const body = closeSessionSchema.safeParse(request.body);
      if (!body.success) return reply.badRequest("Gecersiz veri.");
      try {
        const session = await useCases.closeSession(request.user.id, body.data.countedBalance);
        return { session };
      } catch (error) {
        return handleCashierError(error, reply);
      }
    }
  );
}

function handleCashierError(error: unknown, reply: FastifyReply) {
  if (error instanceof CashierBusinessError) {
    return reply.status(400).send({ code: error.code, message: error.message });
  }
  console.error(error);
  return reply.internalServerError("Kasa islemi sirasinda beklenmeyen bir hata olustu.");
}
