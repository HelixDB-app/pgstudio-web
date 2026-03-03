// Firebase Cloud Messaging Service Worker
// Required for background push notifications on web browsers.
// This file must be at the root of the public directory.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

let messagingInitialized = false;

function initFirebaseMessaging(config) {
    if (messagingInitialized) return;
    try {
        if (!firebase.apps.length) { // eslint-disable-line no-undef
            firebase.initializeApp(config); // eslint-disable-line no-undef
        }
        // eslint-disable-next-line no-undef
        const messaging = firebase.messaging();
        messaging.onBackgroundMessage((payload) => {
            console.log("[FCM-SW] Background message received:", payload);
            const notificationTitle = payload.notification?.title ?? "pgStudio";
            const notificationOptions = {
                body: payload.notification?.body ?? "",
                icon: "/logo.png",
                badge: "/logo.png",
                image: payload.notification?.image ?? undefined,
                data: payload.data ?? {},
                requireInteraction: false,
            };
            // eslint-disable-next-line no-restricted-globals
            return self.registration.showNotification(notificationTitle, notificationOptions);
        });
        messagingInitialized = true;
        console.log("[FCM-SW] Firebase Messaging initialized successfully");
    } catch (err) {
        console.error("[FCM-SW] Failed to initialize Firebase Messaging:", err);
    }
}

// ── Try to initialize from URL search params (passed when registering the SW) ──
// This handles the case where the SW is already active when a background
// message arrives, before the app has a chance to postMessage the config.
try {
    const swUrl = new URL(self.location.href); // eslint-disable-line no-undef
    const configParam = swUrl.searchParams.get("config");
    if (configParam) {
        const config = JSON.parse(decodeURIComponent(configParam));
        console.log("[FCM-SW] Initializing from URL config param");
        initFirebaseMessaging(config);
    }
} catch (err) {
    console.warn("[FCM-SW] Could not parse config from URL:", err);
}

// ── Also accept config via postMessage (fallback / update path) ──
// eslint-disable-next-line no-undef
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "FIREBASE_CONFIG") {
        console.log("[FCM-SW] Received FIREBASE_CONFIG via postMessage");
        initFirebaseMessaging(event.data.config);
    }
});

// ── Notification click handler ──
// eslint-disable-next-line no-undef
self.addEventListener("notificationclick", (event) => {
    console.log("[FCM-SW] Notification clicked:", event.notification.data);
    event.notification.close();

    const actionUrl = event.notification.data?.actionUrl;
    const urlToOpen = actionUrl || "/";

    event.waitUntil(
        // eslint-disable-next-line no-undef
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && "focus" in client) { // eslint-disable-line no-undef
                    client.focus();
                    client.navigate(urlToOpen);
                    return;
                }
            }
            // eslint-disable-next-line no-undef
            if (clients.openWindow) {
                // eslint-disable-next-line no-undef
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
