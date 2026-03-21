import fs from "node:fs";
import path from "node:path";

export interface OAuthAuthDetails {
  type: "oauth";
  refresh: string;
  access?: string;
  expires?: number;
}

export function loadAuthFromDisk(): OAuthAuthDetails | null {
  try {
    const homeDir = process.env.HOME || "/home/salmen";
    const credsPath = path.join(homeDir, ".gemini", "oauth_creds.json");
    
    if (!fs.existsSync(credsPath)) {
      return null;
    }

    const content = fs.readFileSync(credsPath, "utf-8");
    const data = JSON.parse(content);

    if (!data.refresh_token) {
      return null;
    }

    return {
      type: "oauth",
      refresh: data.refresh_token,
      access: data.access_token,
      expires: data.expiry_date
    };
  } catch (error) {
    console.error("[Gemini Switcher] Failed to load auth from disk:", error);
    return null;
  }
}

export function accessTokenExpired(auth: OAuthAuthDetails): boolean {
  if (!auth.access || typeof auth.expires !== "number") {
    return true;
  }
  return auth.expires <= Date.now() + 60000;
}
