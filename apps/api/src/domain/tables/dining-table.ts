import { DomainError } from "../shared/domain-error.js";

export const diningTableStatuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"] as const;
export type DiningTableStatus = (typeof diningTableStatuses)[number];

export interface DiningTableProps {
  id: string;
  name: string;
  capacity?: number | null;
  status?: DiningTableStatus;
  isActive?: boolean;
}

export class DiningTable {
  readonly id: string;
  readonly name: string;
  readonly capacity: number | null;
  readonly isActive: boolean;
  private _status: DiningTableStatus;

  constructor(props: DiningTableProps) {
    this.id = props.id;
    this.name = props.name;
    this.capacity = props.capacity ?? null;
    this.isActive = props.isActive ?? true;
    this._status = props.status ?? "AVAILABLE";
  }

  get status() {
    return this._status;
  }

  occupy(): void {
    if (!this.isActive || this._status === "OUT_OF_SERVICE" || this._status === "RESERVED") {
      throw new DomainError("TABLE_UNAVAILABLE", "Masa kullanıma kapalı.");
    }
    if (this._status === "OCCUPIED") {
      throw new DomainError("TABLE_OCCUPIED", "Masanın aktif adisyonu var.");
    }
    this._status = "OCCUPIED";
  }

  release(): void {
    this._status = "AVAILABLE";
  }

  reserve(): void {
    if (!this.isActive || this._status === "OUT_OF_SERVICE" || this._status === "OCCUPIED") {
      throw new DomainError("TABLE_UNAVAILABLE", "Masa kullanıma kapalı.");
    }
    this._status = "RESERVED";
  }

  setOutOfService(): void {
    if (this._status === "OCCUPIED") {
      throw new DomainError("TABLE_OCCUPIED", "Masanın aktif adisyonu var.");
    }
    this._status = "OUT_OF_SERVICE";
  }
}
