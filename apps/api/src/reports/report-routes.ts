import { dailyReportQuerySchema } from "@adisyon/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireRoles } from "../authentication/authorization-middleware.js";
import { application } from "../composition.js";
import { ReportUseCases, ReportBusinessError } from "../application/reports/report-use-cases.js";

export async function reportRoutes(app: FastifyInstance, useCases: ReportUseCases = application.reports) {
  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = dailyReportQuerySchema.safeParse(request.query);
    if (!query.success) return reply.badRequest("Rapor tarihi geçersiz.");
    try {
      return await useCases.aggregateDailyReport(query.data.date, request.user.id);
    } catch (error) {
      if (error instanceof ReportBusinessError) return reply.badRequest(error.message);
      throw error;
    }
  };

  app.get("/reports/daily", { onRequest: [requireRoles("OWNER", "ADMIN")] }, handler);
  app.post("/reports/daily", { onRequest: [requireRoles("OWNER", "ADMIN")] }, handler);
}
