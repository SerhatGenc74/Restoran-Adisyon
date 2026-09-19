import argon2 from "argon2";
import type { UserRepository } from "../../interfaces/user-repository.js";
import type { AuthenticatedUser } from "../../authentication/authentication-types.js";

export class AuthUseCases {
  constructor(private readonly userRepository: UserRepository) {}

  async authenticateUser(username: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.userRepository.findByUsernameWithPassword(username);

    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, password))) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    };
  }
}
