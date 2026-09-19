export interface CategoryRow {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductPortionRow {
  id: string;
  portion: string;
  price: number;
}

export interface ProductRow {
  id: string;
  categoryId: string;
  name: string;
  type: "FOOD" | "DRINK" | "OTHER";
  price: number;
  kitchenNote: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: CategoryRow;
  portions?: ProductPortionRow[];
}

export interface CatalogRepository {
  // Categories
  listCategories(options?: { skip?: number; take?: number }): Promise<{ data: CategoryRow[]; total: number }>;
  findCategoryById(id: string): Promise<CategoryRow | null>;
  hasActiveProducts(categoryId: string): Promise<boolean>;
  createCategory(data: { name: string; sortOrder?: number }): Promise<CategoryRow>;
  updateCategory(
    id: string,
    data: { name?: string; sortOrder?: number; isActive?: boolean }
  ): Promise<CategoryRow>;

  // Products
  listProducts(filter?: { includeInactive?: boolean }, options?: { skip?: number; take?: number }): Promise<{ data: ProductRow[]; total: number }>;
  findProductById(id: string): Promise<ProductRow | null>;
  findProductsByIds(ids: string[]): Promise<ProductRow[]>;
  createProduct(data: {
    categoryId: string;
    name: string;
    type: "FOOD" | "DRINK" | "OTHER";
    price: number;
    kitchenNote?: string;
    portions?: Array<{ portion: string; price: number }>;
  }): Promise<ProductRow>;
  updateProduct(
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      type?: "FOOD" | "DRINK" | "OTHER";
      price?: number;
      kitchenNote?: string;
      isActive?: boolean;
      portions?: Array<{ portion: string; price: number }>;
    }
  ): Promise<ProductRow>;
}
