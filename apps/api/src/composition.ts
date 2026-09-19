import { prisma } from "./database/prisma-client.js";
import { sqliteClient } from "./infrastructure/sqlite/sqlite-client.js";

import { OrderUseCases } from "./application/orders/order-use-cases.js";
import { PaymentUseCases } from "./application/payments/payment-use-cases.js";
import { ReportUseCases } from "./application/reports/report-use-cases.js";
import { TableUseCases } from "./application/tables/table-use-cases.js";
import { CatalogUseCases } from "./application/catalog/catalog-use-cases.js";
import { UserUseCases } from "./application/users/user-use-cases.js";
import { AuthUseCases } from "./application/authentication/auth-use-cases.js";
import { CashierUseCases } from "./application/cashier/cashier-use-cases.js";

import { PrismaOrderRepository } from "./infrastructure/prisma/prisma-order-repository.js";
import { PrismaPaymentRepository } from "./infrastructure/prisma/prisma-payment-repository.js";
import { PrismaReportRepository } from "./infrastructure/prisma/prisma-report-repository.js";
import { PrismaTableRepository } from "./infrastructure/prisma/prisma-table-repository.js";
import { PrismaCatalogRepository } from "./infrastructure/prisma/prisma-catalog-repository.js";
import { PrismaUserRepository } from "./infrastructure/prisma/prisma-user-repository.js";
import { PrismaCashierRepository } from "./infrastructure/prisma/prisma-cashier-repository.js";

import { SqliteOrderRepository } from "./infrastructure/sqlite/sqlite-order-repository.js";
import { SqlitePaymentRepository } from "./infrastructure/sqlite/sqlite-payment-repository.js";
import { SqliteReportRepository } from "./infrastructure/sqlite/sqlite-report-repository.js";
import { SqliteTableRepository } from "./infrastructure/sqlite/sqlite-table-repository.js";
import { SqliteCatalogRepository } from "./infrastructure/sqlite/sqlite-catalog-repository.js";
import { SqliteUserRepository } from "./infrastructure/sqlite/sqlite-user-repository.js";
import { SqliteCashierRepository } from "./infrastructure/sqlite/sqlite-cashier-repository.js";

import { withAuditLog } from "./application/shared/auditable-use-case.js";

export function createApplication() {
  const isOffline = process.env.DATABASE_TYPE === "sqlite";
  
  const db = isOffline ? sqliteClient : prisma;
  
  const orderRepo = isOffline ? new SqliteOrderRepository(db as any) : new PrismaOrderRepository(db as any);
  const paymentRepo = isOffline ? new SqlitePaymentRepository(db as any) : new PrismaPaymentRepository(db as any);
  const userRepo = isOffline ? new SqliteUserRepository(db as any) : new PrismaUserRepository(db as any);
  const reportRepo = isOffline ? new SqliteReportRepository(db as any) : new PrismaReportRepository(db as any);
  const tableRepo = isOffline ? new SqliteTableRepository(db as any) : new PrismaTableRepository(db as any);
  const catalogRepo = isOffline ? new SqliteCatalogRepository(db as any) : new PrismaCatalogRepository(db as any);
  const cashierRepo = isOffline ? new SqliteCashierRepository(db as any) : new PrismaCashierRepository(db as any);

  const ordersBase = new OrderUseCases(orderRepo as any);
  const paymentsBase = new PaymentUseCases(paymentRepo as any);
  const usersBase = new UserUseCases(userRepo as any);

  const orders = withAuditLog(ordersBase, db as any, {
    createOrder: {
      action: "CREATE_ORDER",
      entityType: "ORDER",
      getUserId: (args) => args[1], // createOrder(input, createdById)
      getEntityId: (result) => result.id
    },
    cancelOrderItem: {
      action: "CANCEL_ORDER_ITEM",
      entityType: "ORDER",
      getUserId: (args) => args[2], // cancelOrderItem(orderId, itemId, canceledById)
      getEntityId: (result, args) => args[0] // orderId
    }
  });

  const payments = withAuditLog(paymentsBase, db as any, {
    completePayment: {
      action: "COMPLETE_PAYMENT",
      entityType: "ORDER",
      getUserId: (args) => args[2], // completePayment(orderId, input, receivedById)
      getEntityId: (result, args) => args[0] // orderId
    }
  });

  const users = withAuditLog(usersBase, db as any, {
    updateUser: {
      action: "UPDATE_USER",
      entityType: "USER",
      getUserId: (args) => args[2], // updateUser(id, input, actorId)
      getEntityId: (result, args) => args[0] // id
    }
  });

  const auth = new AuthUseCases(userRepo as any);
  const cashier = new CashierUseCases(cashierRepo as any);

  return {
    auth,
    cashier,
    orders,
    payments,
    reports: new ReportUseCases(reportRepo as any),
    tables: new TableUseCases(tableRepo as any),
    catalog: new CatalogUseCases(catalogRepo as any),
    users
  };
}

export const application = createApplication();
