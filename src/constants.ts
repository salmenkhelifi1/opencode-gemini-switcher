export const GEMINI_CLIENT_ID = "YOUR_GEMINI_CLIENT_ID";
export const GEMINI_CLIENT_SECRET = "YOUR_GEMINI_CLIENT_SECRET";
export const GEMINI_SCOPES: readonly string[] = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];
export const GEMINI_REDIRECT_URI = "http://localhost:8085/oauth2callback";
export const GEMINI_PROVIDER_ID = "google";
