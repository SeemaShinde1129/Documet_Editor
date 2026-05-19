export const endpoints = {
  health: "/health",
  documents: "/documents",
  initializeDocument: "/documents/initialize",
  documentById: (id: string) => `/documents/${id}`,
  documentTitle: (id: string) => `/documents/${id}/title`,
  documentCollaborators: (id: string) => `/documents/${id}/collaborators`,
  documentCollaborator: (id: string, userId: string) =>
    `/documents/${id}/collaborators/${userId}`,
  deleteDocument: (id: string) => `/documents/${id}`,
} as const;
