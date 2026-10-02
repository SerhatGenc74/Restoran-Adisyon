import type { UserRole } from "@adisyon/shared";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireAuthentication(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  await request.jwtVerify();
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void | FastifyReply> => {
    await request.jwtVerify();

    if (!allowedRoles.includes(request.user.role)) {
      return reply.forbidden("Bu işlem için yetkiniz bulunmuyor.");
    }
  };
}
