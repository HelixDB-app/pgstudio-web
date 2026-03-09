import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { processNotificationChunk } from "@/lib/notification-processor";
import {
  BUG_REPORT_STATUS_LABELS,
  type BugReportStatus,
} from "@/lib/bug-report-constants";
import type { BugReportDocument } from "@/models/BugReport";
import {
  NOTIFICATIONS_COLLECTION,
  NOTIFICATION_DELIVERIES_COLLECTION,
  type NotificationDocument,
} from "@/models/Notification";

interface DeliveryResult {
  sent: boolean;
  skippedReason?: string;
  error?: string;
}

export interface BugReportStatusNotifyResult {
  email: DeliveryResult;
  notification: DeliveryResult;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendStatusEmail(params: {
  reportId: string;
  report: BugReportDocument;
  nextStatus: BugReportStatus;
  updateMessage?: string;
  commitSummary?: string;
}): Promise<DeliveryResult> {
  const to = params.report.reporter.email?.trim();
  if (!to) {
    return { sent: false, skippedReason: "Reporter email is missing." };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.BUG_REPORTS_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !fromAddress) {
    return {
      sent: false,
      skippedReason:
        "Email delivery is not configured. Set RESEND_API_KEY and BUG_REPORTS_FROM_EMAIL.",
    };
  }

  const statusLabel = BUG_REPORT_STATUS_LABELS[params.nextStatus];
  const safeTitle = escapeHtml(params.report.title);
  const safeMessage = escapeHtml(
    params.updateMessage?.trim() ||
      "Thanks for the report. We have updated its status in our pipeline."
  );
  const safeCommit = params.commitSummary
    ? escapeHtml(params.commitSummary.trim())
    : "";

  const subject = `[pgStudio] Update on your report ${params.reportId.slice(-8).toUpperCase()}`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.5;">
      <p style="margin: 0 0 12px 0;">Hi ${escapeHtml(params.report.reporter.name)},</p>
      <p style="margin: 0 0 12px 0;">Your ${params.report.reportType} report <strong>${safeTitle}</strong> moved to <strong>${statusLabel}</strong>.</p>
      <p style="margin: 0 0 12px 0;">${safeMessage}</p>
      ${
        safeCommit
          ? `<p style="margin: 0 0 12px 0;"><strong>Commit/Update Summary:</strong><br/>${safeCommit}</p>`
          : ""
      }
      <p style="margin: 0; color: #4b5563; font-size: 13px;">Report ID: ${params.reportId}</p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        sent: false,
        error: `Email API error (${response.status}): ${body.slice(0, 200)}`,
      };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Email send failed.",
    };
  }
}

async function sendInAppStatusNotification(params: {
  reportId: string;
  report: BugReportDocument;
  nextStatus: BugReportStatus;
  updateMessage?: string;
  commitSummary?: string;
}): Promise<DeliveryResult> {
  const userId = params.report.reporter.userId;
  if (!userId || !ObjectId.isValid(userId)) {
    return {
      sent: false,
      skippedReason: "Reporter is not linked to an authenticated user.",
    };
  }

  const statusLabel = BUG_REPORT_STATUS_LABELS[params.nextStatus];
  const now = new Date();

  try {
    const client = await clientPromise;
    const db = client.db();

    const notificationDoc: NotificationDocument = {
      type: "in_app",
      title: `Report Update: ${statusLabel}`,
      body: `${params.report.title} is now in ${statusLabel}.`,
      data: {
        reportId: params.reportId,
        status: params.nextStatus,
        updateMessage: params.updateMessage?.trim() ?? "",
        commitSummary: params.commitSummary?.trim() ?? "",
        actionUrl: "/report-bug",
      },
      segment: { type: "selected", userIds: [userId] },
      status: "sending",
      totalTargeted: 1,
      totalSent: 0,
      totalFailed: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await db
      .collection<NotificationDocument>(NOTIFICATIONS_COLLECTION)
      .insertOne(notificationDoc);

    await db.collection(NOTIFICATION_DELIVERIES_COLLECTION).insertOne({
      notificationId: insertedId,
      userId: new ObjectId(userId),
      channel: "desktop_rtdb",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await processNotificationChunk({
      notificationId: insertedId.toString(),
      userIds: [userId],
      payload: {
        type: "in_app",
        title: notificationDoc.title,
        body: notificationDoc.body,
        data: notificationDoc.data,
      },
    });

    await db.collection(NOTIFICATIONS_COLLECTION).updateOne(
      { _id: insertedId },
      { $set: { status: "completed", sentAt: new Date(), updatedAt: new Date() } }
    );

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to deliver in-app notification.",
    };
  }
}

export async function notifyBugReportStatusChange(params: {
  reportId: string;
  report: BugReportDocument;
  nextStatus: BugReportStatus;
  updateMessage?: string;
  commitSummary?: string;
}): Promise<BugReportStatusNotifyResult> {
  const [email, notification] = await Promise.all([
    sendStatusEmail(params),
    sendInAppStatusNotification(params),
  ]);

  return { email, notification };
}
