import type { CatalogRepository } from "../../interfaces/catalog-repository.js";
import { Category } from "../../domain/catalog/category.js";
import { Product } from "../../domain/catalog/product.js";
import { DomainError } from "../../domain/shared/domain-error.js";

export interface CategoryCreateInput {
  name: string;
  sortOrder?: number;
}

export interface CategoryUpdateInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ProductCreateInput {
  categoryId: string;
  name: string;
  type: "FOOD" | "DRINK" | "OTHER";
  price: number;
  kitchenNote?: string;
  portions?: Array<{ portion: string; price: number }>;
}

export interface ProductUpdateInput {
  categoryId?: string;
  name?: string;
  type?: "FOOD" | "DRINK" | "OTHER";
  price?: number;
  isActive?: boolean;
  kitchenNote?: string;
  portions?: Array<{ portion: string; price: number }>;
}

export class CatalogBusinessError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "CatalogBusinessError";
  }
}

export class CatalogUseCases {
  constructor(private readonly repository: CatalogRepository) {}

  // ── Categories ──────────────────────────────────────────────────────────────

  listCategories(options?: { skip?: number; take?: number }) {
    return this.repository.listCategories(options);
  }

  async createCategory(input: CategoryCreateInput) {
    try {
      Category.create({ name: input.name, sortOrder: input.sortOrder ?? 0 });
    } catch (error) {
      throw this.toCatalogError(error);
    }
    return this.repository.createCategory(input);
  }

  async updateCategory(id: string, input: CategoryUpdateInput) {
    const existing = await this.repository.findCategoryById(id);
    if (!existing) {
      throw new CatalogBusinessError("CATEGORY_NOT_FOUND", "Kategori bulunamadi.");
    }

    // Business rule: aktif urunleri olan kategori pasif edilemez
    if (input.isActive === false && existing.isActive) {
      const domain = Category.restore(existing);
      const hasActive = await this.repository.hasActiveProducts(id);
      try {
        domain.assertCanDeactivate(hasActive);
      } catch (error) {
        throw this.toCatalogError(error);
      }
    }

    return this.repository.updateCategory(id, input);
  }

  // ── Products ─────────────────────────────────────────────────────────────────

  listProducts(filter?: { includeInactive?: boolean }, options?: { skip?: number; take?: number }) {
    return this.repository.listProducts(filter, options);
  }

  async createProduct(input: ProductCreateInput) {
    const category = await this.repository.findCategoryById(input.categoryId);
    if (!category || !category.isActive) {
      throw new CatalogBusinessError("CATEGORY_NOT_FOUND", "Kategori bulunamadi veya pasif.");
    }

    try {
      Product.create({
        id: "new",
        categoryId: input.categoryId,
        name: input.name,
        type: input.type,
        price: input.price,
        kitchenNote: input.kitchenNote
      });
    } catch (error) {
      throw this.toCatalogError(error);
    }

    return this.repository.createProduct(input);
  }

  async updateProduct(id: string, input: ProductUpdateInput) {
    const existing = await this.repository.findProductById(id);
    if (!existing) {
      throw new CatalogBusinessError("PRODUCT_NOT_FOUND", "Urun bulunamadi.");
    }

    // Business rule: pasif kategorideki urun aktif edilemez
    if (input.isActive === true && !existing.isActive) {
      const categoryId = input.categoryId ?? existing.categoryId;
      const category = await this.repository.findCategoryById(categoryId);
      if (!category || !category.isActive) {
        throw new CatalogBusinessError(
          "CATEGORY_INACTIVE",
          "Pasif kategorideki urun aktif edilemez."
        );
      }
    }

    if (input.categoryId && input.categoryId !== existing.categoryId) {
      const category = await this.repository.findCategoryById(input.categoryId);
      if (!category || !category.isActive) {
        throw new CatalogBusinessError("CATEGORY_NOT_FOUND", "Kategori bulunamadi veya pasif.");
      }
    }

    if (input.price !== undefined && input.price < 0) {
      throw new CatalogBusinessError("INVALID_PRICE", "Urun fiyati negatif olamaz.");
    }

    return this.repository.updateProduct(id, input);
  }

  private toCatalogError(error: unknown): CatalogBusinessError {
    if (error instanceof DomainError) {
      return new CatalogBusinessError(error.code, error.message);
    }
    if (error instanceof CatalogBusinessError) return error;
    return new CatalogBusinessError("CATALOG_ERROR", "Katalog islemi gecersiz.");
  }
}
