import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, BookOpen, Camera, CheckCircle2, Dog, Glasses, Loader2, PencilLine, Plus, ShieldCheck, Sparkles, Trash2, UserPlus } from "lucide-react";
import config from "@config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartoonStyleSelector, CARTOON_STYLES, type CartoonStyle } from "@/components/CartoonStyleSelector";
import InlineAuth from "@/components/InlineAuth";
import PhotoPicker from "@/components/PhotoPicker";
import { BOOK_LANGUAGES, bookLanguage, browserBookLanguage } from "@/content/languages";
import { HOLIDAY_THEMES, EVERGREEN_THEMES, PRONOUNS, getTheme, type Pronouns, type StoryTheme } from "@/content/themes";
import {
  EMPTY_APPEARANCE,
  EMPTY_DETAILS,
  ageRangeFor,
  buildCustomStoryPrompt,
  buildStoryPrompt,
  castRequest,
  lookSummary,
  relationLabel,
  type Appearance,
  type CastRole,
  type LookMode,
  type PersonalDetails,
  type WizardAnswers,
} from "@/content/storyPrompt";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBookCreation } from "@/lib/createBook";
import type { PreparedPhoto } from "@/lib/photo";
import { formatPrice, printPrice } from "@/lib/pricing";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sb_wizard_v3";
const STEPS = ["Hero", "Look", "Friends", "Story", "Style", "Create"] as const;
/** Siblings, parents, grandparents, friends and pets besides the hero (backend allows 8 including the hero). */
const MAX_OTHERS = 7;

const HAIR_COLORS = ["Black", "Dark brown", "Brown", "Light brown", "Blonde", "Strawberry blonde", "Red", "Auburn", "Gray"];
const HAIR_STYLES = ["Short", "Straight", "Wavy", "Curly", "Coily", "Afro", "Braids", "Locs", "Ponytail", "Pigtails", "Long", "Buzz cut", "Bald"];
const SKIN_TONES = ["Very fair", "Fair", "Light", "Medium", "Olive", "Tan", "Brown", "Dark brown", "Deep"];
const EYE_COLORS = ["Brown", "Dark brown", "Hazel", "Green", "Blue", "Gray", "Amber"];
const PERSON_ROLES: { value: CastRole; label: string }[] = [
  { value: "sibling", label: "Brother or sister" },
  { value: "friend", label: "Friend" },
  { value: "parent", label: "Mom or dad" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other", label: "Someone else" },
];

interface OtherMember {
  key: string;
  name: string;
  role: CastRole;
  age: number | null;
  pronouns: Pronouns | null;
  lookMode: LookMode;
  photos: PreparedPhoto[];
  description: string;
}

interface WizardState {
  step: number;
  name: string;
  age: number | null;
  pronouns: Pronouns | null;
  lookMode: LookMode | null;
  heroPhotos: PreparedPhoto[];
  appearance: Appearance;
  others: OtherMember[];
  /** "theme": one of our story templates; "custom": the parent's own idea. */
  storyMode: "theme" | "custom";
  themeId: string | null;
  customIdea: string;
  customTitle: string;
  style: CartoonStyle;
  details: PersonalDetails;
  pageCount: 10 | 15 | 20;
  /** Book language code (content/languages.ts). */
  language: string;
  photoConsent: boolean;
}

const INITIAL: WizardState = {
  step: 0,
  name: "",
  age: null,
  pronouns: null,
  lookMode: null,
  heroPhotos: [],
  appearance: EMPTY_APPEARANCE,
  others: [],
  storyMode: "theme",
  themeId: null,
  customIdea: "",
  customTitle: "",
  style: "traditional",
  details: EMPTY_DETAILS,
  pageCount: config.story.defaultPageCount,
  language: "en",
  photoConsent: false,
};

function OptionSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue placeholder="Choose…" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Chips<T extends string>({ value, options, onChange, label }: { value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-full border-2 px-4 py-2 text-sm font-medium", value === o.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PRONOUN_OPTIONS = (Object.keys(PRONOUNS) as Pronouns[]).map((p) => ({ value: p, label: PRONOUNS[p].label }));
const GROWNUP_OPTIONS: { value: Pronouns; label: string }[] = [
  { value: "he", label: "Man" },
  { value: "she", label: "Woman" },
];

function ThemeOption({ theme, name, selected, onSelect }: { theme: StoryTheme; name: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn("text-left rounded-xl border-2 p-4 bg-gradient-to-br transition-all", theme.accent, selected ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-primary/50")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display font-bold">{theme.label.replace("[Name]", name || "Your Child")}</p>
        {selected && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" aria-hidden />}
      </div>
      <p className="text-sm text-foreground/80 font-story mt-1">{theme.tagline}</p>
    </button>
  );
}

function LookChoice({ mode, onChange, name }: { mode: LookMode | null; onChange: (m: LookMode) => void; name: string }) {
  const option = (value: LookMode, icon: React.ReactNode, title: string, text: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === value}
      onClick={() => onChange(value)}
      className={cn("flex-1 text-left rounded-xl border-2 p-4", mode === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}
    >
      <span className="flex items-center gap-2 font-semibold">{icon}{title}</span>
      <span className="block text-sm text-muted-foreground mt-1">{text}</span>
    </button>
  );
  return (
    <div role="radiogroup" aria-label={`How to show ${name}`} className="flex flex-col sm:flex-row gap-3">
      {option("photo", <Camera className="h-5 w-5 text-primary" aria-hidden />, "Use a photo", `Best likeness. ${name} becomes the illustrated hero.`)}
      {option("describe", <PencilLine className="h-5 w-5 text-primary" aria-hidden />, "Describe instead", "No photo needed. Pick hair, skin tone and eyes.")}
    </div>
  );
}

export default function Create() {
  const [state, setState] = useState<WizardState>(INITIAL);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoIssues, setPhotoIssues] = useState<string[] | null>(null);
  const [checkingPhotos, setCheckingPhotos] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const creation = useBookCreation();

  // Restore saved answers and apply ?theme= from landing pages.
  useEffect(() => {
    let next = INITIAL;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) next = { ...INITIAL, ...JSON.parse(saved) };
      if (next.pronouns && !(next.pronouns in PRONOUNS)) next = { ...next, pronouns: null };
    } catch {
      // Ignore unreadable storage.
    }
    const params = new URLSearchParams(window.location.search);
    // ?lang= from ads in other languages, else the browser's language for a fresh start.
    const langParam = BOOK_LANGUAGES.find((l) => l.code === params.get("lang"))?.code;
    if (langParam) next = { ...next, language: langParam };
    else if (!next.name && next.language === "en") next = { ...next, language: browserBookLanguage() };
    const preselected = getTheme(params.get("theme"));
    if (preselected && !next.themeId) next = { ...next, storyMode: "theme", themeId: preselected.id };
    if (params.get("mode") === "custom") next = { ...next, storyMode: "custom" };
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
      // Photos can exceed storage limits; the wizard still works without saving.
    }
  }, [state, restored]);

  // New or removed photos need a fresh check.
  useEffect(() => setPhotoIssues(null), [state.heroPhotos, state.others, state.lookMode]);

  // Once the story is written and drawing has started, show the book as it fills in.
  useEffect(() => {
    if (creation.state.phase === "drawing") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore.
      }
      navigate(`/book/${creation.state.storyId}?new=1`);
    }
  }, [creation.state, navigate]);

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));
  const updateLook = (patch: Partial<Appearance>) => setState((s) => ({ ...s, appearance: { ...s.appearance, ...patch } }));
  const updateDetails = (patch: Partial<PersonalDetails>) => setState((s) => ({ ...s, details: { ...s.details, ...patch } }));
  const updateOther = (key: string, patch: Partial<OtherMember>) =>
    setState((s) => ({ ...s, others: s.others.map((m) => (m.key === key ? { ...m, ...patch } : m)) }));
  const addOther = (pet: boolean) => {
    const key = `${Date.now()}`;
    // Focus the new person's name field so adding several family members is quick.
    window.setTimeout(() => {
      const input = document.getElementById(`name-${key}`) as HTMLInputElement | null;
      input?.scrollIntoView({ block: "center", behavior: "smooth" });
      input?.focus();
    }, 50);
    setState((s) => ({
      ...s,
      others: [
        ...s.others,
        { key, name: "", role: pet ? "pet" : "sibling", age: null, pronouns: null, lookMode: "describe", photos: [], description: "" } satisfies OtherMember,
      ].slice(0, MAX_OTHERS),
    }));
  };

  const theme = getTheme(state.themeId);
  const name = state.name.trim();
  const hero = useMemo(() => (name && state.age && state.pronouns ? { name, age: state.age, pronouns: state.pronouns } : null), [name, state.age, state.pronouns]);
  const anyPhotos = (state.lookMode === "photo" && state.heroPhotos.length > 0) || state.others.some((m) => m.lookMode === "photo" && m.photos.length > 0);

  const stepError = (): string | null => {
    switch (state.step) {
      case 0:
        return hero ? null : "Please add your child's name and age, and choose boy or girl.";
      case 1:
        if (!state.lookMode) return `Choose whether to use a photo or describe ${name || "your child"}.`;
        if (state.lookMode === "photo" && !state.heroPhotos.length) return `Add at least one photo of ${name}, or choose "Describe instead".`;
        if (state.lookMode === "describe" && !(state.appearance.hairColor && state.appearance.skinTone)) return "Please choose at least a hair color and skin tone.";
        return null;
      case 2: {
        const incomplete = state.others.find((m) => !m.name.trim() || (m.role !== "pet" && !m.pronouns));
        if (incomplete) return incomplete.role === "pet" ? "Please give each pet a name." : "Please add a name and choose boy or girl for everyone you've added, or remove them.";
        return null;
      }
      case 3:
        if (state.storyMode === "custom") return state.customIdea.trim().length >= 15 ? null : "Tell us a little about the story you'd like (a sentence or two is plenty).";
        return theme ? null : "Please choose one of our stories, or pick \"Write your own story\".";
      default:
        return null;
    }
  };

  const go = (step: number) => {
    setError(null);
    update({ step });
    if (step > state.step) track("wizard_step", { step_name: STEPS[step], step_number: step + 1 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    const problem = stepError();
    if (problem) {
      setError(problem);
      return;
    }
    go(state.step + 1);
  };

  const selectTheme = (t: StoryTheme) => {
    update({ themeId: t.id });
    track("view_content", { content_type: "theme", content_ids: [t.id], content_name: t.label });
  };

  const custom = state.storyMode === "custom";
  const storyReady = custom ? state.customIdea.trim().length >= 15 : !!theme;
  const storyTitle = hero ? (custom ? state.customTitle.trim() || `${hero.name}'s story` : theme?.title(hero) ?? "") : "";

  const answers = (): WizardAnswers | null =>
    hero && storyReady
      ? {
          hero,
          appearance: state.appearance,
          heroLookMode: state.lookMode ?? "describe",
          heroPhotos: state.heroPhotos.map((p) => p.dataUrl),
          others: state.others.map((m) => ({ ...m, photos: m.photos.map((p) => p.dataUrl) })),
          themeId: custom ? "" : theme?.id ?? "",
          style: state.style,
          details: state.details,
          pageCount: state.pageCount,
          language: state.language,
        }
      : null;

  const startBook = () => {
    const a = answers();
    if (!a || !hero) return;
    if (!custom && !theme) return;
    track("create_book", {
      story_mode: custom ? "custom" : "theme",
      theme: custom ? undefined : theme?.id,
      art_style: state.style,
      language: state.language,
      hero_photo: state.lookMode === "photo",
      cast_size: state.others.length + 1,
      pages: state.pageCount,
    });
    creation.start({
      prompt: custom || !theme ? buildCustomStoryPrompt(a, state.customIdea, state.customTitle) : buildStoryPrompt(theme, a),
      totalPages: state.pageCount,
      targetAge: ageRangeFor(hero.age),
      imageStyleId: config.story.imageStyleIds[state.style],
      // Custom stories without a title get one from the story writer.
      title: custom ? state.customTitle.trim() || undefined : theme?.title(hero),
      authorName: state.details.fromName.trim() || undefined,
      dedication: state.details.dedication.trim() || undefined,
      language: state.language,
      cast: castRequest(a, state.photoConsent),
    });
  };

  /** Check photos server-side (face found, one person, not blurry), then create. */
  const create = async () => {
    if (anyPhotos && !state.photoConsent) {
      setError("Please confirm you're allowed to use these photos.");
      return;
    }
    setError(null);
    if (anyPhotos && photoIssues === null) {
      setCheckingPhotos(true);
      const checks = [
        ...(state.lookMode === "photo" ? state.heroPhotos.map((p) => ({ photo: p, name, kind: "person" })) : []),
        ...state.others.filter((m) => m.lookMode === "photo").flatMap((m) => m.photos.map((p) => ({ photo: p, name: m.name, kind: m.role === "pet" ? "pet" : "person" }))),
      ];
      const results = await Promise.all(
        checks.map((c) =>
          api<{ ok: boolean; message: string | null }>("/stories/generate", { method: "POST", body: { action: "checkPhoto", photo: c.photo.dataUrl, name: c.name, kind: c.kind } }).catch(() => ({ ok: true, message: null })),
        ),
      );
      setCheckingPhotos(false);
      const issues = Array.from(new Set(results.filter((r) => !r.ok && r.message).map((r) => r.message as string)));
      if (issues.length) {
        setPhotoIssues(issues);
        return;
      }
    }
    startBook();
  };

  // ---- Creating screen ----
  if (creation.state.phase === "writing") {
    const seconds = creation.state.seconds;
    const lines = [`Planning ${name}'s adventure…`, `Writing ${storyTitle ? `"${storyTitle}"` : "the story"}…`, "Choosing the perfect words…", "Almost there…"];
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-xl text-center" aria-live="polite">
        <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-6" aria-hidden />
        <h1 className="text-3xl font-display font-bold mb-3">{storyTitle || "Your book"}</h1>
        <p className="text-lg font-story text-muted-foreground mb-6">{lines[Math.min(lines.length - 1, Math.floor(seconds / 20))]}</p>
        <Progress value={Math.min(90, 5 + seconds * 1.4)} className="mb-3" />
        <p className="text-sm text-muted-foreground">Writing takes about a minute, then the pictures appear one by one.</p>
      </div>
    );
  }

  const others = state.others;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">Create a personalized storybook</h1>
        <p className="text-muted-foreground font-story">A few quick questions, then watch {name || "your child"}'s book come to life.</p>
      </div>

      <ol className="flex items-center justify-between gap-1 mb-8" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <div className={cn("h-1.5 rounded-full", i <= state.step ? "bg-primary" : "bg-muted")} />
            <p className={cn("hidden sm:block text-xs mt-1.5 text-center", i === state.step ? "text-primary font-semibold" : "text-muted-foreground")} aria-current={i === state.step ? "step" : undefined}>{label}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-card p-5 sm:p-8">
        <p className="sm:hidden text-sm text-primary font-semibold mb-2">Step {state.step + 1} of {STEPS.length}</p>

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
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((a) => <SelectItem key={a} value={String(a)}>{a} year{a === 1 ? "" : "s"} old</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium mb-1.5">Boy or girl?</legend>
              <Chips label="Boy or girl" value={state.pronouns} options={PRONOUN_OPTIONS} onChange={(pronouns) => update({ pronouns })} />
            </fieldset>
          </div>
        )}

        {state.step === 1 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">What does {name || "your child"} look like?</h2>
            <LookChoice mode={state.lookMode} onChange={(lookMode) => update({ lookMode })} name={name || "your child"} />

            {state.lookMode === "photo" && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-1">Add 1 to 3 clear photos of {name}'s face</p>
                  <p className="text-sm text-muted-foreground mb-3">Front-facing, good light, just {name} in the picture. More photos give a better likeness.</p>
                  <PhotoPicker photos={state.heroPhotos} onChange={(heroPhotos) => update({ heroPhotos })} max={3} name={name} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="photo-note">Anything the photo doesn't show? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="photo-note" value={state.appearance.other} maxLength={120} placeholder="e.g. usually wears red sneakers" onChange={(e) => updateLook({ other: e.target.value })} />
                </div>
                <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-hidden />Photos are private, used only to draw this book, deleted automatically within 30 days, and never used to train AI.</p>
              </div>
            )}

            {state.lookMode === "describe" && (
              <div className="space-y-4">
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
                  <Input id="other-look" value={state.appearance.other} maxLength={120} placeholder="e.g. freckles, a gap-toothed smile" onChange={(e) => updateLook({ other: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        )}

        {state.step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-display font-bold">Anyone else in the story?</h2>
              <p className="text-muted-foreground text-sm mt-1">Optional. Add brothers and sisters, parents, grandparents, friends or pets, as many as {MAX_OTHERS}, and they'll join {name}'s adventure. Add the whole family if you like.</p>
            </div>

            {others.map((m) => (
              <div key={m.key} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold flex items-center gap-2">
                    {m.role === "pet" ? <Dog className="h-4 w-4 text-primary" aria-hidden /> : <UserPlus className="h-4 w-4 text-primary" aria-hidden />}
                    {m.name.trim() || (m.role === "pet" ? "New pet" : "New person")}
                  </p>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${m.name || "this person"}`} onClick={() => update({ others: others.filter((o) => o.key !== m.key) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`name-${m.key}`}>Name</Label>
                    <Input id={`name-${m.key}`} value={m.name} maxLength={30} onChange={(e) => updateOther(m.key, { name: e.target.value })} placeholder={m.role === "pet" ? "e.g. Biscuit" : "e.g. Ava"} />
                  </div>
                  {m.role !== "pet" && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`role-${m.key}`}>Who is this?</Label>
                      <Select value={m.role} onValueChange={(v) => updateOther(m.key, { role: v as CastRole })}>
                        <SelectTrigger id={`role-${m.key}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{PERSON_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {(m.role === "sibling" || m.role === "friend") && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`age-${m.key}`}>Age</Label>
                      <Select value={m.age != null ? String(m.age) : undefined} onValueChange={(v) => updateOther(m.key, { age: Number(v) })}>
                        <SelectTrigger id={`age-${m.key}`}><SelectValue placeholder="Age" /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 18 }, (_, i) => i).map((a) => <SelectItem key={a} value={String(a)}>{a === 0 ? "Baby" : `${a}`}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {m.role !== "pet" && (
                  <Chips label="Boy or girl" value={m.pronouns} options={m.role === "parent" || m.role === "grandparent" ? GROWNUP_OPTIONS : PRONOUN_OPTIONS} onChange={(pronouns) => updateOther(m.key, { pronouns })} />
                )}
                <div className="flex gap-2 text-sm">
                  {(["describe", "photo"] as LookMode[]).map((mode) => (
                    <button key={mode} type="button" onClick={() => updateOther(m.key, { lookMode: mode })} className={cn("rounded-full border px-3 py-1", m.lookMode === mode ? "border-primary bg-primary/10 text-primary" : "border-border")}>
                      {mode === "describe" ? "Describe" : "Use a photo"}
                    </button>
                  ))}
                </div>
                {m.lookMode === "photo" ? (
                  <PhotoPicker photos={m.photos} onChange={(photos) => updateOther(m.key, { photos })} max={1} name={m.name || "them"} compact />
                ) : (
                  <Input
                    aria-label={`What ${m.name || "this person"} looks like`}
                    value={m.description}
                    maxLength={160}
                    onChange={(e) => updateOther(m.key, { description: e.target.value })}
                    placeholder={m.role === "pet" ? "e.g. a fluffy grey cat with white paws" : "e.g. curly black hair, freckles, glasses"}
                  />
                )}
              </div>
            ))}

            {others.length < MAX_OTHERS ? (
              <div className="space-y-2">
                {others.length > 0 && <p className="text-sm font-medium">Anyone else? You can add {MAX_OTHERS - others.length} more.</p>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-1" onClick={() => addOther(false)}><Plus className="h-4 w-4" aria-hidden />{others.some((m) => m.role !== "pet") ? "Add another person" : "Add a person"}</Button>
                  <Button variant="outline" className="gap-1" onClick={() => addOther(true)}><Plus className="h-4 w-4" aria-hidden />{others.some((m) => m.role === "pet") ? "Add another pet" : "Add a pet"}</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">That's the most people a story can hold ({MAX_OTHERS + 1} including {name}).</p>
            )}
          </div>
        )}

        {state.step === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">What's the story?</h2>
            <div role="radiogroup" aria-label="Story type" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { value: "theme", title: "Pick one of our stories", text: "Holiday and everyday adventures with tried-and-tested plots." },
                { value: "custom", title: "Write your own story", text: "Describe any adventure you can dream up and we'll write and illustrate it." },
              ] as const).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={state.storyMode === o.value}
                  onClick={() => update({ storyMode: o.value })}
                  className={cn("text-left rounded-xl border-2 p-4", state.storyMode === o.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {o.value === "theme" ? <BookOpen className="h-5 w-5 text-primary" aria-hidden /> : <PencilLine className="h-5 w-5 text-primary" aria-hidden />}
                    {o.title}
                  </span>
                  <span className="block text-sm text-muted-foreground mt-1">{o.text}</span>
                </button>
              ))}
            </div>

            {state.storyMode === "theme" ? (
              <>
                <div role="radiogroup" aria-label="Holiday stories" className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Holiday stories</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {HOLIDAY_THEMES.map((t) => <ThemeOption key={t.id} theme={t} name={name} selected={state.themeId === t.id} onSelect={() => selectTheme(t)} />)}
                  </div>
                </div>
                <div role="radiogroup" aria-label="Everyday adventures" className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Everyday adventures</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {EVERGREEN_THEMES.map((t) => <ThemeOption key={t.id} theme={t} name={name} selected={state.themeId === t.id} onSelect={() => selectTheme(t)} />)}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-idea">What happens in the story?</Label>
                  <Textarea
                    id="custom-idea"
                    rows={6}
                    maxLength={1500}
                    value={state.customIdea}
                    onChange={(e) => update({ customIdea: e.target.value })}
                    placeholder={`e.g. ${name || "Maya"} finds a door in the backyard that leads to a kingdom of friendly robots who need help fixing their rainbow machine.${others.length ? ` ${others[0].name || "Their sister"} comes along to help.` : ""}`}
                  />
                  <p className="text-xs text-muted-foreground">A sentence or two is plenty. Add a lesson, a favorite place or a funny moment if you like. Everyone you added on the previous steps will be in it.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-title">Title <span className="text-muted-foreground font-normal">(optional, we'll make one up if you leave it blank)</span></Label>
                  <Input id="custom-title" value={state.customTitle} maxLength={80} placeholder={`e.g. ${name || "Maya"} and the Robot Kingdom`} onChange={(e) => update({ customTitle: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        )}

        {state.step === 4 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">Choose an art style</h2>
            <CartoonStyleSelector selectedStyle={state.style} onStyleChange={(style) => update({ style })} />
          </div>
        )}

        {state.step === 5 && hero && storyReady && (
          <div className="space-y-5">
            <h2 className="text-2xl font-display font-bold">"{storyTitle}"</h2>
            <dl className="text-sm rounded-xl bg-muted/50 p-4 space-y-1.5">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Starring</dt><dd className="font-medium text-right">{[hero.name, ...others.map((m) => `${m.name} (${relationLabel({ ...m, photos: [] }, hero)})`)].join(", ")}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{hero.name}'s look</dt><dd className="font-medium text-right">{state.lookMode === "photo" ? `From ${state.heroPhotos.length} photo${state.heroPhotos.length === 1 ? "" : "s"}` : lookSummary(state.appearance)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Art style</dt><dd className="font-medium">{CARTOON_STYLES.find((s) => s.id === state.style)?.name}</dd></div>
            </dl>

            <div className="space-y-1.5">
              <Label htmlFor="book-language">Language of the book</Label>
              <Select value={state.language} onValueChange={(language) => update({ language })}>
                <SelectTrigger id="book-language" className="sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOOK_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.native === l.name ? l.name : `${l.native} (${l.name})`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.language !== "en" && (
                <p className="text-xs text-muted-foreground">The whole book, title included, will be written in {bookLanguage(state.language).name}. Names stay exactly as you typed them.</p>
              )}
            </div>

            <div>
              <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setShowExtras((v) => !v)} aria-expanded={showExtras}>
                {showExtras ? "Hide" : "Add"} a dedication, favorite things or book length (optional)
              </button>
              {showExtras && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dedication">Dedication on page 1</Label>
                    <Textarea id="dedication" value={state.details.dedication} maxLength={300} rows={3} placeholder={`e.g. To ${name}, may every adventure bring you home to us. Love, Mom and Dad`} onChange={(e) => updateDetails({ dedication: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label htmlFor="fav-animal">Favorite animal</Label><Input id="fav-animal" value={state.details.favoriteAnimal} maxLength={60} onChange={(e) => updateDetails({ favoriteAnimal: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label htmlFor="fav-toy">Favorite toy</Label><Input id="fav-toy" value={state.details.favoriteToy} maxLength={60} onChange={(e) => updateDetails({ favoriteToy: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label htmlFor="hobby">Loves doing</Label><Input id="hobby" value={state.details.hobby} maxLength={80} onChange={(e) => updateDetails({ hobby: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="from-name">Author name on the cover</Label>
                    <Input id="from-name" value={state.details.fromName} maxLength={40} placeholder="e.g. Grandma Rose" onChange={(e) => updateDetails({ fromName: e.target.value })} />
                  </div>
                  <fieldset>
                    <legend className="text-sm font-medium mb-1.5">Book length</legend>
                    <div role="radiogroup" className="grid grid-cols-3 gap-2">
                      {config.story.pageCounts.map((p) => (
                        <button key={p} type="button" role="radio" aria-checked={state.pageCount === p} onClick={() => update({ pageCount: p })} className={cn("rounded-xl border-2 p-3 text-center", state.pageCount === p ? "border-primary bg-primary/10" : "border-border")}>
                          <span className="block font-semibold">{p} pages</span>
                          <span className="block text-xs text-muted-foreground">{p === 10 ? "Short" : p === 15 ? "Medium" : "Long"}, same price</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}
            </div>

            {anyPhotos && (
              <label className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer">
                <Checkbox className="mt-0.5" checked={state.photoConsent} onCheckedChange={(c) => update({ photoConsent: c === true })} />
                <span className="text-sm">I'm the parent or guardian of the children in these photos, or I have their permission to use them.</span>
              </label>
            )}

            {photoIssues && (
              <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3 text-sm">
                {photoIssues.map((m) => <p key={m}>{m}</p>)}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setPhotoIssues(null); go(state.lookMode === "photo" ? 1 : 2); }}>Change photos</Button>
                  <Button size="sm" onClick={startBook}>Use them anyway</Button>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">Free to create and preview. You'll see the book before you buy anything.</p>

            {!loading && !isAuthenticated ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <InlineAuth heroName={hero.name} onReady={create} busyLabel="One moment…" />
              </div>
            ) : (
              !photoIssues && (
                <Button size="lg" className="w-full gap-2 text-base" onClick={create} disabled={loading || checkingPhotos}>
                  {checkingPhotos ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                  {checkingPhotos ? "Checking photos…" : `Create ${hero.name}'s book`}
                </Button>
              )
            )}
            {creation.state.phase === "error" && <p role="alert" className="text-sm text-destructive">{creation.state.message}</p>}
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="flex justify-between gap-3 mt-8">
          {state.step > 0 ? <Button variant="ghost" onClick={() => go(state.step - 1)} className="gap-1"><ArrowLeft className="h-4 w-4" aria-hidden />Back</Button> : <span />}
          {state.step < STEPS.length - 1 && (
            <Button onClick={next} className="gap-1">
              {state.step === 2 && !others.length ? "Skip" : "Next"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
