"use client";

import type { DocumentCollaborator } from "@repo/types/document";
import {
  AlertCircle,
  Loader2,
  MailPlus,
  Share2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { documentApi } from "@/features/documents/api/document.api";
import { ApiClientError } from "@/shared/api/client";

type ShareDocumentModalProps = {
  documentId: string;
  isOwner: boolean;
  className?: string;
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

const getCollaboratorLabel = (collaborator: DocumentCollaborator) => {
  return collaborator.user.email ?? collaborator.user.username;
};

const getInitials = (value: string) => {
  const normalizedValue = value.includes("@") ? value.split("@")[0] : value;
  const words = normalizedValue.split(/[\s._-]+/).filter(Boolean);

  if (words.length === 0) {
    return "U";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

export function ShareDocumentModal({
  documentId,
  isOwner,
  className = "",
}: ShareDocumentModalProps) {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [email, setEmail] = useState("");
  const [collaborators, setCollaborators] = useState<DocumentCollaborator[]>(
    [],
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const isSubmitDisabled =
    !isOwner || trimmedEmail.length === 0 || isSubmitting;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    emailInputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const fetchCollaborators = async () => {
      try {
        setStatus("loading");
        setErrorMessage(null);

        const response = await documentApi.getDocumentCollaborators(documentId);

        if (!isMounted) {
          return;
        }

        setCollaborators(response.data);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to load document collaborators", error);

        if (!isMounted) {
          return;
        }

        setErrorMessage("Could not load collaborators.");
        setStatus("error");
      }
    };

    void fetchCollaborators();

    return () => {
      isMounted = false;
    };
  }, [documentId, isOpen]);

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    setEmail("");
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOwner) {
      setErrorMessage("Only the document owner can share this document.");
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage("Enter a collaborator email.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const response = await documentApi.shareDocument(documentId, {
        email: trimmedEmail,
        role: "editor",
      });

      setCollaborators((currentCollaborators) => {
        const withoutDuplicate = currentCollaborators.filter(
          (collaborator) => collaborator.userId !== response.data.userId,
        );

        return [...withoutDuplicate, response.data];
      });
      setEmail("");
      setStatus("ready");
    } catch (error) {
      console.error("Failed to share document", error);
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Could not share with that user. They may need to sign in first.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!isOwner) {
      setErrorMessage("Only the document owner can manage collaborators.");
      return;
    }

    try {
      setRemovingUserId(userId);
      setErrorMessage(null);

      await documentApi.removeDocumentCollaborator(documentId, userId);

      setCollaborators((currentCollaborators) =>
        currentCollaborators.filter(
          (collaborator) => collaborator.userId !== userId,
        ),
      );
    } catch (error) {
      console.error("Failed to remove collaborator", error);
      setErrorMessage("Could not remove collaborator.");
    } finally {
      setRemovingUserId(null);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <section
        aria-labelledby="share-document-title"
        aria-modal="true"
        className="my-auto w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-white">
              <Users className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="share-document-title"
                className="text-lg font-semibold text-neutral-950"
              >
                Share document
              </h2>
              <p className="text-sm text-neutral-500">
                Manage collaborators with edit access.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Close share modal"
            disabled={isSubmitting}
            onClick={closeModal}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {isOwner ? (
          <form
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            onSubmit={handleSubmit}
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Collaborator email</span>
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-950/10"
                placeholder="teammate@example.com"
                disabled={isSubmitting}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage(null);
                }}
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <MailPlus className="size-4" aria-hidden="true" />
              )}
              Invite
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            Only the document owner can manage sharing.
          </div>
        )}

        {errorMessage ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-950">
              Collaborators
            </p>
            <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
              {collaborators.length}
            </span>
          </div>

          {status === "loading" ? (
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading collaborators...
            </div>
          ) : null}

          {status !== "loading" && collaborators.length === 0 ? (
            <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">
              No shared collaborators yet.
            </div>
          ) : null}

          {collaborators.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {collaborators.map((collaborator) => {
                const label = getCollaboratorLabel(collaborator);

                return (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700">
                        {getInitials(label)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-950">
                          {label}
                        </p>
                        <p className="text-xs capitalize text-neutral-500">
                          {collaborator.role}
                        </p>
                      </div>
                    </div>

                    {isOwner ? (
                      <button
                        type="button"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50"
                        aria-label={`Remove ${label}`}
                        disabled={removingUserId === collaborator.userId}
                        onClick={() => {
                          void handleRemoveCollaborator(collaborator.userId);
                        }}
                      >
                        {removingUserId === collaborator.userId ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <Share2 className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Manage access</span>
      </button>

      {isOpen ? createPortal(modalContent, document.body) : null}
    </>
  );
}

export default ShareDocumentModal;
