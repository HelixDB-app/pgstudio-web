import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

function getFirebaseAdmin(): admin.app.App {
    if (app) return app;

    if (admin.apps.length > 0) {
        app = admin.apps[0]!;
        return app;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    let credential: admin.credential.Credential;

    if (serviceAccountJson) {
        const parsed = JSON.parse(serviceAccountJson);
        credential = admin.credential.cert(parsed);
    } else if (projectId && clientEmail && privateKey) {
        credential = admin.credential.cert({ projectId, clientEmail, privateKey });
    } else {
        // Application Default Credentials fallback (works in Google Cloud)
        credential = admin.credential.applicationDefault();
    }

    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    app = admin.initializeApp({ credential, databaseURL, projectId });
    return app;
}

export function getAdminMessaging(): admin.messaging.Messaging {
    return getFirebaseAdmin().messaging();
}

export function getAdminDatabase(): admin.database.Database {
    return getFirebaseAdmin().database();
}

const LOG = "[firebase-admin]";

/** Write a notification entry to Firebase RTDB at notifications/{userId}/{notificationId} */
export async function writeNotificationToRTDB(
    userId: string,
    notificationId: string,
    payload: {
        title: string;
        body: string;
        imageUrl?: string | null;
        data?: Record<string, string>;
        type?: string;
        createdAt: string;
    }
): Promise<void> {
    console.log(`${LOG} Writing RTDB entry: notifications/${userId}/${notificationId}`);
    const db = getAdminDatabase();
    const ref = db.ref(`notifications/${userId}/${notificationId}`);
    await ref.set({
        ...payload,
        imageUrl: payload.imageUrl ?? null,
        data: payload.data ?? {},
    });
    console.log(`${LOG} RTDB write succeeded for user=${userId}`);
}

/** Send FCM to a list of web tokens; returns array of failed tokens */
export async function sendFCMToTokens(
    tokens: string[],
    payload: {
        title: string;
        body: string;
        imageUrl?: string | null;
        data?: Record<string, string>;
    }
): Promise<string[]> {
    if (tokens.length === 0) {
        console.log(`${LOG} sendFCMToTokens called with 0 tokens, skipping`);
        return [];
    }

    console.log(`${LOG} Sending FCM to ${tokens.length} token(s)`);
    const messaging = getAdminMessaging();
    const failedTokens: string[] = [];

    // FCM batch limit is 500 per call
    const BATCH_SIZE = 500;
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const chunk = tokens.slice(i, i + BATCH_SIZE);
        console.log(`${LOG} FCM batch ${Math.floor(i / BATCH_SIZE) + 1}: sending to ${chunk.length} token(s)`);

        // FCM data values must all be strings
        const stringData: Record<string, string> = {};
        for (const [k, v] of Object.entries(payload.data ?? {})) {
            stringData[k] = String(v);
        }

        const messages: admin.messaging.Message[] = chunk.map((token) => ({
            token,
            notification: {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl ?? undefined,
            },
            data: stringData,
            webpush: {
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: "/logo.png",
                    image: payload.imageUrl ?? undefined,
                    requireInteraction: false,
                },
                fcmOptions: {},
            },
        }));

        try {
            const response = await messaging.sendEach(messages);
            let batchSuccess = 0;
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errCode = resp.error?.code ?? "unknown";
                    const errMsg = resp.error?.message ?? "";
                    console.error(`${LOG} FCM token failed [${errCode}]: ${errMsg} — token prefix: ${chunk[idx].slice(0, 20)}...`);
                    failedTokens.push(chunk[idx]);
                } else {
                    batchSuccess++;
                }
            });
            console.log(`${LOG} Batch result: ${batchSuccess} success, ${response.responses.length - batchSuccess} failed`);
        } catch (err) {
            console.error(`${LOG} FCM batch entirely failed:`, err);
            // Mark all tokens in this batch as failed
            failedTokens.push(...chunk);
        }
    }

    console.log(`${LOG} sendFCMToTokens complete: ${tokens.length - failedTokens.length} sent, ${failedTokens.length} failed`);
    return failedTokens;
}
