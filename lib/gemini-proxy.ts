export const GOOGLE_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const MODEL_ID_RE = /^[a-zA-Z0-9._-]+$/;

export function isValidGeminiModelId(model: string): boolean {
    return model.length > 0 && model.length <= 128 && MODEL_ID_RE.test(model);
}

export function buildGenerateContentUrl(model: string, apiKey: string): string {
    const q = new URLSearchParams({ key: apiKey });
    return `${GOOGLE_GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?${q}`;
}

export function buildStreamGenerateContentUrl(model: string, apiKey: string): string {
    const q = new URLSearchParams({ alt: "sse", key: apiKey });
    return `${GOOGLE_GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?${q}`;
}
