export interface OAuthAuthDetails {
  type: "oauth";
  refresh: string;
  access?: string;
  expires?: number;
}

export type AuthDetails = OAuthAuthDetails | { type: string; [key: string]: unknown };
export type GetAuth = () => Promise<AuthDetails>;

export interface LoaderResult {
  apiKey: string;
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

export interface PluginContext {
  client: any;
}

export interface PluginResult {
  config?: (config: any) => Promise<void>;
  auth: {
    provider: string;
    loader: (getAuth: GetAuth, provider: any) => Promise<LoaderResult | null>;
  };
}
