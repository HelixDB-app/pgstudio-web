import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { UserDocument } from "@/models/User";
import { USERS_COLLECTION } from "@/models/User";

const FORTY_DAYS_SECONDS = 40 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(clientPromise) as NextAuthOptions["adapter"],
    session: {
        strategy: "jwt",
        maxAge: FORTY_DAYS_SECONDS,
    },
    jwt: {
        maxAge: FORTY_DAYS_SECONDS,
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                name: { label: "Name", type: "text" },
                isSignUp: { label: "Sign Up", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const client = await clientPromise;
                const db = client.db();
                const users = db.collection<UserDocument>(USERS_COLLECTION);
                const existing = await users.findOne({ email: credentials.email });

                if (credentials.isSignUp === "true") {
                    // Sign-up flow
                    if (existing) {
                        throw new Error("An account with this email already exists.");
                    }
                    const hash = await bcrypt.hash(credentials.password, 12);
                    const sessionToken = uuidv4();
                    const now = new Date();
                    const result = await users.insertOne({
                        name: credentials.name || credentials.email.split("@")[0],
                        email: credentials.email,
                        passwordHash: hash,
                        provider: "credentials",
                        emailVerified: null,
                        activeSessionToken: sessionToken,
                        sessionCreatedAt: now,
                        createdAt: now,
                        updatedAt: now,
                    });
                    return {
                        id: result.insertedId.toString(),
                        name: credentials.name || credentials.email.split("@")[0],
                        email: credentials.email,
                        activeSessionToken: sessionToken,
                    };
                } else {
                    // Sign-in flow
                    if (!existing || !existing.passwordHash) {
                        throw new Error("No account found with this email.");
                    }
                    const valid = await bcrypt.compare(credentials.password, existing.passwordHash);
                    if (!valid) throw new Error("Invalid password.");

                    // Block suspended or deleted accounts
                    if (existing.deletedAt) throw new Error("This account has been deleted.");
                    if (existing.suspendedAt) throw new Error("This account has been suspended. Contact support.");
                    if (existing.isActive === false) throw new Error("This account is inactive. Contact support.");

                    // Rotate session token (single active session)
                    const sessionToken = uuidv4();
                    await users.updateOne(
                        { _id: existing._id },
                        {
                            $set: {
                                activeSessionToken: sessionToken,
                                sessionCreatedAt: new Date(),
                                lastLoginAt: new Date(),
                                updatedAt: new Date(),
                            },
                        }
                    );
                    return {
                        id: existing._id!.toString(),
                        name: existing.name,
                        email: existing.email,
                        image: existing.image,
                        activeSessionToken: sessionToken,
                    };
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: { prompt: "consent", access_type: "offline", response_type: "code" },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // For OAuth providers, rotate activeSessionToken on every sign-in
            if (account?.provider !== "credentials") {
                try {
                    const client = await clientPromise;
                    const db = client.db();
                    const users = db.collection<UserDocument>(USERS_COLLECTION);

                    // Check for suspended/deleted accounts
                    const existing = await users.findOne({ email: user.email! });
                    if (existing?.deletedAt) return false;
                    if (existing?.suspendedAt) return "/login?error=AccountSuspended";
                    if (existing?.isActive === false) return "/login?error=AccountInactive";

                    const sessionToken = uuidv4();
                    await users.updateOne(
                        { email: user.email! },
                        {
                            $set: {
                                provider: account?.provider as "google" | "apple",
                                activeSessionToken: sessionToken,
                                sessionCreatedAt: new Date(),
                                lastLoginAt: new Date(),
                                updatedAt: new Date(),
                            },
                        },
                        { upsert: false }
                    );
                    (user as { activeSessionToken?: string }).activeSessionToken = sessionToken;
                } catch {
                    // User might not exist yet (first OAuth sign-in handled by adapter)
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.activeSessionToken = (user as { activeSessionToken?: string }).activeSessionToken;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as { id?: string }).id = token.id as string;
                (session.user as { activeSessionToken?: string }).activeSessionToken =
                    token.activeSessionToken as string;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            if (url.startsWith(baseUrl)) return url;
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            return baseUrl;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
};
