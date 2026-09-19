import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentUseCases, PaymentBusinessError } from './payment-use-cases.js';
import type { PaymentRepository, PaymentTransaction, PaymentOrder } from '../../interfaces/payment-repository.js';
import { dec } from '../../domain/shared/test-decimal.js';
import type { DecimalValue } from '../../domain/shared/decimal.js';

describe('PaymentUseCases', () => {
  let repository: any;
  let tx: any;
  let useCases: PaymentUseCases;

  beforeEach(() => {
    tx = {
      findOrderForPayment: vi.fn(),
      decimal: vi.fn(dec),
      zero: vi.fn(() => dec(0)),
      createPayment: vi.fn(),
      markOrderPaid: vi.fn(),
      releaseTable: vi.fn(),
      getOrder: vi.fn()
    };
    repository = {
      transaction: vi.fn((work) => work(tx))
    };
    useCases = new PaymentUseCases(repository);
  });

  it('should complete payment and mark order as PAID if balance is 0', async () => {
    tx.findOrderForPayment.mockResolvedValue({
      id: 'order-1',
      status: 'OPEN',
      total: dec(100),
      tableId: 'table-1',
      payments: []
    } as PaymentOrder);

    tx.createPayment.mockResolvedValue(true);
    tx.getOrder.mockResolvedValue({ id: 'order-1', status: 'PAID' });

    const result = await useCases.completePayment('order-1', { amount: 100, method: 'CASH' }, 'user-1');

    expect(tx.findOrderForPayment).toHaveBeenCalledWith('order-1');
    expect(tx.createPayment).toHaveBeenCalled();
    expect(tx.markOrderPaid).toHaveBeenCalledWith('order-1');
    expect(tx.releaseTable).toHaveBeenCalledWith('table-1');
    expect(result.payment).toBe(true);
  });

  it('should throw error if amount exceeds remaining balance', async () => {
    tx.findOrderForPayment.mockResolvedValue({
      id: 'order-1',
      status: 'OPEN',
      total: dec(100),
      tableId: 'table-1',
      payments: [{ amount: dec(50) }]
    });

    await expect(useCases.completePayment('order-1', { amount: 60, method: 'CASH' }, 'user-1'))
      .rejects
      .toThrowError(PaymentBusinessError);
  });

  it('should support split payments (bölünmüş ödeme) without marking order as PAID', async () => {
    tx.findOrderForPayment.mockResolvedValue({
      id: 'order-1',
      status: 'OPEN',
      total: dec(200),
      tableId: 'table-1',
      payments: [{ amount: dec(50) }] // Previously paid 50
    });

    tx.createPayment.mockResolvedValue(true);
    tx.getOrder.mockResolvedValue({ id: 'order-1', status: 'OPEN' });

    const result = await useCases.completePayment('order-1', { amount: 100, method: 'CARD' }, 'user-1');

    expect(tx.createPayment).toHaveBeenCalled();
    expect(tx.markOrderPaid).not.toHaveBeenCalled();
    expect(tx.releaseTable).not.toHaveBeenCalled();
    expect(result.payment).toBe(true);
    expect(result.remaining.toString()).toBe("50");
  });
});
