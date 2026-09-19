import { PrismaClient as SqliteClient } from '@prisma/client-sqlite';

export const sqliteClient = new SqliteClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);

        // Capture mutation events for the outbox
        if (['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany'].includes(operation)) {
          // Exclude Outbox itself to avoid infinite loops
          if (model === 'Outbox') return result;

          // For Many operations, we might not have a single ID, just stringify the args or result
          const entityId = (result as any)?.id || 'BULK_OP';
          
          await (sqliteClient as any).outbox.create({
            data: {
              entityId: String(entityId),
              entityType: model,
              action: operation.toUpperCase(),
              payload: JSON.stringify({ args, result })
            }
          });
        }

        return result;
      }
    }
  }
});
