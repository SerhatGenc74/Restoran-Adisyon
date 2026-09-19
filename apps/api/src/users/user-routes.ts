import {
  entityIdParamsSchema,
  userCreateSchema,
  userUpdateSchema
} from "@adisyon/shared";
import type { FastifyInstance } from "fastify";
import { requireRoles } from "../authentication/authorization-middleware.js";
import { createErrorHandler } from "../shared/error-handler.js";
import type { UserUseCases } from "../application/users/user-use-cases.js";
import { UserBusinessError } from "../application/users/user-use-cases.js";

const handleError = createErrorHandler(
  (e): e is UserBusinessError => e instanceof UserBusinessError,
  {
    USER_NOT_FOUND: (reply) => reply.notFound("Kullanici bulunamadi."),
    CANNOT_DEACTIVATE_SELF: (reply) =>
      reply.conflict("Kendi hesabinizi devre disi birakamazsiniz.")
  }
);

import { paginationQuerySchema, getOffset, paginate } from "../shared/pagination.js";

export async function userRoutes(app: FastifyInstance, useCases: UserUseCases) {
  app.get("/users", { onRequest: [requireRoles("OWNER", "ADMIN")] }, async (request, reply) => {
    const query = paginationQuerySchema.safeParse(request.query);
    if (!query.success) return reply.badRequest("Gecersiz sayfalama parametreleri.");
    const options = { skip: getOffset(query.data), take: query.data.limit };
    const result = await useCases.listUsers(options);
    return { users: paginate(result.data, result.total, query.data) };
  });

  app.post(
    "/users",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const body = userCreateSchema.safeParse(request.body);
      if (!body.success) return reply.badRequest("Kullanici bilgileri gecersiz.");
      try {
        return { user: await useCases.createUser(body.data) };
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  app.patch(
    "/users/:id",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      const body = userUpdateSchema.safeParse(request.body);
      if (!params.success || !body.success) return reply.badRequest("Kullanici bilgileri gecersiz.");
      try {
        return { user: await useCases.updateUser(params.data.id, body.data, request.user.id) };
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );

  app.post(
    "/users/:id/deactivate",
    { onRequest: [requireRoles("OWNER", "ADMIN")] },
    async (request, reply) => {
      const params = entityIdParamsSchema.safeParse(request.params);
      if (!params.success) return reply.badRequest("Kullanici numarasi gecersiz.");
      try {
        return {
          user: await useCases.updateUser(params.data.id, { isActive: false }, request.user.id)
        };
      } catch (error) {
        return handleError(error, reply);
      }
    }
  );
}
