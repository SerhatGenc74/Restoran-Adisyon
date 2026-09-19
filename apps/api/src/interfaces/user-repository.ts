import type { UserRole } from "../domain/users/user.js";

export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  listUsers(options?: { skip?: number; take?: number }): Promise<{ data: UserRow[]; total: number }>;
  findById(id: string): Promise<UserRow | null>;
  findByUsernameWithPassword(username: string): Promise<(UserRow & { passwordHash: string }) | null>;
  createUser(data: {
    username: string;
    passwordHash: string;
    displayName: string;
    role: UserRole;
  }): Promise<UserRow>;
  updateUser(
    id: string,
    data: {
      displayName?: string;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
    }
  ): Promise<UserRow>;
}
