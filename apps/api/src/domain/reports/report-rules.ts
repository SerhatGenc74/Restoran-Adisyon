import type { DecimalValue } from "../shared/decimal.js";

export function dateRange(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("INVALID_DATE");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) {
    throw new Error("INVALID_DATE");
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function sumBy<T extends DecimalValue>(values: T[], zero: T): T {
  return values.reduce((sum, value) => sum.add(value) as T, zero);
}
