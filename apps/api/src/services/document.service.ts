import { prisma } from "../prisma/client";
import type { AuthenticatedUser } from "../auth/supabase-auth";

export type CollaboratorRole = "editor";

type CreateDocumentInput = {
  title: string;
  ownerId: string;
  ownerUsername?: string | null;
};

type InitializeDocumentInput = {
  title: string;
  username: string;
};

const normalizeEmail = (email: string | null | undefined) => {
  return email?.trim().toLowerCase() ?? null;
};

export const ensureUserRecord = async (user: AuthenticatedUser) => {
  const email = normalizeEmail(user.email);

  return prisma.user.upsert({
    where: {
      id: user.id,
    },
    update: {
      email,
      username: email ?? user.id,
    },
    create: {
      id: user.id,
      username: email ?? user.id,
      email,
    },
  });
};

export const createDocument = async ({
  title,
  ownerId,
  ownerUsername,
}: CreateDocumentInput) => {
  const email = normalizeEmail(ownerUsername);
  const username = email ?? ownerUsername ?? ownerId;

  return prisma.$transaction(async (transaction) => {
    await transaction.user.upsert({
      where: {
        id: ownerId,
      },
      update: {},
      create: {
        id: ownerId,
        username,
        email: email && email.includes("@") ? email : null,
      },
    });

    return transaction.document.create({
      data: {
        title,
        content: "",
        ownerId,
      },
    });
  });
};

export const initializeDocument = async ({
  title,
  username,
}: InitializeDocumentInput) => {
  return prisma.$transaction(async (transaction) => {
    const owner = await transaction.user.upsert({
      where: {
        username,
      },
      update: {},
      create: {
        username,
      },
    });

    return transaction.document.create({
      data: {
        title,
        content: "",
        ownerId: owner.id,
      },
    });
  });
};

export const getDocumentById = async (documentId: string) => {
  return prisma.document.findUnique({
    where: {
      id: documentId,
    },
  });
};

export const getAccessibleDocumentById = async (
  documentId: string,
  userId: string,
) => {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        {
          ownerId: userId,
        },
        {
          collaborators: {
            some: {
              userId,
            },
          },
        },
      ],
    },
  });
};

export const getDocumentOwnerId = async (documentId: string) => {
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
    },
    select: {
      ownerId: true,
    },
  });

  return document?.ownerId ?? null;
};

export const getDocuments = async () => {
  return prisma.document.findMany({
    orderBy: {
      updatedAt: "desc",
    },
  });
};

export const getAccessibleDocuments = async (userId: string) => {
  return prisma.document.findMany({
    where: {
      OR: [
        {
          ownerId: userId,
        },
        {
          collaborators: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
};

export const canAccessDocument = async (
  documentId: string,
  userId: string,
): Promise<boolean> => {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        {
          ownerId: userId,
        },
        {
          collaborators: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(document);
};

export const updateDocumentContent = async (
  documentId: string,
  content: string,
) => {
  return prisma.document.update({
    where: {
      id: documentId,
    },
    data: {
      content,
    },
  });
};

export const updateDocumentTitle = async (
  documentId: string,
  title: string,
) => {
  return prisma.document.update({
    where: {
      id: documentId,
    },
    data: {
      title,
    },
  });
};

export const deleteDocument = async (documentId: string) => {
  return prisma.document.delete({
    where: {
      id: documentId,
    },
  });
};

export const getDocumentCollaborators = async (documentId: string) => {
  return prisma.documentCollaborator.findMany({
    where: {
      documentId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

export const addDocumentCollaboratorByEmail = async ({
  documentId,
  email,
  role,
}: {
  documentId: string;
  email: string;
  role: CollaboratorRole;
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
  });

  if (!user) {
    return null;
  }

  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
    },
    select: {
      ownerId: true,
    },
  });

  if (!document || document.ownerId === user.id) {
    return null;
  }

  return prisma.documentCollaborator.upsert({
    where: {
      documentId_userId: {
        documentId,
        userId: user.id,
      },
    },
    update: {
      role,
    },
    create: {
      documentId,
      userId: user.id,
      role,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });
};

export const removeDocumentCollaborator = async (
  documentId: string,
  userId: string,
) => {
  return prisma.documentCollaborator.deleteMany({
    where: {
      documentId,
      userId,
    },
  });
};
