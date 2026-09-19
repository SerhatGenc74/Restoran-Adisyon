import type { DecimalValue } from "./decimal.js";

export class TestDecimal implements DecimalValue {
  constructor(val: number | string) { this.val = typeof val === "string" ? parseFloat(val) : val; }
  public val: number;

  add(value: DecimalValue): DecimalValue {
    return new TestDecimal(this.val + (value as TestDecimal).val);
  }
  sub(value: DecimalValue): DecimalValue {
    return new TestDecimal(this.val - (value as TestDecimal).val);
  }
  mul(value: DecimalValue): DecimalValue {
    return new TestDecimal(this.val * (value as TestDecimal).val);
  }
  toDecimalPlaces(decimalPlaces?: number): DecimalValue {
    const factor = Math.pow(10, decimalPlaces || 0);
    return new TestDecimal(Math.round(this.val * factor) / factor);
  }
  eq(value: DecimalValue): boolean {
    return this.val === (value as TestDecimal).val;
  }
  lte(value: DecimalValue): boolean {
    return this.val <= (value as TestDecimal).val;
  }
  gt(value: DecimalValue): boolean {
    return this.val > (value as TestDecimal).val;
  }
  comparedTo(value: DecimalValue): number {
    if (this.val > (value as TestDecimal).val) return 1;
    if (this.val < (value as TestDecimal).val) return -1;
    return 0;
  }
  toString() {
    return this.val.toString();
  }
}

export function dec(val: number | string): DecimalValue {
  return new TestDecimal(val);
}
