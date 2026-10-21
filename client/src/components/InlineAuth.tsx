import { useState } from "react";
import { Link } from "wouter";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage, useAuth } from "@/lib/auth";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "upper & lower case", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "a number", test: (p: string) => /\d/.test(p) },
  { label: "a symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Create an account (or sign in) without leaving the page. Calls onReady once
 * the visitor is signed in.
 */
export default function InlineAuth({ heroName, onReady, busyLabel }: { heroName: string; onReady: () => void; busyLabel: string }) {
  const { signUp, confirmSignUp, resendSignUpCode, signIn } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin" | "confirm">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RULES.every((r) => r.test(password))) {
      setError("Please choose a password that meets all four rules below.");
      return;
    }
    run(async () => {
      await signUp(email, password, name || email.split("@")[0]);
      track("generate_lead", { method: "wizard" });
      setMode("confirm");
    });
  };

  const submitConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await confirmSignUp(email, code);
      track("sign_up", { method: "email" });
      await signIn(email, password);
      onReady();
    });
  };

  const submitSignin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const result = await signIn(email, password);
      if (result.done) {
        onReady();
      } else if (result.nextStep === "CONFIRM_SIGN_UP") {
        await resendSignUpCode(email).catch(() => undefined);
        setMode("confirm");
      } else {
        setError("We couldn't finish signing you in. Please try again.");
      }
    });
  };

  const passwordField = (autoComplete: string) => (
    <div className="space-y-1.5">
      <Label htmlFor="ia-password">Password</Label>
      <div className="relative">
        <Input id="ia-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={autoComplete} required className="pr-10" />
        <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  const errorText = error && <p role="alert" className="text-sm text-destructive">{error}</p>;

  if (mode === "confirm") {
    return (
      <form onSubmit={submitConfirm} className="space-y-3">
        <p className="font-semibold">Check your email</p>
        <p className="text-sm text-muted-foreground">We sent a 6-digit code to {email}. Enter it to start {heroName}'s book.</p>
        <div className="space-y-1.5">
          <Label htmlFor="ia-code">Verification code</Label>
          <Input id="ia-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
        {errorText}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {busy ? busyLabel : `Confirm and create ${heroName}'s book`}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-primary hover:underline"
          onClick={() => run(async () => {
            await resendSignUpCode(email);
            setNotice("We sent a new code. Check your inbox and spam folder.");
          })}
        >
          Send a new code
        </button>
      </form>
    );
  }

  if (mode === "signin") {
    return (
      <form onSubmit={submitSignin} className="space-y-3">
        <p className="font-semibold">Welcome back</p>
        <div className="space-y-1.5">
          <Label htmlFor="ia-email">Email</Label>
          <Input id="ia-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        {passwordField("current-password")}
        {errorText}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {busy ? busyLabel : `Sign in and create ${heroName}'s book`}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          New here? <button type="button" className="text-primary font-medium hover:underline" onClick={() => setMode("signup")}>Create a free account</button>
          {" · "}
          <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={submitSignup} className="space-y-3">
      <p className="font-semibold">Save {heroName}'s book to a free account</p>
      <p className="text-sm text-muted-foreground">It stays in your account so you can come back to it. No payment needed to create and preview.</p>
      <div className="space-y-1.5">
        <Label htmlFor="ia-email">Email</Label>
        <Input id="ia-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ia-name">Your first name <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="ia-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </div>
      {passwordField("new-password")}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {PASSWORD_RULES.map((r) => (
          <li key={r.label} className={cn("flex items-center gap-1", r.test(password) ? "text-primary" : "text-muted-foreground")}>
            <Check className="h-3 w-3" aria-hidden />
            {r.label}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        By continuing you agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>, and confirm you're 18 or older.
      </p>
      {errorText}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {busy ? busyLabel : "Continue"}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account? <button type="button" className="text-primary font-medium hover:underline" onClick={() => setMode("signin")}>Sign in</button>
      </p>
    </form>
  );
}
