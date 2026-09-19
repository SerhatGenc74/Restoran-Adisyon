import { FastifyPluginAsync } from "fastify";
import { prisma } from "../database/prisma-client.js";

interface SyncItem {
  id: string;
  entityId: string;
  entityType: string;
  action: string;
  payload: string;
}

interface SyncPayload {
  items: SyncItem[];
}

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: SyncPayload }>("/batch", async (request, reply) => {
    // Basic auth check
    const authHeader = request.headers.authorization;
    if (authHeader !== `Bearer ${process.env.SYNC_SECRET || 'offline-sync-secret'}`) {
      return reply.status(401).send({ message: "Unauthorized sync request" });
    }

    const { items } = request.body;
    
    if (!items || !Array.isArray(items)) {
      return reply.status(400).send({ message: "Invalid payload format" });
    }

    const results = [];

    // Process sequentially to avoid DB lock issues, or use a transaction
    for (const item of items) {
      try {
        // Idempotency check: has this item already been synced?
        const existing = await prisma.syncHistory.findUnique({ where: { id: item.id } });
        
        if (existing) {
          results.push({ id: item.id, status: 'SKIPPED_ALREADY_SYNCED' });
          continue;
        }

        // Apply changes to Postgres depending on entityType and action
        const payload = JSON.parse(item.payload);
        
        // For this prototype, we'll just record idempotency. 
        // In a full implementation, you would dynamically update the tables:
        // await (prisma as any)[item.entityType.toLowerCase()][item.action.toLowerCase()](payload.args);
        
        // Record as successfully synced
        await prisma.syncHistory.create({
          data: { id: item.id }
        });

        results.push({ id: item.id, status: 'SUCCESS' });
      } catch (error: any) {
        fastify.log.error(`Sync failed for item ${item.id}: ${error.message}`);
        results.push({ id: item.id, status: 'FAILED', error: error.message });
      }
    }

    return reply.status(200).send({ results });
  });
};
