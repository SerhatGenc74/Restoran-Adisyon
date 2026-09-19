// @ts-nocheck
import { Prisma, PrismaClient } from "@prisma/client-sqlite";
import type { DiningTableStatus } from "../../domain/tables/dining-table.js";
import type { TableRepository } from "../../interfaces/table-repository.js";
import { mapDiningTable } from "./mappers/domain-mappers.js";

type Database = PrismaClient | Prisma.TransactionClient;

const activeOrderStatuses = ["OPEN", "IN_PREPARATION", "READY", "SERVED"] as const;

export class SqliteTableRepository implements TableRepository {
  constructor(private readonly db: Database) {}

  async create(data: { name: string; capacity?: number }) {
    return this.db.diningTable.create({
      data,
      include: { orders: { where: { status: { in: [...activeOrderStatuses] } }, select: { id: true, orderNumber: true, status: true, total: true } } }
    }) as any;
  }

  async listActiveTables(options?: { skip?: number; take?: number }) {
    const where = { isActive: true };
    const [rows, total] = await Promise.all([
      this.db.diningTable.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          orders: {
            where: { status: { in: [...activeOrderStatuses] } },
            select: { id: true, orderNumber: true, status: true, total: true }
          }
        },
        skip: options?.skip,
        take: options?.take
      }),
      this.db.diningTable.count({ where })
    ]);
    return { data: rows as any[], total };
  }

  async findById(id: string) {
    const table = await this.db.diningTable.findUnique({ where: { id } });
    return table ? mapDiningTable(table) : null;
  }

  async findActiveOrderForTable(id: string) {
    return this.db.order.findFirst({
      where: { tableId: id, status: { in: [...activeOrderStatuses] } },
      select: { id: true }
    });
  }

  async updateStatus(id: string, status: DiningTableStatus) {
    return this.db.diningTable.update({
      where: { id },
      data: { status }
    });
  }
}
