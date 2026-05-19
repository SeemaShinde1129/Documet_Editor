"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

type AuthMode = "login" | "signup";

type AuthFieldProps = {
  label: string;
  icon: ReactNode;
  type: "text" | "email" | "password";
  value: string;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
  onChange: (value: string) => void;
};

const MIN_PASSWORD_LENGTH = 6;
const DASHBOARD_PATH = "/";

const authModeCopy: Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    submitLabel: string;
    togglePrompt: string;
    toggleLabel: string;
  }
> = {
  login: {
    eyebrow: "Secure workspace access",
    title: "Welcome back",
    description: "Sign in to open your team documents and live workspaces.",
    submitLabel: "Sign in",
    togglePrompt: "New to Realtime Docs?",
    toggleLabel: "Create an account",
  },
  signup: {
    eyebrow: "Start your workspace",
    title: "Create your account",
    description: "Set up your profile and begin collaborating in realtime.",
    submitLabel: "Create account",
    togglePrompt: "Already have an account?",
    toggleLabel: "Sign in",
  },
};

const productSignals = ["Live cursors", "Autosave", "Shared drafts"];

const getSafeRedirectPath = (redirectTo: string | null) => {
  if (
    !redirectTo ||
    redirectTo === "/auth" ||
    redirectTo.startsWith("/auth?")
  ) {
    return DASHBOARD_PATH;
  }

  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return DASHBOARD_PATH;
  }

  return redirectTo;
};

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          compact
            ? "flex size-10 items-center justify-center rounded-lg bg-neutral-950 text-white"
            : "flex size-11 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white shadow-sm"
        }
      >
        <FileText className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p
          className={
            compact
              ? "text-sm font-semibold text-neutral-950"
              : "text-sm font-semibold text-white"
          }
        >
          Realtime Docs
        </p>
        <p
          className={
            compact ? "text-xs text-neutral-500" : "text-xs text-neutral-400"
          }
        >
          Collaborative editor
        </p>
      </div>
    </div>
  );
}

function WorkspacePreview() {
  return (
    <div className="mt-14 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-neutral-950/30 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-xs font-medium text-neutral-400">Workspace</p>
          <p className="mt-1 text-sm font-semibold text-neutral-100">
            Product notes
          </p>
        </div>
        <div className="flex -space-x-2">
          {["K", "S", "A"].map((initial) => (
            <span
              key={initial}
              className="flex size-8 items-center justify-center rounded-full border-2 border-neutral-900 bg-neutral-200 text-xs font-semibold text-neutral-800"
            >
              {initial}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <div className="h-3 w-11/12 rounded-full bg-white/20" />
        <div className="h-3 w-8/12 rounded-full bg-white/15" />
        <div className="mt-5 grid grid-cols-[1fr_0.65fr] gap-3">
          <div className="rounded-xl border border-white/10 bg-neutral-950/40 p-3">
            <div className="h-2.5 w-2/3 rounded-full bg-white/20" />
            <div className="mt-3 h-2.5 w-5/6 rounded-full bg-white/10" />
            <div className="mt-2 h-2.5 w-1/2 rounded-full bg-white/10" />
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
            <p className="text-xs font-medium text-emerald-200">Saved</p>
            <p className="mt-5 text-xs text-emerald-100/80">Just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductPanel() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#18191b] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_78%_72%,rgba(120,113,108,0.16),transparent_30%)]" />
      <div className="absolute inset-x-10 top-32 h-px bg-white/10" />

      <div className="relative">
        <BrandMark />

        <div className="mt-24 max-w-lg">
          <p className="text-sm font-medium text-neutral-400">
            Calm collaboration for focused teams
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-neutral-50">
            A quieter way to write together.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-neutral-300">
            Keep ideas, drafts, and decisions moving in a realtime workspace
            built around clarity, presence, and flow.
          </p>
        </div>

        <WorkspacePreview />
      </div>

      <div className="relative grid grid-cols-3 gap-3">
        {productSignals.map((signal) => (
          <div
            key={signal}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-200"
          >
            {signal}
          </div>
        ))}
      </div>
    </aside>
  );
}

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-xl border border-neutral-200 bg-neutral-100/80 p-1">
      {(["login", "signup"] as const).map((authMode) => (
        <button
          key={authMode}
          type="button"
          className={
            mode === authMode
              ? "rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 shadow-sm transition"
              : "rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
          }
          onClick={() => onChange(authMode)}
        >
          {authMode === "login" ? "Login" : "Sign up"}
        </button>
      ))}
    </div>
  );
}

function AuthField({
  label,
  icon,
  type,
  value,
  placeholder,
  autoComplete,
  minLength,
  onChange,
}: AuthFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <span className="relative mt-2 block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          autoComplete={autoComplete}
          minLength={minLength}
          className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50/80 pl-10 pr-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:bg-white focus:ring-4 focus:ring-neutral-950/10"
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function MessageBanner({
  type,
  children,
}: {
  type: "error" | "success";
  children: ReactNode;
}) {
  const isError = type === "error";

  return (
    <div
      className={
        isError
          ? "flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          : "flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700"
      }
    >
      {isError ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <p>{children}</p>
    </div>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const copy = authModeCopy[mode];
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirectTo"));

  const isSubmitDisabled = useMemo(() => {
    if (isSubmitting || authLoading) {
      return true;
    }

    if (!trimmedEmail || password.length < MIN_PASSWORD_LENGTH) {
      return true;
    }

    return mode === "signup" && !trimmedName;
  }, [
    authLoading,
    isSubmitting,
    mode,
    password.length,
    trimmedEmail,
    trimmedName,
  ]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [authLoading, isAuthenticated, redirectPath, router]);

  const resetFeedback = () => {
    setAuthError(null);
    setSuccessMessage(null);
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetFeedback();
  };

  const handleModeToggle = () => {
    setMode((currentMode) => (currentMode === "login" ? "signup" : "login"));
    resetFeedback();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    if (mode === "signup" && !trimmedName) {
      setAuthError("Name is required.");
      return;
    }

    if (!trimmedEmail) {
      setAuthError("Email is required.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setAuthError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      resetFeedback();

      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error("Unable to create an authenticated session.");
        }

        setSuccessMessage("Signed in successfully. Redirecting...");
        router.replace(redirectPath);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setSuccessMessage("Account created. Redirecting...");
        router.replace(redirectPath);
        router.refresh();
        return;
      }

      setSuccessMessage("Account created. Check your email to confirm access.");
    } catch (error) {
      console.error("Supabase authentication failed", error);
      setAuthError(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950 lg:grid lg:grid-cols-[minmax(440px,0.95fr)_minmax(520px,1.05fr)]">
      <ProductPanel />

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark compact />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white/95 p-5 shadow-xl shadow-neutral-200/70 sm:p-8">
            <div>
              <p className="text-sm font-medium text-neutral-500">
                {copy.eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
                {copy.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-500">
                {copy.description}
              </p>
            </div>

            <div className="mt-8">
              <ModeSwitch mode={mode} onChange={handleModeChange} />
            </div>

            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <AuthField
                  label="Name"
                  icon={<User className="size-4" aria-hidden="true" />}
                  type="text"
                  value={name}
                  autoComplete="name"
                  placeholder="Karan Sharma"
                  onChange={setName}
                />
              ) : null}

              <AuthField
                label="Email"
                icon={<Mail className="size-4" aria-hidden="true" />}
                type="email"
                value={email}
                autoComplete="email"
                placeholder="you@example.com"
                onChange={setEmail}
              />

              <AuthField
                label="Password"
                icon={<LockKeyhole className="size-4" aria-hidden="true" />}
                type="password"
                value={password}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={MIN_PASSWORD_LENGTH}
                placeholder="At least 6 characters"
                onChange={setPassword}
              />

              {authError ? (
                <MessageBanner type="error">{authError}</MessageBanner>
              ) : null}

              {successMessage ? (
                <MessageBanner type="success">{successMessage}</MessageBanner>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-950/20 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60 disabled:shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {isSubmitting ? "Please wait..." : copy.submitLabel}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-neutral-500">
              {copy.togglePrompt}{" "}
              <button
                type="button"
                className="font-medium text-neutral-950 underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
                onClick={handleModeToggle}
              >
                {copy.toggleLabel}
              </button>
            </p>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-neutral-500">
            Protected by Supabase Auth. Your session is stored securely in the
            browser.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 text-neutral-700">
          <p className="text-sm font-medium">Loading authentication...</p>
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
