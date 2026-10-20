import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import config from "@config";
import { authModule } from "./amplify";
import { api } from "./api";

export interface ApiProfile {
  userId?: string;
  fullName?: string;
  email?: string;
  subscriptionStatus?: string;
  createdAt?: string | number;
  [key: string]: unknown;
}

export interface AuthUser {
  userId: string;
  username: string;
  email?: string;
  name?: string;
  apiProfile: ApiProfile | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the stored session has been checked on the client. */
  loading: boolean;
  isAuthenticated: boolean;
  signUp(email: string, password: string, name: string): Promise<void>;
  confirmSignUp(email: string, code: string): Promise<void>;
  resendSignUpCode(email: string): Promise<void>;
  /** Returns the next step when sign-in needs more (e.g. the account is unconfirmed). */
  signIn(email: string, password: string): Promise<{ done: boolean; nextStep?: string }>;
  signOut(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Amplify stores Cognito tokens under this prefix; skip loading it for logged-out visitors. */
function hasStoredSession() {
  try {
    const prefix = `CognitoIdentityServiceProvider.${config.api.cognito.userPoolClientId}.`;
    return Object.keys(localStorage).some((key) => key.startsWith(prefix) && key.endsWith(".LastAuthUser"));
  } catch {
    return true;
  }
}

async function loadUser(): Promise<AuthUser | null> {
  const auth = await authModule();
  try {
    const current = await auth.getCurrentUser();
    const attributes = await auth.fetchUserAttributes().catch(() => ({} as Record<string, string | undefined>));
    const apiProfile = await api<ApiProfile>("/user").catch(() => null);
    return {
      userId: current.userId,
      username: current.username,
      email: attributes.email,
      name: attributes.name,
      apiProfile,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!hasStoredSession()) {
      setLoading(false);
      return;
    }
    loadUser()
      .then((u) => active && setUser(u))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = await authModule();
    const result = await auth.signIn({ username: email.trim(), password });
    if (!result.isSignedIn) {
      return { done: false, nextStep: result.nextStep?.signInStep };
    }
    setUser(await loadUser());
    return { done: true };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      async signUp(email, password, name) {
        const auth = await authModule();
        await auth.signUp({
          username: email.trim(),
          password,
          options: { userAttributes: { email: email.trim(), name: name.trim() } },
        });
      },
      async confirmSignUp(email, code) {
        const auth = await authModule();
        await auth.confirmSignUp({ username: email.trim(), confirmationCode: code.trim() });
      },
      async resendSignUpCode(email) {
        const auth = await authModule();
        await auth.resendSignUpCode({ username: email.trim() });
      },
      signIn,
      async signOut() {
        const auth = await authModule();
        await auth.signOut();
        setUser(null);
      },
      async forgotPassword(email) {
        const auth = await authModule();
        await auth.resetPassword({ username: email.trim() });
      },
      async confirmForgotPassword(email, code, newPassword) {
        const auth = await authModule();
        await auth.confirmResetPassword({ username: email.trim(), confirmationCode: code.trim(), newPassword });
      },
      async refreshProfile() {
        setUser(await loadUser());
      },
    }),
    [user, loading, signIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Amplify error names mapped to messages a parent can act on. */
export function authErrorMessage(error: unknown) {
  const name = (error as { name?: string })?.name;
  const message = (error as { message?: string })?.message;
  switch (name) {
    case "UserNotFoundException":
    case "NotAuthorizedException":
      return "That email and password don't match. Please try again.";
    case "UsernameExistsException":
      return "An account with this email already exists. Try signing in.";
    case "CodeMismatchException":
      return "That code doesn't match. Check the email we sent and try again.";
    case "ExpiredCodeException":
      return "That code has expired. We can send you a new one.";
    case "InvalidPasswordException":
      return "Password must be at least 8 characters and include upper and lower case letters, a number and a symbol.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "UserNotConfirmedException":
      return "Please confirm your email first. We can resend the code.";
    default:
      return message || "Something went wrong. Please try again.";
  }
}
