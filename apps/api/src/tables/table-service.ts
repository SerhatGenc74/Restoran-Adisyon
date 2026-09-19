import type { DiningTableStatus } from "../domain/tables/dining-table.js";
import { application } from "../composition.js";

/**
 * Compatibility facade for callers that still use the pre-use-case table service.
 */
export function listDiningTables() {
  return application.tables.listTables();
}

export function updateDiningTableStatus(id: string, status: DiningTableStatus) {
  return application.tables.updateStatus(id, status);
}
