import type { PrismaClient } from "@prisma/client";

export type AuditConfig<T> = Partial<{
  [K in keyof T]: {
    action: string;
    entityType: string;
    getUserId: (args: any[]) => string;
    getEntityId?: (result: any, args: any[]) => string | undefined;
  };
}>;

export function withAuditLog<T extends object>(
  useCase: T,
  prisma: PrismaClient,
  config: AuditConfig<T>
): T {
  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);
      if (typeof originalMethod !== "function") return originalMethod;

      const methodConfig = config[prop as keyof T];
      if (!methodConfig) return originalMethod.bind(target);

      return async function (...args: any[]) {
        const result = await originalMethod.apply(target, args);

        try {
          const userId = methodConfig.getUserId(args);
          const entityId = methodConfig.getEntityId ? methodConfig.getEntityId(result, args) : undefined;
          
          const payload = JSON.parse(JSON.stringify(args));

          await prisma.auditLog.create({
            data: {
              userId,
              action: methodConfig.action,
              entityType: methodConfig.entityType,
              entityId,
              payload
            }
          });
        } catch (error) {
          console.error(`Audit log failed for action ${methodConfig.action}:`, error);
        }

        return result;
      };
    }
  };
  return new Proxy(useCase, handler);
}
