import config from "@config";
import { authModule } from "./amplify";

/**
 * Client for the existing StoryBloom backend (API Gateway + Lambda).
 * Request and response shapes match the live site as deployed Dec 2025.
 */

export const API_BASE = config.api.baseUrl;

export async function getIdToken(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await authModule();
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

export async function getUserSub(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await authModule();
    const session = await fetchAuthSession();
    const sub = session.tokens?.idToken?.payload?.sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public body?: unknown) {
    super(message);
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Send the Cognito ID token. Defaults to true. */
  auth?: boolean;
}

export async function api<T = any>(path: string, { method = "GET", body, auth = true }: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = (data && typeof data === "object" && data.message) || (typeof data === "string" && data) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

/** The backend returns checkout links under a few different keys. */
export function checkoutUrlFrom(data: any): string | null {
  return data?.url || data?.sessionUrl || data?.checkout_url || data?.checkoutUrl || data?.session?.url || null;
}

export function isPaidSession(data: any) {
  return data?.paid === true || data?.payment_status === "paid" || data?.status === "complete" || data?.session?.payment_status === "paid";
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- Story types (as returned by the backend) ----

export type PageType = "COVER_FRONT" | "PAGE" | "COVER_BACK";

export interface StoryPage {
  id: string;
  storyId: string;
  type?: PageType;
  pageNumber?: number;
  pageNo?: number;
  text?: string;
  content?: string;
  title?: string;
  author?: string;
  imagePrompt?: string;
  imageUrl?: string | null;
  status?: string;
}

export interface Story {
  id?: string;
  storyId?: string;
  title?: string;
  author?: string;
  totalPages?: number;
  coverImageUrl?: string;
  regenerationLimit?: number;
  regenerationUsed?: number;
  regenerationRemaining?: number;
}

export interface StoryListItem extends Story {
  storyId: string;
  previewCount?: number;
  downloadable?: string;
  downloadStatus?: string;
  downloadOption?: DownloadOption;
  downloadHistory?: { downloadOption: DownloadOption; status: string; downloadable: string }[];
  deliveryStatus?: string;
  expectedDeliveryDate?: string;
}

export type DownloadOption = "pdf_only" | "pdf_and_book";

export interface Character {
  id?: string;
  name: string;
  description: string;
}

export function pageNumberOf(page: StoryPage) {
  return page.pageNumber ?? page.pageNo;
}
