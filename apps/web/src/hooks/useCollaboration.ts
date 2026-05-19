"use client";

import type { Editor, EditorEvents } from "@tiptap/react";
import { useEffect, useRef } from "react";

import { documentSocket } from "@/shared/socket/document-socket";
import { useDocumentStore } from "@/stores/document.store";

type RemoteDocumentUpdatePayload = {
  documentId: string;
  content: string;
  updatedBy: string;
};

type RemoteDocumentLoadPayload = {
  documentId: string;
  title: string;
  content: string;
};

type UseCollaborationArgs = {
  editor: Editor | null;
  documentId: string;
  username: string;
};

const getContentPreview = (content: string) => {
  return content.replace(/\s+/g, " ").slice(0, 80);
};

const restoreSelection = (editor: Editor, from: number, to: number) => {
  const maxPosition = editor.state.doc.content.size;

  editor.commands.setTextSelection({
    from: Math.min(from, maxPosition),
    to: Math.min(to, maxPosition),
  });
};

const setRemoteEditorContent = (editor: Editor, content: string) => {
  editor.commands.setContent(content, {
    emitUpdate: false,
  });
};

export const useCollaboration = ({
  editor,
  documentId,
  username,
}: UseCollaborationArgs) => {
  const isApplyingRemoteUpdateRef = useRef(false);
  const lastEmittedContentRef = useRef<string | null>(null);
  const updateContent = useDocumentStore((state) => state.updateContent);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    let cleanupListeners: (() => void) | null = null;
    let isEffectActive = true;

    const applyIncomingContent = ({
      content,
      source,
      updatedBy,
    }: {
      content: string;
      source: "document:load" | "document:updated";
      updatedBy?: string;
    }) => {
      if (editor.isDestroyed) {
        console.info(
          "Collaboration incoming content skipped because editor is destroyed",
          {
            documentId,
            source,
            updatedBy,
          },
        );

        return;
      }

      const currentContent = editor.getHTML();

      if (currentContent === content) {
        console.info(
          "Collaboration incoming content skipped because content is identical",
          {
            documentId,
            source,
            updatedBy,
            contentLength: content.length,
          },
        );

        return;
      }

      const previousSelection = editor.state.selection;
      const shouldRestoreSelection = editor.isFocused;

      isApplyingRemoteUpdateRef.current = true;

      try {
        console.info("Collaboration applying incoming editor content", {
          documentId,
          source,
          updatedBy,
          previousContentLength: currentContent.length,
          nextContentLength: content.length,
        });

        setRemoteEditorContent(editor, content);

        if (shouldRestoreSelection && !editor.isDestroyed) {
          restoreSelection(
            editor,
            previousSelection.from,
            previousSelection.to,
          );
        }

        updateContent(content);

        console.info("Collaboration editor content update applied", {
          documentId,
          source,
          updatedBy,
          contentLength: content.length,
        });
      } finally {
        isApplyingRemoteUpdateRef.current = false;
      }
    };

    const handleDocumentLoad = (payload: RemoteDocumentLoadPayload) => {
      console.info("Collaboration document load received", {
        documentId: payload.documentId,
        currentDocumentId: documentId,
        contentLength: payload.content.length,
        contentPreview: getContentPreview(payload.content),
      });

      if (payload.documentId !== documentId) {
        console.info(
          "Collaboration document load skipped for another document",
          {
            currentDocumentId: documentId,
            incomingDocumentId: payload.documentId,
          },
        );

        return;
      }

      applyIncomingContent({
        content: payload.content,
        source: "document:load",
      });
    };

    const handleRemoteUpdate = (payload: RemoteDocumentUpdatePayload) => {
      console.info("Collaboration remote update received", {
        documentId: payload.documentId,
        updatedBy: payload.updatedBy,
        currentUsername: username,
        socketId: documentSocket.id,
        contentLength: payload.content.length,
        contentPreview: getContentPreview(payload.content),
      });

      if (payload.documentId !== documentId) {
        console.info(
          "Collaboration remote update skipped for another document",
          {
            currentDocumentId: documentId,
            incomingDocumentId: payload.documentId,
          },
        );

        return;
      }

      applyIncomingContent({
        content: payload.content,
        source: "document:updated",
        updatedBy: payload.updatedBy,
      });
    };

    const handleLocalUpdate = ({
      editor: currentEditor,
    }: EditorEvents["update"]) => {
      if (isApplyingRemoteUpdateRef.current || currentEditor.isDestroyed) {
        console.info("Collaboration local update skipped during remote apply", {
          documentId,
          username,
          isDestroyed: currentEditor.isDestroyed,
        });

        return;
      }

      const content = currentEditor.getHTML();

      if (lastEmittedContentRef.current === content) {
        console.info(
          "Collaboration local update skipped because content was already emitted",
          {
            documentId,
            username,
            contentLength: content.length,
          },
        );

        return;
      }

      lastEmittedContentRef.current = content;

      console.info("Collaboration local update emitted", {
        documentId,
        username,
        socketId: documentSocket.id,
        socketConnected: documentSocket.connected,
        contentLength: content.length,
        contentPreview: getContentPreview(content),
      });

      documentSocket.emit("document:update", {
        documentId,
        content,
        username,
      });

      console.info("Collaboration document:update sent to backend", {
        documentId,
        username,
        socketId: documentSocket.id,
        socketConnected: documentSocket.connected,
      });
    };

    const registerListeners = () => {
      if (!isEffectActive || editor.isDestroyed || cleanupListeners) {
        return;
      }

      documentSocket.on("document:load", handleDocumentLoad);
      documentSocket.on("document:updated", handleRemoteUpdate);
      editor.on("update", handleLocalUpdate);

      console.info("Collaboration sync listeners registered", {
        documentId,
        username,
        socketId: documentSocket.id,
        socketConnected: documentSocket.connected,
        editorInitialized: editor.isInitialized,
      });

      cleanupListeners = () => {
        documentSocket.off("document:load", handleDocumentLoad);
        documentSocket.off("document:updated", handleRemoteUpdate);
        editor.off("update", handleLocalUpdate);

        console.info("Collaboration sync listeners cleaned up", {
          documentId,
          username,
          socketId: documentSocket.id,
        });
      };
    };

    const handleEditorCreate = () => {
      console.info("Collaboration editor initialized", {
        documentId,
        username,
      });

      registerListeners();
    };

    if (editor.isInitialized) {
      registerListeners();
    } else {
      console.info("Collaboration waiting for editor initialization", {
        documentId,
        username,
      });

      editor.on("create", handleEditorCreate);
    }

    return () => {
      isEffectActive = false;
      editor.off("create", handleEditorCreate);
      cleanupListeners?.();
    };
  }, [documentId, editor, updateContent, username]);
};
