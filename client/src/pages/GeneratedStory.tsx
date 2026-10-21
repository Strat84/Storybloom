import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ImageIcon, Loader2, Pencil, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api, normalizePages, pageNumberOf, type Character, type PageType, type Story, type StoryPage } from "@/lib/api";
import { recallStoryContext } from "@/lib/generate";

const IMAGE_POLL_MS = 20_000;
const IMAGE_POLL_MAX = 45;

type Draft = { text: string; imagePrompt: string };

function typeForIndex(index: number, total: number): PageType {
  if (index === 0) return "COVER_FRONT";
  if (index === total - 1) return "COVER_BACK";
  return "PAGE";
}

function pageLabel(type: PageType, index: number) {
  if (type === "COVER_FRONT") return "Front cover";
  if (type === "COVER_BACK") return "Back cover";
  return `Page ${index}`;
}

function CharacterIdentity({ storyId, locked }: { storyId: string; locked: boolean }) {
  const { toast } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ characters?: Character[] } | Character[]>(`/stories/${storyId}/characters`);
      setCharacters(Array.isArray(data) ? data : data.characters ?? []);
    } catch {
      toast({ title: "Couldn't load characters", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [storyId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const data = await api<{ characters?: Character[] }>(`/stories/${storyId}/updatecharacters`, {
        method: "PUT",
        body: characters.map((c) => ({ id: c.id, name: c.name, description: c.description })),
      });
      if (Array.isArray(data?.characters)) setCharacters(data.characters);
      setEditing(false);
      toast({ title: "Characters saved" });
    } catch (err) {
      toast({ title: "Couldn't save characters", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const edit = (index: number, patch: Partial<Character>) =>
    setCharacters((cs) => cs.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-xl font-display font-bold">Characters</h2>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); load(); }} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={locked || loading} className="gap-1">
            <Pencil className="h-3 w-3" aria-hidden />Edit
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">These descriptions keep each character looking the same in every illustration.</p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading characters…</p>
      ) : characters.length === 0 ? (
        <p className="text-sm text-muted-foreground">No characters found for this story.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map((c, i) => (
            <div key={c.id ?? i} className="rounded-lg border p-4 space-y-2">
              {editing ? (
                <>
                  <Label htmlFor={`char-name-${i}`}>Name</Label>
                  <Input id={`char-name-${i}`} value={c.name} onChange={(e) => edit(i, { name: e.target.value })} />
                  <Label htmlFor={`char-desc-${i}`}>Description</Label>
                  <Textarea id={`char-desc-${i}`} rows={4} value={c.description} onChange={(e) => edit(i, { description: e.target.value })} />
                </>
              ) : (
                <>
                  <p className="font-semibold">{c.name || "Unnamed character"}</p>
                  <p className="text-sm text-muted-foreground">{c.description || "No description yet"}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PageCard({
  page,
  index,
  total,
  draft,
  onDraft,
  onSave,
  saving,
  locked,
  generating,
}: {
  page: StoryPage;
  index: number;
  total: number;
  draft: Draft | undefined;
  onDraft: (draft: Draft | undefined) => void;
  onSave: () => void;
  saving: boolean;
  locked: boolean;
  generating: boolean;
}) {
  const type = typeForIndex(index, total);
  const label = pageLabel(type, index);
  const isCover = type !== "PAGE";
  const editing = !!draft;
  const dirty = !!draft && (draft.text !== (page.text ?? "") || draft.imagePrompt !== (page.imagePrompt ?? ""));

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-display font-bold flex items-center gap-2">
          {label}
          {dirty && <span className="text-xs font-sans font-medium rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">Unsaved</span>}
        </h3>
        {editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onDraft(undefined)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="gap-1" disabled={locked} onClick={() => onDraft({ text: page.text ?? "", imagePrompt: page.imagePrompt ?? "" })}>
            <Pencil className="h-3 w-3" aria-hidden />Edit
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          {!isCover && (
            <div className="space-y-1.5">
              <Label>Story text</Label>
              {editing ? (
                <Textarea rows={5} value={draft.text} onChange={(e) => onDraft({ ...draft, text: e.target.value })} disabled={saving} />
              ) : (
                <p className="rounded-md bg-muted/50 p-3 font-story min-h-[4rem]">{page.text || <span className="text-muted-foreground">No text yet…</span>}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Picture description</Label>
            {editing ? (
              <>
                <Textarea rows={4} value={draft.imagePrompt} onChange={(e) => onDraft({ ...draft, imagePrompt: e.target.value })} disabled={saving} />
                <p className="text-xs text-muted-foreground">Describe what should be in the picture: who, where, and what they're doing.</p>
              </>
            ) : (
              <p className="rounded-md bg-muted/50 p-3 text-sm min-h-[3rem]">{page.imagePrompt || <span className="text-muted-foreground">No description yet…</span>}</p>
            )}
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block">Picture</Label>
          <div className="aspect-[3/4] rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
            {page.imageUrl ? (
              <img src={page.imageUrl} alt={`Illustration for ${label.toLowerCase()}`} className="w-full h-full object-cover" />
            ) : generating ? (
              <div className="text-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" aria-hidden />Drawing…</div>
            ) : (
              <div className="text-center text-muted-foreground p-4"><ImageIcon className="h-8 w-8 mx-auto mb-2" aria-hidden />The picture appears here after you generate images</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function GeneratedStory() {
  const { storyId } = useParams<{ storyId: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [story, setStory] = useState<Story | null>(null);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft | undefined>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const pollTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!storyId) return;
    setLoading(true);
    // The endpoint returns { pages }; the title and author live on the cover page.
    api<{ story?: Story; pages?: StoryPage[] }>(`/stories/${storyId}`)
      .then((data) => {
        const loaded = normalizePages(data.pages, storyId);
        setPages(loaded);
        setStory({
          ...data.story,
          title: data.story?.title ?? loaded.find((p) => p.title)?.title,
          author: data.story?.author ?? loaded.find((p) => p.author)?.author,
        });
      })
      .catch((err) => setLoadError(err.message || "We couldn't load this story."))
      .finally(() => setLoading(false));
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, [storyId]);

  const savePage = async (page: StoryPage) => {
    const draft = drafts[page.id];
    if (!draft || !storyId) return true;
    setSavingId(page.id);
    try {
      const n = pageNumberOf(page);
      const body = { text: draft.text, imagePrompt: draft.imagePrompt, imageDescription: draft.imagePrompt, imageUrl: page.imageUrl };
      const updated = await api<StoryPage | null>(`/stories/${encodeURIComponent(storyId)}/page/${encodeURIComponent(String(n))}`, { method: "PUT", body });
      setPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, ...draft, ...(updated ?? {}) } : p)));
      setDrafts((d) => ({ ...d, [page.id]: undefined }));
      return true;
    } catch (err) {
      toast({ title: "Couldn't save this page", description: (err as Error).message, variant: "destructive" });
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const pollImages = () => {
    let attempts = 0;
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(async () => {
      attempts++;
      try {
        // Per-page picture status, keyed by page number (no page ids in this response).
        const data = await api<{ pages?: { pageNumber: number; status?: string; imageUrl?: string | null }[] }>(`/stories/${storyId}/images-status`);
        const latest = data.pages ?? [];
        setPages((prev) =>
          prev.map((page) => {
            const update = latest.find((l) => Number(l.pageNumber) === Number(pageNumberOf(page)));
            return update ? { ...page, status: update.status, imageUrl: update.imageUrl ?? page.imageUrl } : page;
          }),
        );
        if (latest.some((p) => p.status?.toUpperCase() === "FAILED")) {
          window.clearInterval(pollTimer.current!);
          setGenerating(false);
          toast({ title: "Some pictures didn't work", description: "Try adjusting those picture descriptions and generate again.", variant: "destructive" });
          return;
        }
        if (latest.length > 0 && latest.every((p) => !!p.imageUrl)) {
          window.clearInterval(pollTimer.current!);
          setGenerating(false);
          toast({ title: "Your book is illustrated!", description: "Taking you to My Stories to preview and order." });
          window.setTimeout(() => navigate("/mystories"), 2000);
          return;
        }
      } catch {
        // Keep polling through transient errors.
      }
      if (attempts > IMAGE_POLL_MAX) {
        window.clearInterval(pollTimer.current!);
        setGenerating(false);
        toast({ title: "Still drawing", description: "This is taking longer than usual. Check My Stories in a few minutes." });
      }
    }, IMAGE_POLL_MS);
  };

  const generateImages = async () => {
    if (!storyId) return;
    for (const page of pages) {
      if (drafts[page.id] && !(await savePage(page))) return;
    }
    setGenerating(true);
    try {
      const context = recallStoryContext(storyId);
      await api(`/stories/${storyId}/generate-images`, {
        method: "POST",
        body: {
          characterDescription: context?.characterDescription?.trim() || undefined,
          targetAge: context?.targetAge || "3-5 years",
        },
      });
      toast({ title: "Drawing your pictures…", description: "This usually takes a few minutes. You can stay on this page." });
      pollImages();
    } catch (err) {
      setGenerating(false);
      toast({ title: "Couldn't start the pictures", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" aria-hidden />Loading your story…
      </div>
    );
  }
  if (loadError || !story) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="mb-4">{loadError ?? "Story not found."}</p>
        <Button asChild><Link href="/mystories">Go to My Stories</Link></Button>
      </div>
    );
  }

  const allIllustrated = pages.length > 0 && pages.every((p) => !!p.imageUrl);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">{story.title || "Your story"}</h1>
        <p className="text-muted-foreground font-story">
          {story.author ? `by ${story.author}. ` : ""}Read it through and make any changes, then generate the pictures.
        </p>
      </div>

      <CharacterIdentity storyId={storyId!} locked={generating} />

      {pages.map((page, i) => (
        <PageCard
          key={page.id}
          page={page}
          index={i}
          total={pages.length}
          draft={drafts[page.id]}
          onDraft={(d) => setDrafts((prev) => ({ ...prev, [page.id]: d }))}
          onSave={() => savePage(page)}
          saving={savingId === page.id}
          locked={generating}
          generating={generating && !page.imageUrl}
        />
      ))}

      <Card className="p-6 text-center sticky bottom-4 shadow-lg">
        <h2 className="text-xl font-display font-bold mb-3">{allIllustrated ? "Your book is illustrated" : "Happy with the story?"}</h2>
        {allIllustrated ? (
          <Button asChild size="lg"><Link href="/mystories">Preview and order</Link></Button>
        ) : (
          <Button size="lg" onClick={generateImages} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wand2 className="h-4 w-4" aria-hidden />}
            {generating ? "Drawing pictures…" : "Generate pictures"}
          </Button>
        )}
      </Card>
    </div>
  );
}
