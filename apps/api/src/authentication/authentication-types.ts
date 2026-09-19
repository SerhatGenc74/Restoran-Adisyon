import type { UserRole } from "@adisyon/shared";

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: AuthenticatedUser;
  }
}
