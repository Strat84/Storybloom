import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import config from "@config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartoonStyleSelector, type CartoonStyle } from "@/components/CartoonStyleSelector";
import { useAuth } from "@/lib/auth";
import { rememberStoryContext, useStoryGeneration } from "@/lib/generate";

/** "Advanced: write your own story": the original free-form prompt, now as a simple form. */
export default function CreateCustom() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const generation = useStoryGeneration();
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState<10 | 15 | 20>(config.story.defaultPageCount);
  const [age, setAge] = useState<string>(config.story.ageRanges[0]);
  const [style, setStyle] = useState<CartoonStyle>("traditional");

  useEffect(() => {
    if (generation.state.status === "done") {
      rememberStoryContext(generation.state.storyId, { characterDescription: "", targetAge: age });
      navigate(`/generated-story/${generation.state.storyId}`);
    }
  }, [generation.state, navigate, age]);

  const busy = generation.state.status === "starting" || generation.state.status === "writing";

  if (busy) {
    const elapsed = generation.state.status === "writing" ? generation.state.elapsedSeconds : 0;
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-xl text-center" aria-live="polite">
        <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-6" aria-hidden />
        <h1 className="text-3xl font-display font-bold mb-3">Writing your story…</h1>
        <Progress value={Math.min(95, 10 + elapsed / 2)} className="mb-3" />
        <p className="text-sm text-muted-foreground">This usually takes a few minutes. Please keep this page open.</p>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    generation.start({
      prompt: prompt.trim(),
      totalPages: pages,
      targetAge: age,
      userId: user?.userId,
      imageStyleId: config.story.imageStyleIds[style],
      title: title.trim() || undefined,
      authorName: author.trim() || undefined,
    });
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl">
      <Link href="/create" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4" aria-hidden />Back to guided setup
      </Link>
      <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">Write your own story</h1>
      <p className="text-muted-foreground font-story mb-8">
        Describe any story you like: the characters, where it happens and what they learn. The more detail, the better.
      </p>

      <form onSubmit={submit} className="rounded-2xl border bg-card p-5 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="story-idea">Your story idea</Label>
          <Textarea
            id="story-idea"
            required
            rows={6}
            maxLength={2000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. My son Leo (6, curly brown hair, glasses) discovers a door in our backyard that leads to a kingdom of friendly robots who need help fixing their rainbow machine."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-title">Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="custom-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-author">Author name <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="custom-author" value={author} maxLength={40} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-pages">Story length</Label>
            <Select value={String(pages)} onValueChange={(v) => setPages(Number(v) as 10 | 15 | 20)}>
              <SelectTrigger id="custom-pages"><SelectValue /></SelectTrigger>
              <SelectContent>
                {config.story.pageCounts.map((p) => <SelectItem key={p} value={String(p)}>{p} pages</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-age">Reading age</Label>
            <Select value={age} onValueChange={setAge}>
              <SelectTrigger id="custom-age"><SelectValue /></SelectTrigger>
              <SelectContent>
                {config.story.ageRanges.map((a) => <SelectItem key={a} value={a}>{a.replace("-", "–")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Art style</p>
          <CartoonStyleSelector selectedStyle={style} onStyleChange={setStyle} />
        </div>

        {!loading && !isAuthenticated ? (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <p className="text-sm font-medium">Sign in or create a free account to create your story.</p>
            <Button asChild><Link href="/signup?next=/create/custom">Create free account</Link></Button>
          </div>
        ) : (
          <Button type="submit" size="lg" className="w-full gap-2" disabled={!prompt.trim() || loading}>
            <Sparkles className="h-4 w-4" aria-hidden />Create my story
          </Button>
        )}
        {generation.state.status === "error" && <p role="alert" className="text-sm text-destructive">{generation.state.message}</p>}
      </form>
    </div>
  );
}
