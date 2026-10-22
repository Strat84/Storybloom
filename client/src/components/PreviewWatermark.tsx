import { cn } from "@/lib/utils";

/**
 * Diagonal "PREVIEW" watermark over a page image, so customers can see the whole
 * book before buying. Purchased books show without it.
 */
export default function PreviewWatermark({ label = "PREVIEW", className }: { label?: string; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}>
      <div className="absolute -inset-1/2 flex flex-col justify-center gap-10 -rotate-[30deg]">
        {Array.from({ length: 7 }).map((_, row) => (
          <p key={row} className="whitespace-nowrap text-center font-display text-3xl sm:text-4xl tracking-[0.3em] text-white/45 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
            {`${label} · StoryBloom · ${label} · StoryBloom · ${label}`}
          </p>
        ))}
      </div>
    </div>
  );
}
