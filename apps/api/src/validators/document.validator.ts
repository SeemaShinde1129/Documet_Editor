import { z } from "zod";

export const createDocumentSchema = z.object({
  body: z.object({
    title: z
      .string({
        error: "Title is required",
      })
      .min(1, "Title must be at least 1 character")
      .max(100, "Title must be at most 100 characters"),
    ownerId: z.string({
      error: "Owner id is required",
    }).uuid("Owner id must be a valid user id"),
  }),
});

export const initializeDocumentSchema = z.object({
  body: z.object({
    title: z
      .string({
        error: "Title is required",
      })
      .min(1, "Title must be at least 1 character")
      .max(100, "Title must be at most 100 characters"),
    username: z
      .string({
        error: "Username is required",
      })
      .min(1, "Username is required")
      .max(50, "Username must be at most 50 characters"),
  }),
});

export const updateDocumentSchema = z.object({
  body: z.object({
    documentId: z.string({
      error: "Document id is required",
    }),
    content: z.string({
      error: "Content is required",
    }),
    username: z.string({
      error: "Username is required",
    }),
  }),
});

export const updateDocumentTitleSchema = z.object({
  params: z.object({
    id: z
      .string({
        error: "Document id is required",
      })
      .min(1, "Document id is required"),
  }),
  body: z.object({
    title: z
      .string({
        error: "Title is required",
      })
      .min(1, "Title must be at least 1 character")
      .max(100, "Title must be at most 100 characters"),
  }),
});

export const shareDocumentSchema = z.object({
  params: z.object({
    id: z
      .string({
        error: "Document id is required",
      })
      .min(1, "Document id is required"),
  }),
  body: z.object({
    email: z
      .string({
        error: "Collaborator email is required",
      })
      .email("Collaborator email must be valid"),
    role: z.literal("editor").default("editor"),
  }),
});

export const collaboratorParamsSchema = z.object({
  params: z.object({
    id: z
      .string({
        error: "Document id is required",
      })
      .min(1, "Document id is required"),
    userId: z.uuid("Collaborator user id must be valid"),
  }),
});

export const documentParamsSchema = z.object({
  params: z.object({
    id: z
      .string({
        error: "Document id is required",
      })
      .min(1, "Document id is required"),
  }),
});

export type CreateDocumentInput = z.infer<
  typeof createDocumentSchema
>["body"];
export type InitializeDocumentInput = z.infer<
  typeof initializeDocumentSchema
>["body"];
export type UpdateDocumentInput = z.infer<
  typeof updateDocumentSchema
>["body"];
export type UpdateDocumentTitleInput = z.infer<
  typeof updateDocumentTitleSchema
>["body"];
export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>["body"];
export type DocumentParams = z.infer<typeof documentParamsSchema>["params"];
export type CollaboratorParams = z.infer<
  typeof collaboratorParamsSchema
>["params"];
