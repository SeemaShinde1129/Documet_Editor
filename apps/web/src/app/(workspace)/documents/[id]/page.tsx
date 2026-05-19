"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import ConnectionStatus from "@/components/ConnectionStatus";
import InlineDocumentTitle from "@/components/InlineDocumentTitle";
import PresenceAvatars from "@/components/PresenceAvatars";
import ShareDocumentButton from "@/components/ShareDocumentButton";
import ShareDocumentModal from "@/components/ShareDocumentModal";
import Editor from "@/editor/Editor";
import { documentApi } from "@/features/documents/api/document.api";
import { setSocketAuthToken } from "@/lib/socket";
import { useAuth } from "@/providers/AuthProvider";
import { ApiClientError } from "@/shared/api/client";
import { documentSocket } from "@/shared/socket/document-socket";
import { useDocumentStore } from "@/stores/document.store";

type PageStatus = "loading" | "ready" | "error";

const formatSavedAt = (savedAt: string | null) => {
  if (!savedAt) {
    return null;
  }

  const date = new Date(savedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export default function DocumentWorkspacePage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id;
  const { session, user, userDisplayName } = useAuth();
  const username = userDisplayName ?? user?.email ?? user?.id ?? null;
  const accessToken = session?.access_token ?? null;

  const ownerId = useDocumentStore((state) => state.ownerId);
  const activeUsers = useDocumentStore((state) => state.activeUsers);
  const isSaving = useDocumentStore((state) => state.isSaving);
  const lastSavedAt = useDocumentStore((state) => state.lastSavedAt);
  const setDocument = useDocumentStore((state) => state.setDocument);
  const setActiveUsers = useDocumentStore((state) => state.setActiveUsers);
  const setSavingStatus = useDocumentStore((state) => state.setSavingStatus);
  const setLastSavedAt = useDocumentStore((state) => state.setLastSavedAt);
  const resetDocument = useDocumentStore((state) => state.resetDocument);

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formattedLastSavedAt = formatSavedAt(lastSavedAt);
  const isOwner = Boolean(user?.id && ownerId === user.id);
  const handleContentChange = useCallback(() => {
    setSavingStatus(true);
  }, [setSavingStatus]);

  useEffect(() => {
    const handleRoomUsers = (payload: {
      documentId: string;
      users: string[];
    }) => {
      if (payload.documentId !== documentId) {
        return;
      }

      setActiveUsers(payload.users);
    };

    const handleDocumentError = (payload: {
      documentId: string;
      message: string;
    }) => {
      if (payload.documentId !== documentId) {
        return;
      }

      setErrorMessage(payload.message);
      setPageStatus("error");
    };

    const handleDocumentSaved = (payload: {
      documentId: string;
      savedAt: string;
    }) => {
      if (payload.documentId !== documentId) {
        return;
      }

      setSavingStatus(false);
      setLastSavedAt(payload.savedAt);
    };

    documentSocket.on("room:users", handleRoomUsers);
    documentSocket.on("document:error", handleDocumentError);
    documentSocket.on("document:saved", handleDocumentSaved);

    return () => {
      documentSocket.off("room:users", handleRoomUsers);
      documentSocket.off("document:error", handleDocumentError);
      documentSocket.off("document:saved", handleDocumentSaved);
    };
  }, [documentId, setActiveUsers, setLastSavedAt, setSavingStatus]);

  useEffect(() => {
    let isMounted = true;
    let hasJoinedDocument = false;

    const joinDocumentRoom = () => {
      if (!isMounted || !username) {
        return;
      }

      documentSocket.emit("document:join", {
        documentId,
        username,
      });

      hasJoinedDocument = true;

      console.info("Document presence join emitted", {
        documentId,
        username,
        socketId: documentSocket.id,
        socketConnected: documentSocket.connected,
      });
    };

    const handleSocketConnect = () => {
      if (!hasJoinedDocument) {
        joinDocumentRoom();
      }
    };

    const handleSocketConnectError = (error: Error) => {
      console.error("Document socket authentication failed", error);

      if (!isMounted) {
        return;
      }

      setErrorMessage("Could not connect to realtime collaboration.");
      setPageStatus("error");
    };

    const handleSocketReconnect = (attempt: number) => {
      console.info("Document socket reconnected; refreshing room presence", {
        documentId,
        username,
        socketId: documentSocket.id,
        attempt,
      });

      joinDocumentRoom();
    };

    const loadDocument = async () => {
      if (!username || !accessToken) {
        return;
      }

      try {
        setPageStatus("loading");
        setErrorMessage(null);
        setSocketAuthToken(accessToken);

        const response = await documentApi.getDocumentById(documentId);

        if (!isMounted) {
          return;
        }

        setDocument({
          documentId: response.data.id,
          ownerId: response.data.ownerId,
          title: response.data.title,
          content: response.data.content,
        });

        if (!documentSocket.connected) {
          documentSocket.once("connect", handleSocketConnect);
          documentSocket.once("connect_error", handleSocketConnectError);
          documentSocket.connect();
        } else {
          joinDocumentRoom();
        }

        documentSocket.io.on("reconnect", handleSocketReconnect);
        setPageStatus("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to load document workspace", error);
        setErrorMessage(
          error instanceof ApiClientError &&
            [401, 403, 404].includes(error.status)
            ? "You do not have access to this document, or it no longer exists."
            : "Unable to load this document.",
        );
        setPageStatus("error");
      }
    };

    void loadDocument();

    return () => {
      isMounted = false;
      documentSocket.off("connect", handleSocketConnect);
      documentSocket.off("connect_error", handleSocketConnectError);
      documentSocket.io.off("reconnect", handleSocketReconnect);

      if (hasJoinedDocument && username) {
        documentSocket.emit("document:leave", {
          documentId,
          username,
        });
      }

      documentSocket.disconnect();
      resetDocument();
    };
  }, [accessToken, documentId, resetDocument, setDocument, username]);

  if (pageStatus === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 text-neutral-700">
        <p className="text-sm font-medium">Loading document...</p>
      </main>
    );
  }

  if (!username) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 text-neutral-700">
        <p className="text-sm font-medium">Preparing workspace...</p>
      </main>
    );
  }

  if (pageStatus === "error") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-950">
            Document unavailable
          </h1>
          <p className="mt-2 text-sm text-neutral-600">{errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-950 [--document-header:8.75rem] [--workspace-header:4.125rem] sm:[--document-header:5.5rem] md:[--workspace-header:0rem]">
      <header className="sticky top-[65px] z-20 border-b border-neutral-200 bg-white/95 backdrop-blur md:top-0">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Document
            </p>
            <InlineDocumentTitle documentId={documentId} canEdit={isOwner} />
          </div>

          <div className="-mx-1 flex max-w-full items-center gap-2 overflow-x-auto px-1 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <ConnectionStatus />

            <div className="shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
              <PresenceAvatars users={activeUsers} maxVisible={3} />
            </div>

            <ShareDocumentButton />
            <ShareDocumentModal documentId={documentId} isOwner={isOwner} />

            <span className="inline-flex shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-neutral-700">
              {isSaving ? (
                <Loader2
                  className="size-3.5 animate-spin text-neutral-500"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2
                  className="size-3.5 text-emerald-600"
                  aria-hidden="true"
                />
              )}
              <span>{isSaving ? "Saving..." : "Saved"}</span>
              {!isSaving && formattedLastSavedAt ? (
                <span className="hidden text-neutral-500 sm:inline">
                  {formattedLastSavedAt}
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </header>

      <Editor
        documentId={documentId}
        username={username}
        onContentChange={handleContentChange}
      />
    </main>
  );
}
