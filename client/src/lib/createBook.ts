import { useCallback, useRef, useState } from "react";
import { ApiError, api, sleep } from "./api";
import type { GenerateRequest } from "./generate";

export interface CastRequestMember {
  name: string;
  role: string;
  kind: string;
  age?: number;
  pronouns?: string;
  description: string;
  photoConsent: boolean;
  photos: string[];
}

export interface CreateBookRequest extends GenerateRequest {
  cast?: CastRequestMember[];
  dedication?: string;
}

export interface PagePicture {
  pageNumber: number;
  status?: string;
  imageUrl?: string | null;
}

export type BookCreationState =
  | { phase: "idle" }
  | { phase: "writing"; storyId?: string; seconds: number }
  | { phase: "drawing"; storyId: string; done: number; total: number; pictures: PagePicture[] }
  | { phase: "error"; message: string; storyId?: string };

const STATUS_POLL_MS = 4000;
const IMAGES_POLL_MS = 5000;
const WRITING_TIMEOUT_MS = 6 * 60_000;

function friendlyError(error: unknown) {
  if (error instanceof ApiError && error.status === 429) {
    return "You've reached today's limit for free stories. Please try again a little later.";
  }
  if (error instanceof ApiError && error.status === 401) return "Your session has expired. Please sign in again.";
  return "We couldn't create your story just now. Please try again in a minute.";
}

export interface ImagesStatus {
  status?: string;
  counts?: { total: number; completed: number; pending: number; failed: number };
  pages?: PagePicture[];
}

export function picturesDone(s: ImagesStatus) {
  const c = s.counts;
  return !!c && c.total > 0 && c.pending === 0 && c.completed + c.failed >= c.total;
}

/**
 * Create a whole book in one go: write the story, then draw the pictures,
 * reporting progress (including each finished picture) along the way.
 * Resolves with the storyId once the text is written and drawing has started;
 * `onDrawn` fires when every picture is finished.
 */
export function useBookCreation() {
  const [state, setState] = useState<BookCreationState>({ phase: "idle" });
  const cancelled = useRef(false);

  const watchPictures = useCallback(async (storyId: string, onDrawn?: () => void) => {
    while (!cancelled.current) {
      await sleep(IMAGES_POLL_MS);
      try {
        const s = await api<ImagesStatus>(`/stories/${storyId}/images-status`);
        const pictures = s.pages ?? [];
        setState({ phase: "drawing", storyId, done: s.counts?.completed ?? 0, total: s.counts?.total ?? pictures.length, pictures });
        if (picturesDone(s)) {
          onDrawn?.();
          return;
        }
      } catch {
        // Transient errors: keep watching.
      }
    }
  }, []);

  const start = useCallback(
    async (request: CreateBookRequest, onDrawn?: () => void) => {
      cancelled.current = false;
      const started = Date.now();
      setState({ phase: "writing", seconds: 0 });

      let storyId: string;
      try {
        storyId = (await api<{ storyId: string }>("/stories/generate", { method: "POST", body: request })).storyId;
      } catch (error) {
        setState({ phase: "error", message: friendlyError(error) });
        return null;
      }

      // 1. Wait for the story text.
      while (!cancelled.current) {
        await sleep(STATUS_POLL_MS);
        setState({ phase: "writing", storyId, seconds: Math.round((Date.now() - started) / 1000) });
        try {
          const status = (await api<{ status?: string }>(`/stories/${storyId}/status`)).status?.toUpperCase();
          if (status === "FAILED") {
            setState({ phase: "error", storyId, message: "Something went wrong writing your story. Please try again; it won't count against your free stories." });
            return null;
          }
          if (status && status !== "PENDING") break;
        } catch {
          // Keep waiting through a failed poll.
        }
        if (Date.now() - started > WRITING_TIMEOUT_MS) {
          setState({ phase: "error", storyId, message: "This is taking longer than usual. Your story will appear in My Stories when it's ready." });
          return null;
        }
      }

      // 2. Start the pictures straight away.
      try {
        await api(`/stories/${storyId}/generate-images`, { method: "POST", body: { targetAge: request.targetAge } });
      } catch (error) {
        setState({ phase: "error", storyId, message: friendlyError(error) });
        return storyId;
      }
      setState({ phase: "drawing", storyId, done: 0, total: 0, pictures: [] });
      void watchPictures(storyId, onDrawn);
      return storyId;
    },
    [watchPictures],
  );

  const stop = useCallback(() => {
    cancelled.current = true;
  }, []);

  return { state, start, stop, watchPictures };
}
