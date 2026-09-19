import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderUseCases, OrderBusinessError } from './order-use-cases.js';
import type { OrderTransaction, OrderDto } from '../../interfaces/order-repository.js';
import { dec } from '../../domain/shared/test-decimal.js';
import type { DecimalValue } from '../../domain/shared/decimal.js';

describe('OrderUseCases', () => {
  let repository: any;
  let tx: any;
  let useCases: OrderUseCases;

  beforeEach(() => {
    tx = {
      decimal: vi.fn(dec),
      zero: vi.fn(() => dec(0)),
      findTable: vi.fn(),
      findActiveOrderForTable: vi.fn(),
      findProducts: vi.fn(),
      createOrder: vi.fn(),
      createOrderItem: vi.fn(),
      updateOrderTotals: vi.fn(),
      updateOrderStatus: vi.fn(),
      markTableOccupied: vi.fn(),
      getOrder: vi.fn(),
      listOrderItems: vi.fn()
    };
    repository = {
      transaction: vi.fn((work) => work(tx))
    };
    useCases = new OrderUseCases(repository);
  });

  it('should create order successfully', async () => {
    tx.findTable.mockResolvedValue({ isActive: true, status: 'AVAILABLE' });
    tx.findActiveOrderForTable.mockResolvedValue(null);
    tx.findProducts.mockResolvedValue([{ id: 'prod-1', price: 10 }]);
    tx.createOrder.mockResolvedValue({ id: 'order-1' });
    tx.getOrder.mockResolvedValue({ id: 'order-1', status: 'OPEN' });

    const result = await useCases.createOrder(
      { tableId: 'table-1', items: [{ productId: 'prod-1', quantity: 2 }] },
      'user-1'
    );

    expect(tx.findTable).toHaveBeenCalledWith('table-1');
    expect(tx.createOrder).toHaveBeenCalled();
    expect(tx.markTableOccupied).toHaveBeenCalledWith('table-1');
    expect(result).toEqual({ id: 'order-1' });
  });

  it('should throw error if table is not available', async () => {
    tx.findTable.mockResolvedValue({ isActive: true, status: 'OCCUPIED' });
    tx.findActiveOrderForTable.mockResolvedValue({ id: 'order-1', status: 'OPEN' });

    await expect(useCases.createOrder({ tableId: 'table-1', items: [] }, 'user-1'))
      .rejects
      .toThrowError(OrderBusinessError);
  });
});
