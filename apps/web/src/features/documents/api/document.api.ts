import type {
  Document,
  DocumentCollaborator,
  DocumentCollaboratorRole,
} from "@repo/types/document";
import { endpoints } from "@/shared/api/endpoints";
import { http } from "@/shared/lib/http";

export type ApiResponse<TData> = {
  success: boolean;
  data: TData;
};

export type CreateDocumentRequest = Pick<Document, "title" | "ownerId">;

export type InitializeDocumentRequest = Pick<Document, "title"> & {
  username: string;
};

export type UpdateDocumentTitleRequest = Pick<Document, "title">;

export type ShareDocumentRequest = {
  email: string;
  role?: DocumentCollaboratorRole;
};

export const documentApi = {
  createDocument: (body: CreateDocumentRequest) =>
    http.post<ApiResponse<Document>, CreateDocumentRequest>(
      endpoints.documents,
      body,
    ),

  initializeDocument: (body: InitializeDocumentRequest) =>
    http.post<ApiResponse<Document>, InitializeDocumentRequest>(
      endpoints.initializeDocument,
      body,
    ),

  getDocumentById: (documentId: string) =>
    http.get<ApiResponse<Document>>(endpoints.documentById(documentId)),

  updateDocumentTitle: (documentId: string, body: UpdateDocumentTitleRequest) =>
    http.patch<ApiResponse<Document>, UpdateDocumentTitleRequest>(
      endpoints.documentTitle(documentId),
      body,
    ),

  deleteDocument: (documentId: string) =>
    http.delete<ApiResponse<{ id: string }>>(
      endpoints.deleteDocument(documentId),
    ),

  getDocumentCollaborators: (documentId: string) =>
    http.get<ApiResponse<DocumentCollaborator[]>>(
      endpoints.documentCollaborators(documentId),
    ),

  shareDocument: (documentId: string, body: ShareDocumentRequest) =>
    http.post<ApiResponse<DocumentCollaborator>, ShareDocumentRequest>(
      endpoints.documentCollaborators(documentId),
      body,
    ),

  removeDocumentCollaborator: (documentId: string, userId: string) =>
    http.delete<ApiResponse<{ id: string }>>(
      endpoints.documentCollaborator(documentId, userId),
    ),

  getDocuments: () => http.get<ApiResponse<Document[]>>(endpoints.documents),
};
