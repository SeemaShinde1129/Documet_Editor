"use client";

import type { Document } from "@repo/types/document";
import {
  AlertCircle,
  Clock3,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  RefreshCcw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CreateDocumentModal from "@/components/CreateDocumentModal";
import { documentApi } from "@/features/documents/api/document.api";
import { useAuth } from "@/providers/AuthProvider";
import { exportAsMarkdown } from "@/utils/document-export";

type DashboardStatus = "loading" | "ready" | "error";

type DocumentAction = "rename" | "delete" | "download" | "duplicate";

const documentActions: Array<{
  label: string;
  value: DocumentAction;
  icon: typeof Pencil;
  ownerOnly?: boolean;
}> = [
  { label: "Rename", value: "rename", icon: Pencil, ownerOnly: true },
  { label: "Delete", value: "delete", icon: Trash2, ownerOnly: true },
  { label: "Download", value: "download", icon: Download },
  { label: "Duplicate", value: "duplicate", icon: Copy },
];

const formatDocumentTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getRelativeActivity = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `${diffDays}d ago`;
};

function WorkspaceHeader({
  documentCount,
  searchQuery,
  status,
  onRefresh,
  onSearchChange,
}: {
  documentCount: number;
  searchQuery: string;
  status: DashboardStatus;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header className="sticky top-[65px] z-20 border-b border-neutral-200 bg-neutral-50/95 backdrop-blur md:top-0">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">
              Personal workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Documents
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-60 sm:size-10"
              aria-label="Refresh documents"
              disabled={status === "loading"}
              onClick={onRefresh}
            >
              <RefreshCcw
                className={
                  status === "loading" ? "size-4 animate-spin" : "size-4"
                }
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block flex-1">
            <span className="sr-only">Search documents</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              className="h-11 w-full rounded-md border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-base text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-950/10 sm:text-sm"
              placeholder="Search documents..."
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-md bg-neutral-50 px-3 py-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              {documentCount} documents
            </span>
            <span className="hidden min-h-10 rounded-md bg-neutral-50 px-3 py-2 sm:inline-flex sm:items-center">
              Live autosave enabled
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function DocumentActionMenu({
  document,
  isOwner,
  isOpen,
  onToggle,
  onAction,
}: {
  document: Document;
  isOwner: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onAction: (action: DocumentAction, document: Document) => void;
}) {
  const visibleActions = documentActions.filter(
    (action) => !action.ownerOnly || isOwner,
  );

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-md text-neutral-500 opacity-100 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 sm:size-8 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={`Open actions for ${document.title}`}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-9 z-30 w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {visibleActions.map((action) => {
            const Icon = action.icon;
            const isDelete = action.value === "delete";

            return (
              <button
                key={action.value}
                type="button"
                className={
                  isDelete
                    ? "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    : "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                }
                onClick={() => onAction(action.value, document)}
              >
                <Icon className="size-4" aria-hidden="true" />
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DocumentCard({
  document,
  isOwner,
  isMenuOpen,
  onOpen,
  onMenuToggle,
  onAction,
}: {
  document: Document;
  isOwner: boolean;
  isMenuOpen: boolean;
  onOpen: (documentId: string) => void;
  onMenuToggle: (documentId: string) => void;
  onAction: (action: DocumentAction, document: Document) => void;
}) {
  return (
    <article className="group rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md sm:hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
          onClick={() => onOpen(document.id)}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 transition-colors group-hover:bg-neutral-950 group-hover:text-white">
            <FileText className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-neutral-950">
              {document.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Updated {getRelativeActivity(document.updatedAt)}
            </p>
          </div>
        </button>

        <DocumentActionMenu
          document={document}
          isOwner={isOwner}
          isOpen={isMenuOpen}
          onToggle={() => onMenuToggle(document.id)}
          onAction={onAction}
        />
      </div>

      <button
        type="button"
        className="mt-5 block w-full rounded-md border border-neutral-100 bg-neutral-50 px-3 py-3 text-left transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
        onClick={() => onOpen(document.id)}
      >
        <p className="line-clamp-2 text-sm leading-6 text-neutral-600">
          Open the collaborative editor to write, sync, and autosave with your
          workspace.
        </p>
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-50 px-2 py-1">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {formatDocumentTime(document.updatedAt)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-50 px-2 py-1">
          <FileText className="size-3.5" aria-hidden="true" />
          {formatDocumentTime(document.createdAt)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
        <div className="flex -space-x-2">
          {["G", "S", "A"].map((label) => (
            <span
              key={label}
              className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-xs font-medium text-neutral-700"
            >
              {label}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
          <Users className="size-3.5" aria-hidden="true" />3 collaborators
        </span>
      </div>

      <div className="mt-3">
        <span
          className={
            isOwner
              ? "inline-flex rounded-md bg-neutral-950 px-2 py-1 text-xs font-medium text-white"
              : "inline-flex rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600"
          }
        >
          {isOwner ? "Owner" : "Shared access"}
        </span>
      </div>
    </article>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse rounded-lg border border-neutral-200 bg-white p-4 shadow-sm sm:h-64 sm:p-5"
        >
          <div className="flex gap-3">
            <div className="size-11 rounded-md bg-neutral-200" />
            <div className="flex-1">
              <div className="h-5 w-2/3 rounded bg-neutral-200" />
              <div className="mt-2 h-4 w-1/3 rounded bg-neutral-100" />
            </div>
          </div>
          <div className="mt-8 h-16 rounded-md bg-neutral-100" />
          <div className="mt-5 h-4 w-3/4 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return documents;
    }

    return documents.filter((document) =>
      document.title.toLowerCase().includes(normalizedQuery),
    );
  }, [documents, searchQuery]);

  useEffect(() => {
    let isMounted = true;

    const fetchDocuments = async () => {
      try {
        const response = await documentApi.getDocuments();

        if (!isMounted) {
          return;
        }

        setDocuments(response.data);
        setStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to fetch documents", error);
        setErrorMessage(
          "Could not load documents. Check that the API server and database are running.",
        );
        setStatus("error");
      }
    };

    void fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!openActionMenuId) {
      return;
    }

    const closeMenu = () => {
      setOpenActionMenuId(null);
    };

    window.addEventListener("click", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, [openActionMenuId]);

  const refreshDocuments = async () => {
    try {
      setStatus("loading");
      setErrorMessage(null);
      setOpenActionMenuId(null);

      const response = await documentApi.getDocuments();

      setDocuments(response.data);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to refresh documents", error);
      setErrorMessage(
        "Could not load documents. Check that the API server and database are running.",
      );
      setStatus("error");
    }
  };

  const handleDocumentAction = async (
    action: DocumentAction,
    document: Document,
  ) => {
    setOpenActionMenuId(null);
    const isOwner = user?.id === document.ownerId;

    if ((action === "rename" || action === "delete") && !isOwner) {
      setErrorMessage("Only the document owner can perform this action.");
      return;
    }

    if (action === "rename") {
      router.push(`/documents/${document.id}`);
      return;
    }

    if (action === "delete") {
      const shouldDelete = window.confirm(
        `Delete "${document.title || "Untitled document"}"?`,
      );

      if (!shouldDelete) {
        return;
      }

      try {
        await documentApi.deleteDocument(document.id);
        setDocuments((currentDocuments) =>
          currentDocuments.filter(
            (currentDocument) => currentDocument.id !== document.id,
          ),
        );
      } catch (error) {
        console.error("Failed to delete document", error);
        setErrorMessage("Could not delete document. Check your permissions.");
      }

      return;
    }

    if (action === "download") {
      exportAsMarkdown({
        title: document.title,
        content: document.content,
      });
      return;
    }

    console.info("Document quick action selected", {
      action,
      documentId: document.id,
    });
  };

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-950">
      <WorkspaceHeader
        documentCount={documents.length}
        searchQuery={searchQuery}
        status={status}
        onRefresh={refreshDocuments}
        onSearchChange={setSearchQuery}
      />

      <section className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {errorMessage ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              All documents
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Browse recent files, open live workspaces, and track team
              activity.
            </p>
          </div>

          <p className="text-sm text-neutral-500">
            {filteredDocuments.length} shown
          </p>
        </div>

        {status === "loading" ? <LoadingGrid /> : null}

        {status === "error" ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-neutral-100 text-neutral-700">
              <AlertCircle className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              Documents could not be loaded
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Start the API server and database, then try again.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
              onClick={refreshDocuments}
            >
              <RefreshCcw className="size-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : null}

        {status === "ready" && documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-neutral-950 text-white">
              <FileText className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No documents yet</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Create your first collaborative document to begin writing.
            </p>
            <CreateDocumentModal className="mt-6" />
          </div>
        ) : null}

        {status === "ready" &&
        documents.length > 0 &&
        filteredDocuments.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-neutral-100 text-neutral-700">
              <Search className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No matches found</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Try a different search term or create a new document.
            </p>
          </div>
        ) : null}

        {status === "ready" && filteredDocuments.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                isOwner={user?.id === document.ownerId}
                isMenuOpen={openActionMenuId === document.id}
                onOpen={(documentId) =>
                  router.push(`/documents/${documentId}`)
                }
                onMenuToggle={(documentId) =>
                  setOpenActionMenuId((currentDocumentId) =>
                    currentDocumentId === documentId ? null : documentId,
                  )
                }
                onAction={(action, selectedDocument) => {
                  void handleDocumentAction(action, selectedDocument);
                }}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
