import { cn } from "@/lib/utils";

/**
 * "Preview" mark on a page picture of a book that hasn't been bought. Kept to a slim band along
 * the bottom edge so the child's face stays clear: the free reading window (and the pages that
 * lock after it) is what protects the book, not a mark across the art. Bought books show without it.
 */
export default function PreviewWatermark({ label = "PREVIEW", className }: { label?: string; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0 select-none", className)}>
      <div className="bg-gradient-to-t from-black/55 via-black/25 to-transparent pt-8 pb-2 px-3 flex items-end justify-between">
        <span className="font-display text-white/90 text-sm sm:text-base tracking-[0.25em] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{label}</span>
        <span className="font-display text-white/90 text-sm sm:text-base [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">StoryBloom</span>
      </div>
    </div>
  );
}
