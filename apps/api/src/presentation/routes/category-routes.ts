import {
  categoryCreateSchema,
  categoryUpdateSchema,
  entityIdParamsSchema
} from "@adisyon/shared";
import type { FastifyInstance } from "fastify";
import { requireAuthentication, requireRoles } from "../middleware/authorization-middleware.js";
import { createErrorHandler } from "../../shared/error-handler.js";
import type { CatalogUseCases } from "../../application/catalog/catalog-use-cases.js";
import { CatalogBusinessError } from "../../application/catalog/catalog-use-cases.js";

const handleError = createErrorHandler(
  (e): e is CatalogBusinessError => e instanceof CatalogBusinessError,
  {
    CATEGORY_NOT_FOUND: (reply) => reply.notFound("Kategori bulunamadi."),
    CATEGORY_HAS_ACTIVE_PRODUCTS: (reply) =>
      reply.conflict("Aktif urunleri olan kategori pasif edilemez.")
  }
);

import { paginationQuerySchema, getOffset, paginate } from "../../shared/pagination.js";

export async function categoryRoutes(app: FastifyInstance, useCases: CatalogUseCases) {
  app.get("/categories", { onRequest: [requireAuthentication] }, async (request, reply) => {
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success) return reply.badRequest("Gecersiz sayfalama parametreleri.");
    const options = { skip: getOffset(query.data), take: query.data.limit };
    const result = await useCases.listCategories(options);
    return { categories: paginate(result.data, result.total, query.data) };
  });

  app.post(
    "/categories",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const parsed = categoryCreateSchema.safeParse(request.body);
      if (!parsed.success) return reply.badRequest("Kategori bilgileri gecersiz.");
      try {
        return { category: await useCases.createCategory(parsed.data) };
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  app.patch(
    "/categories/:id",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      const body = categoryUpdateSchema.safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Kategori bilgileri gecersiz.");
      try {
        return { category: await useCases.updateCategory(params.data.id, body.data) };
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );
}
