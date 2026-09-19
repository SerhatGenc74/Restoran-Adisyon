import type { DecimalValue } from "../shared/decimal.js";

export const activeOrderStatuses = ["OPEN", "IN_PREPARATION", "READY", "SERVED"] as const;

export type OrderItemStatus = "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

export function isAllowedItemTransition(from: OrderItemStatus, to: OrderItemStatus): boolean {
  if (from === to) return false;
  const transitions: Record<OrderItemStatus, OrderItemStatus[]> = {
    PENDING: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["SERVED", "CANCELLED"],
    SERVED: [],
    CANCELLED: []
  };
  return transitions[from].includes(to);
}

export function calculateOrderTotals<T extends DecimalValue>(
  items: Array<{ lineTotal: T; isComplimentary: boolean }>,
  zero: T
) {
  const subtotal = items.reduce((sum, item) => sum.add(item.lineTotal) as T, zero);
  const complimentaryTotal = items
    .filter((item) => item.isComplimentary)
    .reduce((sum, item) => sum.add(item.lineTotal) as T, zero);
  return {
    subtotal: subtotal.toDecimalPlaces(2) as T,
    complimentaryTotal: complimentaryTotal.toDecimalPlaces(2) as T,
    discountTotal: zero,
    total: subtotal.sub(complimentaryTotal).toDecimalPlaces(2) as T
  };
}

export function orderStatusFromItems(items: Array<{ status: OrderItemStatus }>) {
  const active = items.filter((item) => item.status !== "CANCELLED");
  if (active.length > 0 && active.every((item) => item.status === "SERVED")) return "SERVED" as const;
  if (active.length > 0 && active.every((item) => item.status === "READY" || item.status === "SERVED")) {
    return "READY" as const;
  }
  if (active.some((item) => item.status === "PREPARING" || item.status === "READY" || item.status === "SERVED")) {
    return "IN_PREPARATION" as const;
  }
  return "OPEN" as const;
}
