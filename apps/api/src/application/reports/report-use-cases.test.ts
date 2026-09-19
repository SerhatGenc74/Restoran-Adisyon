import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportUseCases } from './report-use-cases.js';
import { dec } from '../../domain/shared/test-decimal.js';

describe('ReportUseCases', () => {
  let repository: any;
  let useCases: ReportUseCases;

  beforeEach(() => {
    repository = {
      findCompletedPayments: vi.fn(),
      findPaidOrderItems: vi.fn(),
      upsertDailyReport: vi.fn(),
      zero: vi.fn(() => dec(0))
    };
    useCases = new ReportUseCases(repository);
  });

  it('should aggregate daily report correctly', async () => {
    // Mock payments: 100 CASH, 200 CARD
    repository.findCompletedPayments.mockResolvedValue([
      { id: 'p1', orderId: 'o1', method: 'CASH', amount: dec(100) },
      { id: 'p2', orderId: 'o2', method: 'CARD', amount: dec(200) }
    ]);
    
    // Mock items
    repository.findPaidOrderItems.mockResolvedValue([
      { id: 'i1', productId: 'prod-1', orderId: 'o1', quantity: dec(1), lineTotal: dec(100), isComplimentary: false, product: { name: 'Çorba', type: 'FOOD' } },
      { id: 'i2', productId: 'prod-2', orderId: 'o2', quantity: dec(1), lineTotal: dec(200), isComplimentary: false, product: { name: 'Kebap', type: 'FOOD' } },
      { id: 'i3', productId: 'prod-3', orderId: 'o2', quantity: dec(1), lineTotal: dec(30), isComplimentary: true, product: { name: 'Çay', type: 'DRINK' } }
    ]);

    repository.upsertDailyReport.mockResolvedValue({ id: 'rep-1' });

    const result = await useCases.aggregateDailyReport('2026-09-16', 'user-1');

    expect(repository.findCompletedPayments).toHaveBeenCalled();
    expect(repository.findPaidOrderItems).toHaveBeenCalledWith(['o1', 'o2']);
    
    // Verify report data sent to upsert
    const upsertArgs = repository.upsertDailyReport.mock.calls[0][0];
    expect(upsertArgs.totalRevenue.toString()).toBe("300"); // 100+200
    expect(upsertArgs.cashRevenue.toString()).toBe("100");
    expect(upsertArgs.cardRevenue.toString()).toBe("200");
    expect(upsertArgs.complimentaryTotal.toString()).toBe("30");
    expect(upsertArgs.orderCount).toBe(2);

    expect((result.report as any).id).toBe('rep-1');
    expect(result.topProducts).toHaveLength(3);
  });
});
