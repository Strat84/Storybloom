import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, Pencil, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import BookViewerDialog, { type ViewerStory } from "@/components/BookViewerDialog";
import PreviewWatermark from "@/components/PreviewWatermark";
import PrintOrderDialog from "@/components/PrintOrderDialog";
import { api, normalizePages, type StoryListItem, type StoryPage } from "@/lib/api";
import { buyDigital, buyPrint, confirmPendingPurchase, downloadPdf, hasPaid, isPurchased, loadStoryList, pdfCreditFor, readPendingPurchase } from "@/lib/checkout";
import { picturesDone, type ImagesStatus } from "@/lib/createBook";
import { digitalPrice, formatPrice, printPrice, printTierForStory } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const IMAGES_POLL_MS = 5000;

function pageLabel(page: StoryPage, index: number, total: number) {
  if (page.type === "COVER_FRONT" || index === 0) return "Cover";
  if (page.type === "COVER_BACK" || index === total - 1) return "Back cover";
  return `Page ${index}`;
}

export default function Book() {
  const { storyId } = useParams<{ storyId: string }>();
  const { toast } = useToast();
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [listItem, setListItem] = useState<StoryListItem | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<{ done: number; total: number } | null>(null);
  const watching = useRef(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<null | "pdf" | "print" | "download" | "confirming">(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [editor, setEditor] = useState(false);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const pollTimer = useRef<number | null>(null);

  const title = pages.find((p) => p.title)?.title || listItem?.title || "Your book";
  const author = pages.find((p) => p.author)?.author;
  const purchased = isPurchased(listItem);
  const printed = hasPaid(listItem, "pdf_and_book");
  // The PDF price is credited toward the printed book (the backend applies it at checkout).
  const pdfCredit = pdfCreditFor(listItem);

  const loadBook = useCallback(async () => {
    const [detail, list] = await Promise.all([api<{ pages?: StoryPage[] }>(`/stories/${storyId}`), loadStoryList()]);
    setPages(normalizePages(detail.pages, storyId!));
    setListItem(list.find((s) => s.storyId === storyId));
  }, [storyId]);

  // Merge picture progress by page number (the status response has no page ids).
  const applyImagesStatus = useCallback((s: ImagesStatus) => {
    setPages((prev) =>
      prev.map((page) => {
        const u = s.pages?.find((l) => Number(l.pageNumber) === Number(page.pageNumber));
        return u ? { ...page, status: u.status, imageUrl: u.imageUrl ?? page.imageUrl } : page;
      }),
    );
    // Right after "generate-images" the backend may not have marked pages pending yet,
    // so keep showing progress while we're watching until every picture is finished.
    const inProgress = !picturesDone(s) && (watching.current || (s.counts?.pending ?? 0) > 0);
    setDrawing(inProgress ? { done: s.counts?.completed ?? 0, total: s.counts?.total ?? 0 } : null);
  }, []);

  const watchPictures = useCallback(() => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    watching.current = true;
    const startedAt = Date.now();
    const stop = () => {
      watching.current = false;
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
    const tick = async () => {
      try {
        const s = await api<ImagesStatus>(`/stories/${storyId}/images-status`);
        if (picturesDone(s) || Date.now() - startedAt > 20 * 60_000) stop();
        applyImagesStatus(s);
      } catch {
        // Keep polling through transient errors.
      }
    };
    void tick();
    pollTimer.current = window.setInterval(tick, IMAGES_POLL_MS);
  }, [storyId, applyImagesStatus]);

  useEffect(() => {
    if (!storyId) return;
    loadBook()
      .then(async () => {
        const s = await api<ImagesStatus>(`/stories/${storyId}/images-status`).catch(() => null);
        // ?new=1: just created in the wizard, drawing has started even if no page is marked yet.
        const justCreated = new URLSearchParams(window.location.search).get("new") === "1";
        if (s && ((s.counts?.pending ?? 0) > 0 || (justCreated && !picturesDone(s)))) watchPictures();
        else if (s) applyImagesStatus(s);
      })
      .catch((err) => setLoadError(err.message || "We couldn't load this book."))
      .finally(() => setLoading(false));
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, [storyId, loadBook, watchPictures, applyImagesStatus]);

  // Coming back from Stripe: wait for the payment to be confirmed.
  useEffect(() => {
    const pending = readPendingPurchase();
    const returned = new URLSearchParams(window.location.search).get("purchased") === "1";
    if (!pending || pending.storyId !== storyId) return;
    if (!returned) return;
    setBusy("confirming");
    confirmPendingPurchase((list) => setListItem(list.find((s) => s.storyId === storyId)))
      .then((ok) => {
        if (ok) toast({ title: "Thank you! Your book is unlocked.", description: pending.downloadOption === "pdf_and_book" ? "Your printed book is on its way." : "Download it below any time." });
      })
      .finally(() => {
        setBusy(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("purchased");
        window.history.replaceState({}, "", url.toString());
      });
  }, [storyId, toast]);

  const total = pages.length;
  const page = pages[index];
  // Before purchase every page is readable but carries a "PREVIEW" watermark (the cover stays clean).
  const watermarked = !purchased && index > 0;
  const noPictures = !loading && !drawing && pages.length > 0 && pages.every((p) => !p.imageUrl);
  const printTier = printTierForStory(total);

  const viewerStory = useMemo<ViewerStory | null>(() => (storyId ? { storyId, title, pages, regenerationUsed: listItem?.regenerationUsed, regenerationLimit: listItem?.regenerationLimit } : null), [storyId, title, pages, listItem]);

  const scrollToPurchase = () => purchaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const startDigital = async () => {
    setBusy("pdf");
    try {
      await buyDigital(storyId!);
    } catch (err) {
      toast({ title: "Checkout failed", description: (err as Error).message, variant: "destructive" });
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy("download");
    try {
      await downloadPdf(storyId!, title);
      toast({ title: "Download started" });
    } catch (err) {
      toast({ title: "Download failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const drawPictures = async () => {
    try {
      await api(`/stories/${storyId}/generate-images`, { method: "POST", body: {} });
      setDrawing({ done: 0, total: pages.length });
      watchPictures();
    } catch (err) {
      toast({ title: "Couldn't start the pictures", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" aria-hidden />Opening your book…</div>;
  }
  if (loadError || !page) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="mb-4">{loadError ?? "We couldn't find this book."}</p>
        <Button asChild><Link href="/mystories">Go to My Stories</Link></Button>
      </div>
    );
  }

  const text = page.text || page.content || "";

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-5xl pb-28 md:pb-10">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-display font-bold">{title}</h1>
        {author && <p className="text-muted-foreground">by {author}</p>}
      </div>

      {drawing && (
        <Card className="p-4 mb-6 max-w-xl mx-auto" aria-live="polite">
          <p className="font-semibold flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden />Drawing the pictures… {drawing.total ? `${drawing.done} of ${drawing.total}` : ""}</p>
          <Progress value={drawing.total ? (drawing.done / drawing.total) * 100 : 5} />
          <p className="text-xs text-muted-foreground mt-2">This takes about a minute or two. Pages appear as they're finished.</p>
        </Card>
      )}
      {noPictures && (
        <Card className="p-4 mb-6 max-w-xl mx-auto text-center">
          <p className="mb-3">Your story is written. Let's add the pictures.</p>
          <Button onClick={drawPictures} className="gap-2"><Sparkles className="h-4 w-4" aria-hidden />Draw the pictures</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6 items-start">
        <div className="relative rounded-2xl overflow-hidden border bg-muted aspect-[3/4]">
          {page.imageUrl ? (
            <img
              src={page.imageUrl}
              alt={`${title}: ${pageLabel(page, index, total).toLowerCase()}`}
              className="w-full h-full object-cover"
              draggable={false}
              onContextMenu={(e) => watermarked && e.preventDefault()}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin" aria-label="Drawing this page" /></div>
          )}
          {watermarked && page.imageUrl && <PreviewWatermark />}
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-primary">{pageLabel(page, index, total)} of {total}</p>
          {index === 0 ? (
            <p className="text-2xl font-display font-bold">{title}</p>
          ) : (
            <p className="text-lg font-story leading-relaxed whitespace-pre-line min-h-[6rem]">
              {text || (index === total - 1 ? "The End" : "")}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} disabled={index === total - 1} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
            {!drawing && (
              <Button variant="ghost" size="sm" className="gap-1 ml-auto" onClick={() => setEditor(true)}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit or redraw</Button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Pages">
            {pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={pageLabel(p, i, total)}
                onClick={() => setIndex(i)}
                className={cn("shrink-0 w-12 h-16 rounded-md overflow-hidden border-2 bg-muted", i === index ? "border-primary" : "border-transparent")}
              >
                {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!purchased && !drawing && (
        <p className="mt-4 text-sm text-muted-foreground text-center">
          Read every page free. The "Preview" watermark disappears in the book you buy.
        </p>
      )}

      <div ref={purchaseRef} className="mt-10 scroll-mt-24">
        {busy === "confirming" ? (
          <Card className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" aria-hidden />Confirming your payment…</Card>
        ) : purchased ? (
          <Card className="p-6">
            <h2 className="text-2xl font-display font-bold mb-1 flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-primary" aria-hidden />It's yours</h2>
            <p className="text-muted-foreground mb-4">
              {printed
                ? "Your printed book is being made. You can also download the PDF any time."
                : `Download the PDF to read on any device or print at home. Want a printed keepsake too? We'll take the ${formatPrice(pdfCredit)} you paid for the PDF off the printed book.`}
              {listItem?.expectedDeliveryDate && ` Expected delivery ${new Date(listItem.expectedDeliveryDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={download} disabled={busy === "download"} className="gap-2">
                {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}Download PDF
              </Button>
              {!printed && (
                <Button variant="outline" onClick={() => setPrintOpen(true)} className="gap-2">
                  <Truck className="h-4 w-4" aria-hidden />Order a printed copy: {formatPrice(printPrice(printTier) - pdfCredit)}
                </Button>
              )}
              <Button asChild variant="ghost"><Link href="/create">Make another book</Link></Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <h2 className="text-2xl font-display font-bold mb-1">Get {title}</h2>
            <p className="text-muted-foreground mb-5">A keepsake they'll read again and again.</p>
            <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-4">
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 flex flex-col">
                <p className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" aria-hidden />Printed book</p>
                <p className="text-3xl font-bold text-primary my-1">{formatPrice(printPrice(printTier))}</p>
                <ul className="text-sm text-muted-foreground mb-4 flex-1 space-y-1">
                  <li className="flex gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden />{printTier}-page full-color book, printed and shipped to your door</li>
                  <li className="flex gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden />Includes the digital PDF</li>
                  <li className="flex gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden />Check every page before it's printed</li>
                  <li className="flex gap-1.5"><Truck className="h-4 w-4 text-primary shrink-0" aria-hidden />Free standard shipping</li>
                </ul>
                <Button size="lg" onClick={() => setPrintOpen(true)} disabled={!!busy || !!drawing} className="w-full">Order the printed book</Button>
              </div>
              <div className="rounded-xl border-2 p-4 flex flex-col">
                <p className="font-semibold flex items-center gap-2"><Download className="h-4 w-4 text-primary" aria-hidden />Digital book only</p>
                <p className="text-3xl font-bold text-primary my-1">{formatPrice(digitalPrice())}</p>
                <p className="text-sm text-muted-foreground mb-4 flex-1">Instant PDF without the watermark. Order the printed book later and we'll credit the {formatPrice(digitalPrice())}.</p>
                <Button variant="outline" onClick={startDigital} disabled={!!busy || !!drawing} className="w-full">{busy === "pdf" ? "Opening checkout…" : "Get the PDF"}</Button>
              </div>
            </div>
            {drawing && <p className="text-sm text-muted-foreground mt-3">You can buy as soon as all the pictures are drawn.</p>}
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden />Secure checkout with Stripe</li>
              <li className="flex items-center gap-1.5"><Pencil className="h-4 w-4 text-primary" aria-hidden />Edit any page before you buy</li>
              <li className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" aria-hidden />Printed books ship to US addresses</li>
            </ul>
          </Card>
        )}
      </div>

      {!purchased && busy !== "confirming" && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur p-3 flex items-center gap-3">
          <div className="flex-1 text-sm">
            <p className="font-semibold leading-tight">{title}</p>
            <p className="text-muted-foreground leading-tight">Printed book {formatPrice(printPrice(printTier))}</p>
          </div>
          <Button onClick={() => setPrintOpen(true)} disabled={!!drawing}>Order printed book</Button>
          <button type="button" onClick={scrollToPurchase} className="text-xs text-primary underline whitespace-nowrap">PDF only</button>
        </div>
      )}

      <PrintOrderDialog
        open={printOpen}
        storyId={storyId ?? null}
        storyTitle={title}
        pageCount={printTier}
        onClose={() => setPrintOpen(false)}
        pdfCredit={pdfCredit}
        proofPages={pages.map((pg, i) => ({ imageUrl: pg.imageUrl ?? null, text: pg.text || pg.content || "", label: pageLabel(pg, i, total) }))}
        watermark={!purchased}
        onEditPages={() => {
          setPrintOpen(false);
          setEditor(true);
        }}
        onCheckout={async (order) => {
          setBusy("print");
          try {
            await buyPrint(order);
          } catch (err) {
            setBusy(null);
            throw err;
          }
        }}
      />

      <BookViewerDialog
        open={editor}
        loading={false}
        story={viewerStory}
        onClose={() => setEditor(false)}
        onStoryUpdate={(updated) => setPages(updated.pages)}
        initialIndex={index}
      />
    </div>
  );
}
