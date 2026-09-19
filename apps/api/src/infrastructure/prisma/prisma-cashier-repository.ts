import { PrismaClient, Prisma } from "@prisma/client";
import type { CashierRepository, CashierSessionRow } from "../../interfaces/cashier-repository.js";
import type { DecimalValue } from "../../domain/shared/decimal.js";

function decimal(value: DecimalValue): Prisma.Decimal {
  return value as unknown as Prisma.Decimal;
}

function applicationDecimal(value: Prisma.Decimal): DecimalValue {
  return value as unknown as DecimalValue;
}

export class PrismaCashierRepository implements CashierRepository {
  constructor(private readonly prisma: PrismaClient) {}

  decimal(value: number | string) {
    return new Prisma.Decimal(value) as unknown as DecimalValue;
  }

  zero() {
    return new Prisma.Decimal(0) as unknown as DecimalValue;
  }

  private mapSession(row: any): CashierSessionRow {
    return {
      ...row,
      openingBalance: applicationDecimal(row.openingBalance),
      countedBalance: row.countedBalance ? applicationDecimal(row.countedBalance) : null,
      expectedBalance: row.expectedBalance ? applicationDecimal(row.expectedBalance) : null,
      difference: row.difference ? applicationDecimal(row.difference) : null,
    };
  }

  async findActiveSession(): Promise<CashierSessionRow | null> {
    const session = await this.prisma.cashierSession.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" }
    });
    return session ? this.mapSession(session) : null;
  }

  async createSession(data: { openedById: string; openingBalance: DecimalValue }): Promise<CashierSessionRow> {
    const session = await this.prisma.cashierSession.create({
      data: {
        openedById: data.openedById,
        openingBalance: decimal(data.openingBalance),
        status: "OPEN"
      }
    });
    return this.mapSession(session);
  }

  async closeSession(id: string, data: { closedById: string; countedBalance: DecimalValue; expectedBalance: DecimalValue; difference: DecimalValue }): Promise<CashierSessionRow> {
    const session = await this.prisma.cashierSession.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: data.closedById,
        countedBalance: decimal(data.countedBalance),
        expectedBalance: decimal(data.expectedBalance),
        difference: decimal(data.difference)
      }
    });
    return this.mapSession(session);
  }

  async calculateExpectedBalance(sessionId: string): Promise<DecimalValue> {
    const session = await this.prisma.cashierSession.findUnique({ where: { id: sessionId } });
    if (!session) return this.zero();

    // Get all cash payments received since session opened
    const payments = await this.prisma.payment.aggregate({
      where: {
        method: "CASH",
        status: "COMPLETED",
        isRefund: false,
        paidAt: { gte: session.openedAt } // Simplified approach: all payments since session opened
      },
      _sum: { amount: true }
    });

    const refunds = await this.prisma.payment.aggregate({
      where: {
        method: "CASH",
        status: "REFUNDED",
        isRefund: true,
        refundedAt: { gte: session.openedAt }
      },
      _sum: { amount: true }
    });

    const received = payments._sum.amount ? payments._sum.amount : new Prisma.Decimal(0);
    const refunded = refunds._sum.amount ? refunds._sum.amount : new Prisma.Decimal(0);

    const expected = session.openingBalance.add(received).sub(refunded);
    return applicationDecimal(expected);
  }
}
