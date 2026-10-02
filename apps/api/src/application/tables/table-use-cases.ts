import { DiningTable, type DiningTableStatus } from "../../domain/tables/dining-table.js";
import { DomainError } from "../../domain/shared/domain-error.js";
import type { TableRepository } from "../../interfaces/table-repository.js";

export class TableBusinessError extends Error {
  constructor(
    public readonly code: "TABLE_NOT_FOUND" | "TABLE_HAS_ACTIVE_ORDER" | "TABLE_UNAVAILABLE",
    message: string
  ) {
    super(message);
  }
}

export class TableUseCases {
  constructor(private readonly repository: TableRepository) {}

  listDiningTables(options?: { skip?: number; take?: number }) {
    return this.repository.listActiveTables(options);
  }

  listTables(options?: { skip?: number; take?: number }) {
    return this.listDiningTables(options);
  }

  createTable(input: { name: string; capacity?: number }) {
    return this.repository.create(input);
  }

  async updateDiningTableStatus(id: string, status: DiningTableStatus) {
    const table = await this.repository.findById(id);
    if (!table || !table.isActive) {
      throw new TableBusinessError("TABLE_NOT_FOUND", "Masa bulunamadı.");
    }

    if (status === "AVAILABLE" && (await this.repository.findActiveOrderForTable(id))) {
      throw new TableBusinessError("TABLE_HAS_ACTIVE_ORDER", "Masanın aktif adisyonu var.");
    }

    try {
      this.applyStatus(table, status);
    } catch (error) {
      if (error instanceof DomainError) {
        if (error.code === "TABLE_OCCUPIED") {
          throw new TableBusinessError("TABLE_HAS_ACTIVE_ORDER", "Masanın aktif adisyonu var.");
        }
        if (error.code === "TABLE_UNAVAILABLE") {
          throw new TableBusinessError("TABLE_UNAVAILABLE", "Masa kullanıma kapalı.");
        }
      }
      throw error;
    }

    return this.repository.updateStatus(id, status);
  }

  updateStatus(id: string, status: DiningTableStatus) {
    return this.updateDiningTableStatus(id, status);
  }

  async updateTable(id: string, data: { name?: string; capacity?: number; isActive?: boolean }) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new TableBusinessError("TABLE_NOT_FOUND", "Masa bulunamadı.");
    return this.repository.update(id, data);
  }

  async deleteTable(id: string) {
    const activeOrder = await this.repository.findActiveOrderForTable(id);
    if (activeOrder) throw new TableBusinessError("TABLE_HAS_ACTIVE_ORDER", "Masanın aktif adisyonu var.");
    await this.repository.delete(id);
  }

  private applyStatus(table: DiningTable, status: DiningTableStatus) {
    switch (status) {
      case "AVAILABLE":
        table.release();
        break;
      case "OCCUPIED":
        table.occupy();
        break;
      case "RESERVED":
        table.reserve();
        break;
      case "OUT_OF_SERVICE":
        table.setOutOfService();
        break;
    }
  }
}
