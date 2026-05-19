import { create } from "zustand";

type LastSavedAt = string | null;

export interface DocumentStoreState {
  currentDocumentId: string | null;
  ownerId: string | null;
  title: string;
  content: string;
  activeUsers: string[];
  isConnected: boolean;
  isSaving: boolean;
  lastSavedAt: LastSavedAt;
}

export interface SetDocumentPayload {
  documentId: string;
  ownerId: string;
  title: string;
  content: string;
}

export interface DocumentStoreActions {
  setDocument: (document: SetDocumentPayload) => void;
  setTitle: (title: string) => void;
  updateContent: (content: string) => void;
  setActiveUsers: (users: string[]) => void;
  setConnectionStatus: (isConnected: boolean) => void;
  setSavingStatus: (isSaving: boolean) => void;
  setLastSavedAt: (lastSavedAt: LastSavedAt) => void;
  resetDocument: () => void;
}

export type DocumentStore = DocumentStoreState & DocumentStoreActions;

const initialDocumentState: DocumentStoreState = {
  currentDocumentId: null,
  ownerId: null,
  title: "",
  content: "",
  activeUsers: [],
  isConnected: false,
  isSaving: false,
  lastSavedAt: null,
};

export const useDocumentStore = create<DocumentStore>((set) => ({
  ...initialDocumentState,

  setDocument: ({ documentId, ownerId, title, content }) =>
    set(() => ({
      currentDocumentId: documentId,
      ownerId,
      title,
      content,
      activeUsers: [],
      isSaving: false,
      lastSavedAt: null,
    })),

  setTitle: (title) =>
    set(() => ({
      title,
    })),

  updateContent: (content) =>
    set(() => ({
      content,
    })),

  setActiveUsers: (users) =>
    set(() => ({
      activeUsers: [...users],
    })),

  setConnectionStatus: (isConnected) =>
    set(() => ({
      isConnected,
    })),

  setSavingStatus: (isSaving) =>
    set(() => ({
      isSaving,
    })),

  setLastSavedAt: (lastSavedAt) =>
    set(() => ({
      lastSavedAt,
      isSaving: false,
    })),

  resetDocument: () =>
    set(() => ({
      ...initialDocumentState,
    })),
}));
