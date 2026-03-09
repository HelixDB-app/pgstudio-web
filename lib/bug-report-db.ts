import clientPromise from "@/lib/mongodb";
import {
  BUG_REPORTS_COLLECTION,
  type BugReportDocument,
} from "@/models/BugReport";

let indexPromise: Promise<void> | null = null;

export function ensureBugReportIndexes(): Promise<void> {
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    const client = await clientPromise;
    const db = client.db();
    await db.collection<BugReportDocument>(BUG_REPORTS_COLLECTION).createIndexes([
      { key: { createdAt: -1 } },
      { key: { status: 1, createdAt: -1 } },
      { key: { "reporter.userId": 1, createdAt: -1 } },
      { key: { "reporter.sessionId": 1, createdAt: -1 } },
      { key: { "reporter.email": 1, createdAt: -1 } },
    ]);
  })().catch((error) => {
    indexPromise = null;
    throw error;
  });

  return indexPromise;
}
