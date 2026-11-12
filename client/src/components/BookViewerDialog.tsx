import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pencil, RefreshCw } from "lucide-react";
import config from "@config";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, sleep, type Story, type StoryPage } from "@/lib/api";
import { recordReading, requestMoreRedraws } from "@/lib/reading";
import { cn } from "@/lib/utils";

/** Quick reasons for a redraw: they guide the feedback and tell us what goes wrong most. */
const REDRAW_REASONS = [
  { key: "likeness", label: "Doesn't look like my child", hint: "e.g. rounder face, curly brown hair, no glasses, a bit younger" },
  { key: "person", label: "Wrong or extra person", hint: "e.g. only Mia and Grandma should be in this picture" },
  { key: "missing", label: "Someone or something is missing", hint: "e.g. Add my daughter Mia, she's missing from this picture" },
  { key: "style", label: "Colors or style", hint: "e.g. brighter colors, make it nighttime" },
  { key: "other", label: "Something else", hint: "Describe what to change in this picture" },
] as const;

export interface ViewerStory extends Story {
  storyId: string;
  pages: StoryPage[];
  /** Bought: shown in the "out of redraws" message. */
  purchased?: boolean;
}

interface BookViewerDialogProps {
  story: ViewerStory | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onStoryUpdate: (story: ViewerStory) => void;
  /** Page to open on (defaults to the cover). */
  initialIndex?: number;
  /** Open straight into redrawing the picture or editing the words. */
  initialMode?: "view" | "edit" | "redraw";
  /** "Same problem on other pages?": hand the request to the several-pages fixer. */
  onFixAcross?: (issue: string, pageNo: number) => void;
}

function orderPages(pages: StoryPage[]) {
  const front = pages.filter((p) => p.type === "COVER_FRONT");
  const back = pages.filter((p) => p.type === "COVER_BACK");
  const inner = pages
    .filter((p) => p.type !== "COVER_FRONT" && p.type !== "COVER_BACK")
    .sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
  return [...front, ...inner, ...back];
}

/** Redraws finish in the background (checked, and redrawn if someone is missing), so allow up to 3 minutes. */
async function waitForImage(storyId: string, pageNo: number) {
  for (let attempt = 0; attempt < 90; attempt++) {
    await sleep(2000);
    const status = await api<{ status?: string; imageUrl?: string }>(`/stories/${storyId}/pages/${pageNo}/image-status`);
    if (status.status === "COMPLETED" && status.imageUrl) return status.imageUrl;
    if (status.status === "FAILED") throw new Error("The new picture couldn't be drawn. Please try different feedback.");
  }
  throw new Error("Drawing the picture took too long. Please try again.");
}

export default function BookViewerDialog({ story, loading, open, onClose, onStoryUpdate, initialIndex = 0, initialMode = "view", onFixAcross }: BookViewerDialogProps) {
  const { toast } = useToast();
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"view" | "edit" | "redraw">("view");
  const [draft, setDraft] = useState({ title: "", author: "", text: "" });
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState<(typeof REDRAW_REASONS)[number]["key"] | null>(null);
  const [why, setWhy] = useState("");
  /** The last redraw's request, offered for the other pages. */
  const [lastAsked, setLastAsked] = useState<{ text: string; page: number } | null>(null);
  const [askState, setAskState] = useState<null | "sending" | "maxed">(null);
  const [busy, setBusy] = useState<null | "saving" | "drawing">(null);
  // On a phone the redraw form sits below the picture and words: bring it into view when it opens.
  const redrawPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && mode === "redraw") window.setTimeout(() => redrawPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }, [open, mode, index]);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      const start = pages[initialIndex];
      const isCover = start?.type === "COVER_FRONT";
      if (initialMode === "edit" && start) {
        setDraft({ title: start.title ?? story?.title ?? "", author: start.author ?? story?.author ?? "", text: isCover ? "" : start.text || start.content || "" });
      }
      // The back cover has no words to edit.
      setMode(initialMode === "edit" && start?.type === "COVER_BACK" ? "view" : initialMode);
    }
    // Only reset when the dialog opens, not on every story update while it's open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, story?.storyId]);

  const pages = useMemo(() => orderPages(story?.pages ?? []), [story]);
  const page = pages[index];
  const isFront = page?.type === "COVER_FRONT";
  const isBack = page?.type === "COVER_BACK";
  const label = isFront ? "Front cover" : isBack ? "Back cover" : `Page ${index}`;
  // The backend numbers the front cover 0, story pages 1..n and the back cover last.
  const pageNo = index;
  const limit = story?.regenerationLimit ?? config.story.regenerationLimit;
  const used = story?.regenerationUsed ?? 0;
  const limitReached = used >= limit;
  useEffect(() => {
    if (open && limitReached && mode === "redraw") recordReading(story?.storyId, { name: "redraw_limit_hit", page: index });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, limitReached, mode]);
  const supportHref = `mailto:support@storybloom.ai?subject=${encodeURIComponent(`Help with my book: ${story?.title ?? ""}`)}&body=${encodeURIComponent(
    `Hi StoryBloom,

I've used all my redraws and this still isn't right:

(what's wrong, and on which page)

My book: ${typeof window !== "undefined" ? `${window.location.origin}/book/${story?.storyId}` : ""}
`,
  )}`;
  const title = pages.find((p) => p.title)?.title ?? story?.title ?? "";
  const author = pages.find((p) => p.author)?.author ?? story?.author ?? "";
  const text = page ? page.text || page.content || (isBack ? "The End" : "") : "";
  const image = page?.imageUrl || story?.coverImageUrl;

  const startEdit = () => {
    setDraft({ title, author, text: page?.text || page?.content || "" });
    setMode("edit");
  };

  const replacePage = (patch: Partial<StoryPage>, storyPatch: Partial<ViewerStory> = {}) => {
    if (!story || !page) return;
    const updated: ViewerStory = {
      ...story,
      ...storyPatch,
      pages: story.pages.map((p) => (p === page ? { ...p, ...patch } : p)),
    };
    onStoryUpdate(updated);
  };

  const saveEdit = async () => {
    if (!story || !page) return;
    setBusy("saving");
    try {
      const body = isFront ? { title: draft.title, author: draft.author } : { text: draft.text };
      await api(`/stories/${story.storyId}/page/${pageNo}`, { method: "PUT", body });
      if (isFront) {
        replacePage({ title: draft.title, author: draft.author }, { title: draft.title });
        // A new title needs a new cover illustration.
        setBusy("drawing");
        await api(`/stories/${story.storyId}/pages/${pageNo}/generate-image`, { method: "POST" });
        const url = await waitForImage(story.storyId, pageNo);
        replacePage({ title: draft.title, author: draft.author, imageUrl: url }, { title: draft.title, coverImageUrl: url });
      } else {
        replacePage({ text: draft.text, content: draft.text });
      }
      setMode("view");
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const redraw = async () => {
    if (!story || !page || !feedback.trim() || limitReached) return;
    setBusy("drawing");
    recordReading(story.storyId, { name: "redraw_request", page: pageNo, category: reason ?? "none" });
    try {
      const res = await api<{ regenerationUsed?: number }>(`/stories/${story.storyId}/pages/${pageNo}/regenerate`, {
        method: "POST",
        body: { feedback: feedback.trim() },
      });
      const url = await waitForImage(story.storyId, pageNo);
      replacePage({ imageUrl: url }, {
        regenerationUsed: res?.regenerationUsed ?? used + 1,
        ...(isFront ? { coverImageUrl: url } : {}),
      });
      setLastAsked({ text: feedback.trim(), page: pageNo });
      setFeedback("");
      setReason(null);
      setMode("view");
    } catch (err) {
      toast({ title: "Couldn't redraw", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loading ? "Loading…" : `${title || "Your story"}: ${label}`}</DialogTitle>
        </DialogHeader>
        {loading || !page ? (
          <div className="py-16 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" aria-hidden /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative rounded-xl border bg-muted overflow-hidden" data-clarity-mask="true">
                {image ? <img src={image} alt={`${label} illustration`} className="w-full h-auto" /> : <p className="p-8 text-center text-muted-foreground">No picture yet</p>}
                {busy === "drawing" && (
                  <div className="absolute inset-0 bg-background/75 flex flex-col items-center justify-center font-medium text-center px-6"><span className="flex items-center"><Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden />Drawing…</span><span className="text-xs text-muted-foreground mt-1 font-normal">We check that everyone you asked for is in the picture, so this can take up to a minute.</span></div>
                )}
              </div>
              <div className="space-y-4">
                {mode === "edit" ? (
                  <div className="space-y-3">
                    {isFront ? (
                      <>
                        <div className="space-y-1.5"><Label htmlFor="v-title">Title</Label><Input id="v-title" dir="auto" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} disabled={!!busy} /></div>
                        <div className="space-y-1.5"><Label htmlFor="v-author">Author</Label><Input id="v-author" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} disabled={!!busy} /></div>
                        <p className="text-xs text-muted-foreground">Changing the title redraws the cover.</p>
                      </>
                    ) : (
                      <div className="space-y-1.5"><Label htmlFor="v-text">Story text</Label><Textarea id="v-text" dir="auto" rows={7} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} disabled={!!busy} /></div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={!!busy}>{busy === "saving" ? "Saving…" : busy === "drawing" ? "Drawing cover…" : "Save changes"}</Button>
                      <Button variant="outline" onClick={() => setMode("view")} disabled={!!busy}>Cancel</Button>
                    </div>
                  </div>
                ) : isFront ? (
                  <div>
                    <p className="text-2xl font-display font-bold">{title || "Untitled"}</p>
                    {author && <p className="text-muted-foreground">by {author}</p>}
                  </div>
                ) : (
                  <p dir="auto" className="text-lg font-story leading-relaxed whitespace-pre-line">{text}</p>
                )}

                {mode === "redraw" && (
                  <div ref={redrawPanel} className="space-y-2 rounded-lg border-2 border-primary/40 p-3 scroll-mt-4">
                    {limitReached ? (
                      askState === "maxed" ? (
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">Thanks, we've noted it.</p>
                          <p className="text-muted-foreground">This book has had all its extra redraws. <a className="underline text-primary" href={supportHref}>Email us</a> and we'll fix it with you.</p>
                          <Button variant="outline" onClick={() => setMode("view")}>Back</Button>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">You've used all {limit} redraws for this book.</p>
                          <p className="text-muted-foreground">Tell us what still isn't right and we'll add {config.story.feedbackRedraws} more redraws right now.</p>
                          <div className="flex flex-wrap gap-1.5">
                            {REDRAW_REASONS.map((r) => (
                              <button key={r.key} type="button" onClick={() => setReason(r.key)} disabled={askState === "sending"}
                                className={cn("rounded-full border px-3 py-1 text-xs", reason === r.key ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                                {r.label}
                              </button>
                            ))}
                          </div>
                          <Textarea rows={3} aria-label="What still isn't right" placeholder="e.g. Her face still looks older than 4, and her hair should be curly" value={why} onChange={(e) => setWhy(e.target.value)} disabled={askState === "sending"} />
                          <div className="flex gap-2">
                            <Button disabled={why.trim().length < 8 || askState === "sending"} onClick={async () => {
                              if (!story) return;
                              setAskState("sending");
                              const res = await requestMoreRedraws(story.storyId, { category: reason ?? "none", text: why.trim(), page: pageNo });
                              if (res.granted && res.regenerationLimit) {
                                onStoryUpdate({ ...story, regenerationLimit: res.regenerationLimit });
                                toast({ title: `${res.added ?? config.story.feedbackRedraws} more redraws added`, description: "Thanks for telling us. Describe the change you want and redraw." });
                                setWhy("");
                                setAskState(null);
                              } else if (res.error && /little more/.test(res.error)) {
                                toast({ title: "Tell us a little more", description: "A few words about what isn't right is enough." });
                                setAskState(null);
                              } else {
                                setAskState("maxed");
                              }
                            }}>{askState === "sending" ? "Sending…" : `Get ${config.story.feedbackRedraws} more redraws`}</Button>
                            <Button variant="outline" onClick={() => setMode("view")} disabled={askState === "sending"}>Back</Button>
                          </div>
                        </div>
                      )
                    ) : (
                      <>
                        <Label>What's wrong with this picture?</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {REDRAW_REASONS.map((r) => (
                            <button key={r.key} type="button" onClick={() => setReason(r.key)} disabled={!!busy}
                              className={cn("rounded-full border px-3 py-1 text-xs", reason === r.key ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                              {r.label}
                            </button>
                          ))}
                        </div>
                        <Label htmlFor="v-feedback" className="block pt-1">What should change?</Label>
                        <Textarea id="v-feedback" rows={3} placeholder={REDRAW_REASONS.find((r) => r.key === reason)?.hint ?? "e.g. Make her hair curlier and add the red scarf"} value={feedback} onChange={(e) => setFeedback(e.target.value)} disabled={!!busy} />
                        <p className="text-xs text-muted-foreground">{used} of {limit} redraws used for this book</p>
                        <div className="flex gap-2">
                          <Button onClick={redraw} disabled={!!busy || !feedback.trim()}>{busy === "drawing" ? "Drawing…" : "Redraw picture"}</Button>
                          <Button variant="outline" onClick={() => setMode("view")} disabled={!!busy}>Cancel</Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {mode === "view" && lastAsked && lastAsked.page === pageNo && onFixAcross && (
                  <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm space-y-2">
                    <p className="font-medium">Is this also wrong on other pages?</p>
                    <p className="text-muted-foreground text-xs">We'll find the pages with the same problem and fix only those, as one redraw.</p>
                    <Button size="sm" onClick={() => onFixAcross(lastAsked.text, lastAsked.page)}>Check the other pages</Button>
                  </div>
                )}
                {mode === "view" && !isBack && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={startEdit}><Pencil className="h-3.5 w-3.5" aria-hidden />{isFront ? "Edit title" : "Edit text"}</Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setMode("redraw")}><RefreshCw className="h-3.5 w-3.5" aria-hidden />Redraw picture</Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t mt-2">
              <Button variant="outline" onClick={() => { setIndex((i) => Math.max(0, i - 1)); setMode("view"); }} disabled={index === 0 || !!busy} className="gap-1"><ChevronLeft className="h-4 w-4" aria-hidden />Back</Button>
              <span className="text-sm text-muted-foreground">{index + 1} / {pages.length}</span>
              <Button variant="outline" onClick={() => { setIndex((i) => Math.min(pages.length - 1, i + 1)); setMode("view"); }} disabled={index === pages.length - 1 || !!busy} className="gap-1">Next<ChevronRight className="h-4 w-4" aria-hidden /></Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
