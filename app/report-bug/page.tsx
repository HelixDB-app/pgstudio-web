"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Bug,
  X,
} from "lucide-react";
import {
  BUG_REPORT_LIMITS,
  BUG_REPORT_STATUS_LABELS,
  BUG_REPORT_TYPE_LABELS,
  BUG_REPORT_TYPES,
  type BugReportStatus,
  type BugReportType,
} from "@/lib/bug-report-constants";
import type { BugReportPublic } from "@/models/BugReport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const REPORTER_SESSION_STORAGE_KEY = "pgstudio_bug_reporter_session_id";

type SelectedScreenshot = {
  id: string;
  file: File;
  previewUrl: string;
};

interface FormErrors {
  reporterName?: string;
  reporterEmail?: string;
  title?: string;
  description?: string;
  screenshots?: string;
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getReporterSessionId(): string {
  if (typeof window === "undefined") return "web-unknown";
  const existing = localStorage.getItem(REPORTER_SESSION_STORAGE_KEY);
  if (existing) return existing;
  const next = createLocalId();
  localStorage.setItem(REPORTER_SESSION_STORAGE_KEY, next);
  return next;
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

function typeBadgeClass(reportType: BugReportType): string {
  switch (reportType) {
    case "bug":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "feature":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "idea":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateScreenshots(files: File[]): string | undefined {
  if (files.length > BUG_REPORT_LIMITS.maxScreenshots) {
    return `You can attach up to ${BUG_REPORT_LIMITS.maxScreenshots} screenshots.`;
  }

  for (const file of files) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return `Unsupported file type: ${file.type || "unknown"}.`;
    }
    if (file.size > BUG_REPORT_LIMITS.maxScreenshotSizeBytes) {
      return `\"${file.name}\" exceeds ${Math.round(
        BUG_REPORT_LIMITS.maxScreenshotSizeBytes / (1024 * 1024)
      )}MB.`;
    }
  }

  return undefined;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function ReportBugPage() {
  const { data: session } = useSession();
  const [reportType, setReportType] = useState<BugReportType>("bug");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<SelectedScreenshot[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const [recentReports, setRecentReports] = useState<BugReportPublic[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const screenshotsRef = useRef<SelectedScreenshot[]>([]);

  useEffect(() => {
    if (session?.user?.name && !reporterName) {
      setReporterName(session.user.name);
    }
    if (session?.user?.email && !reporterEmail) {
      setReporterEmail(session.user.email);
    }
  }, [session?.user?.email, session?.user?.name, reporterName, reporterEmail]);

  useEffect(() => {
    screenshotsRef.current = screenshots;
  }, [screenshots]);

  useEffect(() => {
    return () => {
      for (const screenshot of screenshotsRef.current) {
        URL.revokeObjectURL(screenshot.previewUrl);
      }
    };
  }, []);

  const screenshotFiles = useMemo(
    () => screenshots.map((item) => item.file),
    [screenshots]
  );

  const fetchRecentReports = useCallback(async () => {
    const reporterSessionId = getReporterSessionId();
    const params = new URLSearchParams({
      reporterSessionId,
      limit: "12",
    });

    if (reporterEmail.trim()) {
      params.set("reporterEmail", reporterEmail.trim().toLowerCase());
    }

    setReportsLoading(true);
    try {
      const response = await fetch(`/api/bug-reports?${params.toString()}`);
      const payload = (await response.json()) as {
        reports?: BugReportPublic[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load recent reports.");
      }

      setRecentReports(payload.reports ?? []);
      setReportsError(null);
    } catch (error) {
      setReportsError(
        error instanceof Error ? error.message : "Unable to load recent reports."
      );
    } finally {
      setReportsLoading(false);
    }
  }, [reporterEmail]);

  useEffect(() => {
    void fetchRecentReports();
  }, [fetchRecentReports]);

  function resetForm() {
    setReportType("bug");
    setTitle("");
    setDescription("");
    setErrors({});
    setSubmitError(null);

    for (const screenshot of screenshots) {
      URL.revokeObjectURL(screenshot.previewUrl);
    }
    setScreenshots([]);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;

    const fileArray = Array.from(files);
    const slotsLeft = BUG_REPORT_LIMITS.maxScreenshots - screenshots.length;
    const nextFiles = fileArray.slice(0, Math.max(0, slotsLeft));

    const mapped: SelectedScreenshot[] = nextFiles.map((file) => ({
      id: createLocalId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    const merged = [...screenshots, ...mapped];
    const validationError = validateScreenshots(merged.map((item) => item.file));

    if (validationError) {
      for (const screenshot of mapped) {
        URL.revokeObjectURL(screenshot.previewUrl);
      }
      setErrors((current) => ({ ...current, screenshots: validationError }));
      return;
    }

    setScreenshots(merged);
    setErrors((current) => ({ ...current, screenshots: undefined }));
  }

  function removeScreenshot(id: string) {
    const target = screenshots.find((entry) => entry.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    const next = screenshots.filter((entry) => entry.id !== id);
    setScreenshots(next);

    const validationError = validateScreenshots(next.map((entry) => entry.file));
    setErrors((current) => ({ ...current, screenshots: validationError }));
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

    if (reporterName.trim().length < BUG_REPORT_LIMITS.minReporterNameLength) {
      nextErrors.reporterName = `Name must be at least ${BUG_REPORT_LIMITS.minReporterNameLength} characters.`;
    }

    if (!isValidEmail(reporterEmail)) {
      nextErrors.reporterEmail = "Please enter a valid email.";
    }

    if (title.trim().length < BUG_REPORT_LIMITS.minTitleLength) {
      nextErrors.title = `Title must be at least ${BUG_REPORT_LIMITS.minTitleLength} characters.`;
    }

    if (description.trim().length < BUG_REPORT_LIMITS.minDescriptionLength) {
      nextErrors.description = `Description must be at least ${BUG_REPORT_LIMITS.minDescriptionLength} characters.`;
    }

    const screenshotError = validateScreenshots(screenshotFiles);
    if (screenshotError) {
      nextErrors.screenshots = screenshotError;
    }

    return nextErrors;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmittedId(null);

    const validationErrors = validateForm();
    const hasErrors = Object.values(validationErrors).some(Boolean);
    if (hasErrors) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("reportType", reportType);
      formData.append("reporterName", reporterName.trim());
      formData.append("reporterEmail", reporterEmail.trim().toLowerCase());
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("reporterSessionId", getReporterSessionId());
      formData.append("sourceApp", "landing");
      formData.append("platform", navigator.platform || "unknown");
      formData.append("userAgent", navigator.userAgent || "unknown");
      formData.append("language", navigator.language || "unknown");
      formData.append(
        "timezone",
        Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"
      );
      formData.append(
        "viewport",
        JSON.stringify({ width: window.innerWidth, height: window.innerHeight })
      );

      for (const file of screenshotFiles) {
        formData.append("screenshots", file);
      }

      const response = await fetch("/api/bug-reports", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        report?: BugReportPublic;
        error?: string;
      };

      if (!response.ok || !payload.report) {
        throw new Error(payload.error || "Unable to submit report.");
      }

      setSubmittedId(payload.report.id);
      toast.success("Thanks! Your report has been submitted.");

      resetForm();
      await fetchRecentReports();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit report.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="space-y-3 border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Beta Feedback Program
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Report a Bug, Feature Request, or Idea
          </h1>
          <p className="max-w-3xl text-sm text-zinc-400">
            Help improve pgStudio during beta. Share what happened, attach screenshots,
            and our team will track it through backlog to release.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="border-white/10 bg-zinc-950/80">
            <CardHeader>
              <CardTitle className="text-base text-white">Submit Report</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={onSubmit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-200" htmlFor="reporter-name">
                      Name
                    </label>
                    <Input
                      id="reporter-name"
                      value={reporterName}
                      maxLength={BUG_REPORT_LIMITS.maxReporterNameLength}
                      onChange={(event) => {
                        setReporterName(event.target.value);
                        setErrors((current) => ({ ...current, reporterName: undefined }));
                      }}
                      className="border-white/15 bg-black text-zinc-100"
                      placeholder="Your name"
                      disabled={isSubmitting}
                    />
                    {errors.reporterName && (
                      <p className="text-xs text-red-300">{errors.reporterName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-200" htmlFor="reporter-email">
                      Email
                    </label>
                    <Input
                      id="reporter-email"
                      type="email"
                      value={reporterEmail}
                      onChange={(event) => {
                        setReporterEmail(event.target.value);
                        setErrors((current) => ({ ...current, reporterEmail: undefined }));
                      }}
                      className="border-white/15 bg-black text-zinc-100"
                      placeholder="you@company.com"
                      disabled={isSubmitting}
                    />
                    {errors.reporterEmail && (
                      <p className="text-xs text-red-300">{errors.reporterEmail}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200" htmlFor="report-type">
                    Report Type
                  </label>
                  <select
                    id="report-type"
                    value={reportType}
                    onChange={(event) => setReportType(event.target.value as BugReportType)}
                    className="h-10 w-full rounded-md border border-white/15 bg-black px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/30"
                    disabled={isSubmitting}
                  >
                    {BUG_REPORT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {BUG_REPORT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200" htmlFor="report-title">
                    Title
                  </label>
                  <Input
                    id="report-title"
                    value={title}
                    maxLength={BUG_REPORT_LIMITS.maxTitleLength}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setErrors((current) => ({ ...current, title: undefined }));
                    }}
                    className="border-white/15 bg-black text-zinc-100"
                    placeholder="Short summary"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-300">{errors.title}</span>
                    <span className="text-zinc-500">
                      {title.trim().length}/{BUG_REPORT_LIMITS.maxTitleLength}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-200" htmlFor="report-description">
                    Description
                  </label>
                  <textarea
                    id="report-description"
                    value={description}
                    maxLength={BUG_REPORT_LIMITS.maxDescriptionLength}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setErrors((current) => ({ ...current, description: undefined }));
                    }}
                    className="min-h-36 w-full resize-y rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="What happened? How can we reproduce it? What did you expect instead?"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-300">{errors.description}</span>
                    <span className="text-zinc-500">
                      {description.trim().length}/{BUG_REPORT_LIMITS.maxDescriptionLength}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-medium text-zinc-200">Screenshots</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-white/20 bg-black text-zinc-200 hover:bg-zinc-900"
                      disabled={isSubmitting}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4" />
                      Attach
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      handleFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />

                  <p className="text-xs text-zinc-500">
                    Up to {BUG_REPORT_LIMITS.maxScreenshots} screenshots, PNG/JPEG/WebP,
                    max {Math.round(BUG_REPORT_LIMITS.maxScreenshotSizeBytes / (1024 * 1024))}MB each.
                  </p>
                  {errors.screenshots && (
                    <p className="text-xs text-red-300">{errors.screenshots}</p>
                  )}

                  {screenshots.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {screenshots.map((shot) => (
                        <figure
                          key={shot.id}
                          className="group relative overflow-hidden rounded-lg border border-white/10 bg-black"
                        >
                          <Image
                            src={shot.previewUrl}
                            alt={shot.file.name}
                            width={640}
                            height={320}
                            unoptimized
                            className="h-28 w-full object-cover"
                          />
                          <figcaption className="space-y-0.5 p-2 text-[11px]">
                            <p className="truncate text-zinc-200">{shot.file.name}</p>
                            <p className="text-zinc-500">{(shot.file.size / 1024).toFixed(1)} KB</p>
                          </figcaption>
                          <button
                            type="button"
                            onClick={() => removeScreenshot(shot.id)}
                            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-zinc-100 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </figure>
                      ))}
                    </div>
                  )}
                </div>

                {submitError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Submission failed
                    </div>
                    <p className="mt-1 text-xs text-red-100/80">{submitError}</p>
                  </div>
                )}

                {submittedId && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Report submitted
                    </div>
                    <p className="mt-1 text-xs text-emerald-100/80">ID: {submittedId}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <MessageSquareText className="h-4 w-4" />
                        Submit Report
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 bg-black text-zinc-200 hover:bg-zinc-900"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-zinc-950/80">
            <CardHeader>
              <CardTitle className="text-base text-white">Your Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex items-center justify-center py-12 text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : reportsError ? (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                  {reportsError}
                </div>
              ) : recentReports.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  No reports yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentReports.map((report) => (
                    <li key={report.id} className="rounded-lg border border-white/10 bg-black/40 p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${typeBadgeClass(
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
                      <p className="text-sm font-medium text-zinc-100">{report.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{report.description}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{formatDate(report.createdAt)}</span>
                        <span>{report.screenshotCount} screenshot(s)</span>
                      </div>
                      {(report.lastUpdateMessage || report.lastCommitSummary) && (
                        <div className="mt-2 rounded-md border border-white/10 bg-zinc-900/60 p-2 text-[11px] text-zinc-300">
                          {report.lastUpdateMessage && <p>{report.lastUpdateMessage}</p>}
                          {report.lastCommitSummary && (
                            <p className="mt-1 text-zinc-400">
                              <Sparkles className="mr-1 inline h-3 w-3" />
                              {report.lastCommitSummary}
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-zinc-400">
                <p className="mb-2 flex items-center gap-2 font-medium text-zinc-200">
                  <Bug className="h-3.5 w-3.5" />
                  Reporting Checklist
                </p>
                <ul className="space-y-1">
                  <li>1. Include exact steps to reproduce.</li>
                  <li>2. Share expected vs actual behavior.</li>
                  <li>3. Add screenshots for faster triage.</li>
                  <li>4. Mention impacted version/platform when possible.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
