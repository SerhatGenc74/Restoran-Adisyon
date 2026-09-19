// @ts-nocheck
import type { PrismaClient } from "@prisma/client-sqlite";
import type { CatalogRepository, CategoryRow, ProductRow } from "../../interfaces/catalog-repository.js";

function toCategoryRow(record: {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CategoryRow {
  return {
    id: record.id,
    name: record.name,
    sortOrder: record.sortOrder,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function toProductRow(record: {
  id: string;
  categoryId: string;
  name: string;
  type: string;
  price: { toNumber(): number };
  kitchenNote: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}): ProductRow {
  return {
    id: record.id,
    categoryId: record.categoryId,
    name: record.name,
    type: record.type as "FOOD" | "DRINK" | "OTHER",
    price: record.price.toNumber(),
    kitchenNote: record.kitchenNote,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    category: record.category ? toCategoryRow(record.category) : undefined
  };
}

export class SqliteCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Categories ──────────────────────────────────────────────────────────────

  async listCategories(options?: { skip?: number; take?: number }): Promise<{ data: CategoryRow[]; total: number }> {
    const where = { isActive: true };
    const [rows, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: options?.skip,
        take: options?.take
      }),
      this.prisma.category.count({ where })
    ]);
    return { data: rows.map(toCategoryRow), total };
  }

  async findCategoryById(id: string): Promise<CategoryRow | null> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    return row ? toCategoryRow(row) : null;
  }

  async hasActiveProducts(categoryId: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { categoryId, isActive: true }
    });
    return count > 0;
  }

  async createCategory(data: { name: string; sortOrder?: number }): Promise<CategoryRow> {
    const row = await this.prisma.category.create({ data });
    return toCategoryRow(row);
  }

  async updateCategory(
    id: string,
    data: { name?: string; sortOrder?: number; isActive?: boolean }
  ): Promise<CategoryRow> {
    const row = await this.prisma.category.update({ where: { id }, data });
    return toCategoryRow(row);
  }

  // ── Products ─────────────────────────────────────────────────────────────────

  async listProducts(filter?: { includeInactive?: boolean }, options?: { skip?: number; take?: number }): Promise<{ data: ProductRow[]; total: number }> {
    const where = filter?.includeInactive
        ? undefined
        : { isActive: true, category: { isActive: true } };
    
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
        skip: options?.skip,
        take: options?.take
      }),
      this.prisma.product.count({ where })
    ]);
    return { data: rows.map(toProductRow), total };
  }

  async findProductById(id: string): Promise<ProductRow | null> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true }
    });
    return row ? toProductRow(row) : null;
  }

  async findProductsByIds(ids: string[]): Promise<ProductRow[]> {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true, category: { isActive: true } },
      include: { category: true }
    });
    return rows.map(toProductRow);
  }

  async createProduct(data: {
    categoryId: string;
    name: string;
    type: "FOOD" | "DRINK" | "OTHER";
    price: number;
    kitchenNote?: string;
  }): Promise<ProductRow> {
    const row = await this.prisma.product.create({
      data,
      include: { category: true }
    });
    return toProductRow(row);
  }

  async updateProduct(
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
  ): Promise<ProductRow> {
    const { portions: _portions, ...productData } = data;
    const row = await this.prisma.product.update({
      where: { id },
      data: productData,
      include: { category: true }
    });
    return toProductRow(row);
  }
}
