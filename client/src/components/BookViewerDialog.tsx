import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pencil, RefreshCw } from "lucide-react";
import config from "@config";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, sleep, type Story, type StoryPage } from "@/lib/api";

export interface ViewerStory extends Story {
  storyId: string;
  pages: StoryPage[];
}

interface BookViewerDialogProps {
  story: ViewerStory | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onStoryUpdate: (story: ViewerStory) => void;
  /** Page to open on (defaults to the cover). */
  initialIndex?: number;
}

function orderPages(pages: StoryPage[]) {
  const front = pages.filter((p) => p.type === "COVER_FRONT");
  const back = pages.filter((p) => p.type === "COVER_BACK");
  const inner = pages
    .filter((p) => p.type !== "COVER_FRONT" && p.type !== "COVER_BACK")
    .sort((a, b) => (a.pageNumber ?? 0) - (b.pageNumber ?? 0));
  return [...front, ...inner, ...back];
}

async function waitForImage(storyId: string, pageNo: number) {
  for (let attempt = 0; attempt < 30; attempt++) {
    await sleep(2000);
    const status = await api<{ status?: string; imageUrl?: string }>(`/stories/${storyId}/pages/${pageNo}/image-status`);
    if (status.status === "COMPLETED" && status.imageUrl) return status.imageUrl;
    if (status.status === "FAILED") throw new Error("The new picture couldn't be drawn. Please try different feedback.");
  }
  throw new Error("Drawing the picture took too long. Please try again.");
}

export default function BookViewerDialog({ story, loading, open, onClose, onStoryUpdate, initialIndex = 0 }: BookViewerDialogProps) {
  const { toast } = useToast();
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"view" | "edit" | "redraw">("view");
  const [draft, setDraft] = useState({ title: "", author: "", text: "" });
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<null | "saving" | "drawing">(null);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setMode("view");
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
      setFeedback("");
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
              <div className="relative rounded-xl border bg-muted overflow-hidden">
                {image ? <img src={image} alt={`${label} illustration`} className="w-full h-auto" /> : <p className="p-8 text-center text-muted-foreground">No picture yet</p>}
                {busy === "drawing" && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center font-medium"><Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden />Drawing…</div>
                )}
              </div>
              <div className="space-y-4">
                {mode === "edit" ? (
                  <div className="space-y-3">
                    {isFront ? (
                      <>
                        <div className="space-y-1.5"><Label htmlFor="v-title">Title</Label><Input id="v-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} disabled={!!busy} /></div>
                        <div className="space-y-1.5"><Label htmlFor="v-author">Author</Label><Input id="v-author" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} disabled={!!busy} /></div>
                        <p className="text-xs text-muted-foreground">Changing the title redraws the cover.</p>
                      </>
                    ) : (
                      <div className="space-y-1.5"><Label htmlFor="v-text">Story text</Label><Textarea id="v-text" rows={7} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} disabled={!!busy} /></div>
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
                  <p className="text-lg font-story leading-relaxed whitespace-pre-line">{text}</p>
                )}

                {mode === "redraw" && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <Label htmlFor="v-feedback">What should change in this picture?</Label>
                    <Textarea id="v-feedback" rows={3} placeholder="e.g. Make her hair curlier and add the red scarf" value={feedback} onChange={(e) => setFeedback(e.target.value)} disabled={!!busy} />
                    <p className="text-xs text-muted-foreground">{limitReached ? `You've used all ${limit} redraws for this book.` : `${used} of ${limit} redraws used for this book`}</p>
                    <div className="flex gap-2">
                      <Button onClick={redraw} disabled={!!busy || !feedback.trim() || limitReached}>{busy === "drawing" ? "Drawing…" : "Redraw picture"}</Button>
                      <Button variant="outline" onClick={() => setMode("view")} disabled={!!busy}>Cancel</Button>
                    </div>
                  </div>
                )}

                {mode === "view" && !isBack && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={startEdit}><Pencil className="h-3.5 w-3.5" aria-hidden />{isFront ? "Edit title" : "Edit text"}</Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setMode("redraw")} disabled={limitReached}><RefreshCw className="h-3.5 w-3.5" aria-hidden />Redraw picture</Button>
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
