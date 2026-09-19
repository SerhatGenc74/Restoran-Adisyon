import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { authenticationRoutes } from "./authentication/authentication-routes.js";
import { categoryRoutes } from "./catalog/category-routes.js";
import { productRoutes } from "./catalog/product-routes.js";
import { tableRoutes } from "./tables/table-routes.js";
import { orderRoutes } from "./orders/order-routes.js";
import { paymentRoutes } from "./payments/payment-routes.js";
import { reportRoutes } from "./reports/report-routes.js";
import { userRoutes } from "./users/user-routes.js";
import { cashierRoutes } from "./cashier/cashier-routes.js";
import { createApplication } from "./composition.js";

import fastifyWebsocket from "@fastify/websocket";
import { kitchenWsRoutes } from "./kitchen/kitchen-ws.js";
import { ApiErrorResponse } from "@adisyon/shared";
import { broadcastDevLog, addDevClient } from "./shared/dev-console.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET ortam degiskeni tanimlanmalidir.");
  }

  app.register(cors, { origin: true });
  app.register(sensible);
  app.register(fastifyJwt, { secret: jwtSecret });
  app.register(fastifyWebsocket);
  const application = createApplication();

  app.get("/health", async () => ({ status: "ok" }));
  
  app.register(async (instance) => {
    instance.get("/dev-logs", { websocket: true }, (connection: any, req) => {
      addDevClient(connection);
    });
  });

  app.register(authenticationRoutes);
  app.register((instance) => categoryRoutes(instance, application.catalog));
  app.register((instance) => productRoutes(instance, application.catalog));
  app.register((instance) => tableRoutes(instance, application.tables));
  app.register((instance) => orderRoutes(instance, application.orders));
  app.register((instance) => paymentRoutes(instance, application.payments));
  app.register((instance) => reportRoutes(instance, application.reports));
  app.register((instance) => userRoutes(instance, application.users));
  app.register((instance) => cashierRoutes(instance, application.cashier));
  app.register(kitchenWsRoutes);

  app.setErrorHandler((error: any, request, reply) => {
    const traceId = request.id;
    let statusCode = error.statusCode || 500;
    let code = "INTERNAL_SERVER_ERROR";
    let message = error.message || "Beklenmeyen bir sistem hatası oluştu.";
    let isBusinessError = false;

    // Fastify Sensible / Zod / Custom handled errors:
    if (statusCode < 500) {
      isBusinessError = true;
      code = (error as any).code || "BAD_REQUEST";
    }

    // Prisma specific unhandled errors that surface here
    if (error.code && typeof error.code === 'string' && error.code.startsWith('P2')) {
      statusCode = 400;
      isBusinessError = false;
      message = "Veritabanı kısıtlama hatası oluştu.";
    }

    // Build standard response
    const response: ApiErrorResponse = {
      statusCode,
      code,
      message: isBusinessError ? message : "Beklenmeyen bir sistem hatası oluştu.",
      isBusinessError,
      traceId,
      details: isBusinessError ? error.validation || error : undefined,
    };

    // Broadcast to DevConsole
    broadcastDevLog({
      time: new Date().toISOString(),
      traceId,
      url: request.url,
      method: request.method,
      statusCode,
      code,
      originalMessage: error.message,
      isBusinessError,
      stack: !isBusinessError ? error.stack : undefined
    });

    if (!isBusinessError) {
      app.log.error({ err: error, traceId }, "Unhandled System Error");
    }

    reply.status(statusCode).send(response);
  });

  return app;
}
