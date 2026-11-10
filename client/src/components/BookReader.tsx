import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PreviewWatermark from "@/components/PreviewWatermark";
import type { StoryPage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BookReaderProps {
  open: boolean;
  onClose: () => void;
  title: string;
  author?: string;
  pages: StoryPage[];
  /** Controlled by the book page, so the inline view and the reader stay on the same page. */
  index: number;
  onIndex: (index: number) => void;
  watermarked: boolean;
  /** Shown after the last page (and on locked pages) when the book isn't bought yet. */
  endPanel?: ReactNode;
  lockedPanel?: ReactNode;
}

function label(page: StoryPage, i: number, total: number) {
  if (page.type === "COVER_FRONT" || i === 0) return "Cover";
  if (page.type === "COVER_BACK" || i === total - 1) return "Back cover";
  return `Page ${i}`;
}

/**
 * Full-screen reading, made for phones: picture and words on one screen, swipe or tap the
 * sides to turn the page. After the last page, an end screen with the ways to keep the book.
 */
export default function BookReader({ open, onClose, title, author, pages, index, onIndex, watermarked, endPanel, lockedPanel }: BookReaderProps) {
  const total = pages.length;
  // One extra "slide" after the back cover when there's an end panel.
  const last = endPanel ? total : total - 1;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = (i: number) => onIndex(Math.max(0, Math.min(last, i)));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, last]);

  // Load the next picture before it's needed.
  useEffect(() => {
    const next = pages[index + 1]?.imageUrl;
    if (open && next) new Image().src = next;
  }, [open, index, pages]);

  if (!open) return null;
  const atEnd = index >= total;
  const page = pages[Math.min(index, total - 1)];
  const text = page ? page.text || page.content || "" : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Reading ${title}`}
      className="fixed inset-0 z-[60] flex flex-col bg-[#1d1730] text-white"
      style={{ height: "100dvh" }}
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
      <div className="flex items-center gap-3 px-3 py-2 shrink-0">
        <button type="button" onClick={onClose} aria-label="Close the book" className="p-2 -ml-1 rounded-full hover:bg-white/10"><X className="h-6 w-6" /></button>
        <p dir="auto" className="flex-1 truncate text-sm font-semibold">{title}</p>
        <p className="text-sm text-white/70 tabular-nums">{atEnd ? "The End" : `${index + 1} / ${total}`}</p>
      </div>

      {atEnd ? (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="max-w-md mx-auto rounded-2xl bg-background text-foreground p-5">{endPanel}</div>
        </div>
      ) : page?.locked ? (
        <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col items-center justify-center text-center">
          <Lock className="h-10 w-10 mb-3 text-white/80" aria-hidden />
          <p className="text-lg font-semibold mb-4">{label(page, index, total)} opens when you get the book</p>
          <div className="w-full max-w-md rounded-2xl bg-background text-foreground p-5 text-left">{lockedPanel ?? endPanel}</div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row md:items-center md:gap-8 md:px-8">
          <div className="relative shrink-0 md:flex-1 flex justify-center px-3">
            <div className="relative" data-clarity-mask="true">
              {page?.imageUrl ? (
                <img
                  src={page.imageUrl}
                  alt={`${title}: ${label(page, index, total).toLowerCase()}`}
                  className="block rounded-xl object-contain max-h-[56dvh] md:max-h-[80dvh] w-auto max-w-full"
                  draggable={false}
                  onContextMenu={(e) => watermarked && e.preventDefault()}
                />
              ) : (
                <div className="aspect-[3/4] h-[50dvh] rounded-xl bg-white/10" />
              )}
              {watermarked && index > 0 && page?.imageUrl && <PreviewWatermark className="rounded-b-xl overflow-hidden" />}
            </div>
            {/* Tap the left or right third of the picture to turn the page. */}
            <button type="button" aria-label="Previous page" className="absolute inset-y-0 left-0 w-1/3" onClick={() => go(index - 1)} disabled={index === 0} />
            <button type="button" aria-label="Next page" className="absolute inset-y-0 right-0 w-1/3" onClick={() => go(index + 1)} />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-2 md:flex-none md:w-[38%]" data-clarity-mask="true">
            {index === 0 ? (
              <div className="text-center md:text-left">
                <p dir="auto" className="text-2xl font-display font-bold">{title}</p>
                {author && <p className="text-white/70 mt-1">by {author}</p>}
                <p className="text-white/60 text-sm mt-4">Swipe or tap the picture to turn the page.</p>
              </div>
            ) : (
              <p dir="auto" className="text-[1.15rem] leading-relaxed font-story whitespace-pre-line">{text || (index === total - 1 ? "The End" : "")}</p>
            )}
          </div>
        </div>
      )}

      <div className="shrink-0 flex items-center justify-between gap-3 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button variant="secondary" size="lg" className="gap-1 bg-white/10 text-white hover:bg-white/20 border-0" onClick={() => go(index - 1)} disabled={index === 0}>
          <ChevronLeft className="h-5 w-5" aria-hidden />Back
        </Button>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: last + 1 }).map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-white" : "w-1.5 bg-white/30")} />
          ))}
        </div>
        <Button size="lg" className="gap-1" onClick={() => (index >= last ? onClose() : go(index + 1))}>
          {index >= last ? "Close" : "Next"}<ChevronRight className="h-5 w-5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
