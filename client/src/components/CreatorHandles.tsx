// Optional "have a following?" fields on the sign-up forms. The handles are kept in this browser until
// the account is confirmed, then sent with the confirmation code (Cognito clientMetadata) and saved on
// the user by the post-confirmation trigger (storybloom-backend utils/social.js). The outreach Apps
// Script checks public follower counts and emails any creator offer.

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KEY = "sb_creator_handles";
const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
] as const;
type Handles = Partial<Record<(typeof PLATFORMS)[number]["id"], string>>;

function load(): Handles {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

/** The handles entered at sign-up, for confirmSignUp's clientMetadata (undefined if none). */
export function readCreatorHandles(): Record<string, string> | undefined {
  const handles = Object.fromEntries(Object.entries(load()).map(([k, v]) => [k, String(v ?? "").trim().slice(0, 100)]).filter(([, v]) => v));
  return Object.keys(handles).length ? handles : undefined;
}

export function clearCreatorHandles() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // storage blocked: nothing was kept
  }
}

export default function CreatorHandles({ compact = false }: { compact?: boolean }) {
  const [handles, setHandles] = useState<Handles>(load);
  const [open, setOpen] = useState(() => Object.values(handles).some(Boolean));
  const set = (id: keyof Handles, value: string) => {
    const next = { ...handles, [id]: value };
    setHandles(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage blocked: the handles just won't be sent
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3 text-left text-sm hover:bg-primary/10">
        <span className="font-semibold text-primary flex items-center gap-1.5"><Sparkles className="h-4 w-4" aria-hidden />Share your family on social? Your first book could be free.</span>
        {!compact && <span className="text-muted-foreground">Optional. Add your handle and we'll see if you qualify for a creator offer.</span>}
      </button>
    );
  }
  return (
    <fieldset className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
      <legend className="px-1 text-sm font-semibold text-primary flex items-center gap-1.5"><Sparkles className="h-4 w-4" aria-hidden />Creators get free and discounted books</legend>
      <p className="text-xs text-muted-foreground">
        Optional. Add any account you post on. We look at its public follower count, and if you qualify, we'll email you a free or discounted book to share
        with your followers.
      </p>
      <div className={compact ? "space-y-2" : "grid grid-cols-1 sm:grid-cols-3 gap-2"}>
        {PLATFORMS.map((p) => (
          <div key={p.id} className="space-y-1">
            <Label htmlFor={`creator-${p.id}`} className="text-xs">{p.label}</Label>
            <Input id={`creator-${p.id}`} value={handles[p.id] ?? ""} onChange={(e) => set(p.id, e.target.value)} placeholder="@yourhandle" maxLength={100} autoComplete="off" />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
