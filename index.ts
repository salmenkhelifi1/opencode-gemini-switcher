import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// --- Types ---
export interface OAuthAuthDetails {
  type: "oauth";
  refresh: string;
  access?: string;
  expires?: number;
}

export interface LoaderResult {
  apiKey: string;
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

// --- Constants ---
const GEMINI_CLIENT_ID = "YOUR_GEMINI_CLIENT_ID";
const GEMINI_CLIENT_SECRET = "YOUR_GEMINI_CLIENT_SECRET";
const GEMINI_PROVIDER_ID = "google";
const GEMINI_ENDPOINT = "https://cloudcode-pa.googleapis.com";

// --- Helpers ---
function loadAuthFromDisk(): OAuthAuthDetails | null {
  try {
    const homeDir = process.env.HOME || "/home/salmen";
    const credsPath = path.join(homeDir, ".gemini", "oauth_creds.json");
    if (!fs.existsSync(credsPath)) return null;
    const data = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
    if (!data.refresh_token) return null;
    return {
      type: "oauth",
      refresh: data.refresh_token,
      access: data.access_token,
      expires: data.expiry_date
    };
  } catch (e) {
    return null;
  }
}

function parseProjectId(refresh: string): string {
  const parts = refresh.split("|");
  return parts.length > 1 ? parts[1] : "rosy-odyssey-86f3p";
}

async function fetchTokenRefresh(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: GEMINI_CLIENT_ID,
      client_secret: GEMINI_CLIENT_SECRET,
    }),
  });
  return await res.json();
}

/**
 * Portable Gemini Switcher Plugin
 * Consolidation of all switching and sync logic for OpenCode.
 */
export const GeminiSwitcherPlugin = async ({ client }: any): Promise<any> => {
  return {
    auth: {
      provider: GEMINI_PROVIDER_ID,
      loader: async (getAuth: any) => {
        const disk = loadAuthFromDisk();
        let auth = await getAuth() as OAuthAuthDetails;
        
        // Sync if disk is different
        if (disk && disk.refresh !== auth.refresh) {
          console.log(`[Gemini Switcher] Syncing with disk account: ${disk.refresh.split("|")[0]}`);
          auth = disk;
        }

        return {
          apiKey: "",
          async fetch(input: any, init: any) {
            // 1. Ensure token is fresh
            let accessToken = auth.access;
            if (!accessToken || (auth.expires && auth.expires < Date.now() + 60000)) {
               const data = await fetchTokenRefresh(auth.refresh);
               accessToken = data.access_token;
               auth.access = accessToken;
               auth.expires = Date.now() + (data.expires_in || 3600) * 1000;
               auth.refresh = data.refresh_token ?? auth.refresh;
            }

            // 2. Prepare Request
            const projectId = parseProjectId(auth.refresh);
            const urlStr = input.toString();
            const match = urlStr.match(/\/models\/([^:]+):(\w+)/);
            if (!match) return fetch(input, init);

            const [, model, action] = match;
            const streaming = action === "streamGenerateContent";
            const targetUrl = `${GEMINI_ENDPOINT}/v1internal:${action}${streaming ? "?alt=sse" : ""}`;

            const headers = new Headers(init?.headers);
            headers.set("Authorization", `Bearer ${accessToken}`);
            headers.set("X-Goog-Api-Client", "gl-node/22.17.0");
            headers.set("Client-Metadata", "ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI");
            headers.set("x-activity-request-id", randomUUID());
            if (streaming) headers.set("Accept", "text/event-stream");

            let body = init?.body;
            if (typeof body === "string" && body) {
              const parsedBody = JSON.parse(body);
              body = JSON.stringify({
                project: projectId,
                model: model,
                user_prompt_id: randomUUID(),
                request: parsedBody
              });
            }

            return fetch(targetUrl, { ...init, headers, body });
          }
        };
      }
    },
    provider: {
      id: GEMINI_PROVIDER_ID,
      models: async () => [
        { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Switcher)" },
        { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Switcher)" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Switcher)" },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Switcher)" }
      ]
    }
  };
};
