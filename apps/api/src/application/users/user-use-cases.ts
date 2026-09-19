import argon2 from "argon2";
import type { UserRepository } from "../../interfaces/user-repository.js";
import { User } from "../../domain/users/user.js";
import { DomainError } from "../../domain/shared/domain-error.js";

export interface UserCreateInput {
  username: string;
  password: string; // Made required as it is
  displayName: string;
  role: "WAITER" | "KITCHEN" | "CASHIER" | "OWNER" | "ADMIN";
}

export interface UserUpdateInput {
  password?: string;
  displayName?: string;
  role?: "WAITER" | "KITCHEN" | "CASHIER" | "OWNER" | "ADMIN";
  isActive?: boolean;
}

export class UserBusinessError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "UserBusinessError";
  }
}

export class UserUseCases {
  constructor(private readonly repository: UserRepository) {}

  listUsers(options?: { skip?: number; take?: number }) {
    return this.repository.listUsers(options);
  }

  async createUser(input: UserCreateInput) {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    return this.repository.createUser({
      username: input.username,
      displayName: input.displayName,
      role: input.role,
      passwordHash
    });
  }

  async updateUser(id: string, input: UserUpdateInput, actorId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new UserBusinessError("USER_NOT_FOUND", "Kullanici bulunamadi.");
    }

    if (input.isActive === false) {
      const domain = User.restore(existing);
      try {
        domain.assertCanDeactivate(actorId);
      } catch (error) {
        throw this.toUserError(error);
      }
    }

    const data: {
      displayName?: string;
      role?: typeof input.role;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.role !== undefined) data.role = input.role;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.password !== undefined) {
      data.passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    }

    return this.repository.updateUser(id, data);
  }

  private toUserError(error: unknown): UserBusinessError {
    if (error instanceof DomainError) return new UserBusinessError(error.code, error.message);
    if (error instanceof UserBusinessError) return error;
    return new UserBusinessError("USER_ERROR", "Kullanici islemi gecersiz.");
  }
}
