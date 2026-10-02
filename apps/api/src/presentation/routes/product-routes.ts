import { z } from "zod";
import {
  entityIdParamsSchema,
  productCreateSchema,
  productUpdateSchema
} from "@adisyon/shared";
import type { FastifyInstance } from "fastify";
import { requireAuthentication, requireRoles } from "../middleware/authorization-middleware.js";
import { createErrorHandler } from "../../shared/error-handler.js";
import type { CatalogUseCases } from "../../application/catalog/catalog-use-cases.js";
import { CatalogBusinessError } from "../../application/catalog/catalog-use-cases.js";
import { paginationQuerySchema, getOffset, paginate } from "../../shared/pagination.js";

const handleError = createErrorHandler(
  (e): e is CatalogBusinessError => e instanceof CatalogBusinessError,
  {
    CATEGORY_NOT_FOUND: (reply) => reply.notFound("Kategori bulunamadi."),
    CATEGORY_INACTIVE: (reply) => reply.conflict("Pasif kategorideki urun aktif edilemez."),
    PRODUCT_NOT_FOUND: (reply) => reply.notFound("Urun bulunamadi."),
    INVALID_PRICE: (reply) => reply.badRequest("Urun fiyati gecersiz.")
  }
);

const productQuerySchema = paginationQuerySchema.extend({
  includeInactive: z.string().optional().transform((v) => v === "true")
});

export async function productRoutes(app: FastifyInstance, useCases: CatalogUseCases) {
  app.get("/products", { onRequest: [requireAuthentication] }, async (request, reply) => {
    const query = productQuerySchema.safeParse(request.query);
    if (!query.success) return reply.badRequest("Gecersiz sayfalama parametreleri.");
    const options = { skip: getOffset(query.data), take: query.data.limit };
    const result = await useCases.listProducts({ includeInactive: query.data.includeInactive }, options);
    return { products: paginate(result.data, result.total, query.data) };
  });

  app.post(
    "/products",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const parsed = productCreateSchema.safeParse(request.body);
      if (!parsed.success) return reply.badRequest("Urun bilgileri gecersiz.");
      try {
        return { product: await useCases.createProduct(parsed.data) };
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  app.patch(
    "/products/:id",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      const body = productUpdateSchema.safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Urun bilgileri gecersiz.");
      try {
        return { product: await useCases.updateProduct(params.data.id, body.data) };
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );
}
