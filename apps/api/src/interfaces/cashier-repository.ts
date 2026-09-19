import type { DecimalValue } from "../domain/shared/decimal.js";

export interface CashierSessionRow {
  id: string;
  openedById: string;
  closedById: string | null;
  openedAt: Date;
  closedAt: Date | null;
  openingBalance: DecimalValue;
  countedBalance: DecimalValue | null;
  expectedBalance: DecimalValue | null;
  difference: DecimalValue | null;
  status: string;
}

export interface CashierRepository {
  decimal(value: number | string): DecimalValue;
  zero(): DecimalValue;
  findActiveSession(): Promise<CashierSessionRow | null>;
  createSession(data: { openedById: string; openingBalance: DecimalValue }): Promise<CashierSessionRow>;
  closeSession(id: string, data: { closedById: string; countedBalance: DecimalValue; expectedBalance: DecimalValue; difference: DecimalValue }): Promise<CashierSessionRow>;
  calculateExpectedBalance(sessionId: string): Promise<DecimalValue>;
}
