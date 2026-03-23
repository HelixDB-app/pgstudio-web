import { ObjectId } from "mongodb";

export type ApiLogStatus = "success" | "error" | "aborted";

export type ApiFeatureType =
    | "chat"
    | "suggestions"
    | "doc-writer"
    | "sql-review"
    | "seed-data"
    | "index-optimization"
    | "schema-designer"
    | "sql-to-schema"
    | "query-error"
    | "query-explain"
    | "schema-doc"
    | "git"
    | "ai_command"
    | "sql_completion"
    | "other";

export interface ApiLogDocument {
    _id?: ObjectId;
    userId: ObjectId;
    userEmail?: string;
    userName?: string;
    /** Gemini model id e.g. "gemini-2.5-pro" */
    model: string;
    /** High-level feature that triggered this call */
    featureType: ApiFeatureType;
    /** Raw API endpoint called: "streamGenerateContent" | "generateContent" */
    endpoint: string;
    requestTimestamp: Date;
    /** Wall-clock milliseconds from request start to first byte / full response */
    responseTime: number;
    status: ApiLogStatus;
    /** Total tokens (prompt + candidate) if available */
    tokenUsed?: number;
    promptTokens?: number;
    candidateTokens?: number;
    errorMessage?: string;
    errorCode?: number;
    /** User's active subscription plan slug at call time */
    subscriptionType?: string;
    createdAt: Date;
}

export interface ApiLogPublic {
    id: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    model: string;
    featureType: string;
    endpoint: string;
    requestTimestamp: string;
    responseTime: number;
    status: ApiLogStatus;
    tokenUsed?: number;
    promptTokens?: number;
    candidateTokens?: number;
    errorMessage?: string;
    errorCode?: number;
    subscriptionType?: string;
    createdAt: string;
}

export const API_LOGS_COLLECTION = "api_logs";

/** Index key spec: field -> 1 (asc) or -1 (desc). No optional keys so MongoDB types accept it. */
type IndexKeySpec = Record<string, 1 | -1>;

/**
 * Index definitions — call ensureApiLogIndexes() once on startup
 * or on first log insertion.
 */
export const API_LOGS_INDEX_SPECS: { key: IndexKeySpec; name: string }[] = [
    { key: { userId: 1, createdAt: -1 }, name: "userId_createdAt" },
    { key: { createdAt: -1 }, name: "createdAt" },
    { key: { status: 1, createdAt: -1 }, name: "status_createdAt" },
    { key: { model: 1, createdAt: -1 }, name: "model_createdAt" },
    { key: { featureType: 1, createdAt: -1 }, name: "featureType_createdAt" },
    { key: { endpoint: 1, createdAt: -1 }, name: "endpoint_createdAt" },
];
