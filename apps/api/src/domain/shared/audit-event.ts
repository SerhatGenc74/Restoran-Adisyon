export interface AuditEventProps {
  id?: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: any;
  createdAt?: Date;
}

export class AuditEvent {
  readonly id?: string;
  readonly userId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly payload: any;
  readonly createdAt?: Date;

  private constructor(props: AuditEventProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.action = props.action;
    this.entityType = props.entityType;
    this.entityId = props.entityId ?? null;
    this.payload = props.payload;
    this.createdAt = props.createdAt;
  }

  static create(props: Omit<AuditEventProps, "id" | "createdAt">): AuditEvent {
    return new AuditEvent(props);
  }

  static restore(props: AuditEventProps): AuditEvent {
    return new AuditEvent(props);
  }
}
