import { ObjectId } from "mongodb";

export const ADMIN_AUDIT_LOGS_COLLECTION = "admin_audit_logs";

export type AuditAction =
    | "user.suspend"
    | "user.unsuspend"
    | "user.delete"
    | "user.restore"
    | "user.force_logout"
    | "notification.send"
    | "notification.retry"
    | "release_note.create"
    | "release_note.update"
    | "release_note.delete"
    | "bug_report.status_update";

export interface AdminAuditLogDocument {
    _id?: ObjectId;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ip?: string;
    createdAt: Date;
}
