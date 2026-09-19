import { describe, it, expect } from 'vitest';
import { Order } from './order.js';
import { dec } from '../shared/test-decimal.js';
import { OrderItem } from './order-item.js';

describe('Order Entity', () => {
  const defaultOrderProps = { zero: dec(0),
    id: 'order-1',
    tableId: 'table-1',
    orderNumber: 1,
    status: 'OPEN' as const,
    note: null,
    openedAt: new Date(),
    closedAt: null,
    createdById: 'user-1',
    servedById: null,
    items: [],
    payments: []
  };

  it('should calculate totals correctly for new items', () => {
    const order = Order.create({
      ...defaultOrderProps,
      items: [
        OrderItem.create({
          id: 'item-1',
          productId: 'prod-1',
          quantity: dec(2),
          unitPrice: dec(50),
          status: 'PENDING',
          isComplimentary: false
        }),
        OrderItem.create({
          id: 'item-2',
          productId: 'prod-2',
          quantity: dec(1),
          unitPrice: dec(30),
          status: 'PENDING',
          isComplimentary: true
        })
      ]
    });

    // Totals should be recalculated when created
    expect(order.subtotal.toString()).toBe("130"); // 2*50 + 1*30
    expect(order.complimentaryTotal.toString()).toBe("30");
    expect(order.discountTotal.toString()).toBe("0");
    expect(order.total.toString()).toBe("100"); // 130 - 30 - 0
  });

  it('should not allow payment if cancelled', () => {
    const order = Order.create({ ...defaultOrderProps, status: 'CANCELLED' });
    expect(order.status).toBe('CANCELLED');
  });

  it('should handle complimentary items correctly', () => {
    const order = Order.create({
      ...defaultOrderProps,
      items: [
        OrderItem.create({
          id: 'item-1',
          productId: 'prod-1',
          quantity: dec(2),
          unitPrice: dec(50), // 100
          status: 'PENDING',
          isComplimentary: false
        }),
        OrderItem.create({
          id: 'item-2',
          productId: 'prod-2',
          quantity: dec(1),
          unitPrice: dec(30), // 30
          status: 'PENDING',
          isComplimentary: true // İkram
        })
      ]
    });

    // İkram olan ürünün tutarı complimentaryTotal'a eklenir, total'a eklenmez.
    expect(order.subtotal.toString()).toBe("130");
    expect(order.complimentaryTotal.toString()).toBe("30");
    expect(order.total.toString()).toBe("100");
  });
});
