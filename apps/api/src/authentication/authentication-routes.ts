import { loginRequestSchema } from "@adisyon/shared";
import type { FastifyInstance } from "fastify";
import { requireAuthentication } from "./authorization-middleware.js";
import { application } from "../composition.js";

export async function authenticationRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const parsedBody = loginRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.badRequest("Kullanıcı adı ve şifre zorunludur.");
    }

    const user = await application.auth.authenticateUser(parsedBody.data.username, parsedBody.data.password);

    if (!user) {
      return reply.unauthorized("Kullanıcı adı veya şifre hatalı.");
    }

    const accessToken = await reply.jwtSign(user);

    return { accessToken, user };
  });

  app.get("/auth/me", { onRequest: [requireAuthentication] }, async (request) => ({
    user: request.user
  }));
}
