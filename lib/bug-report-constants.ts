export const BUG_REPORT_TYPES = ["bug", "feature", "idea"] as const;
export type BugReportType = (typeof BUG_REPORT_TYPES)[number];

export const BUG_REPORT_STATUSES = [
  "backlog",
  "todo",
  "today",
  "in_staging",
  "done",
  "released",
] as const;
export type BugReportStatus = (typeof BUG_REPORT_STATUSES)[number];

export const BUG_REPORT_STATUS_LABELS: Record<BugReportStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  today: "Today",
  in_staging: "In Staging",
  done: "Done",
  released: "Released",
};

export const BUG_REPORT_TYPE_LABELS: Record<BugReportType, string> = {
  bug: "Bug",
  feature: "Feature Request",
  idea: "Idea",
};

export const BUG_REPORT_LIMITS = {
  minTitleLength: 5,
  maxTitleLength: 120,
  minDescriptionLength: 20,
  maxDescriptionLength: 4000,
  minReporterNameLength: 2,
  maxReporterNameLength: 120,
  maxScreenshots: 3,
  maxScreenshotSizeBytes: 10 * 1024 * 1024,
} as const;

export const BUG_REPORT_ACCEPTED_SCREENSHOT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
