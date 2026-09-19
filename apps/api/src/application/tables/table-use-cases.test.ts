import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableUseCases, TableBusinessError } from './table-use-cases.js';

describe('TableUseCases', () => {
  let repository: any;
  let useCases: TableUseCases;

  beforeEach(() => {
    repository = {
      listActiveTables: vi.fn(),
      updateStatus: vi.fn(),
      findById: vi.fn()
    };
    useCases = new TableUseCases(repository);
  });

  it('should list tables', async () => {
    repository.listActiveTables.mockResolvedValue([{ id: 'table-1', name: 'Masa 1', status: 'AVAILABLE' }]);
    const tables = await useCases.listTables();
    expect(tables).toHaveLength(1);
    expect(repository.listActiveTables).toHaveBeenCalled();
  });

  it('should update table status', async () => {
    repository.findById.mockResolvedValue({ id: 'table-1', name: 'Masa 1', status: 'AVAILABLE', isActive: true, occupy: vi.fn(), release: vi.fn(), reserve: vi.fn(), setOutOfService: vi.fn() });
    repository.updateStatus.mockResolvedValue({ id: 'table-1', status: 'OCCUPIED' });
    
    const table = await useCases.updateStatus('table-1', 'OCCUPIED');
    expect(repository.updateStatus).toHaveBeenCalledWith('table-1', 'OCCUPIED');
    expect((table as any).status).toBe('OCCUPIED');
  });
});
