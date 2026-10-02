import type { DiningTable, DiningTableStatus } from "../domain/tables/dining-table.js";

export interface DiningTableOrderSummary {
  id: string;
  orderNumber: number;
  status: string;
  total: unknown;
}

export interface DiningTableListItem {
  id: string;
  name: string;
  capacity: number | null;
  status: DiningTableStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  orders: DiningTableOrderSummary[];
}

export interface TableRepository {
  listActiveTables(options?: { skip?: number; take?: number }): Promise<{ data: DiningTableListItem[]; total: number }>;
  create(data: { name: string; capacity?: number }): Promise<DiningTableListItem>;
  findById(id: string): Promise<DiningTable | null>;
  findActiveOrderForTable(id: string): Promise<{ id: string } | null>;
  updateStatus(id: string, status: DiningTableStatus): Promise<unknown>;
  update(id: string, data: { name?: string; capacity?: number; isActive?: boolean }): Promise<DiningTableListItem>;
  delete(id: string): Promise<void>;
}
