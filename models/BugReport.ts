import { ObjectId } from "mongodb";
import type {
  BugReportStatus,
  BugReportType,
} from "@/lib/bug-report-constants";

export const BUG_REPORTS_COLLECTION = "bug_reports";

export interface BugReportScreenshot {
  path: string;
  url: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
}

export interface BugReportReporter {
  name: string;
  email: string;
  userId?: string;
  sessionId?: string;
  sourceApp: "landing" | "desktop";
  appVersion?: string;
  appChannel?: string;
}

export interface BugReportMetadata {
  platform?: string;
  userAgent?: string;
  language?: string;
  timezone?: string;
  viewport?: {
    width: number;
    height: number;
  };
  ipAddress?: string | null;
  connection?: {
    isConnected: boolean;
    databaseName: string | null;
    serverVersion: string | null;
  };
}

export interface BugReportStatusHistoryItem {
  from?: BugReportStatus;
  to: BugReportStatus;
  changedBy: "system" | "admin";
  changedAt: Date;
  updateMessage?: string;
  commitSummary?: string;
  emailSent?: boolean;
  notificationSent?: boolean;
}

export interface BugReportDocument {
  _id?: ObjectId;
  reportType: BugReportType;
  title: string;
  description: string;
  reporter: BugReportReporter;
  metadata: BugReportMetadata;
  screenshots: BugReportScreenshot[];
  status: BugReportStatus;
  statusHistory: BugReportStatusHistoryItem[];
  lastUpdateMessage?: string;
  lastCommitSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BugReportStatusHistoryPublic {
  from?: BugReportStatus;
  to: BugReportStatus;
  changedBy: "system" | "admin";
  changedAt: string;
  updateMessage?: string;
  commitSummary?: string;
  emailSent?: boolean;
  notificationSent?: boolean;
}

export interface BugReportPublic {
  id: string;
  reportType: BugReportType;
  title: string;
  description: string;
  reporter: BugReportReporter;
  metadata: BugReportMetadata;
  screenshots: BugReportScreenshot[];
  screenshotCount: number;
  status: BugReportStatus;
  statusHistory: BugReportStatusHistoryPublic[];
  lastUpdateMessage?: string;
  lastCommitSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export function bugReportToPublic(doc: BugReportDocument): BugReportPublic {
  return {
    id: doc._id!.toString(),
    reportType: doc.reportType,
    title: doc.title,
    description: doc.description,
    reporter: doc.reporter,
    metadata: doc.metadata,
    screenshots: doc.screenshots,
    screenshotCount: doc.screenshots.length,
    status: doc.status,
    statusHistory: (doc.statusHistory ?? []).map((entry) => ({
      from: entry.from,
      to: entry.to,
      changedBy: entry.changedBy,
      changedAt: entry.changedAt.toISOString(),
      updateMessage: entry.updateMessage,
      commitSummary: entry.commitSummary,
      emailSent: entry.emailSent,
      notificationSent: entry.notificationSent,
    })),
    lastUpdateMessage: doc.lastUpdateMessage,
    lastCommitSummary: doc.lastCommitSummary,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
