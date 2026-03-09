import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { ensureBugReportIndexes } from "@/lib/bug-report-db";
import {
  BUG_REPORT_STATUSES,
  type BugReportStatus,
} from "@/lib/bug-report-constants";
import {
  BUG_REPORTS_COLLECTION,
  bugReportToPublic,
  type BugReportDocument,
} from "@/models/BugReport";

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  await ensureBugReportIndexes();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? "200")));
  const status = searchParams.get("status")?.trim() as BugReportStatus | undefined;
  const search = searchParams.get("search")?.trim() ?? "";

  const filter: Record<string, unknown> = {};
  if (status && BUG_REPORT_STATUSES.includes(status)) {
    filter.status = status;
  }

  if (search) {
    const regex = { $regex: search, $options: "i" };
    filter.$or = [
      { title: regex },
      { description: regex },
      { "reporter.name": regex },
      { "reporter.email": regex },
    ];
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<BugReportDocument>(BUG_REPORTS_COLLECTION);

    const [reports, total, groupedCounts] = await Promise.all([
      collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
      collection
        .aggregate<{ _id: BugReportStatus; count: number }>([
          { $match: filter },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const countsByStatus = BUG_REPORT_STATUSES.reduce<Record<BugReportStatus, number>>(
      (acc, currentStatus) => {
        acc[currentStatus] = 0;
        return acc;
      },
      {
        backlog: 0,
        todo: 0,
        today: 0,
        in_staging: 0,
        done: 0,
        released: 0,
      }
    );

    for (const row of groupedCounts) {
      if (BUG_REPORT_STATUSES.includes(row._id)) {
        countsByStatus[row._id] = row.count;
      }
    }

    return NextResponse.json({
      reports: reports.map(bugReportToPublic),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      countsByStatus,
    });
  } catch (error) {
    console.error("[admin/bug-reports GET]", error);
    return NextResponse.json(
      { error: "Unable to load bug reports." },
      { status: 500 }
    );
  }
}
