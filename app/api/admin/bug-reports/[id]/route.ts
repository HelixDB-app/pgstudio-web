import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { ensureBugReportIndexes } from "@/lib/bug-report-db";
import { notifyBugReportStatusChange } from "@/lib/bug-report-notifier";
import {
  BUG_REPORT_STATUSES,
  type BugReportStatus,
} from "@/lib/bug-report-constants";
import {
  BUG_REPORTS_COLLECTION,
  bugReportToPublic,
  type BugReportDocument,
  type BugReportStatusHistoryItem,
} from "@/models/BugReport";

function normalizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  await ensureBugReportIndexes();

  const { id } = await context.params;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
  }

  let body: {
    status?: BugReportStatus;
    updateMessage?: string;
    commitSummary?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const nextStatus = body.status;
  if (!nextStatus || !BUG_REPORT_STATUSES.includes(nextStatus)) {
    return NextResponse.json(
      {
        error:
          "status is required and must be one of backlog, todo, today, in_staging, done, released.",
      },
      { status: 400 }
    );
  }

  const updateMessage = normalizeText(body.updateMessage, 1200);
  const commitSummary = normalizeText(body.commitSummary, 1200);

  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<BugReportDocument>(BUG_REPORTS_COLLECTION);

    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const statusChanged = existing.status !== nextStatus;
    if (!statusChanged) {
      return NextResponse.json({
        report: bugReportToPublic(existing),
        notification: {
          email: { sent: false, skippedReason: "Status did not change." },
          notification: { sent: false, skippedReason: "Status did not change." },
        },
      });
    }

    const notificationResult = await notifyBugReportStatusChange({
      reportId: id,
      report: existing,
      nextStatus,
      updateMessage,
      commitSummary,
    });

    const now = new Date();
    const historyEntry: BugReportStatusHistoryItem = {
      from: existing.status,
      to: nextStatus,
      changedBy: "admin",
      changedAt: now,
      updateMessage,
      commitSummary,
      emailSent: notificationResult.email.sent,
      notificationSent: notificationResult.notification.sent,
    };

    const setPayload: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: now,
    };
    if (updateMessage) setPayload.lastUpdateMessage = updateMessage;
    if (commitSummary) setPayload.lastCommitSummary = commitSummary;

    const updated = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: setPayload,
        $push: { statusHistory: historyEntry },
      },
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Unable to update report." },
        { status: 500 }
      );
    }

    await writeAuditLog(
      "bug_report.status_update",
      "bug_report",
      id,
      {
        fromStatus: existing.status,
        toStatus: nextStatus,
        updateMessage,
        commitSummary,
      },
      req.headers.get("x-forwarded-for") ?? undefined
    );

    return NextResponse.json({
      report: bugReportToPublic(updated),
      notification: notificationResult,
    });
  } catch (error) {
    console.error("[admin/bug-reports PATCH]", error);
    return NextResponse.json(
      { error: "Unable to update report status." },
      { status: 500 }
    );
  }
}
