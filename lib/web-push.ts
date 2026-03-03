/**
 * Web push notification utilities for pgstudio-web.
 * Registers a Firebase Cloud Messaging token and sends it to the backend
 * device registration API.
 */

const LOG = "[web-push]";

export function isFCMSupportedInBrowser(): boolean {
    if (typeof window === "undefined") return false;
    if (!window.isSecureContext) {
        console.warn(`${LOG} isFCMSupported: not a secure context`);
        return false;
    }
    if (!("Notification" in window)) {
        console.warn(`${LOG} isFCMSupported: Notification API not available`);
        return false;
    }
    if (!("serviceWorker" in navigator)) {
        console.warn(`${LOG} isFCMSupported: Service Worker not available`);
        return false;
    }
    if (!("PushManager" in window)) {
        console.warn(`${LOG} isFCMSupported: PushManager not available`);
        return false;
    }
    return true;
}

/**
 * Wait for a service worker registration to have an active worker.
 * Necessary because a freshly registered SW starts in the "installing" state.
 */
function waitForSWActivation(reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
    return new Promise((resolve) => {
        if (reg.active) {
            resolve(reg);
            return;
        }
        const sw = reg.installing ?? reg.waiting;
        if (!sw) {
            // Edge case: no worker at all, resolve immediately
            resolve(reg);
            return;
        }
        const handler = function (this: ServiceWorker) {
            if (this.state === "activated") {
                this.removeEventListener("statechange", handler);
                resolve(reg);
            }
        };
        sw.addEventListener("statechange", handler);
    });
}

/** Register for web push notifications. Returns true on success. */
export async function registerWebPush(): Promise<boolean> {
    if (!isFCMSupportedInBrowser()) return false;

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!apiKey || !projectId || !messagingSenderId || !appId || !vapidKey) {
        console.warn(`${LOG} Missing Firebase config env vars — web push disabled`);
        return false;
    }

    const config = {
        apiKey,
        projectId,
        messagingSenderId,
        appId,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        databaseURL,
    };

    try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        console.log(`${LOG} Notification permission: ${permission}`);
        if (permission !== "granted") return false;

        // Dynamic import to keep Firebase out of main bundle
        const [firebaseApp, { getMessaging, getToken }] = await Promise.all([
            import("firebase/app"),
            import("firebase/messaging"),
        ]);

        let app;
        try { app = firebaseApp.getApp(); }
        catch { app = firebaseApp.initializeApp(config); }

        const messaging = getMessaging(app);

        // Pass config as URL param so the SW can initialize Firebase immediately
        // on activation, without waiting for a postMessage from the page.
        let swReg: ServiceWorkerRegistration | undefined;
        try {
            const swUrl = `/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(config))}`;
            console.log(`${LOG} Registering service worker: ${swUrl.slice(0, 60)}...`);
            const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });

            // Wait for SW to become active before posting config (belt & suspenders)
            const activeReg = await waitForSWActivation(reg);
            activeReg.active?.postMessage({ type: "FIREBASE_CONFIG", config });
            swReg = activeReg;
            console.log(`${LOG} Service worker active, config sent`);
        } catch (swErr) {
            console.warn(`${LOG} Service worker registration failed (FCM may work with default SW):`, swErr);
        }

        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swReg,
        });

        if (!token) {
            console.error(`${LOG} getToken returned empty — check VAPID key and Firebase project config`);
            return false;
        }

        console.log(`${LOG} Got FCM token (prefix): ${token.slice(0, 20)}...`);

        // Register token with backend
        const res = await fetch("/api/notifications/register-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, platform: "web" }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`${LOG} Failed to register device token: ${res.status} ${err}`);
            return false;
        }

        console.log(`${LOG} Web push registration successful`);
        return true;
    } catch (err) {
        console.error(`${LOG} registerWebPush failed:`, err);
        return false;
    }
}

/** Unregister web push (delete token from backend and Firebase) */
export async function unregisterWebPush(): Promise<void> {
    try {
        const [firebaseApp, { getMessaging, deleteToken, getToken }] = await Promise.all([
            import("firebase/app"),
            import("firebase/messaging"),
        ]);

        let app;
        try { app = firebaseApp.getApp(); } catch { return; }

        const messaging = getMessaging(app);
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
        const token = await getToken(messaging, { vapidKey });

        if (token) {
            await deleteToken(messaging);
            await fetch("/api/notifications/register-device", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            console.log(`${LOG} Web push unregistered`);
        }
    } catch (err) {
        console.warn(`${LOG} unregisterWebPush failed:`, err);
    }
}
