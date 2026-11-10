import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Loader2, Lock, Pencil, ShieldCheck, Sparkles, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import BookReader from "@/components/BookReader";
import BookViewerDialog, { type ViewerStory } from "@/components/BookViewerDialog";
import PreviewWatermark from "@/components/PreviewWatermark";
import PrintOrderDialog from "@/components/PrintOrderDialog";
import { api, normalizePages, type PreviewState, type StoryListItem, type StoryPage } from "@/lib/api";
import { activeOffer, withOffer, orderIdFor, buyDigital, buyPrint, confirmPendingPurchase, downloadPdf, hasPaid, isPurchased, loadStoryList, pdfCreditFor, readPendingPurchase } from "@/lib/checkout";
import { picturesDone, type ImagesStatus } from "@/lib/createBook";
import { digitalPrice, formatPrice, printPrice, printTierForStory } from "@/lib/pricing";
import { likelyInUS } from "@/lib/region";
import { cn } from "@/lib/utils";
import { track } from "@/lib/track";
import { flushReading, onRedrawLimitRaised, openSource, recordReading } from "@/lib/reading";
import { useAuth } from "@/lib/auth";
import { showReviewOptIn } from "@/lib/googleReviews";

const IMAGES_POLL_MS = 5000;

/** e.g. "Thu, Nov 5, 10:00 AM" in the visitor's own time zone. */
function offerEnds(ms: number) {
  return new Date(ms).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function hoursLeft(ms: number, now: number) {
  const mins = Math.max(0, Math.round((ms - now) / 60_000));
  return mins >= 60 ? `About ${Math.round(mins / 60)} hour${Math.round(mins / 60) === 1 ? "" : "s"} left.` : `${mins} minute${mins === 1 ? "" : "s"} left.`;
}

/** "2 days" / "5 hours" until the free preview ends. */
function timeLeft(ms: number, now: number) {
  const hours = Math.max(0, (ms - now) / 3_600_000);
  if (hours >= 36) return `${Math.round(hours / 24)} days`;
  if (hours >= 1) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
  return "less than an hour";
}

function pageLabel(page: StoryPage, index: number, total: number) {
  if (page.type === "COVER_FRONT" || index === 0) return "Cover";
  if (page.type === "COVER_BACK" || index === total - 1) return "Back cover";
  return `Page ${index}`;
}

/** One quick question on a return visit to a book that hasn't been bought. */
const SURVEY = [
  { key: "price", label: "The price" },
  { key: "likeness", label: "The pictures don't look right" },
  { key: "content", label: "Something in the story is off" },
  { key: "later", label: "I'll buy it later" },
  { key: "trying", label: "Just trying it out" },
] as const;
const visitsKey = (storyId: string) => `sb_visits_${storyId}`;
const surveyKey = (storyId: string) => `sb_survey_${storyId}`;
function storage<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export default function Book() {
  const { storyId } = useParams<{ storyId: string }>();
  const { toast } = useToast();
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [listItem, setListItem] = useState<StoryListItem | undefined>();
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<{ done: number; total: number } | null>(null);
  const watching = useRef(false);
  const [index, setIndex] = useState(0);
  const [readerOpen, setReaderOpen] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "print" | "download" | "confirming">(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [editor, setEditor] = useState(false);
  const [survey, setSurvey] = useState<"ask" | "done" | null>(null);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const pollTimer = useRef<number | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const title = pages.find((p) => p.title)?.title || listItem?.title || "Your book";
  const author = pages.find((p) => p.author)?.author;
  const purchased = isPurchased(listItem) || !!preview?.purchased;
  const printed = hasPaid(listItem, "pdf_and_book");
  // The PDF price is credited toward the printed book (the backend applies it at checkout).
  const pdfCredit = pdfCreditFor(listItem);
  // The follow-up email's discount, while it's open. Re-checked each minute so it disappears on time.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const offer = activeOffer(listItem, clock);
  const showOffer = offer && !purchased;
  const locked = !!preview?.locked && !purchased;

  const loadBook = useCallback(async () => {
    const [detail, list] = await Promise.all([api<{ pages?: StoryPage[]; preview?: PreviewState }>(`/stories/${storyId}`), loadStoryList()]);
    setPages(normalizePages(detail.pages, storyId!));
    setPreview(detail.preview ?? null);
    setListItem(list.find((s) => s.storyId === storyId));
  }, [storyId]);

  // Merge picture progress by page number (the status response has no page ids).
  const applyImagesStatus = useCallback((s: ImagesStatus) => {
    setPages((prev) =>
      prev.map((page) => {
        const u = s.pages?.find((l) => Number(l.pageNumber) === Number(page.pageNumber));
        if (!u || page.locked) return page;
        return { ...page, status: u.status, imageUrl: u.imageUrl ?? page.imageUrl };
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
        if (picturesDone(s)) track("book_ready", { story_id: storyId, seconds: Math.round((Date.now() - startedAt) / 1000) });
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
        track("view_book", { story_id: storyId });
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
      void flushReading(true);
    };
  }, [storyId, loadBook, watchPictures, applyImagesStatus]);

  // Reading the book to the end or starting to buy earns more redraws; the backend says when.
  useEffect(() => {
    onRedrawLimitRaised((id, limit) => {
      if (id === storyId) setListItem((item) => (item ? { ...item, regenerationLimit: Math.max(limit, item.regenerationLimit ?? 0) } : item));
    });
    return () => onRedrawLimitRaised(null);
  }, [storyId]);

  // Coming back from Stripe: wait for the payment to be confirmed.
  const { user } = useAuth();
  const buyerEmail = useRef(user?.email);
  buyerEmail.current = user?.email;
  useEffect(() => {
    const pending = readPendingPurchase();
    const returned = new URLSearchParams(window.location.search).get("purchased") === "1";
    if (!pending || pending.storyId !== storyId) return;
    if (!returned) return;
    setBusy("confirming");
    confirmPendingPurchase((list) => setListItem(list.find((s) => s.storyId === storyId)))
      .then(async (ok) => {
        if (!ok) return;
        toast({ title: "Thank you! Your book is unlocked.", description: pending.downloadOption === "pdf_and_book" ? "Your printed book is on its way." : "Download it below any time." });
        showReviewOptIn(pending, orderIdFor(pending), buyerEmail.current);
        // Locked pages open up now that it's bought.
        await loadBook().catch(() => undefined);
      })
      .finally(() => {
        setBusy(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("purchased");
        window.history.replaceState({}, "", url.toString());
      });
  }, [storyId, toast, loadBook]);

  const total = pages.length;
  const page = pages[Math.min(index, Math.max(0, total - 1))];
  // Before purchase pages carry a small "Preview" band (the cover stays clean).
  const watermarked = !purchased && index > 0;
  const noPictures = !loading && !drawing && pages.length > 0 && pages.every((p) => !p.imageUrl && !p.locked);
  const printTier = printTierForStory(total);

  /* ------------------------------ tracking ------------------------------ */
  const opened = useRef(false);
  useEffect(() => {
    if (loading || !total || opened.current) return;
    opened.current = true;
    const source = openSource();
    recordReading(storyId, { name: "book_open", of: total, source });
    // A return visit to a book that isn't bought: ask one quick question (once).
    const visits = storage(() => Number(localStorage.getItem(visitsKey(storyId!)) || 0) + 1, 1);
    storage(() => localStorage.setItem(visitsKey(storyId!), String(visits)), undefined);
    const asked = storage(() => localStorage.getItem(surveyKey(storyId!)), "x");
    if (!purchased && visits >= 2 && !asked && source !== "created") setSurvey("ask");
  }, [loading, total, storyId, purchased]);

  const pageSince = useRef<{ page: number; at: number } | null>(null);
  const finished = useRef(false);
  useEffect(() => {
    if (loading || !total) return;
    const now = Date.now();
    const prev = pageSince.current;
    pageSince.current = { page: index, at: now };
    if (index >= total) return; // the reader's end screen
    recordReading(storyId, { name: "page_view", page: index, of: total, ms: prev ? now - prev.at : undefined, view: readerOpen ? "reader" : "inline" });
    if (pages[index]?.locked) recordReading(storyId, { name: "locked_view", page: index });
    if (index === total - 1 && !finished.current) {
      finished.current = true;
      recordReading(storyId, { name: "read_complete", of: total, view: readerOpen ? "reader" : "inline" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading, total]);

  useEffect(() => {
    if (index === total && readerOpen && !purchased) recordReading(storyId, { name: "buy_view", view: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, readerOpen]);

  // The buy section scrolled into view (once per visit).
  useEffect(() => {
    const el = purchaseRef.current;
    if (!el || purchased || typeof IntersectionObserver === "undefined") return;
    let seen = false;
    const io = new IntersectionObserver((entries) => {
      if (!seen && entries.some((e) => e.isIntersecting)) {
        seen = true;
        recordReading(storyId, { name: "buy_view", view: "inline" });
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [storyId, purchased, loading]);

  const cta = (name: string) => recordReading(storyId, { name: "cta_click", cta: name, view: readerOpen ? "reader" : "inline" });

  /* ------------------------------ actions ------------------------------ */
  // Printed books ship to the US only: elsewhere the PDF is the main offer.
  const [inUS, setInUS] = useState(true);
  useEffect(() => setInUS(likelyInUS()), []);
  const viewerStory = useMemo<ViewerStory | null>(
    () => (storyId ? { storyId, title, pages, purchased, regenerationUsed: listItem?.regenerationUsed, regenerationLimit: listItem?.regenerationLimit } : null),
    [storyId, title, pages, listItem, purchased],
  );

  const openPrintOrder = (from: string) => {
    cta(from);
    track("open_print_order", { story_id: storyId, in_us: inUS });
    setReaderOpen(false);
    setPrintOpen(true);
  };
  const scrollToPurchase = () => purchaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const startDigital = async (from: string) => {
    cta(from);
    recordReading(storyId, { name: "checkout_start", cta: "pdf" });
    await flushReading(true);
    setBusy("pdf");
    try {
      await buyDigital(storyId!);
    } catch (err) {
      recordReading(storyId, { name: "checkout_error", cta: "pdf" });
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

  const answerSurvey = (answer: string | null) => {
    recordReading(storyId, answer ? { name: "survey_answer", answer } : { name: "survey_dismiss" });
    storage(() => localStorage.setItem(surveyKey(storyId!), answer ?? "dismissed"), undefined);
    setSurvey(answer ? "done" : null);
  };

  const go = (i: number) => setIndex(Math.max(0, Math.min(total - 1, i)));

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
  const printNow = formatPrice(withOffer(printPrice(printTier), showOffer ? offer.pct : 0));
  const pdfNow = formatPrice(withOffer(digitalPrice(), showOffer ? offer.pct : 0));

  // The short "keep this book" panel: end of the reader, and on locked pages.
  const buyPanel = (heading: string) => (
    <div className="space-y-3">
      <p className="text-xl font-display font-bold" dir="auto">{heading}</p>
      {showOffer && (
        <p className="text-sm font-semibold text-primary flex items-center gap-1.5"><Sparkles className="h-4 w-4" aria-hidden />{offer.pct}% off until {offerEnds(offer.expiresAt)}</p>
      )}
      {inUS && (
        <Button size="lg" className="w-full justify-between" onClick={() => openPrintOrder(readerOpen ? "end_print" : "locked_print")} disabled={!!busy || !!drawing}>
          <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" aria-hidden />Printed book, free shipping</span><span>{printNow}</span>
        </Button>
      )}
      <Button size="lg" variant={inUS ? "outline" : "default"} className="w-full justify-between" onClick={() => startDigital(readerOpen ? "end_pdf" : "locked_pdf")} disabled={!!busy || !!drawing}>
        <span className="flex items-center gap-2"><Download className="h-4 w-4" aria-hidden />{busy === "pdf" ? "Opening checkout…" : "PDF to keep, instantly"}</span><span>{pdfNow}</span>
      </Button>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />Apple Pay, Google Pay or card. Read it any time, no watermark.</p>
    </div>
  );

  const cardClass = (primary: boolean) => cn("rounded-xl border-2 p-4 flex flex-col", primary && "border-primary bg-primary/5");
  const printCard = (
    <div className={cardClass(inUS)}>
      <p className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" aria-hidden />Printed book</p>
      <p className="text-3xl font-bold text-primary my-1">
        {printNow}
        {showOffer && <s className="ml-2 text-base font-normal text-muted-foreground">{formatPrice(printPrice(printTier))}</s>}
      </p>
      <ul className="text-sm text-muted-foreground mb-4 flex-1 space-y-1">
        <li className="flex gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden />{printTier}-page full-color book, printed and shipped to your door</li>
        <li className="flex gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden />Includes the digital PDF</li>
        <li className="flex gap-1.5"><Truck className="h-4 w-4 text-primary shrink-0" aria-hidden />{inUS ? "Free standard shipping" : "Free shipping to US addresses only"}</li>
      </ul>
      <Button size={inUS ? "lg" : "default"} variant={inUS ? "default" : "outline"} onClick={() => openPrintOrder("card_print")} disabled={!!busy || !!drawing} className="w-full">Order the printed book</Button>
    </div>
  );
  const pdfCard = (
    <div className={cardClass(!inUS)}>
      <p className="font-semibold flex items-center gap-2"><Download className="h-4 w-4 text-primary" aria-hidden />{inUS ? "Digital book only" : "Digital book"}</p>
      <p className="text-3xl font-bold text-primary my-1">
        {pdfNow}
        {showOffer && <s className="ml-2 text-base font-normal text-muted-foreground">{formatPrice(digitalPrice())}</s>}
      </p>
      <p className="text-sm text-muted-foreground mb-4 flex-1">
        {inUS
          ? `Instant PDF without the watermark, yours to read any time. Order the printed book later and we'll credit the ${formatPrice(digitalPrice())}.`
          : "Instant full-color PDF without the watermark. Read it on any phone, tablet or computer, or print it at home or at a local print shop."}
      </p>
      <Button size={inUS ? "default" : "lg"} variant={inUS ? "outline" : "default"} onClick={() => startDigital("card_pdf")} disabled={!!busy || !!drawing} className="w-full">{busy === "pdf" ? "Opening checkout…" : "Get the PDF"}</Button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 py-5 sm:py-10 max-w-5xl pb-28 md:pb-10">
      <div className="text-center mb-4 sm:mb-6">
        <h1 dir="auto" className="text-2xl sm:text-4xl font-display font-bold">{title}</h1>
        {author && <p className="text-muted-foreground text-sm sm:text-base">by {author}</p>}
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

      {!purchased && !drawing && preview?.endsAt && (
        locked ? (
          <Card className="p-4 mb-5 max-w-xl mx-auto border-primary/40 bg-primary/5">
            <p className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4 text-primary" aria-hidden />Your free preview has ended</p>
            <p className="text-sm text-muted-foreground mt-1">The cover and first pages stay open. Get the book to read every page again, any time.</p>
            <Button size="sm" className="mt-3" onClick={() => { cta("locked_banner"); scrollToPurchase(); }}>See options</Button>
          </Card>
        ) : (
          <p className="mb-4 text-sm text-center text-muted-foreground flex items-center justify-center gap-1.5">
            <Clock className="h-4 w-4 text-primary shrink-0" aria-hidden />
            Free to read for {timeLeft(preview.endsAt, clock)} more. After that, get the book to keep reading.
          </p>
        )
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 md:gap-6 items-start">
        <div
          className="relative mx-auto w-full max-w-[min(100%,calc(62dvh*0.75))] md:max-w-none rounded-2xl overflow-hidden border bg-muted aspect-[3/4]"
          data-clarity-mask="true"
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const start = touch.current;
            touch.current = null;
            if (!start) return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
          }}
        >
          {page.locked ? (
            <button type="button" onClick={() => { cta("locked_page"); scrollToPurchase(); }} className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-gradient-to-b from-primary/10 to-muted">
              <Lock className="h-8 w-8 text-primary" aria-hidden />
              <span className="font-medium text-foreground px-16 text-center">{pageLabel(page, index, total)} opens when you get the book</span>
            </button>
          ) : page.imageUrl ? (
            <button type="button" className="block w-full h-full" onClick={() => { setReaderOpen(true); recordReading(storyId, { name: "reader_open", page: index }); }} aria-label="Read full screen">
              <img
                src={page.imageUrl}
                alt={`${title}: ${pageLabel(page, index, total).toLowerCase()}`}
                className="w-full h-full object-cover"
                draggable={false}
                onContextMenu={(e) => watermarked && e.preventDefault()}
              />
            </button>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin" aria-label="Drawing this page" /></div>
          )}
          {watermarked && page.imageUrl && <PreviewWatermark />}
          {index > 0 && (
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous page" className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/35 text-white flex items-center justify-center backdrop-blur-sm"><ChevronLeft className="h-6 w-6" /></button>
          )}
          {index < total - 1 && (
            <button type="button" onClick={() => go(index + 1)} aria-label="Next page" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/35 text-white flex items-center justify-center backdrop-blur-sm"><ChevronRight className="h-6 w-6" /></button>
          )}
          {index > 0 && <span className="absolute top-2 left-2 rounded-full bg-black/40 text-white text-xs px-2 py-0.5">{pageLabel(page, index, total)} · {index + 1}/{total}</span>}
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          {!page.locked && (
            <Button size="lg" className="w-full gap-2 md:order-last" variant={index === 0 ? "default" : "outline"} onClick={() => { setReaderOpen(true); recordReading(storyId, { name: "reader_open", page: index }); }}>
              <BookOpen className="h-5 w-5" aria-hidden />{index === 0 ? "Read the book" : "Read full screen"}
            </Button>
          )}
          {index === 0 ? (
            <p className="hidden md:block text-2xl font-display font-bold" dir="auto">{title}</p>
          ) : page.locked ? null : (
            <p dir="auto" className="text-lg font-story leading-relaxed whitespace-pre-line md:min-h-[6rem]" data-clarity-mask="true">
              {text || (index === total - 1 ? "The End" : "")}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
            {!drawing && !locked && (
              <Button variant="ghost" size="sm" className="gap-1 ml-auto" onClick={() => setEditor(true)}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit or redraw</Button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Pages" data-clarity-mask="true">
            {pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={pageLabel(p, i, total)}
                onClick={() => setIndex(i)}
                className={cn("relative shrink-0 w-12 h-16 rounded-md overflow-hidden border-2 bg-muted", i === index ? "border-primary" : "border-transparent")}
              >
                {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />}
                {p.locked && <Lock className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {survey === "ask" && (
        <Card className="mt-6 p-4 max-w-xl mx-auto relative">
          <button type="button" onClick={() => answerSurvey(null)} aria-label="No thanks" className="absolute right-2 top-2 p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
          <p className="font-semibold pr-6">Quick question: what's stopping you from getting this book?</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {SURVEY.map((s) => (
              <Button key={s.key} size="sm" variant="outline" onClick={() => answerSurvey(s.key)}>{s.label}</Button>
            ))}
          </div>
        </Card>
      )}
      {survey === "done" && (
        <p className="mt-6 text-sm text-center text-muted-foreground">Thank you! If the pictures or story need work, tap “Edit or redraw”, or email support@storybloom.ai and we'll help.</p>
      )}

      <div ref={purchaseRef} className="mt-8 scroll-mt-24">
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
                <Button variant="outline" onClick={() => openPrintOrder("owned_print")} className="gap-2">
                  <Truck className="h-4 w-4" aria-hidden />Order a printed copy: {formatPrice(printPrice(printTier) - pdfCredit)}
                </Button>
              )}
              <Button asChild variant="ghost"><Link href="/create">Make another book</Link></Button>
            </div>
          </Card>
        ) : (
          <Card className="p-5 sm:p-6">
            <h2 className="text-2xl font-display font-bold mb-1" dir="auto">Keep {title}</h2>
            <p className="text-muted-foreground mb-5">A keepsake they'll read again and again.</p>
            {showOffer && (
              <div className="mb-5 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                <p className="font-semibold text-primary flex items-center gap-1.5"><Sparkles className="h-4 w-4" aria-hidden />{offer.pct}% off this book until {offerEnds(offer.expiresAt)}</p>
                <p className="text-muted-foreground">Already applied at checkout, no code needed. {hoursLeft(offer.expiresAt, clock)}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-4">
              {inUS ? <>{printCard}{pdfCard}</> : <>{pdfCard}{printCard}</>}
            </div>
            {drawing && <p className="text-sm text-muted-foreground mt-3">You can buy as soon as all the pictures are drawn.</p>}
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden />Apple Pay, Google Pay or card</li>
              <li className="flex items-center gap-1.5"><Pencil className="h-4 w-4 text-primary" aria-hidden />Edit any page before you buy</li>
              <li className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" aria-hidden />Printed books ship to US addresses</li>
            </ul>
          </Card>
        )}
      </div>

      {!purchased && busy !== "confirming" && !readerOpen && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur px-3 py-2.5 flex items-center gap-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="flex-1 min-w-0 text-sm">
            <p className="text-muted-foreground leading-tight truncate">{inUS ? "Printed book" : "Digital book"}{showOffer && ` · ${offer.pct}% off`}</p>
            <p className="font-semibold leading-tight">{inUS ? printNow : pdfNow}</p>
          </div>
          {inUS ? (
            <Button onClick={() => openPrintOrder("sticky_print")} disabled={!!drawing}>Order printed book</Button>
          ) : (
            <Button onClick={() => startDigital("sticky_pdf")} disabled={!!busy || !!drawing}>Get the PDF</Button>
          )}
          <button type="button" onClick={() => { cta(inUS ? "sticky_pdf_link" : "sticky_print_link"); scrollToPurchase(); }} className="text-xs text-primary underline whitespace-nowrap">{inUS ? `PDF ${pdfNow}` : "Printed (US)"}</button>
        </div>
      )}

      <BookReader
        open={readerOpen}
        onClose={() => {
          setReaderOpen(false);
          recordReading(storyId, { name: "reader_close", page: index });
          if (index >= total) setIndex(total - 1);
        }}
        title={title}
        author={author}
        pages={pages}
        index={index}
        onIndex={setIndex}
        watermarked={!purchased}
        endPanel={purchased ? undefined : buyPanel(`Keep ${title}`)}
        lockedPanel={buyPanel("Get the book to read every page")}
      />

      <PrintOrderDialog
        open={printOpen}
        storyId={storyId ?? null}
        storyTitle={title}
        pageCount={printTier}
        onClose={() => setPrintOpen(false)}
        pdfCredit={pdfCredit}
        offerPct={offer?.pct}
        proofPages={pages.map((pg, i) => ({ imageUrl: pg.imageUrl ?? null, text: pg.text || pg.content || "", label: pageLabel(pg, i, total), locked: pg.locked }))}
        watermark={!purchased}
        onEditPages={locked ? undefined : () => {
          setPrintOpen(false);
          setEditor(true);
        }}
        onEvent={(name) => recordReading(storyId, { name })}
        onCheckout={async (order) => {
          setBusy("print");
          await flushReading(true);
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
        onStoryUpdate={(updated) => {
          setPages(updated.pages);
          if (updated.regenerationUsed !== undefined) setListItem((item) => (item ? { ...item, regenerationUsed: updated.regenerationUsed } : item));
        }}
        initialIndex={Math.min(index, total - 1)}
      />
    </div>
  );
}
