import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "./shell";
import { WorkspaceProvider } from "@/features/inbox/workspace-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    name: session.user.name || "User",
    email: session.user.email || "",
    role: session.user.role || "EMPLOYEE",
    mustChangePassword: !!session.user.mustChangePassword,
  };

  return (
    <WorkspaceProvider>
      <DashboardShell user={user}>{children}</DashboardShell>
    </WorkspaceProvider>
  );
}
