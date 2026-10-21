import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { BLURRY_THRESHOLD, preparePhoto, type PreparedPhoto } from "@/lib/photo";
import { cn } from "@/lib/utils";

interface PhotoPickerProps {
  photos: PreparedPhoto[];
  onChange: (photos: PreparedPhoto[]) => void;
  max: number;
  /** e.g. "Maya" or "Biscuit" */
  name: string;
  compact?: boolean;
}

/** Pick photos from the camera roll (or take one); resized and checked in the browser. */
export default function PhotoPicker({ photos, onChange, max, name, compact }: PhotoPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    const next = [...photos];
    for (const file of Array.from(files).slice(0, max - photos.length)) {
      try {
        const photo = await preparePhoto(file);
        next.push(photo);
        if (photo.sharpness < BLURRY_THRESHOLD) {
          setMessage(`That photo looks a little blurry. A sharp, well-lit photo of ${name}'s face gives the best likeness.`);
        }
      } catch {
        setMessage("We couldn't open that file. Please choose a JPG or PNG photo.");
      }
    }
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <div key={i} className={cn("relative rounded-lg overflow-hidden border bg-muted", compact ? "h-16 w-16" : "h-24 w-24")}>
            <img src={photo.dataUrl} alt={`Photo ${i + 1} of ${name}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={cn(
              "rounded-lg border-2 border-dashed border-primary/40 hover:border-primary flex flex-col items-center justify-center text-primary gap-1 text-xs font-medium",
              compact ? "h-16 w-16" : "h-24 w-24",
            )}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
            {!compact && (photos.length ? "Add another" : "Add photo")}
            <span className="sr-only">Add a photo of {name}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={max > 1} className="hidden" onChange={(e) => add(e.target.files)} />
      {message && <p className="text-sm text-amber-700">{message}</p>}
    </div>
  );
}
