"use client";

import { AlertCircle, CheckCircle2, Loader2, Pencil } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { documentApi } from "@/features/documents/api/document.api";
import { useDocumentStore } from "@/stores/document.store";

type InlineDocumentTitleProps = {
  documentId: string;
  canEdit: boolean;
  className?: string;
};

type TitleSaveStatus = "idle" | "saving" | "saved" | "error";

const TITLE_SAVE_DEBOUNCE_MS = 1000;
const MAX_TITLE_LENGTH = 100;

export function InlineDocumentTitle({
  documentId,
  canEdit,
  className = "",
}: InlineDocumentTitleProps) {
  const title = useDocumentStore((state) => state.title);
  const setTitle = useDocumentStore((state) => state.setTitle);

  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<TitleSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editVersionRef = useRef(0);
  const lastSavedTitleRef = useRef(title.trim());

  const displayTitle = title.trim() || "Untitled document";
  const titleLength = title.length;

  const clearPendingSave = () => {
    if (!debounceTimerRef.current) {
      return;
    }

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  };

  const saveTitle = async (nextTitle: string, editVersion: number) => {
    try {
      const response = await documentApi.updateDocumentTitle(documentId, {
        title: nextTitle,
      });

      if (editVersion !== editVersionRef.current) {
        return;
      }

      lastSavedTitleRef.current = response.data.title.trim();
      setTitle(response.data.title);
      setSaveStatus("saved");
      setErrorMessage(null);
    } catch (error) {
      if (editVersion !== editVersionRef.current) {
        return;
      }

      console.error("Failed to update document title", error);
      setSaveStatus("error");
      setErrorMessage("Unable to save title.");
    }
  };

  const scheduleTitleSave = (nextTitle: string) => {
    clearPendingSave();

    const normalizedTitle = nextTitle.trim();
    const editVersion = editVersionRef.current;

    if (!normalizedTitle) {
      setSaveStatus("error");
      setErrorMessage("Title is required.");
      return;
    }

    if (normalizedTitle === lastSavedTitleRef.current) {
      setSaveStatus("saved");
      setErrorMessage(null);
      return;
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void saveTitle(normalizedTitle, editVersion);
    }, TITLE_SAVE_DEBOUNCE_MS);
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.target.value.slice(0, MAX_TITLE_LENGTH);

    editVersionRef.current += 1;
    setTitle(nextTitle);
    scheduleTitleSave(nextTitle);
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setIsEditing(false);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearPendingSave();
      editVersionRef.current += 1;
      setTitle(lastSavedTitleRef.current);
      setSaveStatus("idle");
      setErrorMessage(null);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      editVersionRef.current += 1;
    };
  }, []);

  return (
    <div className={`min-w-0 ${className}`}>
      {isEditing ? (
        <div className="max-w-xl">
          <input
            ref={inputRef}
            value={title}
            onBlur={() => setIsEditing(false)}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            maxLength={MAX_TITLE_LENGTH}
            aria-label="Document title"
            className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xl font-semibold text-neutral-950 shadow-sm outline-none transition focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10 sm:text-2xl"
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-xs">
            <TitleSaveStatusMessage
              status={saveStatus}
              errorMessage={errorMessage}
            />
            <span className="shrink-0 text-neutral-400">
              {titleLength}/{MAX_TITLE_LENGTH}
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (canEdit) {
              setIsEditing(true);
            }
          }}
          className={
            canEdit
              ? "group/title flex max-w-xl items-center gap-2 rounded-md text-left outline-none transition focus-visible:ring-4 focus-visible:ring-neutral-950/10"
              : "flex max-w-xl cursor-default items-center gap-2 rounded-md text-left"
          }
          aria-label={canEdit ? "Edit document title" : "Document title"}
          disabled={!canEdit}
        >
          <span className="truncate text-xl font-semibold text-neutral-950 sm:text-2xl">
            {displayTitle}
          </span>
          {canEdit ? (
            <Pencil
              className="size-4 shrink-0 text-neutral-400 opacity-0 transition group-hover/title:opacity-100 group-focus-visible/title:opacity-100"
              aria-hidden="true"
            />
          ) : null}
        </button>
      )}

      {!canEdit ? (
        <p className="mt-1 text-xs font-medium text-neutral-500">
          Shared editing access
        </p>
      ) : null}

      {canEdit && !isEditing && saveStatus !== "idle" ? (
        <TitleSaveStatusMessage
          status={saveStatus}
          errorMessage={errorMessage}
          className="mt-1"
        />
      ) : null}
    </div>
  );
}

type TitleSaveStatusMessageProps = {
  status: TitleSaveStatus;
  errorMessage: string | null;
  className?: string;
};

function TitleSaveStatusMessage({
  status,
  errorMessage,
  className = "",
}: TitleSaveStatusMessageProps) {
  if (status === "idle") {
    return <span className={className} />;
  }

  if (status === "saving") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-neutral-500 ${className}`}
      >
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        Saving title...
      </span>
    );
  }

  if (status === "error") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-red-600 ${className}`}
      >
        <AlertCircle className="size-3" aria-hidden="true" />
        {errorMessage ?? "Title could not be saved."}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-emerald-600 ${className}`}
    >
      <CheckCircle2 className="size-3" aria-hidden="true" />
      Title saved
    </span>
  );
}

export default InlineDocumentTitle;
