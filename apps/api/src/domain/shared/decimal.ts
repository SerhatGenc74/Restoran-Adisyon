/**
 * The application only needs this small decimal surface.  Keeping it here
 * prevents the domain and use cases from depending on Prisma's Decimal type.
 */
export interface DecimalValue {
  add(value: DecimalValue): DecimalValue;
  sub(value: DecimalValue): DecimalValue;
  mul(value: DecimalValue): DecimalValue;
  toDecimalPlaces(decimalPlaces?: number): DecimalValue;
  eq(value: DecimalValue): boolean;
  lte(value: DecimalValue): boolean;
  gt(value: DecimalValue): boolean;
  comparedTo(value: DecimalValue): number;
}
