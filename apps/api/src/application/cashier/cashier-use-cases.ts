import type { CashierRepository } from "../../interfaces/cashier-repository.js";

export class CashierBusinessError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export class CashierUseCases {
  constructor(private readonly repository: CashierRepository) {}

  async getActiveSession() {
    return this.repository.findActiveSession();
  }

  async openSession(userId: string, openingBalanceInput: number) {
    const active = await this.repository.findActiveSession();
    if (active) {
      throw new CashierBusinessError("SESSION_ALREADY_OPEN", "Aktif bir kasa oturumu zaten var.");
    }
    const balance = this.repository.decimal(openingBalanceInput);
    return this.repository.createSession({ openedById: userId, openingBalance: balance });
  }

  async closeSession(userId: string, countedBalanceInput: number) {
    const active = await this.repository.findActiveSession();
    if (!active) {
      throw new CashierBusinessError("NO_ACTIVE_SESSION", "Kapatilacak aktif kasa oturumu yok.");
    }
    
    const countedBalance = this.repository.decimal(countedBalanceInput);
    const expectedBalance = await this.repository.calculateExpectedBalance(active.id);
    
    // Using Prisma Decimal logic indirectly via numbers (since DecimalValue is opaque, we cheat a bit for subtraction in use cases, or we should use Big.js. But for now we can just convert to numbers to calculate difference)
    const countedNumber = Number(countedBalance.toString());
    const expectedNumber = Number(expectedBalance.toString());
    const differenceNumber = countedNumber - expectedNumber;
    
    const difference = this.repository.decimal(differenceNumber.toFixed(2));

    return this.repository.closeSession(active.id, {
      closedById: userId,
      countedBalance,
      expectedBalance,
      difference
    });
  }
}
