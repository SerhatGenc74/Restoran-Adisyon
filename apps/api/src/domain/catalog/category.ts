import { DomainError } from "../shared/domain-error.js";

export interface CategoryProps {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export class Category {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly isActive: boolean;

  private constructor(props: CategoryProps) {
    this.id = props.id;
    this.name = props.name;
    this.sortOrder = props.sortOrder;
    this.isActive = props.isActive;
  }

  static create(props: Omit<CategoryProps, "isActive" | "id"> & { id?: string }): Category {
    if (props.sortOrder < 0) {
      throw new DomainError("INVALID_SORT_ORDER", "Siralama degeri negatif olamaz.");
    }
    return new Category({
      id: props.id ?? "",
      name: props.name,
      sortOrder: props.sortOrder,
      isActive: true
    });
  }

  static restore(props: CategoryProps): Category {
    return new Category(props);
  }

  assertCanDeactivate(hasActiveProducts: boolean): void {
    if (hasActiveProducts) {
      throw new DomainError(
        "CATEGORY_HAS_ACTIVE_PRODUCTS",
        "Aktif urunleri olan kategori pasif edilemez."
      );
    }
  }

  toSnapshot(): CategoryProps {
    return {
      id: this.id,
      name: this.name,
      sortOrder: this.sortOrder,
      isActive: this.isActive
    };
  }
}
