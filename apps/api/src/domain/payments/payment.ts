import type { DecimalValue } from "../shared/decimal.js";
import { DomainError } from "../shared/domain-error.js";

export const paymentMethods = ["CASH", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentStatuses = ["COMPLETED", "REFUNDED", "VOIDED"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export interface PaymentProps {
  id: string;
  orderId: string;
  receivedById: string;
  method: PaymentMethod;
  amount: DecimalValue;
  transactionRef?: string | null;
  note?: string | null;
  status?: PaymentStatus;
}

export class Payment {
  readonly id: string;
  readonly orderId: string;
  readonly receivedById: string;
  readonly method: PaymentMethod;
  readonly amount: DecimalValue;
  readonly transactionRef: string | null;
  readonly note: string | null;
  readonly status: PaymentStatus;

  constructor(props: PaymentProps) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.receivedById = props.receivedById;
    this.method = props.method;
    this.amount = props.amount.toDecimalPlaces(2);
    this.transactionRef = props.transactionRef ?? null;
    this.note = props.note ?? null;
    this.status = props.status ?? "COMPLETED";

    if (!this.amount.gt(this.amount.sub(this.amount))) {
      throw new DomainError("INVALID_AMOUNT", "Ödeme tutarı sıfırdan büyük olmalıdır.");
    }
    if (!props.amount.eq(this.amount)) {
      throw new DomainError("INVALID_AMOUNT", "Ödeme tutarı en fazla iki ondalık basamak içerebilir.");
    }
  }

  static create(props: PaymentProps): Payment {
    return new Payment(props);
  }

  static restore(props: PaymentProps): Payment {
    return new Payment(props);
  }

  toSnapshot() {
    return {
      id: this.id,
      orderId: this.orderId,
      receivedById: this.receivedById,
      method: this.method,
      amount: this.amount,
      transactionRef: this.transactionRef,
      note: this.note,
      status: this.status
    };
  }
}
