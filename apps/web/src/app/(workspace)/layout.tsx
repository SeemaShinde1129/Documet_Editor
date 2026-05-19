"use client";

import type { ReactNode } from "react";

import AuthGuard from "@/components/AuthGuard";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-neutral-50 text-neutral-950">
        <WorkspaceSidebar />

        <main className="min-h-dvh min-w-0 md:pl-20 xl:pl-72">
          <div className="min-h-screen">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
