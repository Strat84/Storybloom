import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Glasses, ImagePlus, Loader2, Sparkles } from "lucide-react";
import config from "@config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartoonStyleSelector, CARTOON_STYLES, type CartoonStyle } from "@/components/CartoonStyleSelector";
import { HOLIDAY_THEMES, EVERGREEN_THEMES, PRONOUNS, getTheme, type Pronouns, type StoryTheme } from "@/content/themes";
import {
  EMPTY_APPEARANCE,
  EMPTY_DETAILS,
  ageRangeFor,
  buildStoryPrompt,
  characterDescription,
  lookSummary,
  type Appearance,
  type PersonalDetails,
} from "@/content/storyPrompt";
import { useAuth } from "@/lib/auth";
import { rememberStoryContext, useStoryGeneration } from "@/lib/generate";
import { formatPrice, printPrice } from "@/lib/pricing";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sb_wizard";

const STEPS = ["Your child", "Their look", "Story", "Art style", "Extra touches", "Create"] as const;

const HAIR_COLORS = ["Black", "Dark brown", "Brown", "Light brown", "Blonde", "Strawberry blonde", "Red", "Auburn", "Gray"];
const HAIR_STYLES = ["Short", "Straight", "Wavy", "Curly", "Coily", "Afro", "Braids", "Locs", "Ponytail", "Pigtails", "Long", "Buzz cut", "Bald"];
const SKIN_TONES = ["Very fair", "Fair", "Light", "Medium", "Olive", "Tan", "Brown", "Dark brown", "Deep"];
const EYE_COLORS = ["Brown", "Dark brown", "Hazel", "Green", "Blue", "Gray", "Amber"];

interface WizardState {
  step: number;
  name: string;
  age: number | null;
  pronouns: Pronouns | null;
  appearance: Appearance;
  themeId: string | null;
  style: CartoonStyle;
  details: PersonalDetails;
  pageCount: 10 | 15 | 20;
}

const INITIAL: WizardState = {
  step: 0,
  name: "",
  age: null,
  pronouns: null,
  appearance: EMPTY_APPEARANCE,
  themeId: null,
  style: "traditional",
  details: EMPTY_DETAILS,
  pageCount: config.story.defaultPageCount,
};

function OptionSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o.toLowerCase()}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ThemeOption({ theme, name, selected, onSelect }: { theme: StoryTheme; name: string; selected: boolean; onSelect: () => void }) {
  const title = theme.label.replace("[Name]", name || "Your Child");
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "text-left rounded-xl border-2 p-4 bg-gradient-to-br transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        theme.accent,
        selected ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-primary/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display font-bold">{title}</p>
        {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" aria-hidden />}
      </div>
      <p className="text-sm text-foreground/80 font-story mt-1">{theme.tagline}</p>
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

export default function Create() {
  const [state, setState] = useState<WizardState>(INITIAL);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const generation = useStoryGeneration();

  // Restore saved answers (e.g. after signing up mid-way) and apply ?theme= from landing pages.
  useEffect(() => {
    let next = INITIAL;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) next = { ...INITIAL, ...JSON.parse(saved) };
    } catch {
      // Ignore unreadable storage.
    }
    const themeParam = new URLSearchParams(window.location.search).get("theme");
    const preselected = themeParam ? getTheme(themeParam) : undefined;
    if (preselected && !next.themeId) next = { ...next, themeId: preselected.id };
    setState(next);
    setRestored(true);
    track("start_creation");
    if (preselected) track("view_content", { content_type: "theme", content_ids: [preselected.id], content_name: preselected.label });
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Best-effort only.
    }
  }, [state, restored]);

  useEffect(() => {
    if (generation.state.status === "done") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore.
      }
      navigate(`/generated-story/${generation.state.storyId}`);
    }
  }, [generation.state, navigate]);

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));
  const updateLook = (patch: Partial<Appearance>) => setState((s) => ({ ...s, appearance: { ...s.appearance, ...patch } }));
  const updateDetails = (patch: Partial<PersonalDetails>) => setState((s) => ({ ...s, details: { ...s.details, ...patch } }));

  const theme = getTheme(state.themeId);
  const name = state.name.trim();
  const hero = useMemo(
    () => (name && state.age && state.pronouns ? { name, age: state.age, pronouns: state.pronouns } : null),
    [name, state.age, state.pronouns],
  );

  const stepValid = [
    !!hero,
    !!(state.appearance.hairColor && state.appearance.skinTone),
    !!theme,
    !!state.style,
    true,
    true,
  ];

  const go = (step: number) => {
    setError(null);
    update({ step });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    if (!stepValid[state.step]) {
      setError(
        state.step === 0
          ? "Please add your child's name, age and pronouns."
          : state.step === 1
            ? "Please choose at least a hair color and skin tone."
            : "Please choose a story to continue.",
      );
      return;
    }
    go(state.step + 1);
  };

  const selectTheme = (t: StoryTheme) => {
    update({ themeId: t.id });
    track("view_content", { content_type: "theme", content_ids: [t.id], content_name: t.label });
  };

  const create = async () => {
    if (!hero || !theme) return;
    const answers = { hero, appearance: state.appearance, themeId: theme.id, style: state.style, details: state.details, pageCount: state.pageCount };
    const storyId = await generation.start({
      prompt: buildStoryPrompt(theme, answers),
      totalPages: state.pageCount,
      targetAge: ageRangeFor(hero.age),
      userId: user?.userId,
      imageStyleId: config.story.imageStyleIds[state.style],
      title: theme.title(hero),
      authorName: state.details.fromName.trim() || undefined,
    });
    if (storyId) {
      rememberStoryContext(storyId, { characterDescription: characterDescription(hero, state.appearance), targetAge: ageRangeFor(hero.age) });
    }
  };

  const busy = generation.state.status === "starting" || generation.state.status === "writing";

  if (busy) {
    const elapsed = generation.state.status === "writing" ? generation.state.elapsedSeconds : 0;
    const messages = ["Planning the adventure…", `Writing ${name}'s story…`, "Choosing the perfect words…", "Adding a little extra magic…"];
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-xl text-center" aria-live="polite">
        <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-6" aria-hidden />
        <h1 className="text-3xl font-display font-bold mb-3">{theme && hero ? theme.title(hero) : "Your story"}</h1>
        <p className="text-lg font-story text-muted-foreground mb-6">{messages[Math.min(messages.length - 1, Math.floor(elapsed / 30))]}</p>
        <Progress value={Math.min(95, 10 + elapsed / 2)} className="mb-3" />
        <p className="text-sm text-muted-foreground">This usually takes a few minutes. Please keep this page open.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">Create a personalized storybook</h1>
        <p className="text-muted-foreground font-story">A few quick questions and we'll write a story starring your child.</p>
      </div>

      <ol className="flex items-center justify-between gap-1 mb-8" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= state.step ? "bg-primary" : "bg-muted")} />
            <p className={cn("hidden sm:block text-xs mt-1.5 text-center", i === state.step ? "text-primary font-semibold" : "text-muted-foreground")} aria-current={i === state.step ? "step" : undefined}>
              {label}
            </p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-card p-5 sm:p-8">
        <p className="sm:hidden text-sm text-primary font-semibold mb-2">Step {state.step + 1} of {STEPS.length}: {STEPS[state.step]}</p>

        {state.step === 0 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">Who is the hero?</h2>
            <div className="space-y-1.5">
              <Label htmlFor="child-name">Child's first name</Label>
              <Input id="child-name" value={state.name} maxLength={30} autoComplete="off" placeholder="e.g. Maya" onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-age">Age</Label>
              <Select value={state.age ? String(state.age) : undefined} onValueChange={(v) => update({ age: Number(v) })}>
                <SelectTrigger id="child-age" className="w-40"><SelectValue placeholder="Choose age" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((a) => (
                    <SelectItem key={a} value={String(a)}>{a} year{a === 1 ? "" : "s"} old</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium mb-1.5">Pronouns</legend>
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {(Object.keys(PRONOUNS) as Pronouns[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={state.pronouns === p}
                    onClick={() => update({ pronouns: p })}
                    className={cn("rounded-full border-2 px-4 py-2 text-sm font-medium", state.pronouns === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}
                  >
                    {PRONOUNS[p].label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {state.step === 1 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">What does {name || "your child"} look like?</h2>
            {config.features.photoUpload ? (
              <div className="rounded-xl border-2 border-dashed p-6 text-center">
                <ImagePlus className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden />
                <p className="font-semibold">Upload 1–3 photos</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                We use this to draw {name || "your child"} the same way on the cover and every page.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OptionSelect id="hair-color" label="Hair color" value={state.appearance.hairColor} options={HAIR_COLORS} onChange={(v) => updateLook({ hairColor: v })} />
              <OptionSelect id="hair-style" label="Hair style" value={state.appearance.hairStyle} options={HAIR_STYLES} onChange={(v) => updateLook({ hairStyle: v })} />
              <OptionSelect id="skin-tone" label="Skin tone" value={state.appearance.skinTone} options={SKIN_TONES} onChange={(v) => updateLook({ skinTone: v })} />
              <OptionSelect id="eye-color" label="Eye color" value={state.appearance.eyeColor} options={EYE_COLORS} onChange={(v) => updateLook({ eyeColor: v })} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={state.appearance.glasses} onCheckedChange={(c) => updateLook({ glasses: c === true })} />
              <span className="flex items-center gap-1.5 text-sm font-medium"><Glasses className="h-4 w-4" aria-hidden />Wears glasses</span>
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="other-look">Anything else? <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="other-look" value={state.appearance.other} maxLength={120} placeholder="e.g. freckles, a gap-toothed smile, favorite red sneakers" onChange={(e) => updateLook({ other: e.target.value })} />
            </div>
          </div>
        )}

        {state.step === 2 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">Pick a story</h2>
            <div role="radiogroup" aria-label="Holiday stories" className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Holiday stories</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {HOLIDAY_THEMES.map((t) => (
                  <ThemeOption key={t.id} theme={t} name={name} selected={state.themeId === t.id} onSelect={() => selectTheme(t)} />
                ))}
              </div>
            </div>
            <div role="radiogroup" aria-label="Everyday adventures" className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Everyday adventures</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EVERGREEN_THEMES.map((t) => (
                  <ThemeOption key={t.id} theme={t} name={name} selected={state.themeId === t.id} onSelect={() => selectTheme(t)} />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Have your own idea? <Link href="/create/custom" className="text-primary font-medium hover:underline">Advanced: write your own story</Link>
            </p>
          </div>
        )}

        {state.step === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">Choose an art style</h2>
            <CartoonStyleSelector selectedStyle={state.style} onStyleChange={(style) => update({ style })} />
          </div>
        )}

        {state.step === 4 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">Extra touches <span className="text-base font-normal text-muted-foreground">(all optional)</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fav-animal">Favorite animal</Label>
                <Input id="fav-animal" value={state.details.favoriteAnimal} maxLength={60} placeholder="e.g. otters" onChange={(e) => updateDetails({ favoriteAnimal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fav-toy">Favorite toy</Label>
                <Input id="fav-toy" value={state.details.favoriteToy} maxLength={60} placeholder="e.g. a stuffed bunny called Moppy" onChange={(e) => updateDetails({ favoriteToy: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="hobby">Something they love doing</Label>
                <Input id="hobby" value={state.details.hobby} maxLength={80} placeholder="e.g. dancing, dinosaurs, building forts" onChange={(e) => updateDetails({ hobby: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dedication">Dedication</Label>
              <Textarea id="dedication" value={state.details.dedication} maxLength={300} rows={3} placeholder={`e.g. To ${name || "our little star"}, may every adventure bring you home to us. Love, Mom and Dad`} onChange={(e) => updateDetails({ dedication: e.target.value })} />
              <p className="text-xs text-muted-foreground">{300 - state.details.dedication.length} characters left</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from-name">Author name on the cover</Label>
              <Input id="from-name" value={state.details.fromName} maxLength={40} placeholder="e.g. Grandma Rose" onChange={(e) => updateDetails({ fromName: e.target.value })} />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium mb-1.5">Book length</legend>
              <div role="radiogroup" className="grid grid-cols-3 gap-2">
                {config.story.pageCounts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={state.pageCount === p}
                    onClick={() => update({ pageCount: p })}
                    className={cn("rounded-xl border-2 p-3 text-center", state.pageCount === p ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}
                  >
                    <span className="block font-semibold">{p} pages</span>
                    <span className="block text-xs text-muted-foreground">Printed {formatPrice(printPrice(p))}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {state.step === 5 && theme && hero && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">Ready to create "{theme.title(hero)}"</h2>
            <dl className="text-sm">
              <Summary label="Hero" value={`${hero.name}, ${hero.age} (${PRONOUNS[hero.pronouns].label.toLowerCase()})`} />
              <Summary label="Look" value={lookSummary(state.appearance)} />
              <Summary label="Story" value={theme.title(hero)} />
              <Summary label="Art style" value={CARTOON_STYLES.find((s) => s.id === state.style)?.name ?? state.style} />
              <Summary label="Length" value={`${state.pageCount} pages`} />
              {state.details.dedication && <Summary label="Dedication" value={state.details.dedication} />}
            </dl>
            <p className="text-sm text-muted-foreground">
              Creating and previewing is free. You'll see every page and can make changes before you buy anything.
            </p>
            {!loading && !isAuthenticated ? (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
                <p className="font-semibold">Create a free account to save {hero.name}'s book</p>
                <p className="text-sm text-muted-foreground">Your answers are saved. You'll come right back here.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild className="flex-1"><Link href="/signup?next=/create">Create free account</Link></Button>
                  <Button asChild variant="outline" className="flex-1"><Link href="/signin?next=/create">I have an account</Link></Button>
                </div>
              </div>
            ) : (
              <Button size="lg" className="w-full gap-2 text-base" onClick={create} disabled={loading}>
                <Sparkles className="h-4 w-4" aria-hidden />
                Create {hero.name}'s book
              </Button>
            )}
            {generation.state.status === "error" && (
              <p role="alert" className="text-sm text-destructive">{generation.state.message}</p>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="flex justify-between gap-3 mt-8">
          {state.step > 0 ? (
            <Button variant="ghost" onClick={() => go(state.step - 1)} className="gap-1"><ArrowLeft className="h-4 w-4" aria-hidden />Back</Button>
          ) : (
            <span />
          )}
          {state.step < STEPS.length - 1 && (
            <Button onClick={next} className="gap-1">Next<ArrowRight className="h-4 w-4" aria-hidden /></Button>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Prefer to write it yourself? <Link href="/create/custom" className="text-primary font-medium hover:underline">Advanced: write your own story</Link>
      </p>
    </div>
  );
}
