"use client";

import { AlertCircle, FileText, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { documentApi } from "@/features/documents/api/document.api";
import { useAuth } from "@/providers/AuthProvider";

const MAX_TITLE_LENGTH = 100;

type CreateDocumentModalProps = {
  triggerLabel?: string;
  iconOnly?: boolean;
  className?: string;
};

export function CreateDocumentModal({
  triggerLabel = "Create Document",
  iconOnly = false,
  className = "",
}: CreateDocumentModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const isSubmitDisabled = trimmedTitle.length === 0 || isSubmitting;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleInputRef.current?.focus();

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

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    setErrorMessage(null);
    setTitle("");
  };

  const openModal = () => {
    setIsOpen(true);
    setErrorMessage(null);
  };

  const createDocument = async () => {
    if (!trimmedTitle) {
      setErrorMessage("Document title is required.");
      return;
    }

    if (!user?.id) {
      setErrorMessage("You must be signed in to create a document.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const response = await documentApi.createDocument({
        title: trimmedTitle,
        ownerId: user.id,
      });

      router.push(`/documents/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
      setErrorMessage("Could not create the document. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void createDocument();
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
        aria-labelledby="create-document-title"
        aria-modal="true"
        className="my-auto w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-white">
              <FileText className="size-5" aria-hidden="true" />
            </div>

            <div>
              <h2
                id="create-document-title"
                className="text-lg font-semibold text-neutral-950"
              >
                Create document
              </h2>
              <p className="text-sm text-neutral-500">
                Start a new collaborative workspace.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Close create document modal"
            disabled={isSubmitting}
            onClick={closeModal}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="text-sm font-medium text-neutral-800"
              htmlFor="document-title"
            >
              Document title
            </label>
            <input
              ref={titleInputRef}
              id="document-title"
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-950/10"
              placeholder="Project notes"
              disabled={isSubmitting}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrorMessage(null);
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-neutral-500">
              <span>Required</span>
              <span>
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>
          </div>

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>{errorMessage}</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50"
              disabled={isSubmitting}
              onClick={closeModal}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              Create
            </button>
          </div>
        </form>
      </section>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        className={`inline-flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 ${className}`}
        onClick={openModal}
      >
        <Plus className="size-4" aria-hidden="true" />
        {iconOnly ? <span className="sr-only">{triggerLabel}</span> : triggerLabel}
      </button>

      {isOpen ? createPortal(modalContent, document.body) : null}
    </>
  );
}

export default CreateDocumentModal;
