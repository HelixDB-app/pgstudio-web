import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { ensureBugReportIndexes } from "@/lib/bug-report-db";
import {
  BUG_REPORT_ACCEPTED_SCREENSHOT_TYPES,
  BUG_REPORT_LIMITS,
  BUG_REPORT_STATUSES,
  BUG_REPORT_TYPES,
  type BugReportType,
} from "@/lib/bug-report-constants";
import {
  BUG_REPORTS_COLLECTION,
  bugReportToPublic,
  type BugReportDocument,
  type BugReportMetadata,
  type BugReportScreenshot,
} from "@/models/BugReport";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCEPTED_SCREENSHOT_TYPES = new Set<string>(
  BUG_REPORT_ACCEPTED_SCREENSHOT_TYPES
);
const FILE_TYPE_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function normalizeText(value: FormDataEntryValue | null, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeLongText(value: FormDataEntryValue | null, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function safeOriginalName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "screenshot";
}

function parseConnection(raw: FormDataEntryValue | null): BugReportMetadata["connection"] {
  if (typeof raw !== "string" || !raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as {
      isConnected?: unknown;
      databaseName?: unknown;
      serverVersion?: unknown;
    };

    return {
      isConnected: Boolean(parsed.isConnected),
      databaseName:
        typeof parsed.databaseName === "string" ? parsed.databaseName : null,
      serverVersion:
        typeof parsed.serverVersion === "string" ? parsed.serverVersion : null,
    };
  } catch {
    return undefined;
  }
}

function parseViewport(raw: FormDataEntryValue | null): BugReportMetadata["viewport"] {
  if (typeof raw !== "string" || !raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as { width?: unknown; height?: unknown };
    const width =
      typeof parsed.width === "number" && Number.isFinite(parsed.width)
        ? Math.max(0, Math.round(parsed.width))
        : 0;
    const height =
      typeof parsed.height === "number" && Number.isFinite(parsed.height)
        ? Math.max(0, Math.round(parsed.height))
        : 0;

    return { width, height };
  } catch {
    return undefined;
  }
}

function getMimeExtension(file: File): string {
  if (FILE_TYPE_TO_EXTENSION[file.type]) {
    return FILE_TYPE_TO_EXTENSION[file.type];
  }

  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  return "png";
}

function validateReportType(value: string): value is BugReportType {
  return BUG_REPORT_TYPES.includes(value as BugReportType);
}

function validateScreenshotFile(file: File): string | null {
  if (!ACCEPTED_SCREENSHOT_TYPES.has(file.type)) {
    return `Unsupported screenshot type: ${file.type || "unknown"}.`;
  }
  if (file.size > BUG_REPORT_LIMITS.maxScreenshotSizeBytes) {
    return `Screenshot \"${file.name}\" exceeds ${(BUG_REPORT_LIMITS.maxScreenshotSizeBytes / (1024 * 1024)).toFixed(0)}MB.`;
  }
  return null;
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return req.headers.get("x-real-ip") ?? null;
}

export async function POST(req: NextRequest) {
  await ensureBugReportIndexes();

  const userId = await getUserId(req).catch(() => null);

  try {
    const formData = await req.formData();

    const reportTypeRaw = normalizeText(formData.get("reportType"), 16).toLowerCase();
    if (!validateReportType(reportTypeRaw)) {
      return NextResponse.json(
        { error: "reportType must be one of: bug, feature, idea." },
        { status: 400 }
      );
    }

    const reporterName = normalizeText(
      formData.get("reporterName"),
      BUG_REPORT_LIMITS.maxReporterNameLength
    );
    const reporterEmail = normalizeText(formData.get("reporterEmail"), 254).toLowerCase();
    const title = normalizeText(formData.get("title"), BUG_REPORT_LIMITS.maxTitleLength);
    const description = normalizeLongText(
      formData.get("description"),
      BUG_REPORT_LIMITS.maxDescriptionLength
    );

    if (reporterName.length < BUG_REPORT_LIMITS.minReporterNameLength) {
      return NextResponse.json(
        {
          error: `Reporter name must be at least ${BUG_REPORT_LIMITS.minReporterNameLength} characters.`,
        },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(reporterEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid reporter email." },
        { status: 400 }
      );
    }

    if (title.length < BUG_REPORT_LIMITS.minTitleLength) {
      return NextResponse.json(
        {
          error: `Title must be at least ${BUG_REPORT_LIMITS.minTitleLength} characters.`,
        },
        { status: 400 }
      );
    }

    if (description.length < BUG_REPORT_LIMITS.minDescriptionLength) {
      return NextResponse.json(
        {
          error: `Description must be at least ${BUG_REPORT_LIMITS.minDescriptionLength} characters.`,
        },
        { status: 400 }
      );
    }

    const screenshotEntries = formData
      .getAll("screenshots")
      .filter((entry): entry is File => entry instanceof File);

    if (screenshotEntries.length > BUG_REPORT_LIMITS.maxScreenshots) {
      return NextResponse.json(
        {
          error: `You can attach up to ${BUG_REPORT_LIMITS.maxScreenshots} screenshots.`,
        },
        { status: 400 }
      );
    }

    for (const file of screenshotEntries) {
      const fileError = validateScreenshotFile(file);
      if (fileError) {
        return NextResponse.json({ error: fileError }, { status: 400 });
      }
    }

    const now = new Date();
    const client = await clientPromise;
    const db = client.db();

    const reportId = randomUUID();
    const screenshotDir = join(process.cwd(), "public", "bug-reports", reportId);
    await mkdir(screenshotDir, { recursive: true });

    const screenshots: BugReportScreenshot[] = [];
    for (const file of screenshotEntries) {
      const ext = getMimeExtension(file);
      const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
      const filePath = join(screenshotDir, filename);
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, bytes);

      screenshots.push({
        path: `/bug-reports/${reportId}/${filename}`,
        url: `/bug-reports/${reportId}/${filename}`,
        originalName: safeOriginalName(file.name),
        contentType: file.type,
        sizeBytes: file.size,
      });
    }

    const sourceAppRaw = normalizeText(formData.get("sourceApp"), 32).toLowerCase();
    const sourceApp =
      sourceAppRaw === "desktop" || sourceAppRaw === "landing"
        ? sourceAppRaw
        : "landing";

    const document: BugReportDocument = {
      reportType: reportTypeRaw,
      title,
      description,
      reporter: {
        name: reporterName,
        email: reporterEmail,
        userId: userId ?? undefined,
        sessionId: normalizeText(formData.get("reporterSessionId"), 128) || undefined,
        sourceApp,
        appVersion: normalizeText(formData.get("appVersion"), 64) || undefined,
        appChannel: normalizeText(formData.get("appChannel"), 32) || undefined,
      },
      metadata: {
        platform: normalizeText(formData.get("platform"), 120) || undefined,
        userAgent: normalizeLongText(formData.get("userAgent"), 500) || undefined,
        language: normalizeText(formData.get("language"), 16) || undefined,
        timezone: normalizeText(formData.get("timezone"), 80) || undefined,
        viewport: parseViewport(formData.get("viewport")),
        ipAddress: getClientIp(req),
        connection: parseConnection(formData.get("connection")),
      },
      screenshots,
      status: BUG_REPORT_STATUSES[0],
      statusHistory: [
        {
          to: BUG_REPORT_STATUSES[0],
          changedBy: "system",
          changedAt: now,
          updateMessage: "Report submitted and added to backlog.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .collection<BugReportDocument>(BUG_REPORTS_COLLECTION)
      .insertOne(document);

    return NextResponse.json(
      {
        report: bugReportToPublic({ ...document, _id: result.insertedId }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[bug-reports POST]", error);
    return NextResponse.json(
      {
        error: "Unable to submit the report right now. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  await ensureBugReportIndexes();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? "20"))
  );

  const reporterSessionId = normalizeText(
    searchParams.get("reporterSessionId"),
    128
  );
  const reporterEmail = normalizeText(
    searchParams.get("reporterEmail"),
    254
  ).toLowerCase();
  const authUserId = await getUserId(req).catch(() => null);

  const filters: Record<string, unknown>[] = [];
  if (reporterEmail && !reporterSessionId && !authUserId) {
    return NextResponse.json(
      {
        error:
          "reporterEmail lookups require reporterSessionId or an authenticated session.",
      },
      { status: 400 }
    );
  }

  if (reporterSessionId) {
    filters.push({ "reporter.sessionId": reporterSessionId });
  }
  if (reporterEmail) {
    filters.push({ "reporter.email": reporterEmail });
  }
  if (authUserId) {
    filters.push({ "reporter.userId": authUserId });
  }

  if (filters.length === 0) {
    return NextResponse.json(
      {
        error:
          "A reporterSessionId, reporterEmail, or authenticated session is required.",
      },
      { status: 400 }
    );
  }

  const query = filters.length === 1 ? filters[0] : { $or: filters };

  try {
    const client = await clientPromise;
    const db = client.db();

    const reports = await db
      .collection<BugReportDocument>(BUG_REPORTS_COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ reports: reports.map(bugReportToPublic) });
  } catch (error) {
    console.error("[bug-reports GET]", error);
    return NextResponse.json({ error: "Unable to load reports." }, { status: 500 });
  }
}
