import type { DecimalValue } from "../shared/decimal.js";

export function remainingBalance<T extends DecimalValue>(total: T, paid: T): T {
  return total.sub(paid).toDecimalPlaces(2) as T;
}

export function sumAmounts<T extends DecimalValue>(amounts: T[], zero: T): T {
  return amounts.reduce((sum, amount) => sum.add(amount) as T, zero);
}
