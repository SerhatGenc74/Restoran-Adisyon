import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient, ProductType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const seedUsers = [
  { username: "admin", displayName: "Sistem Yöneticisi", role: UserRole.ADMIN, envKey: "SEED_ADMIN_PASSWORD" },
  { username: "patron", displayName: "Patron", role: UserRole.OWNER, envKey: "SEED_OWNER_PASSWORD" },
  { username: "garson", displayName: "Garson", role: UserRole.WAITER, envKey: "SEED_WAITER_PASSWORD" },
  { username: "mutfak", displayName: "Mutfak", role: UserRole.KITCHEN, envKey: "SEED_KITCHEN_PASSWORD" },
  { username: "kasa", displayName: "Kasa", role: UserRole.CASHIER, envKey: "SEED_CASHIER_PASSWORD" }
] as const;

const categories = [
  { name: "Çorbalar", sortOrder: 1 },
  { name: "İçecekler", sortOrder: 2 },
  { name: "Yemekler", sortOrder: 3 }
] as const;

const products = [
  { category: "Çorbalar", name: "Mercimek Çorbası", type: ProductType.FOOD, price: "100.00" },
  { category: "Çorbalar", name: "Ezogelin Çorbası", type: ProductType.FOOD, price: "100.00" },
  { category: "Çorbalar", name: "İşkembe Çorbası", type: ProductType.FOOD, price: "150.00" },
  { category: "Çorbalar", name: "Kelle Paça Çorbası", type: ProductType.FOOD, price: "180.00" },
  { category: "İçecekler", name: "Ayran", type: ProductType.DRINK, price: "35.00" },
  { category: "İçecekler", name: "Kola", type: ProductType.DRINK, price: "50.00" },
  { category: "İçecekler", name: "Su", type: ProductType.DRINK, price: "15.00" },
  { category: "İçecekler", name: "Çay", type: ProductType.DRINK, price: "20.00" },
  { category: "Yemekler", name: "Pilav", type: ProductType.FOOD, price: "80.00" }
] as const;

async function seed() {
  const passwordHashes = new Map<string, string>();

  for (const user of seedUsers) {
    const password = process.env[user.envKey] ?? `${user.username}123`;
    passwordHashes.set(user.username, await argon2.hash(password, { type: argon2.argon2id }));
  }

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        displayName: user.displayName,
        role: user.role,
        isActive: true,
        passwordHash: passwordHashes.get(user.username)!
      },
      create: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        passwordHash: passwordHashes.get(user.username)!
      }
    });
  }

  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const savedCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: { sortOrder: category.sortOrder, isActive: true },
      create: category
    });
    categoryIds.set(category.name, savedCategory.id);
  }

  for (const product of products) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) {
      throw new Error(`Category not found for product: ${product.name}`);
    }

    const existingProduct = await prisma.product.findFirst({
      where: { categoryId, name: product.name }
    });

    if (existingProduct) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: { type: product.type, price: product.price, isActive: true }
      });
    } else {
      await prisma.product.create({
        data: {
          categoryId,
          name: product.name,
          type: product.type,
          price: product.price
        }
      });
    }
  }

  for (let number = 1; number <= 12; number += 1) {
    await prisma.diningTable.upsert({
      where: { name: `Masa ${number}` },
      update: { isActive: true },
      create: { name: `Masa ${number}`, capacity: 4 }
    });
  }

  console.log(`Seed tamamlandı: ${seedUsers.length} kullanıcı, ${products.length} ürün, 12 masa.`);
  console.log("Geliştirme kullanıcılarının varsayılan parolaları: <kullanıcı_adı>123");
}

seed()
  .catch((error) => {
    console.error("Seed başarısız:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
