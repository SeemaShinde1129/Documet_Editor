"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCollaboration } from "@/hooks/useCollaboration";
import {
  type DocumentStore,
  useDocumentStore,
} from "@/stores/document.store";

const editorExtensions = [
  StarterKit.configure({
    undoRedo: false,
  }),
  Placeholder.configure({
    placeholder: "Start writing your ideas...",
  }),
];

const toolbarButtonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-transparent text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:pointer-events-none disabled:opacity-40 sm:size-9";

type EditorProps = {
  documentId: string;
  username: string;
  onContentChange?: () => void;
};

function syncEditorContent(editor: NonNullable<ReturnType<typeof useEditor>>) {
  const { content } = useDocumentStore.getState();

  if (editor.getHTML() === content) {
    return;
  }

  editor.commands.setContent(content, {
    emitUpdate: false,
  });
}

export function Editor({ documentId, username, onContentChange }: EditorProps) {
  const [initialContent] = useState(() => useDocumentStore.getState().content);
  const lastLoadedDocumentIdRef = useRef<string | null>(
    useDocumentStore.getState().currentDocumentId,
  );
  const updateContent = useDocumentStore((state) => state.updateContent);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initialContent,
    autofocus: "end",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[58dvh] w-full break-words outline-none text-[1.0625rem] leading-8 text-neutral-950 sm:min-h-[64vh] sm:text-lg sm:leading-9 [&_h1]:mb-5 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-tight sm:[&_h1]:mb-6 sm:[&_h1]:mt-10 sm:[&_h1]:text-4xl [&_h2]:mb-4 [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight sm:[&_h2]:mt-8 sm:[&_h2]:text-2xl [&_p]:my-4 [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 sm:[&_ul]:pl-7 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 sm:[&_ol]:pl-7 [&_li]:my-1 [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-neutral-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      updateContent(currentEditor.getHTML());
      onContentChange?.();
    },
  });

  useCollaboration({
    editor,
    documentId,
    username,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const unsubscribe = useDocumentStore.subscribe(
      (state: DocumentStore, previousState: DocumentStore) => {
        if (state.currentDocumentId === previousState.currentDocumentId) {
          return;
        }

        lastLoadedDocumentIdRef.current = state.currentDocumentId;
        syncEditorContent(editor);
      },
    );

    if (
      useDocumentStore.getState().currentDocumentId !==
      lastLoadedDocumentIdRef.current
    ) {
      lastLoadedDocumentIdRef.current =
        useDocumentStore.getState().currentDocumentId;
      syncEditorContent(editor);
    }

    return unsubscribe;
  }, [editor]);

  const focusEditor = () => {
    editor?.chain().focus().run();
  };

  return (
    <section className="bg-neutral-50 text-neutral-950">
      <div className="mx-auto flex min-h-[calc(100dvh-var(--workspace-header,0rem)-var(--document-header,0rem))] w-full max-w-5xl flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="sticky top-[calc(var(--workspace-header,0rem)+var(--document-header,0rem))] z-10 -mx-3 flex items-center gap-1 overflow-x-auto border-b border-neutral-200 bg-neutral-50/95 px-3 py-2 backdrop-blur [scrollbar-width:none] sm:mx-0 sm:px-0 sm:py-3 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Paragraph"
            title="Paragraph"
            disabled={!editor}
            onClick={() => editor?.chain().focus().setParagraph().run()}
          >
            <Pilcrow className="size-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Heading 1"
            title="Heading 1"
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="size-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Heading 2"
            title="Heading 2"
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-4" aria-hidden="true" />
          </button>

          <div className="mx-1 h-6 w-px bg-neutral-200" />

          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Bold"
            title="Bold"
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Italic"
            title="Italic"
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" aria-hidden="true" />
          </button>

          <div className="mx-1 h-6 w-px bg-neutral-200" />

          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Bullet list"
            title="Bullet list"
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Ordered list"
            title="Ordered list"
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" aria-hidden="true" />
          </button>
        </div>

        <main
          className="flex flex-1 cursor-text flex-col px-1 py-7 sm:px-4 sm:py-10 lg:px-8"
          onClick={focusEditor}
        >
          <EditorContent editor={editor} />
        </main>
      </div>
    </section>
  );
}

export default Editor;
