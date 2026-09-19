import { describe, it, expect } from 'vitest';
import { dec } from '../shared/test-decimal.js';
import { OrderItem } from './order-item.js';
import { DomainError } from '../shared/domain-error.js';

describe('OrderItem Entity', () => {
  it('should transition status correctly', () => {
    const item = OrderItem.create({
      id: 'item-1',
      productId: 'prod-1',
      quantity: dec(1),
      unitPrice: dec(10),
      status: 'PENDING',
      isComplimentary: false
    });

    item.transitionTo('PREPARING');
    expect(item.status).toBe('PREPARING');

    item.transitionTo('READY');
    expect(item.status).toBe('READY');

    item.transitionTo('SERVED');
    expect(item.status).toBe('SERVED');
  });

  it('should throw error when invalid transition', () => {
    const item = OrderItem.create({
      id: 'item-1',
      productId: 'prod-1',
      quantity: dec(1),
      unitPrice: dec(10),
      status: 'SERVED',
      isComplimentary: false
    });

    expect(() => item.transitionTo('PREPARING')).toThrowError(DomainError);
    expect(() => item.transitionTo('PREPARING')).toThrowError("Mutfak durumu geçişi geçersiz.");
  });
});
