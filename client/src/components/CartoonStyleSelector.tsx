import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CartoonStyle = "traditional" | "anime" | "3d" | "chibi";

export interface CartoonStyleOption {
  id: CartoonStyle;
  name: string;
  description: string;
}

export const CARTOON_STYLES: CartoonStyleOption[] = [
  { id: "traditional", name: "Traditional Cartoon", description: "Classic picture-book look with bold outlines and bright colors" },
  { id: "anime", name: "Anime", description: "Expressive Japanese animation style with big, sparkling eyes" },
  { id: "3d", name: "3D Animation", description: "Soft, rounded 3D look like an animated movie" },
  { id: "chibi", name: "Chibi", description: "Extra-cute characters with big heads and tiny bodies" },
];

export function styleImage(id: CartoonStyle, width: 400 | 800 = 400) {
  return `/images/styles/${id}-${width}.webp`;
}

interface CartoonStyleSelectorProps {
  selectedStyle: CartoonStyle;
  onStyleChange: (style: CartoonStyle) => void;
}

/** Art style picker. A radio group, so it works with keyboard and screen readers. */
export function CartoonStyleSelector({ selectedStyle, onStyleChange }: CartoonStyleSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Art style" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {CARTOON_STYLES.map((style) => {
        const selected = selectedStyle === style.id;
        return (
          <button
            key={style.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onStyleChange(style.id)}
            data-testid={`style-card-${style.id}`}
            className={cn(
              "text-left rounded-xl border-2 bg-card overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-primary/50",
            )}
          >
            <div className="relative aspect-[4/3] bg-muted">
              <img
                src={styleImage(style.id)}
                srcSet={`${styleImage(style.id, 400)} 400w, ${styleImage(style.id, 800)} 800w`}
                sizes="(min-width: 1024px) 240px, 45vw"
                alt={`${style.name} illustration style example`}
                width={400}
                height={300}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              {selected && (
                <CheckCircle2 className="absolute top-2 right-2 h-6 w-6 text-primary bg-background rounded-full" aria-hidden />
              )}
            </div>
            <div className="p-3">
              <p className="font-semibold font-display">{style.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-story">{style.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
