export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentJoinPayload {
  documentId: string;
  username: string;
}

export interface DocumentUpdatePayload {
  documentId: string;
  content: string;
  username: string;
}

export interface DocumentLoadPayload {
  documentId: string;
  title: string;
  content: string;
}

export interface DocumentSavedPayload {
  documentId: string;
  savedAt: string;
}

export type DocumentCollaboratorRole = "editor";

export interface DocumentCollaboratorUser {
  id: string;
  username: string;
  email: string | null;
}

export interface DocumentCollaborator {
  id: string;
  documentId: string;
  userId: string;
  role: DocumentCollaboratorRole;
  user: DocumentCollaboratorUser;
  createdAt: string;
  updatedAt: string;
}

export interface RoomUsersPayload {
  documentId: string;
  users: string[];
}

export interface UserJoinedPayload {
  username: string;
  documentId: string;
}

export interface UserLeftPayload {
  username: string;
  documentId: string;
}
