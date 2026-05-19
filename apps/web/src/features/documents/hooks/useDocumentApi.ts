"use client";

import type { Document, DocumentCollaborator } from "@repo/types/document";
import { useCallback } from "react";
import type {
  ApiResponse,
  CreateDocumentRequest,
  InitializeDocumentRequest,
  ShareDocumentRequest,
  UpdateDocumentTitleRequest,
} from "../api/document.api";
import { documentApi } from "../api/document.api";

export const useDocumentApi = () => {
  const createDocument = useCallback(
    (body: CreateDocumentRequest): Promise<ApiResponse<Document>> => {
      return documentApi.createDocument(body);
    },
    [],
  );

  const initializeDocument = useCallback(
    (body: InitializeDocumentRequest): Promise<ApiResponse<Document>> => {
      return documentApi.initializeDocument(body);
    },
    [],
  );

  const getDocumentById = useCallback(
    (documentId: string): Promise<ApiResponse<Document>> => {
      return documentApi.getDocumentById(documentId);
    },
    [],
  );

  const getDocuments = useCallback((): Promise<ApiResponse<Document[]>> => {
    return documentApi.getDocuments();
  }, []);

  const updateDocumentTitle = useCallback(
    (
      documentId: string,
      body: UpdateDocumentTitleRequest,
    ): Promise<ApiResponse<Document>> => {
      return documentApi.updateDocumentTitle(documentId, body);
    },
    [],
  );

  const deleteDocument = useCallback(
    (documentId: string): Promise<ApiResponse<{ id: string }>> => {
      return documentApi.deleteDocument(documentId);
    },
    [],
  );

  const getDocumentCollaborators = useCallback(
    (documentId: string): Promise<ApiResponse<DocumentCollaborator[]>> => {
      return documentApi.getDocumentCollaborators(documentId);
    },
    [],
  );

  const shareDocument = useCallback(
    (
      documentId: string,
      body: ShareDocumentRequest,
    ): Promise<ApiResponse<DocumentCollaborator>> => {
      return documentApi.shareDocument(documentId, body);
    },
    [],
  );

  const removeDocumentCollaborator = useCallback(
    (
      documentId: string,
      userId: string,
    ): Promise<ApiResponse<{ id: string }>> => {
      return documentApi.removeDocumentCollaborator(documentId, userId);
    },
    [],
  );

  return {
    createDocument,
    initializeDocument,
    getDocumentById,
    getDocuments,
    updateDocumentTitle,
    deleteDocument,
    getDocumentCollaborators,
    shareDocument,
    removeDocumentCollaborator,
  };
};
