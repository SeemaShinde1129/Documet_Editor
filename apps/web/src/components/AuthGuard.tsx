"use client";

import { FileText, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { useAuth } from "@/providers/AuthProvider";

type AuthGuardProps = {
  children: ReactNode;
};

function AuthGuardLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-950">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-sm">
          <FileText className="size-5" aria-hidden="true" />
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-neutral-700">
          <Loader2
            className="size-4 animate-spin text-neutral-500"
            aria-hidden="true"
          />
          Preparing workspace
        </div>
        <p className="mt-2 max-w-xs text-sm leading-6 text-neutral-500">
          Checking your secure session before opening your documents.
        </p>
      </div>
    </main>
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading || isAuthenticated) {
      return;
    }

    const redirectTo = encodeURIComponent(pathname || "/");

    router.replace(`/auth?redirectTo=${redirectTo}`);
  }, [isAuthenticated, loading, pathname, router]);

  if (loading || !isAuthenticated) {
    return <AuthGuardLoadingScreen />;
  }

  return children;
}

export default AuthGuard;
