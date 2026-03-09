import { ObjectId } from "mongodb";

export interface UserDocument {
    _id?: ObjectId;
    name: string;
    email: string;
    passwordHash?: string;        // Only for credentials provider
    image?: string;               // Avatar URL (Google/Apple)
    provider: "credentials" | "google" | "apple";
    emailVerified?: Date | null;
    activeSessionToken?: string;  // UUID of the current active session — invalidates others
    sessionCreatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    // Admin-managed fields
    isActive?: boolean;           // false = soft-disabled (not suspended)
    suspendedAt?: Date;           // set when account is suspended
    deletedAt?: Date;             // soft delete timestamp
    lastLoginAt?: Date;           // updated on each successful login
    // User survey (desktop onboarding)
    surveyCompletedAt?: Date;
    surveyAnswers?: SurveyAnswers;
}

export interface SurveyAnswers {
    howDidYouHear?: string;
    primaryReason?: string;
    userType?: string;
    featureInterest?: string;
    mainDatabase?: string;
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    image?: string;
    provider: string;
    createdAt: string | null;
}

export const USERS_COLLECTION = "users";
