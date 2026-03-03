import { ObjectId } from "mongodb";

export const DEVICE_TRIALS_COLLECTION = "device_trials";
export const TRIAL_SETTINGS_COLLECTION = "trial_settings";

// ─── Device Trial ─────────────────────────────────────────────────────────────

export type TrialState = "active" | "expired" | "blocked";

export interface DeviceTrialDocument {
    _id?: ObjectId;
    /** SHA-256 HMAC of the hardware UUID — never the raw ID */
    deviceId: string;
    trialStartDate: Date;
    trialExpiryDate: Date;
    state: TrialState;
    /** true once the trial period has been consumed, even if still within dates */
    trialUsed: boolean;
    /** MongoDB ObjectId string — set once the user logs in on this device */
    associatedUserId?: string;
    /** IP address of the first request (for abuse monitoring) */
    firstSeenIp: string;
    /** IP of the most recent trial-init request */
    lastSeenIp: string;
    /** Monotonically increasing counter; resets on suspicious spike */
    requestCount: number;
    /** ISO timestamp of the last trial-init request (rate-limit gate) */
    lastRequestAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeviceTrialPublic {
    state: TrialState;
    trialStartDate: string;
    trialExpiryDate: string;
    daysRemaining: number;
    trialUsed: boolean;
}

export function deviceTrialToPublic(doc: DeviceTrialDocument): DeviceTrialPublic {
    const now = new Date();
    const ms = doc.trialExpiryDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    return {
        state: doc.state,
        trialStartDate: doc.trialStartDate.toISOString(),
        trialExpiryDate: doc.trialExpiryDate.toISOString(),
        daysRemaining,
        trialUsed: doc.trialUsed,
    };
}

// ─── Trial Settings ───────────────────────────────────────────────────────────

export interface TrialSettingsDocument {
    _id?: ObjectId;
    /** singleton key — always "global" */
    key: "global";
    trialEnabled: boolean;
    /** number of days for the free trial */
    trialDurationDays: number;
    updatedAt: Date;
    updatedBy?: string;
}

export const DEFAULT_TRIAL_SETTINGS: Omit<TrialSettingsDocument, "_id"> = {
    key: "global",
    trialEnabled: true,
    trialDurationDays: 2,
    updatedAt: new Date(),
};
