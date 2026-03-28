import clientPromise from "@/lib/mongodb";
import {
    SUPPORT_REQUESTS_COLLECTION,
    type SupportRequestDocument,
} from "@/models/SupportRequest";

let indexPromise: Promise<void> | null = null;

export function ensureSupportRequestIndexes(): Promise<void> {
    if (indexPromise) return indexPromise;

    indexPromise = (async () => {
        const client = await clientPromise;
        const db = client.db();
        await db.collection<SupportRequestDocument>(SUPPORT_REQUESTS_COLLECTION).createIndexes([
            { key: { createdAt: -1 } },
            { key: { email: 1, createdAt: -1 } },
            { key: { clientIp: 1, createdAt: -1 }, sparse: true },
        ]);
    })().catch((error) => {
        indexPromise = null;
        throw error;
    });

    return indexPromise;
}
