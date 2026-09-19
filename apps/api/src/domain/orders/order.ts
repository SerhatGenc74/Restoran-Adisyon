import type { DecimalValue } from "../shared/decimal.js";
import { DomainError } from "../shared/domain-error.js";
import { calculateOrderTotals, orderStatusFromItems, type OrderItemStatus } from "./order-rules.js";
import { OrderItem, type OrderItemProps, type OrderItemUpdate } from "./order-item.js";
import { Payment } from "../payments/payment.js";

export const orderStatuses = ["OPEN", "IN_PREPARATION", "READY", "SERVED", "PAID", "CANCELLED"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export interface OrderProps {
  id: string;
  tableId?: string | null;
  status?: OrderStatus;
  items?: OrderItem[];
  payments?: Payment[];
  total?: DecimalValue;
  subtotal?: DecimalValue;
  complimentaryTotal?: DecimalValue;
  discountTotal?: DecimalValue;
  zero?: DecimalValue;
}

export class Order {
  private _status: OrderStatus;
  private readonly _items: OrderItem[];
  private readonly _payments: Payment[];

  readonly id: string;
  readonly tableId: string | null;
  private _total: DecimalValue;
  private _subtotal: DecimalValue;
  private _complimentaryTotal: DecimalValue;
  private _discountTotal: DecimalValue;

  constructor(props: OrderProps) {
    this.id = props.id;
    this.tableId = props.tableId ?? null;
    this._status = props.status ?? "OPEN";
    this._items = [...(props.items ?? [])];
    this._payments = [...(props.payments ?? [])];
    const firstItem = this._items[0];
    const zero = props.zero ?? firstItem?.lineTotal.sub(firstItem.lineTotal);
    if (!props.total && !zero) {
      throw new DomainError("INVALID_TOTAL", "Adisyon toplamı belirtilmelidir.");
    }
    const calculated = !props.total
      ? calculateOrderTotals(
          this._items.map((item) => ({ lineTotal: item.lineTotal, isComplimentary: item.isComplimentary })),
          zero as DecimalValue
        )
      : undefined;
    this._total = props.total ?? calculated!.total;
    this._subtotal = props.subtotal ?? calculated?.subtotal ?? this.zeroFromTotal();
    this._complimentaryTotal = props.complimentaryTotal ?? calculated?.complimentaryTotal ?? this.zeroFromTotal();
    this._discountTotal = props.discountTotal ?? calculated?.discountTotal ?? this.zeroFromTotal();
  }

  static create(props: Omit<OrderProps, "total"> & { zero: DecimalValue }): Order {
    const totals = calculateOrderTotals(
      (props.items ?? []).map((item) => ({
        lineTotal: item.lineTotal,
        portion: item.portion,
        isComplimentary: item.isComplimentary
      })),
      props.zero
    );
    return new Order({ ...props, ...totals });
  }

  static restore(props: OrderProps): Order {
    return new Order(props);
  }

  get status() {
    return this._status;
  }

  get total() {
    return this._total;
  }

  get subtotal() {
    return this._subtotal;
  }

  get complimentaryTotal() {
    return this._complimentaryTotal;
  }

  get discountTotal() {
    return this._discountTotal;
  }

  get items(): readonly OrderItem[] {
    return this._items;
  }

  get payments(): readonly Payment[] {
    return this._payments;
  }

  get paidTotal(): DecimalValue {
    return this._payments.reduce((sum, payment) => sum.add(payment.amount), this.zeroFromTotal());
  }

  get remainingBalance(): DecimalValue {
    return this.total.sub(this.paidTotal).toDecimalPlaces(2);
  }

  toSnapshot() {
    return {
      id: this.id,
      tableId: this.tableId,
      status: this._status,
      items: [...this._items],
      payments: [...this._payments],
      total: this._total,
      subtotal: this._subtotal,
      complimentaryTotal: this._complimentaryTotal,
      discountTotal: this._discountTotal
    };
  }

  addItem(item: OrderItem): void {
    this.assertEditable();
    this._items.push(item);
    this.recalculateTotals();
  }

  updateItem(itemId: string, changes: OrderItemUpdate): void {
    this.assertEditable();
    this.findItem(itemId).update(changes);
    this.recalculateTotals();
  }

  cancelItem(itemId: string): void {
    this.assertEditable();
    this.findItem(itemId).cancel();
  }

  transitionItem(itemId: string, status: OrderItemStatus): void {
    this.assertEditable();
    this.findItem(itemId).transitionTo(status);
    this._status = orderStatusFromItems(this._items);
  }

  /**
   * Records a completed payment. An order becomes PAID only when its complete
   * balance has been received; partial payments leave it open.
   */
  receivePayment(payment: Payment): boolean {
    if (this._status === "CANCELLED") {
      throw new DomainError("ORDER_CLOSED", "İptal edilmiş adisyona ödeme alınamaz.");
    }
    if (this._status === "PAID") {
      throw new DomainError("ORDER_ALREADY_PAID", "Adisyon zaten tamamen ödendi.");
    }
    if (payment.orderId !== this.id) {
      throw new DomainError("PAYMENT_ORDER_MISMATCH", "Ödeme farklı bir adisyona aittir.");
    }
    if (payment.status !== "COMPLETED") {
      throw new DomainError("INVALID_PAYMENT", "Sadece tamamlanmış ödemeler adisyona eklenebilir.");
    }
    if (payment.amount.gt(this.remainingBalance)) {
      throw new DomainError("AMOUNT_EXCEEDS_REMAINING", "Ödeme tutarı kalan borçtan fazla olamaz.");
    }
    this._payments.push(payment);
    if (this.remainingBalance.eq(this.zeroFromTotal())) this._status = "PAID";
    return this._status === "PAID";
  }

  assertEditable(): void {
    if (this._status === "PAID" || this._status === "CANCELLED") {
      throw new DomainError("ORDER_NOT_EDITABLE", "Kapanmış adisyon değiştirilemez.");
    }
  }

  static assertEditableStatus(status: string): asserts status is Exclude<OrderStatus, "PAID" | "CANCELLED"> {
    if (status === "PAID" || status === "CANCELLED") {
      throw new DomainError("ORDER_NOT_EDITABLE", "Kapanmış adisyon değiştirilemez.");
    }
  }

  calculateTotals(zero: DecimalValue) {
    return calculateOrderTotals(
      this._items.map((item) => ({ lineTotal: item.lineTotal, isComplimentary: item.isComplimentary })),
      zero
    );
  }

  private recalculateTotals(): void {
    const totals = this.calculateTotals(this.zeroFromTotal());
    this._subtotal = totals.subtotal;
    this._complimentaryTotal = totals.complimentaryTotal;
    this._discountTotal = totals.discountTotal;
    this._total = totals.total;
  }

  private findItem(itemId: string): OrderItem {
    const item = this._items.find((candidate) => candidate.id === itemId);
    if (!item) throw new DomainError("ITEM_NOT_FOUND", "Adisyon kalemi bulunamadı.");
    return item;
  }

  private zeroFromTotal(): DecimalValue {
    return this.total.sub(this.total);
  }
}
