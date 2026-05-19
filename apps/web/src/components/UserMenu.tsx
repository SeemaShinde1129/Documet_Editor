"use client";

import { LogOut, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

type UserMenuProps = {
  className?: string;
  compact?: boolean;
};

export function UserMenu({ className = "", compact = false }: UserMenuProps) {
  const router = useRouter();
  const { user, userDisplayName, userInitials } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = user?.email;
  const name = userDisplayName ?? email ?? user?.id ?? "Account";
  const initials = userInitials ?? "?";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setIsOpen(false);
      router.replace("/auth");
      router.refresh();
    } catch (error) {
      console.error("Failed to sign out", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        className={
          compact
            ? "inline-flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white p-1 text-left shadow-sm transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            : "inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white p-1 pr-3 text-left shadow-sm transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
        }
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((currentValue) => !currentValue);
          setErrorMessage(null);
        }}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-neutral-950 text-xs font-semibold text-white">
          {initials}
        </span>
        {!compact ? (
          <span className="hidden max-w-32 truncate text-sm font-medium text-neutral-700 sm:inline">
            {name}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={
            compact
              ? "absolute bottom-12 left-0 z-40 w-72 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl shadow-neutral-200/70"
              : "absolute right-0 top-12 z-40 w-72 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl shadow-neutral-200/70"
          }
          role="menu"
        >
          <div className="rounded-lg bg-neutral-50 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-950">
                  {name}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {email ?? "No email available"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 px-1 py-1">
            <div className="flex items-center gap-2 px-2 py-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
              <UserCircle className="size-3.5" aria-hidden="true" />
              Account
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:pointer-events-none disabled:opacity-60"
              role="menuitem"
              disabled={isSigningOut}
              onClick={handleLogout}
            >
              <LogOut className="size-4" aria-hidden="true" />
              {isSigningOut ? "Signing out..." : "Log out"}
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default UserMenu;
