import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage, useAuth } from "@/lib/auth";
import { track } from "@/lib/track";

/** Only follow same-site paths after sign-in. */
function safeNext(search: string, fallback = "/mystories") {
  const next = new URLSearchParams(search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 max-w-md">
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1">{title}</h1>
        {subtitle && <p className="text-muted-foreground mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required className="pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null;
}

/** Redirect signed-in visitors away from sign-in pages. */
function useRedirectIfSignedIn(target: string) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!loading && isAuthenticated) navigate(target);
  }, [isAuthenticated, loading, navigate, target]);
}

export function SignIn() {
  const search = useSearch();
  const next = safeNext(search);
  const { signIn, resendSignUpCode } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordReset = new URLSearchParams(search).get("passwordReset") === "true";
  useRedirectIfSignedIn(next);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      if (result.done) {
        navigate(next);
      } else if (result.nextStep === "CONFIRM_SIGN_UP") {
        await resendSignUpCode(email).catch(() => undefined);
        navigate(`/signup?confirm=1&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
      } else {
        setError("We couldn't finish signing you in. Please try again.");
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to see and order your stories.">
      {passwordReset && <p className="mb-4 rounded-md bg-primary/10 p-3 text-sm">Your password was updated. Please sign in.</p>}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="signin-email">Email</Label>
          <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label htmlFor="signin-password">Password</Label>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput id="signin-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <ErrorText error={error} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Sign in
        </Button>
      </form>
      <p className="mt-6 text-sm text-center text-muted-foreground">
        New to StoryBloom? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-primary font-medium hover:underline">Create a free account</Link>
      </p>
    </AuthCard>
  );
}

export function SignUp() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const next = safeNext(search, "/create");
  const { signUp, confirmSignUp, resendSignUpCode, signIn } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"form" | "confirm">(params.get("confirm") ? "confirm" : "form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useRedirectIfSignedIn(next);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !guardian) {
      setError("Please confirm you're a parent or guardian (18+) and agree to the Terms.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password, name);
      track("generate_lead", { method: "signup" });
      setStep("confirm");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmSignUp(email, code);
      track("sign_up", { method: "email" });
      if (password) {
        await signIn(email, password);
        navigate(next);
      } else {
        navigate(`/signin?next=${encodeURIComponent(next)}`);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await resendSignUpCode(email);
      setNotice("We sent a new code. Check your inbox and spam folder.");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  if (step === "confirm") {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a 6-digit code to ${email || "your email"}.`}>
        <form onSubmit={confirm} className="space-y-4">
          {!params.get("email") && !email && (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-email">Email</Label>
              <Input id="confirm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-code">Verification code</Label>
            <Input id="confirm-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} />
          </div>
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
          <ErrorText error={error} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Confirm and continue
          </Button>
          <button type="button" onClick={resend} className="w-full text-sm text-primary hover:underline">Send a new code</button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your free account" subtitle="Save your stories and come back to them any time.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="signup-name">Your name</Label>
          <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput id="signup-password" value={password} onChange={setPassword} autoComplete="new-password" />
          <p className="text-xs text-muted-foreground">At least 8 characters with upper and lower case letters, a number and a symbol.</p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} />
          <span>I'm 18 or older and a parent, guardian or family member creating books for a child.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </span>
        </label>
        <ErrorText error={error} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-center text-muted-foreground">
        Already have an account? <Link href={`/signin?next=${encodeURIComponent(next)}`} className="text-primary font-medium hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}

export function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await forgotPassword(email);
      navigate(`/create-new-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a code to reset it.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">Email</Label>
          <Input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <ErrorText error={error} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Send reset code
        </Button>
      </form>
    </AuthCard>
  );
}

export function CreateNewPassword() {
  const search = useSearch();
  const { confirmForgotPassword, forgotPassword } = useAuth();
  const [, navigate] = useLocation();
  const email = new URLSearchParams(search).get("email") ?? "";
  const [code, setCode] = useState(new URLSearchParams(search).get("code") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmForgotPassword(email, code, password);
      navigate("/signin?passwordReset=true");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Create a new password" subtitle={email ? `Enter the code we sent to ${email}.` : "Enter the code from your email."}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reset-code">Verification code</Label>
          <Input id="reset-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">New password</Label>
          <PasswordInput id="reset-password" value={password} onChange={setPassword} autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <PasswordInput id="reset-confirm" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        </div>
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
        <ErrorText error={error} />
        <Button type="submit" className="w-full" disabled={busy || !email}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Update password
        </Button>
        {email && (
          <button
            type="button"
            className="w-full text-sm text-primary hover:underline"
            onClick={async () => {
              try {
                await forgotPassword(email);
                setNotice("We sent a new code.");
              } catch (err) {
                setError(authErrorMessage(err));
              }
            }}
          >
            Send a new code
          </button>
        )}
      </form>
    </AuthCard>
  );
}
