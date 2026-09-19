import { entityIdParamsSchema, tableStatusUpdateSchema, tableCreateSchema } from "@adisyon/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import { requireAuthentication, requireRoles } from "../authentication/authorization-middleware.js";
import { application } from "../composition.js";
import { TableBusinessError, TableUseCases } from "../application/tables/table-use-cases.js";

import { paginationQuerySchema, getOffset, paginate } from "../shared/pagination.js";

export async function tableRoutes(app: FastifyInstance, useCases: TableUseCases = application.tables) {
  app.get("/tables", { onRequest: [requireAuthentication] }, async (request, reply) => {
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success) return reply.badRequest("Geçersiz sayfalama parametreleri.");
    const options = { skip: getOffset(query.data), take: query.data.limit };
    const result = await useCases.listTables(options);
    return { tables: paginate(result.data, result.total, query.data) };
  });

  app.post(
    "/tables",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const body = tableCreateSchema.safeParse(request.body);
      if (!body.success) return reply.badRequest("Masa bilgileri geçersiz.");

      try {
        const table = await useCases.createTable(body.data);
        return { table };
      } catch (error) {
        if (isPrismaError(error, "P2002")) return reply.conflict("Bu masa adı zaten kullanılıyor.");
        throw error;
      }
    }
  );

  app.patch(
    "/tables/:id/status",
    { onRequest: [requireRoles("WAITER", "CASHIER", "OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      const body = tableStatusUpdateSchema.safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Masa durumu geçersiz.");

      try {
        return { table: await useCases.updateStatus(params.data.id, body.data.status) };
      } catch (error) {
        const response = handleTableError(error, reply);
        if (response) return response;
        if (isPrismaError(error, "P2025")) return reply.notFound("Masa bulunamadı.");
        throw error;
      }
    }
  );
}

function handleTableError(error: unknown, reply: FastifyReply) {
  const code = error instanceof TableBusinessError
    ? error.code
    : error instanceof Error &&
      (error.message === "TABLE_NOT_FOUND" ||
        error.message === "TABLE_HAS_ACTIVE_ORDER" ||
        error.message === "TABLE_UNAVAILABLE")
      ? error.message
      : undefined;

  if (code === "TABLE_NOT_FOUND") return reply.notFound("Masa bulunamadı.");
  if (code === "TABLE_HAS_ACTIVE_ORDER") return reply.conflict("Aktif adisyonu olan masa boş bırakılamaz.");
  if (code === "TABLE_UNAVAILABLE") return reply.conflict("Masa kullanıma kapalı.");
  return undefined;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
