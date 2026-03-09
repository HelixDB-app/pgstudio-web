"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RefreshCw, Save } from "lucide-react";
import {
  BUG_REPORT_STATUSES,
  BUG_REPORT_STATUS_LABELS,
  BUG_REPORT_TYPE_LABELS,
  type BugReportStatus,
} from "@/lib/bug-report-constants";
import type { BugReportPublic } from "@/models/BugReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface BugReportsResponse {
  reports: BugReportPublic[];
  total: number;
  page: number;
  pages: number;
  countsByStatus: Record<BugReportStatus, number>;
}

interface UpdateDraft {
  status: BugReportStatus;
  updateMessage: string;
  commitSummary: string;
}

function statusBadgeClass(status: BugReportStatus): string {
  switch (status) {
    case "backlog":
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
    case "todo":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "today":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "in_staging":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "done":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "released":
      return "bg-teal-500/15 text-teal-300 border-teal-500/30";
  }
}

function reportTypeBadgeClass(type: BugReportPublic["reportType"]): string {
  switch (type) {
    case "bug":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "feature":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "idea":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString();
}

export function BugReportsKanbanBoard() {
  const [reports, setReports] = useState<BugReportPublic[]>([]);
  const [countsByStatus, setCountsByStatus] =
    useState<Record<BugReportStatus, number>>({
      backlog: 0,
      todo: 0,
      today: 0,
      in_staging: 0,
      done: 0,
      released: 0,
    });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, UpdateDraft>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = useCallback(
    async (withSpinner: boolean) => {
      if (withSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({ limit: "250" });
        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await fetch(`/api/admin/bug-reports?${params.toString()}`);
        const payload = (await response.json()) as BugReportsResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load bug reports.");
        }

        setReports(payload.reports ?? []);
        setCountsByStatus(payload.countsByStatus);
        setError(null);

        setDrafts((previous) => {
          const next = { ...previous };
          for (const report of payload.reports ?? []) {
            if (!next[report.id]) {
              next[report.id] = {
                status: report.status,
                updateMessage: "",
                commitSummary: "",
              };
            }
          }
          return next;
        });
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load bug reports.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    void fetchReports(false);
  }, [fetchReports]);

  const groupedReports = useMemo(() => {
    const result = BUG_REPORT_STATUSES.reduce<Record<BugReportStatus, BugReportPublic[]>>(
      (acc, status) => {
        acc[status] = [];
        return acc;
      },
      {
        backlog: [],
        todo: [],
        today: [],
        in_staging: [],
        done: [],
        released: [],
      }
    );

    for (const report of reports) {
      result[report.status].push(report);
    }

    return result;
  }, [reports]);

  async function updateStatus(report: BugReportPublic) {
    const draft = drafts[report.id];
    if (!draft) return;

    if (draft.status === report.status) {
      toast.info("Select a new status before updating.");
      return;
    }

    setUpdatingId(report.id);
    try {
      const response = await fetch(`/api/admin/bug-reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: draft.status,
          updateMessage: draft.updateMessage,
          commitSummary: draft.commitSummary,
        }),
      });

      const payload = (await response.json()) as {
        report?: BugReportPublic;
        error?: string;
        notification?: {
          email: { sent: boolean; skippedReason?: string };
          notification: { sent: boolean; skippedReason?: string };
        };
      };

      if (!response.ok || !payload.report) {
        throw new Error(payload.error || "Status update failed.");
      }

      setReports((current) =>
        current.map((entry) =>
          entry.id === payload.report?.id ? payload.report : entry
        )
      );

      setDrafts((current) => ({
        ...current,
        [report.id]: {
          status: payload.report!.status,
          updateMessage: "",
          commitSummary: "",
        },
      }));

      const emailState = payload.notification?.email.sent
        ? "email sent"
        : "email skipped";
      const notifState = payload.notification?.notification.sent
        ? "notification sent"
        : "notification skipped";
      toast.success(`Status updated (${emailState}, ${notifState}).`);
    } catch (updateError) {
      toast.error(
        updateError instanceof Error ? updateError.message : "Status update failed."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Bug Reports Kanban</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Track beta issues, feature requests, and ideas across delivery stages.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search title, email, reporter..."
              className="h-8 w-56 text-xs"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void fetchReports(true);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchReports(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Unable to load bug reports
            </div>
            <p className="mt-1 text-xs text-red-100/80">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1380px] grid-cols-6 gap-4">
              {BUG_REPORT_STATUSES.map((status) => (
                <div
                  key={status}
                  className="rounded-xl border border-border/50 bg-muted/10 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {BUG_REPORT_STATUS_LABELS[status]}
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      {countsByStatus[status] ?? 0}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {groupedReports[status].length === 0 && (
                      <div className="rounded-lg border border-dashed border-border/50 p-3 text-center text-xs text-muted-foreground">
                        No reports
                      </div>
                    )}

                    {groupedReports[status].map((report) => {
                      const draft = drafts[report.id] ?? {
                        status: report.status,
                        updateMessage: "",
                        commitSummary: "",
                      };

                      return (
                        <article
                          key={report.id}
                          className="rounded-lg border border-border/60 bg-card p-3"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${reportTypeBadgeClass(
                                report.reportType
                              )}`}
                            >
                              {BUG_REPORT_TYPE_LABELS[report.reportType]}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${statusBadgeClass(
                                report.status
                              )}`}
                            >
                              {BUG_REPORT_STATUS_LABELS[report.status]}
                            </span>
                          </div>

                          <p className="text-xs font-semibold leading-snug">{report.title}</p>
                          <p className="mt-1 line-clamp-4 text-xs text-muted-foreground">
                            {report.description}
                          </p>

                          <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
                            <p>{report.reporter.name}</p>
                            <p className="truncate">{report.reporter.email}</p>
                            <p>{formatDate(report.createdAt)}</p>
                            <p>
                              Source: {report.reporter.sourceApp} · {report.screenshotCount} screenshot(s)
                            </p>
                          </div>

                          {report.screenshots.length > 0 && (
                            <div className="mt-2 grid grid-cols-3 gap-1">
                              {report.screenshots.slice(0, 3).map((shot) => (
                                <a
                                  key={shot.path}
                                  href={shot.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded border border-border/50"
                                >
                                  <Image
                                    src={shot.url}
                                    alt={shot.originalName}
                                    width={160}
                                    height={90}
                                    className="h-16 w-full object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 space-y-2 border-t border-border/50 pt-2">
                            <select
                              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                              value={draft.status}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [report.id]: {
                                    ...draft,
                                    status: event.target.value as BugReportStatus,
                                  },
                                }))
                              }
                              disabled={updatingId === report.id}
                            >
                              {BUG_REPORT_STATUSES.map((option) => (
                                <option key={option} value={option}>
                                  {BUG_REPORT_STATUS_LABELS[option]}
                                </option>
                              ))}
                            </select>

                            <Input
                              value={draft.updateMessage}
                              placeholder="Update message for reporter"
                              className="h-8 text-xs"
                              maxLength={300}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [report.id]: {
                                    ...draft,
                                    updateMessage: event.target.value,
                                  },
                                }))
                              }
                              disabled={updatingId === report.id}
                            />

                            <Input
                              value={draft.commitSummary}
                              placeholder="Commit summary (optional)"
                              className="h-8 text-xs"
                              maxLength={300}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [report.id]: {
                                    ...draft,
                                    commitSummary: event.target.value,
                                  },
                                }))
                              }
                              disabled={updatingId === report.id}
                            />

                            <Button
                              size="sm"
                              className="h-8 w-full"
                              disabled={updatingId === report.id}
                              onClick={() => void updateStatus(report)}
                            >
                              {updatingId === report.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Update
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
