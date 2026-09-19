import type { DecimalValue } from "../shared/decimal.js";
import { DomainError } from "../shared/domain-error.js";
import { isAllowedItemTransition, type OrderItemStatus } from "./order-rules.js";

export type { OrderItemStatus };

export interface OrderItemProps {
  id: string;
  productId: string;
  quantity: DecimalValue;
  portion?: string;
  unitPrice: DecimalValue;
  lineTotal?: DecimalValue;
  status?: OrderItemStatus;
  isComplimentary?: boolean;
  complimentaryReason?: string | null;
  note?: string | null;
}

export interface OrderItemUpdate {
  quantity?: DecimalValue;
  portion?: string;
  unitPrice?: DecimalValue;
  isComplimentary?: boolean;
  complimentaryReason?: string | null;
  note?: string | null;
}

/**
 * The order item owns all rules concerning kitchen state and editable item
 * details. Persistence adapters can use `toSnapshot` without leaking their
 * own types into the domain.
 */
export class OrderItem {
  private _quantity: DecimalValue;
  private _portion: string;
  private _lineTotal: DecimalValue;
  private _status: OrderItemStatus;
  private _isComplimentary: boolean;
  private _complimentaryReason: string | null;
  private _note: string | null;

  readonly id: string;
  readonly productId: string;
  private _unitPrice: DecimalValue;

  constructor(props: OrderItemProps) {
    this.id = props.id;
    this.productId = props.productId;
    this._unitPrice = props.unitPrice;
    this._quantity = props.quantity;
    this._portion = props.portion ?? "TAM";
    this._status = props.status ?? "PENDING";
    this._isComplimentary = props.isComplimentary ?? false;
    this._complimentaryReason = props.complimentaryReason ?? null;
    this._note = props.note ?? null;
    this.assertPositiveQuantity(this._quantity);
    this._lineTotal = this.calculateLineTotal();
  }

  static create(props: OrderItemProps): OrderItem {
    return new OrderItem(props);
  }

  /**
   * Rehydrates an item from persistence without recalculating its stored
   * line total. New items should use `create`, which derives the total from
   * quantity and unit price.
   */
  static restore(props: OrderItemProps & { lineTotal: DecimalValue }): OrderItem {
    const item = new OrderItem(props);
    item._lineTotal = props.lineTotal;
    return item;
  }

  get quantity() {
    return this._quantity;
  }

  get portion() {
    return this._portion;
  }

  get unitPrice() {
    return this._unitPrice;
  }

  get lineTotal() {
    return this._lineTotal;
  }

  get status() {
    return this._status;
  }

  get isComplimentary() {
    return this._isComplimentary;
  }

  get complimentaryReason() {
    return this._complimentaryReason;
  }

  get note() {
    return this._note;
  }

  update(changes: OrderItemUpdate): void {
    this.assertDetailsEditable();
    if (changes.quantity !== undefined) {
        this.assertPositiveQuantity(changes.quantity);
        this._quantity = changes.quantity;
    }
    if (changes.portion !== undefined) {
        this._portion = changes.portion;
    }
    if (changes.unitPrice !== undefined) {
        this._unitPrice = changes.unitPrice;
    }
    if (changes.isComplimentary !== undefined) this._isComplimentary = changes.isComplimentary;
    if (changes.complimentaryReason !== undefined) this._complimentaryReason = changes.complimentaryReason;
    if (changes.note !== undefined) this._note = changes.note;
    this._lineTotal = this.calculateLineTotal();
  }

  transitionTo(status: OrderItemStatus): void {
    if (!isAllowedItemTransition(this._status, status)) {
      throw new DomainError("INVALID_TRANSITION", "Mutfak durumu geçişi geçersiz.");
    }
    this._status = status;
  }

  cancel(): void {
    this.transitionTo("CANCELLED");
  }

  toSnapshot() {
    return {
      id: this.id,
      productId: this.productId,
      quantity: this._quantity,
      portion: this._portion,
      unitPrice: this.unitPrice,
      lineTotal: this._lineTotal,
      status: this._status,
      isComplimentary: this._isComplimentary,
      complimentaryReason: this._complimentaryReason,
      note: this._note
    };
  }

  private calculateLineTotal() {
    return this._quantity.mul(this.unitPrice).toDecimalPlaces(2);
  }

  private assertPositiveQuantity(quantity: DecimalValue): void {
    if (!quantity.gt(quantity.sub(quantity))) {
      throw new DomainError("INVALID_QUANTITY", "Adet sıfırdan büyük olmalıdır.");
    }
  }

  private assertDetailsEditable(): void {
    if (this._status !== "PENDING") {
      throw new DomainError("ITEM_NOT_EDITABLE", "Hazırlanmaya başlayan kalem değiştirilemez.");
    }
  }
}
