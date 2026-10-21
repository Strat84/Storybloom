import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { BookOpen, CheckCircle2, Download, Eye, Loader2, Plus, Trash2, Truck } from "lucide-react";
import config from "@config";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import BookViewerDialog, { type ViewerStory } from "@/components/BookViewerDialog";
import PrintOrderDialog, { type PrintOrder } from "@/components/PrintOrderDialog";
import { api, checkoutUrlFrom, getIdToken, getUserSub, normalizePages, type DownloadOption, type StoryListItem, type StoryPage } from "@/lib/api";
import { digitalPrice, formatPrice, printTierForStory, type PrintPageCount } from "@/lib/pricing";
import { track } from "@/lib/track";

const PENDING_PURCHASE = "pendingPurchase";
const PENDING_UNLOCK = "pendingPreviewUnlock";
const PREVIEWS_PURCHASED = "previewsPurchased";

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function hasPaid(story: StoryListItem, option: DownloadOption) {
  if (story.downloadHistory?.some((d) => d.downloadOption === option && d.status === "paid" && d.downloadable === "Yes")) return true;
  return story.downloadable === "Yes" && story.downloadStatus === "paid" && story.downloadOption === option;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export default function MyStories() {
  const { toast } = useToast();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewsLeft, setPreviewsLeft] = useState<Record<string, number>>({});
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, "pdf" | "book" | "download" | undefined>>({});
  const [viewer, setViewer] = useState<{ open: boolean; loading: boolean; story: ViewerStory | null }>({ open: false, loading: false, story: null });
  const [paywallFor, setPaywallFor] = useState<StoryListItem | null>(null);
  const [printFor, setPrintFor] = useState<{ story: StoryListItem; pageCount: PrintPageCount } | null>(null);
  const [deleteFor, setDeleteFor] = useState<StoryListItem | null>(null);

  const loadStories = useCallback(async () => {
    const data = await api<{ stories?: StoryListItem[] } | StoryListItem[]>("/stories");
    const list = Array.isArray(data) ? data : data.stories ?? [];
    setStories(list);
    setPreviewsLeft(Object.fromEntries(list.map((s) => [s.storyId, s.previewCount ?? config.story.freePreviews])));
    return list;
  }, []);

  const markUnlocked = useCallback((storyId: string) => {
    setUnlocked((prev) => {
      const next = { ...prev, [storyId]: true };
      try {
        localStorage.setItem(PREVIEWS_PURCHASED, JSON.stringify(next));
      } catch {
        // Ignore.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setUnlocked(readJson<Record<string, boolean>>(PREVIEWS_PURCHASED) ?? {});
    loadStories()
      .catch((err) => setLoadError(err.message || "Something went wrong loading your stories."))
      .finally(() => setLoading(false));
  }, [loadStories]);

  // Confirm a purchase after returning from Stripe. The backend's success URL is plain
  // /mystories (no session ID) and the Stripe webhook marks the story paid, sometimes a few
  // seconds later, so watch for the paid status, then record the purchase exactly once.
  const purchaseHandled = useRef(false);
  useEffect(() => {
    if (loading || purchaseHandled.current) return;
    const pending = readJson<{ storyId: string; downloadOption: DownloadOption; value?: number; timestamp: number }>(PENDING_PURCHASE);
    const clear = () => {
      try {
        localStorage.removeItem(PENDING_PURCHASE);
        localStorage.removeItem(PENDING_UNLOCK);
      } catch {
        // Ignore.
      }
    };
    if (!pending?.storyId || Date.now() - pending.timestamp > 2 * 60 * 60 * 1000) {
      if (pending) clear();
      return;
    }

    let attempts = 0;
    let timer: number | undefined;
    const check = (list: StoryListItem[]) => {
      const story = list.find((s) => s.storyId === pending.storyId);
      if (story && hasPaid(story, pending.downloadOption)) {
        purchaseHandled.current = true;
        clear();
        if (pending.downloadOption === "pdf_only") markUnlocked(pending.storyId);
        const sessionId = new URLSearchParams(window.location.search).get("session_id");
        // Deterministic event_id so a server-side Conversions API event can deduplicate against it.
        const eventId = sessionId ?? `${pending.storyId}:${pending.downloadOption}:${pending.timestamp}`;
        track("purchase", {
          event_id: eventId,
          transaction_id: eventId,
          value: pending.value,
          currency: config.pricing.currency,
          items: [{ item_id: pending.downloadOption }],
        });
        toast({ title: "Thank you! Your purchase is complete." });
        return;
      }
      // Not paid yet: the webhook may still be running, or the buyer cancelled. Retry briefly.
      if (attempts++ < 6) {
        timer = window.setTimeout(() => loadStories().then(check).catch(() => undefined), 5000);
      }
    };
    check(stories);
    return () => window.clearTimeout(timer);
    // Run once after the first load; later story updates come from check() itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const isUnlocked = (s: StoryListItem) => unlocked[s.storyId] || hasPaid(s, "pdf_only") || hasPaid(s, "pdf_and_book");

  const startCheckout = async (
    story: StoryListItem,
    path: "/stripe/story-download-session" | "/stripe/story-download-book",
    body: unknown,
    pending: { downloadOption: DownloadOption; value: number },
    busyKey: "pdf" | "book",
  ) => {
    setBusy((b) => ({ ...b, [story.storyId]: busyKey }));
    try {
      track("begin_checkout", { value: pending.value, currency: config.pricing.currency, items: [{ item_id: pending.downloadOption }] });
      const data = await api(path, { method: "POST", body });
      const url = checkoutUrlFrom(data);
      if (!url) throw new Error("Checkout link not found");
      localStorage.setItem(PENDING_PURCHASE, JSON.stringify({ storyId: story.storyId, ...pending, timestamp: Date.now() }));
      window.location.href = url;
    } catch (err) {
      toast({ title: "Checkout failed", description: (err as Error).message, variant: "destructive" });
      setBusy((b) => ({ ...b, [story.storyId]: undefined }));
    }
  };

  const buyPdf = (story: StoryListItem) =>
    startCheckout(
      story,
      "/stripe/story-download-session",
      { storyId: story.storyId, downloadOption: "pdf_only" },
      { downloadOption: "pdf_only", value: digitalPrice() },
      "pdf",
    );

  const openPrint = async (story: StoryListItem) => {
    let total = story.totalPages ?? 0;
    if (!total) {
      try {
        const detail = await api<{ totalPages?: number; pages?: StoryPage[] }>(`/stories/${story.storyId}`);
        total = detail.totalPages || detail.pages?.length || 0;
      } catch {
        // Fall back to the smallest tier.
      }
    }
    setPrintFor({ story, pageCount: printTierForStory(total) });
  };

  const buyPrint = async (order: PrintOrder) => {
    if (!printFor) return;
    await startCheckout(
      printFor.story,
      "/stripe/story-download-book",
      {
        storyId: order.storyId,
        pageCount: order.pageCount,
        shippingOption: order.shipping,
        // TODO(backend): the price must be computed server-side from pageCount and shippingOption;
        // never trust a client-sent total. Kept for compatibility with the current backend.
        totalPrice: Number(order.totalPrice.toFixed(2)),
        shippingAddress: {
          name: order.address.name.trim(),
          line1: order.address.street1.trim(),
          line2: order.address.street2.trim() || undefined,
          city: order.address.city.trim(),
          state: order.address.state_code,
          postalCode: order.address.postcode,
          country: order.address.country_code,
          phone: order.address.phone_number,
        },
      },
      { downloadOption: "pdf_and_book", value: order.totalPrice },
      "book",
    );
  };

  const download = async (story: StoryListItem) => {
    const option: DownloadOption = hasPaid(story, "pdf_and_book") ? "pdf_and_book" : "pdf_only";
    setBusy((b) => ({ ...b, [story.storyId]: "download" }));
    try {
      const token = await getIdToken();
      const res = await fetch(`${config.api.baseUrl}/stories/${story.storyId}/export-pdf`, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const filename = `${(story.title || "Story").replace(/[^a-zA-Z0-9]/g, "_")}_${option}.pdf`;
      const type = res.headers.get("content-type") ?? "";
      const link = document.createElement("a");
      link.download = filename;
      if (type.includes("application/json")) {
        const data = await res.json();
        const href = data.downloadUrl || data.url || data.pdfUrl;
        if (!href) throw new Error(data.message || "No download link provided");
        link.href = href;
        link.target = "_blank";
      } else {
        link.href = URL.createObjectURL(await res.blob());
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "Download started" });
    } catch (err) {
      toast({ title: "Download failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy((b) => ({ ...b, [story.storyId]: undefined }));
    }
  };

  const preview = async (story: StoryListItem) => {
    const open = isUnlocked(story);
    if (!open && (previewsLeft[story.storyId] ?? 0) <= 0) {
      setPaywallFor(story);
      return;
    }
    setViewer({ open: true, loading: true, story: null });
    try {
      const detail = await api<{ story?: ViewerStory; pages?: StoryPage[] } & Partial<ViewerStory>>(`/stories/${story.storyId}`);
      const base = detail.story ?? detail;
      setViewer({
        open: true,
        loading: false,
        story: {
          ...base,
          storyId: story.storyId,
          title: base.title ?? story.title,
          pages: normalizePages(detail.pages, story.storyId),
          regenerationLimit: base.regenerationLimit ?? story.regenerationLimit,
          regenerationUsed: base.regenerationUsed ?? story.regenerationUsed,
        },
      });
      if (!open) {
        const sub = await getUserSub();
        if (sub) {
          const res = await api<{ previewCount?: number }>(`/stories/${story.storyId}/preview-count?userId=${sub}`, { method: "PUT" }).catch(() => null);
          if (res) setPreviewsLeft((p) => ({ ...p, [story.storyId]: res.previewCount ?? 0 }));
        }
      }
    } catch {
      setViewer({ open: false, loading: false, story: null });
      toast({ title: "Couldn't load the preview", variant: "destructive" });
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
          <p className="text-muted-foreground font-story">Preview, download or order a printed copy.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((s) => {
            const pdfPaid = hasPaid(s, "pdf_only");
            const bookPaid = hasPaid(s, "pdf_and_book");
            const open = isUnlocked(s);
            const left = previewsLeft[s.storyId] ?? 0;
            const state = busy[s.storyId];
            const textStatus = s.status?.toUpperCase();
            // Only a finished, illustrated book can be bought (older records may have no status).
            const stage: "failed" | "writing" | "needsPictures" | "ready" =
              textStatus === "FAILED" ? "failed" : textStatus === "PENDING" ? "writing" : !s.coverImageUrl && !pdfPaid && !bookPaid ? "needsPictures" : "ready";
            return (
              <Card key={s.storyId} className="overflow-hidden flex flex-col">
                <div className="relative aspect-[4/3] bg-muted">
                  <img src={s.coverImageUrl || "/placeholder-cover.jpg"} alt={`Cover of ${s.title || "your story"}`} className="w-full h-full object-cover" loading="lazy" />
                  {s.deliveryStatus && (
                    <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium flex items-center gap-1">
                      <Truck className="h-3 w-3" aria-hidden />{capitalize(s.deliveryStatus)}
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
                    <p className="text-sm text-muted-foreground">
                      Expected delivery {new Date(s.expectedDeliveryDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}

                  {stage === "failed" && (
                    <p className="text-sm text-muted-foreground rounded-lg border p-3">
                      Something went wrong writing this story. Please delete it and create it again.
                    </p>
                  )}
                  {stage === "writing" && (
                    <p className="text-sm text-muted-foreground rounded-lg border p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />Still being written. Check back in a few minutes.
                    </p>
                  )}
                  {stage === "needsPictures" && (
                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="text-sm text-muted-foreground">The story is written. Add the pictures to preview and order it.</p>
                      <Button asChild size="sm"><Link href={`/generated-story/${s.storyId}`}>Finish your book</Link></Button>
                    </div>
                  )}

                  {stage === "ready" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">Digital PDF</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(digitalPrice())}</p>
                      </div>
                      {pdfPaid || bookPaid ? (
                        <span className="text-xs font-medium text-primary flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Purchased</span>
                      ) : (
                        <Button size="sm" onClick={() => buyPdf(s)} disabled={!!state}>{state === "pdf" ? "Opening…" : "Buy"}</Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">Printed book + PDF</p>
                        <p className="text-xs text-muted-foreground">Shipped to your door</p>
                      </div>
                      {bookPaid ? (
                        <span className="text-xs font-medium text-primary flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Ordered</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openPrint(s)} disabled={!!state}>{state === "book" ? "Opening…" : "Order"}</Button>
                      )}
                    </div>
                  </div>
                  )}

                  {stage === "ready" && (
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => preview(s)}>
                      <Eye className="h-3.5 w-3.5" aria-hidden />Preview
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => download(s)} disabled={!(pdfPaid || bookPaid) || !!state}>
                      {state === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
                      Download
                    </Button>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {open ? "Unlimited previews" : left > 0 ? `${left} free preview${left === 1 ? "" : "s"} left` : "Free previews used"}
                    </span>
                  </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BookViewerDialog
        open={viewer.open}
        loading={viewer.loading}
        story={viewer.story}
        onClose={() => setViewer({ open: false, loading: false, story: null })}
        onStoryUpdate={(updated) => {
          setViewer((v) => ({ ...v, story: updated }));
          setStories((list) => list.map((s) => (s.storyId === updated.storyId ? { ...s, title: updated.title, coverImageUrl: updated.coverImageUrl ?? s.coverImageUrl, regenerationUsed: updated.regenerationUsed } : s)));
        }}
      />

      <Dialog open={!!paywallFor} onOpenChange={(o) => !o && setPaywallFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>You've used your free previews</DialogTitle>
            <DialogDescription>
              Get the digital book for {formatPrice(digitalPrice())} to keep previewing and editing, and download the full PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPaywallFor(null)}>Not now</Button>
            <Button className="flex-1" onClick={() => paywallFor && buyPdf(paywallFor)} disabled={!!(paywallFor && busy[paywallFor.storyId])}>
              Get the digital book
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PrintOrderDialog
        open={!!printFor}
        storyId={printFor?.story.storyId ?? null}
        storyTitle={printFor?.story.title ?? ""}
        pageCount={printFor?.pageCount ?? 10}
        onClose={() => setPrintFor(null)}
        onCheckout={buyPrint}
      />

      <AlertDialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteFor?.title || "this story"}"?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
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
