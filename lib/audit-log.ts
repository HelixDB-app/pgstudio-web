import clientPromise from "@/lib/mongodb";
import { ADMIN_AUDIT_LOGS_COLLECTION, type AuditAction } from "@/models/AdminAuditLog";

export async function writeAuditLog(
    action: AuditAction,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    ip?: string
): Promise<void> {
    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection(ADMIN_AUDIT_LOGS_COLLECTION).insertOne({
            action,
            resource,
            resourceId,
            details: details ?? {},
            ip,
            createdAt: new Date(),
        });
    } catch {
        // Never throw from audit log — it's a side-effect
    }
}
