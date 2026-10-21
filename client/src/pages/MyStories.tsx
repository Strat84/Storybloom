import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { BookOpen, CheckCircle2, Download, Loader2, Plus, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api, type StoryListItem } from "@/lib/api";
import { confirmPendingPurchase, downloadPdf, hasPaid, isPurchased, loadStoryList, readPendingPurchase } from "@/lib/checkout";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

type Stage = "failed" | "writing" | "drawing" | "needsPictures" | "ready";

function stageOf(s: StoryListItem): Stage {
  const status = s.status?.toUpperCase();
  if (status === "FAILED") return "failed";
  if (status === "PENDING") return "writing";
  if (status === "GENERATING_IMAGES") return "drawing";
  if (!s.coverImageUrl && !isPurchased(s)) return "needsPictures";
  return "ready";
}

export default function MyStories() {
  const { toast } = useToast();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<StoryListItem | null>(null);

  const load = useCallback(async () => {
    const list = await loadStoryList();
    setStories(list);
    return list;
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setLoadError(err.message || "Something went wrong loading your stories."))
      .finally(() => setLoading(false));
    // Buyers returning from an older checkout link land here.
    if (readPendingPurchase()) {
      confirmPendingPurchase(setStories).then((ok) => ok && toast({ title: "Thank you! Your purchase is complete." }));
    }
  }, [load, toast]);

  const download = async (s: StoryListItem) => {
    setDownloading(s.storyId);
    try {
      await downloadPdf(s.storyId, s.title);
      toast({ title: "Download started" });
    } catch (err) {
      toast({ title: "Download failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteFor) return;
    try {
      await api(`/stories/${deleteFor.storyId}`, { method: "DELETE" });
      setStories((list) => list.filter((s) => s.storyId !== deleteFor.storyId));
      toast({ title: "Story deleted" });
    } catch {
      toast({ title: "Couldn't delete the story", variant: "destructive" });
    } finally {
      setDeleteFor(null);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold">My Stories</h1>
          <p className="text-muted-foreground font-story">Open a book to read it, edit it or order a copy.</p>
        </div>
        <Button asChild className="gap-1"><Link href="/create"><Plus className="h-4 w-4" aria-hidden />New story</Link></Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" aria-hidden /></div>
      ) : loadError ? (
        <p className="text-destructive">{loadError}</p>
      ) : stories.length === 0 ? (
        <Card className="p-10 text-center">
          <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" aria-hidden />
          <p className="text-lg font-semibold mb-2">No stories yet</p>
          <p className="text-muted-foreground mb-6">Create your first personalized book in about five minutes.</p>
          <Button asChild><Link href="/create">Create a story</Link></Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((s) => {
            const stage = stageOf(s);
            const purchased = isPurchased(s);
            const printed = hasPaid(s, "pdf_and_book");
            const open = stage === "ready" || stage === "drawing" || stage === "needsPictures";
            return (
              <Card key={s.storyId} className="overflow-hidden flex flex-col">
                <div className="relative aspect-[3/4] bg-muted">
                  {s.coverImageUrl ? (
                    <img src={s.coverImageUrl} alt={`Cover of ${s.title || "your story"}`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-chart-2/15">
                      <BookOpen className="h-12 w-12 text-primary/60" aria-hidden />
                    </div>
                  )}
                  {(s.deliveryStatus || printed) && (
                    <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium flex items-center gap-1">
                      <Truck className="h-3 w-3" aria-hidden />{s.deliveryStatus ? capitalize(s.deliveryStatus) : "Ordered"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteFor(s)}
                    className="absolute top-2 right-2 rounded-full bg-background/90 p-2 text-destructive hover:bg-background"
                    aria-label={`Delete ${s.title || "story"}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <h2 className="font-display font-bold text-lg">{s.title || "Untitled story"}</h2>
                  {s.expectedDeliveryDate && (
                    <p className="text-sm text-muted-foreground">Expected delivery {new Date(s.expectedDeliveryDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                  )}
                  {stage === "failed" && <p className="text-sm text-muted-foreground">Something went wrong writing this story. Please delete it and create it again.</p>}
                  {stage === "writing" && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Still being written…</p>}
                  {stage === "drawing" && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Pictures are being drawn…</p>}
                  {purchased && <p className="text-sm text-primary font-medium flex items-center gap-1"><CheckCircle2 className="h-4 w-4" aria-hidden />{printed ? "Printed book ordered" : "Purchased"}</p>}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {open && (
                      <Button asChild size="sm" className="gap-1">
                        <Link href={`/book/${s.storyId}`}>{stage === "needsPictures" ? "Finish your book" : purchased ? "Open book" : "Preview & buy"}</Link>
                      </Button>
                    )}
                    {purchased && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => download(s)} disabled={downloading === s.storyId}>
                        {downloading === s.storyId ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}Download
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteFor?.title || "this story"}"?</AlertDialogTitle>
            <AlertDialogDescription>This deletes the book, its pictures and any photos you uploaded for it. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
