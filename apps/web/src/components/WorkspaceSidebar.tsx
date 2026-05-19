"use client";

import type { Document } from "@repo/types/document";
import {
  AlertCircle,
  Clock3,
  FileText,
  FolderOpen,
  Menu,
  Share2,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";

import CreateDocumentModal from "@/components/CreateDocumentModal";
import UserMenu from "@/components/UserMenu";
import { documentApi } from "@/features/documents/api/document.api";

type WorkspaceSidebarProps = {
  className?: string;
};

type WorkspaceNavItem = {
  label: string;
  href: string;
  icon: typeof FileText;
};

type SidebarDocumentStatus = "idle" | "loading" | "ready" | "error";

type SidebarDocumentStore = {
  documents: Document[];
  status: SidebarDocumentStatus;
  errorMessage: string | null;
  fetchRecentDocuments: () => Promise<void>;
};

const RECENT_DOCUMENT_LIMIT = 6;

const workspaceNavigation: WorkspaceNavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: FolderOpen,
  },
  {
    label: "Recent Documents",
    href: "/recent",
    icon: Clock3,
  },
  {
    label: "Shared",
    href: "/shared",
    icon: Share2,
  },
  {
    label: "Favorites",
    href: "/favorites",
    icon: Star,
  },
];

const useSidebarDocumentStore = create<SidebarDocumentStore>((set, get) => ({
  documents: [],
  status: "idle",
  errorMessage: null,

  fetchRecentDocuments: async () => {
    if (get().status === "loading") {
      return;
    }

    try {
      set({
        status: "loading",
        errorMessage: null,
      });

      const response = await documentApi.getDocuments();

      set({
        documents: response.data.slice(0, RECENT_DOCUMENT_LIMIT),
        status: "ready",
      });
    } catch (error) {
      console.error("Failed to load sidebar documents", error);

      set({
        status: "error",
        errorMessage: "Documents unavailable",
      });
    }
  },
}));

const isNavigationActive = (pathname: string, href: string) => {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

const getActiveDocumentId = (pathname: string) => {
  const match = pathname.match(/^\/documents\/([^/]+)/);

  return match?.[1] ?? null;
};

function WorkspaceBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-neutral-950"
      onClick={onNavigate}
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-950 text-white shadow-sm">
        <FileText className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-950">
          Realtime Docs
        </p>
        <p className="truncate text-xs text-neutral-500">
          Collaborative workspace
        </p>
      </div>
    </Link>
  );
}

function WorkspaceNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1" aria-label="Workspace navigation">
      {workspaceNavigation.map((item) => {
        const Icon = item.icon;
        const isActive = isNavigationActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition"
                : "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            }
            onClick={onNavigate}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function RecentDocumentList({
  activeDocumentId,
  onNavigate,
}: {
  activeDocumentId: string | null;
  onNavigate?: () => void;
}) {
  const documents = useSidebarDocumentStore((state) => state.documents);
  const status = useSidebarDocumentStore((state) => state.status);
  const errorMessage = useSidebarDocumentStore((state) => state.errorMessage);

  if (status === "loading" || status === "idle") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-9 animate-pulse rounded-lg bg-neutral-100"
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <p>{errorMessage}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
        No documents yet.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {documents.map((document) => {
        const isActive = document.id === activeDocumentId;

        return (
          <Link
            key={document.id}
            href={`/documents/${document.id}`}
            className={
              isActive
                ? "group flex items-center gap-2 rounded-lg bg-neutral-100 px-2.5 py-2 text-sm font-medium text-neutral-950 ring-1 ring-neutral-200"
                : "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            }
            title={document.title}
            onClick={onNavigate}
          >
            <span
              className={
                isActive
                  ? "size-1.5 shrink-0 rounded-full bg-neutral-950"
                  : "size-1.5 shrink-0 rounded-full bg-neutral-300 transition group-hover:bg-neutral-500"
              }
              aria-hidden="true"
            />
            <span className="truncate">{document.title || "Untitled"}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  showBrand = true,
}: {
  pathname: string;
  onNavigate?: () => void;
  showBrand?: boolean;
}) {
  const activeDocumentId = useMemo(() => getActiveDocumentId(pathname), [
    pathname,
  ]);

  return (
    <div className="flex min-h-full min-w-0 flex-col">
      {showBrand ? <WorkspaceBrand onNavigate={onNavigate} /> : null}

      <div className={showBrand ? "mt-6" : ""}>
        <CreateDocumentModal
          triggerLabel="Create document"
          className="w-full justify-center rounded-lg"
        />
      </div>

      <div className="mt-6">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Workspace
        </p>
        <WorkspaceNavigation pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="mt-7 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Recent
          </p>
          <Link
            href="/"
            className="text-xs font-medium text-neutral-500 transition hover:text-neutral-950"
            onClick={onNavigate}
          >
            View all
          </Link>
        </div>
        <RecentDocumentList
          activeDocumentId={activeDocumentId}
          onNavigate={onNavigate}
        />
      </div>

      <div className="mt-5 border-t border-neutral-200 pt-4">
        <UserMenu className="w-full" />
      </div>
    </div>
  );
}

function CompactWorkspaceRail({ pathname }: { pathname: string }) {
  const activeDocumentId = useMemo(() => getActiveDocumentId(pathname), [
    pathname,
  ]);
  const documents = useSidebarDocumentStore((state) => state.documents);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center border-r border-neutral-200 bg-white/95 px-3 py-4 shadow-sm backdrop-blur md:flex xl:hidden">
      <Link
        href="/"
        className="flex size-11 items-center justify-center rounded-xl bg-neutral-950 text-white shadow-sm outline-none transition hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
        aria-label="Realtime Docs dashboard"
        title="Realtime Docs"
      >
        <FileText className="size-5" aria-hidden="true" />
      </Link>

      <div className="mt-5">
        <CreateDocumentModal
          triggerLabel="Create document"
          iconOnly
          className="size-11 rounded-xl p-0"
        />
      </div>

      <nav
        className="mt-6 flex w-full flex-col items-center gap-2"
        aria-label="Workspace navigation"
      >
        {workspaceNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = isNavigationActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "flex size-11 items-center justify-center rounded-xl bg-neutral-950 text-white shadow-sm"
                  : "flex size-11 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
              }
              aria-label={item.label}
              title={item.label}
            >
              <Icon className="size-4" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto">
        {documents.slice(0, RECENT_DOCUMENT_LIMIT).map((document) => {
          const isActive = document.id === activeDocumentId;

          return (
            <Link
              key={document.id}
              href={`/documents/${document.id}`}
              className={
                isActive
                  ? "flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950 ring-1 ring-neutral-200"
                  : "flex size-10 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
              }
              aria-label={document.title || "Untitled document"}
              title={document.title || "Untitled document"}
            >
              <span className="text-xs font-semibold">
                {(document.title || "Untitled").slice(0, 1).toUpperCase()}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4">
        <UserMenu compact />
      </div>
    </aside>
  );
}

export function WorkspaceSidebar({ className = "" }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const fetchRecentDocuments = useSidebarDocumentStore(
    (state) => state.fetchRecentDocuments,
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    void fetchRecentDocuments();
  }, [fetchRecentDocuments]);

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-neutral-200 bg-white/95 px-5 py-6 shadow-sm backdrop-blur xl:flex ${className}`}
      >
        <SidebarContent pathname={pathname} />
      </aside>

      <CompactWorkspaceRail pathname={pathname} />

      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            aria-label="Open workspace sidebar"
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <WorkspaceBrand />

          <UserMenu />
        </div>
      </header>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-label="Close workspace sidebar"
            onClick={closeMobileSidebar}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] flex-col overflow-y-auto border-r border-neutral-200 bg-white px-5 py-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <WorkspaceBrand onNavigate={closeMobileSidebar} />
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
                aria-label="Close workspace sidebar"
                onClick={closeMobileSidebar}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <SidebarContent
              pathname={pathname}
              showBrand={false}
              onNavigate={closeMobileSidebar}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default WorkspaceSidebar;
