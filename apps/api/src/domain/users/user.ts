import { DomainError } from "../shared/domain-error.js";

export type UserRole = "WAITER" | "KITCHEN" | "CASHIER" | "OWNER" | "ADMIN";

export interface UserProps {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
}

export class User {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly isActive: boolean;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.username = props.username;
    this.displayName = props.displayName;
    this.role = props.role;
    this.isActive = props.isActive;
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  /**
   * Bir kullanicinin kendi hesabini devre disi birakmasini engeller.
   */
  assertCanDeactivate(actorId: string): void {
    if (this.id === actorId) {
      throw new DomainError(
        "CANNOT_DEACTIVATE_SELF",
        "Kendi hesabinizi devre disi birakamazsiniz."
      );
    }
  }

  toSnapshot(): UserProps {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      role: this.role,
      isActive: this.isActive
    };
  }
}
