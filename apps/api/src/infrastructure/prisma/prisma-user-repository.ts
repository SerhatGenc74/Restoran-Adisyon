import type { PrismaClient } from "@prisma/client";
import type { UserRepository, UserRow } from "../../interfaces/user-repository.js";
import type { UserRole } from "../../domain/users/user.js";

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

function toUserRow(record: {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserRow {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    role: record.role as UserRole,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listUsers(options?: { skip?: number; take?: number }): Promise<{ data: UserRow[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        select: userSelect,
        orderBy: { username: "asc" },
        skip: options?.skip,
        take: options?.take
      }),
      this.prisma.user.count()
    ]);
    return { data: rows.map(toUserRow), total };
  }

  async findById(id: string): Promise<UserRow | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    return row ? toUserRow(row) : null;
  }

  async findByUsernameWithPassword(username: string): Promise<(UserRow & { passwordHash: string }) | null> {
    const row = await this.prisma.user.findUnique({
      where: { username },
      select: { ...userSelect, passwordHash: true }
    });
    return row ? { ...toUserRow(row), passwordHash: row.passwordHash } : null;
  }

  async createUser(data: {
    username: string;
    passwordHash: string;
    displayName: string;
    role: UserRole;
  }): Promise<UserRow> {
    const row = await this.prisma.user.create({
      data: {
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        role: data.role
      },
      select: userSelect
    });
    return toUserRow(row);
  }

  async updateUser(
    id: string,
    data: {
      displayName?: string;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
    }
  ): Promise<UserRow> {
    const row = await this.prisma.user.update({
      where: { id },
      data,
      select: userSelect
    });
    return toUserRow(row);
  }
}
