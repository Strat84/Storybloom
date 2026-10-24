import { useCallback, useRef, useState } from "react";
import { ApiError, api, sleep } from "./api";

export interface GenerateRequest {
  prompt: string;
  totalPages: number;
  targetAge: string;
  userId?: string;
  imageStyleId: number;
  title?: string;
  authorName?: string;
  /** Book language code (content/languages.ts). */
  language?: string;
}

export type GenerationState =
  | { status: "idle" }
  | { status: "starting" }
  | { status: "writing"; storyId: string; elapsedSeconds: number }
  | { status: "done"; storyId: string }
  | { status: "error"; message: string };

const POLL_INTERVAL_MS = 10_000;
const TIMEOUT_MS = 6 * 60_000;

export interface StoryContext {
  characterDescription: string;
  targetAge: string;
}

/** Store the hero's look and reading age so the editor can send them with the image request. */
export function rememberStoryContext(storyId: string, context: StoryContext) {
  try {
    localStorage.setItem(`sb_story_${storyId}`, JSON.stringify(context));
  } catch {
    // Best-effort only.
  }
}

export function recallStoryContext(storyId: string): StoryContext | null {
  try {
    return JSON.parse(localStorage.getItem(`sb_story_${storyId}`) || "null");
  } catch {
    return null;
  }
}

function friendlyError(error: unknown) {
  if (error instanceof ApiError && (error.status === 429 || error.status === 403)) {
    return "You've reached today's limit for free stories. Please try again tomorrow.";
  }
  if (error instanceof ApiError && error.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  return "We couldn't create your story just now. Please try again in a minute.";
}

/** Start a story with the existing /stories/generate endpoint and wait until the text is ready. */
export function useStoryGeneration() {
  const [state, setState] = useState<GenerationState>({ status: "idle" });
  const cancelled = useRef(false);

  const start = useCallback(async (request: GenerateRequest) => {
    cancelled.current = false;
    setState({ status: "starting" });
    let storyId: string;
    try {
      const res = await api<{ storyId: string }>("/stories/generate", { method: "POST", body: request });
      storyId = res.storyId;
    } catch (error) {
      setState({ status: "error", message: friendlyError(error) });
      return null;
    }

    const started = Date.now();
    setState({ status: "writing", storyId, elapsedSeconds: 0 });
    while (!cancelled.current && Date.now() - started < TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const res = await api<{ status?: string }>(`/stories/${storyId}/status`);
        const status = res?.status?.toLowerCase();
        if (status === "completed") {
          setState({ status: "done", storyId });
          return storyId;
        }
        if (status === "failed") {
          setState({ status: "error", message: "Something went wrong writing your story. Please try again." });
          return null;
        }
      } catch {
        // A single failed poll is not fatal; keep waiting until the timeout.
      }
      setState({ status: "writing", storyId, elapsedSeconds: Math.round((Date.now() - started) / 1000) });
    }
    if (!cancelled.current) {
      setState({
        status: "error",
        message: "This is taking longer than usual. Please check My Stories in a few minutes.",
      });
    }
    return null;
  }, []);

  const reset = useCallback(() => {
    cancelled.current = true;
    setState({ status: "idle" });
  }, []);

  return { state, start, reset };
}
