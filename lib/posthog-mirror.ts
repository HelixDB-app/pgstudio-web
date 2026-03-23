/**
 * Opt-in server-side mirror of `ai_model_invocation` for clients where PostHog JS may be blocked.
 * Enable with POSTHOG_MIRROR_API_LOGS=true and NEXT_PUBLIC_POSTHOG_HOST (do not use the project *public* key for high-volume server capture — use a server key if PostHog provides one for your setup).
 */

import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getClient(): PostHog | null {
    if (process.env.POSTHOG_MIRROR_API_LOGS !== "true") return null;
    const key = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
    if (!key) return null;
    if (!client) {
        const host =
            process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
        client = new PostHog(key, { host, flushAt: 20, flushInterval: 5000 });
    }
    return client;
}

export function mirrorAiModelInvocation(
    distinctId: string,
    body: {
        model: string;
        featureType: string;
        endpoint: string;
        responseTime: number;
        status: string;
        provider?: string;
        stream?: boolean;
        cached?: boolean;
        errorMessage?: string;
    }
): void {
    const ph = getClient();
    if (!ph) return;

    const props: Record<string, string | number | boolean> = {
        provider: body.provider ?? "google_gemini",
        model_id: body.model.slice(0, 100),
        feature: body.featureType,
        endpoint: body.endpoint.slice(0, 100),
        latency_ms: Math.round(body.responseTime),
        status: body.status,
        source: "server_mirror",
    };
    if (body.stream !== undefined) props.stream = body.stream;
    if (body.cached !== undefined) props.cached = body.cached;
    if (body.errorMessage) {
        props.error_message =
            body.errorMessage.length > 200
                ? `${body.errorMessage.slice(0, 200)}…`
                : body.errorMessage;
    }

    ph.capture({
        distinctId,
        event: "ai_model_invocation",
        properties: props,
    });
}
