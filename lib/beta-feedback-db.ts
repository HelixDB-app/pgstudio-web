import clientPromise from "@/lib/mongodb";
import {
    BETA_FEEDBACK_COLLECTION,
    type BetaFeedbackDocument,
} from "@/models/BetaFeedback";

let indexPromise: Promise<void> | null = null;

export function ensureBetaFeedbackIndexes(): Promise<void> {
    if (indexPromise) return indexPromise;

    indexPromise = (async () => {
        const client = await clientPromise;
        const db = client.db();
        await db.collection<BetaFeedbackDocument>(BETA_FEEDBACK_COLLECTION).createIndexes([
            { key: { createdAt: -1 } },
            { key: { userId: 1, createdAt: -1 } },
        ]);
    })().catch((error) => {
        indexPromise = null;
        throw error;
    });

    return indexPromise;
}
