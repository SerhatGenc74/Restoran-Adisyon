import { DomainError } from "../shared/domain-error.js";

export type ProductType = "FOOD" | "DRINK" | "OTHER";

export interface ProductProps {
  id: string;
  categoryId: string;
  name: string;
  type: ProductType;
  price: number;
  kitchenNote?: string | null;
  isActive: boolean;
}

export class Product {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly type: ProductType;
  readonly price: number;
  readonly kitchenNote: string | null;
  readonly isActive: boolean;

  private constructor(props: ProductProps) {
    this.id = props.id;
    this.categoryId = props.categoryId;
    this.name = props.name;
    this.type = props.type;
    this.price = props.price;
    this.kitchenNote = props.kitchenNote ?? null;
    this.isActive = props.isActive;
  }

  static create(props: Omit<ProductProps, "isActive">): Product {
    if (props.price < 0) {
      throw new DomainError("INVALID_PRICE", "Urun fiyati negatif olamaz.");
    }
    return new Product({ ...props, isActive: true });
  }

  static restore(props: ProductProps): Product {
    return new Product(props);
  }

  toSnapshot(): ProductProps {
    return {
      id: this.id,
      categoryId: this.categoryId,
      name: this.name,
      type: this.type,
      price: this.price,
      kitchenNote: this.kitchenNote,
      isActive: this.isActive
    };
  }
}
