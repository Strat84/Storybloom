import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Search, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, sleep, type StoryPage } from "@/lib/api";
import { recordReading } from "@/lib/reading";
import { cn } from "@/lib/utils";

const MAX_PAGES = 6;

interface ScanResult {
  pageNumber: number;
  needsFix: boolean;
  why: string;
}

interface FixAcrossPagesProps {
  open: boolean;
  onClose: () => void;
  storyId: string;
  pages: StoryPage[];
  /** The page the parent was on (scanned like the others, but not pre-ticked twice). */
  fromPage: number;
  /** The problem, e.g. the feedback from the redraw they just made. */
  initialIssue?: string;
  /** New pictures as they finish. */
  onPageImage: (pageNumber: number, imageUrl: string) => void;
  onUsage: (usage: { regenerationLimit?: number; regenerationUsed?: number | null }) => void;
}

function label(n: number, total: number) {
  if (n === 0) return "Cover";
  if (n === total - 1) return "Back";
  return `p${n}`;
}

/**
 * Fix the same problem on several pages at once, without touching pages that are fine:
 * describe it, let the AI find the pages that have it, adjust the ticks, fix only those.
 * The whole batch counts as one redraw (backend: regenerateImageWithFeedback.js, actions scan / fixPages).
 */
export default function FixAcrossPages({ open, onClose, storyId, pages, fromPage, initialIssue = "", onPageImage, onUsage }: FixAcrossPagesProps) {
  const [step, setStep] = useState<"describe" | "scanning" | "choose" | "fixing" | "done">("describe");
  const [issue, setIssue] = useState(initialIssue);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<Record<number, "pending" | "done" | "failed">>({});
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const total = pages.length;

  useEffect(() => {
    if (!open) return;
    alive.current = true;
    setIssue(initialIssue);
    setStep("describe");
    setResults([]);
    setChosen(new Set());
    setProgress({});
    setError(null);
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const imageOf = (n: number) => pages.find((p) => Number(p.pageNumber ?? p.pageNo) === n)?.imageUrl ?? pages[n]?.imageUrl ?? null;

  const scan = async () => {
    setError(null);
    setStep("scanning");
    try {
      const res = await api<{ pages: ScanResult[] }>(`/stories/${storyId}/pages/${fromPage}/regenerate`, { method: "POST", body: { action: "scan", feedback: issue.trim() } });
      const found = res.pages || [];
      setResults(found);
      setChosen(new Set(found.filter((r) => r.needsFix).map((r) => r.pageNumber).slice(0, MAX_PAGES)));
      recordReading(storyId, { name: "fix_open", cta: `scan:${found.filter((r) => r.needsFix).length}`, page: fromPage });
      setStep("choose");
    } catch (err) {
      setError((err as Error).message);
      setStep("describe");
    }
  };

  const toggle = (n: number) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else if (next.size < MAX_PAGES) next.add(n);
      return next;
    });

  const fix = async () => {
    const list = Array.from(chosen).sort((a, b) => a - b);
    setError(null);
    try {
      const res = await api<{ jobs?: { pageNumber: number }[]; regenerationLimit?: number; regenerationUsed?: number | null }>(
        `/stories/${storyId}/pages/${fromPage}/regenerate`,
        { method: "POST", body: { action: "fixPages", pages: list, feedback: issue.trim() } },
      );
      onUsage({ regenerationLimit: res.regenerationLimit, regenerationUsed: res.regenerationUsed });
      const started = (res.jobs ?? []).map((j) => j.pageNumber);
      recordReading(storyId, { name: "fix_open", cta: `batch:${started.length}`, page: fromPage });
      setProgress(Object.fromEntries(started.map((n) => [n, "pending"])));
      setStep("fixing");
      // Follow the pictures as they finish (each is checked and may be redrawn, so allow a few minutes).
      const waiting = new Set(started);
      for (let i = 0; i < 80 && waiting.size && alive.current; i++) {
        await sleep(3000);
        const status = await api<{ pages?: { pageNumber: number; status: string; imageUrl?: string | null }[] }>(`/stories/${storyId}/images-status`).catch(() => null);
        for (const p of status?.pages ?? []) {
          const n = Number(p.pageNumber);
          if (!waiting.has(n)) continue;
          if (p.status === "COMPLETED" && p.imageUrl) {
            waiting.delete(n);
            onPageImage(n, p.imageUrl);
            setProgress((prev) => ({ ...prev, [n]: "done" }));
          } else if (p.status === "FAILED") {
            waiting.delete(n);
            setProgress((prev) => ({ ...prev, [n]: "failed" }));
          }
        }
      }
      if (alive.current) setStep("done");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const flagged = results.filter((r) => r.needsFix);
  const doneCount = Object.values(progress).filter((v) => v === "done").length;
  const failedCount = Object.values(progress).filter((v) => v === "failed").length;
  const busy = step === "scanning" || step === "fixing";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Fix on several pages</DialogTitle>
          <DialogDescription>We only redraw the pages that have the problem, so the others stay exactly as they are.</DialogDescription>
        </DialogHeader>

        {(step === "describe" || step === "scanning") && (
          <div className="space-y-3">
            <label htmlFor="fix-issue" className="text-sm font-medium">What should be fixed?</label>
            <Textarea id="fix-issue" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} disabled={busy}
              placeholder="e.g. Isabelle has blonde hair, not brown. Or: the dog is black, with no brown." />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full gap-2" onClick={scan} disabled={busy || issue.trim().length < 4}>
              {step === "scanning" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Looking at every page…</> : <><Search className="h-4 w-4" aria-hidden />Find the pages with this problem</>}
            </Button>
            <p className="text-xs text-muted-foreground">Checking is free. Nothing is redrawn until you choose the pages.</p>
          </div>
        )}

        {step === "choose" && (
          <div className="space-y-3">
            <p className="text-sm">
              {flagged.length
                ? <><strong>{flagged.length} page{flagged.length === 1 ? "" : "s"}</strong> seem{flagged.length === 1 ? "s" : ""} to have this problem{flagged.length > MAX_PAGES ? `. We fix up to ${MAX_PAGES} at a time, so the first ${MAX_PAGES} are ticked; run it again for the rest` : ` and ${flagged.length === 1 ? "is" : "are"} ticked`}. Untick any that look fine, or tick others we missed.</>
                : "No pages seem to have this problem. If you see one we missed, tick it."}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {results.map((r) => {
                const on = chosen.has(r.pageNumber);
                const img = imageOf(r.pageNumber);
                return (
                  <button key={r.pageNumber} type="button" onClick={() => toggle(r.pageNumber)} aria-pressed={on}
                    className={cn("relative rounded-lg overflow-hidden border-2 text-left", on ? "border-primary ring-2 ring-primary/30" : "border-border opacity-80")}>
                    <span className="block aspect-[3/4] bg-muted">{img && <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />}</span>
                    <span className={cn("absolute top-1 left-1 h-5 w-5 rounded border-2 flex items-center justify-center text-[11px] font-bold", on ? "bg-primary border-primary text-primary-foreground" : "bg-white/90 border-muted-foreground/40")}>{on ? "✓" : ""}</span>
                    {r.needsFix && <span className="absolute top-1 right-1 rounded bg-amber-500 text-white text-[10px] px-1">needs fix</span>}
                    <span className="block px-1 py-0.5 text-[11px] leading-tight">
                      <span className="font-semibold">{label(r.pageNumber, total)}</span>
                      {r.needsFix && r.why && <span className="block text-muted-foreground">{r.why}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {chosen.size >= MAX_PAGES && <p className="text-xs text-muted-foreground">Up to {MAX_PAGES} pages at a time.</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={fix} disabled={!chosen.size}>
                <Sparkles className="h-4 w-4" aria-hidden />Fix {chosen.size || ""} page{chosen.size === 1 ? "" : "s"}
              </Button>
              <Button variant="outline" onClick={() => setStep("describe")}>Back</Button>
            </div>
            <p className="text-xs text-muted-foreground">Counts as one redraw, however many pages you fix.</p>
          </div>
        )}

        {(step === "fixing" || step === "done") && (
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              {step === "fixing" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />}
              {step === "fixing" ? `Fixing… ${doneCount} of ${Object.keys(progress).length} done` : `Done: ${doneCount} page${doneCount === 1 ? "" : "s"} fixed.`}
            </p>
            {step === "fixing" && <p className="text-xs text-muted-foreground">Each picture is checked after it's drawn, so this can take a minute or two. You can keep this open.</p>}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.entries(progress).map(([n, state]) => {
                const img = imageOf(Number(n));
                return (
                  <div key={n} className="relative rounded-lg overflow-hidden border">
                    <span className="block aspect-[3/4] bg-muted">{img && <img src={img} alt="" className={cn("w-full h-full object-cover", state === "pending" && "opacity-40")} draggable={false} />}</span>
                    {state === "pending" && <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-primary" aria-hidden />}
                    {state === "failed" && <AlertTriangle className="absolute inset-0 m-auto h-6 w-6 text-amber-600" aria-hidden />}
                    <span className="block px-1 py-0.5 text-[11px] font-semibold">{label(Number(n), total)}</span>
                  </div>
                );
              })}
            </div>
            {failedCount > 0 && <p className="text-xs text-muted-foreground">{failedCount} page{failedCount === 1 ? "" : "s"} couldn't be redrawn. Try that page on its own with “Redraw this picture”.</p>}
            {step === "done" && <Button className="w-full" onClick={onClose}>Done</Button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
