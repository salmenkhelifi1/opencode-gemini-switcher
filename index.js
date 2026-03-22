var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};

// index.ts
var exports_opencode_gemini_switcher = {};
module.exports = __toCommonJS(exports_opencode_gemini_switcher);
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var LOG_FILE = "/tmp/switcher.log";
function log(msg) {
  try {
    import_node_fs.default.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}
`);
  } catch (e) {}
}
var originalFetch = globalThis.fetch;
var GEMINI_PROVIDER_ID = "google";
var STANDARD_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1";
var currentAuth = null;
function loadAuthFromDisk() {
  try {
    const homeDir = process.env.HOME || "/home/salmen";
    const credsPath = import_node_path.default.join(homeDir, ".gemini", "oauth_creds.json");
    if (!import_node_fs.default.existsSync(credsPath))
      return null;
    const data = JSON.parse(import_node_fs.default.readFileSync(credsPath, "utf-8"));
    if (!data.refresh_token)
      return null;
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
async function fetchTokenRefresh(refreshToken) {
  const realToken = refreshToken.split("|")[0];
  const res = await originalFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: realToken,
      client_id: process.env.GOOGLE_CLIENT_ID || "PROVIDE_ME",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "PROVIDE_ME"
    })
  });
  return await res.json();
}
var modelMapping = {
  "gemini-3-pro-preview": "gemini-1.5-pro-latest",
  "gemini-3-flash-preview": "gemini-1.5-flash-latest",
  "gemini-1.5-pro": "gemini-1.5-pro-latest",
  "gemini-1.5-flash": "gemini-1.5-flash-latest"
};
log("Global Interceptor Initialization Started");
globalThis.fetch = async (input, init) => {
  const urlStr = typeof input === "string" ? input : input.url || input.toString();
  if (!urlStr.includes("googleapis.com")) {
    return originalFetch(input, init);
  }
  log("Intercepted Fetch: " + urlStr);
  const disk = loadAuthFromDisk();
  if (disk && (!currentAuth || disk.refresh !== currentAuth.refresh)) {
    log(`Rotation detected -> ${disk.refresh.split("|")[0]}`);
    currentAuth = disk;
  }
  if (currentAuth && (!currentAuth.access || currentAuth.expires && currentAuth.expires < Date.now() + 60000)) {
    const data = await fetchTokenRefresh(currentAuth.refresh);
    if (data.access_token) {
      currentAuth.access = data.access_token;
      currentAuth.expires = Date.now() + (data.expires_in || 3600) * 1000;
    }
  }
  if (urlStr.includes("/models/gemini") || urlStr.includes("generativelanguage.googleapis.com")) {
    const match = urlStr.match(/\/models\/([^:/]+)(?::(\w+))?/);
    if (match) {
      const [, model, action = "generateContent"] = match;
      const mappedModel = modelMapping[model] || model;
      const targetUrl = `${STANDARD_API_ENDPOINT}/models/gemini-1.5-pro-latest:${action}`;
      log(`Mapping ${model} -> gemini-1.5-pro-latest`);
      const headers2 = new Headers(init?.headers || {});
      if (currentAuth?.access)
        headers2.set("Authorization", `Bearer ${currentAuth.access}`);
      const resp = await originalFetch(targetUrl, { ...init, headers: headers2 });
      log(`Response Status: ${resp.status}`);
      return resp;
    }
  }
  const headers = new Headers(init?.headers || {});
  if (currentAuth?.access)
    headers.set("Authorization", `Bearer ${currentAuth.access}`);
  return originalFetch(input, { ...init, headers });
};
var GeminiSwitcherPlugin = async ({ client }) => {
  log("Plugin Factory Called");
  return {
    auth: {
      provider: GEMINI_PROVIDER_ID,
      methods: [
        {
          id: "google",
          name: "Google Gemini",
          description: "Process-level unlimited Gemini rotation"
        }
      ],
      loader: async (getAuth) => {
        log("Auth Loader Called");
        return {
          apiKey: "",
          fetch: globalThis.fetch
        };
      }
    },
    provider: {
      id: GEMINI_PROVIDER_ID,
      models: async () => {
        log("Model Listing Called");
        return [
          { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Switcher)" },
          { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Switcher)" }
        ];
      }
    }
  };
};
GeminiSwitcherPlugin.default = GeminiSwitcherPlugin;
module_opencode_gemini_switcher.exports = GeminiSwitcherPlugin;
