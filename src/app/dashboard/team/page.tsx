import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Forbidden } from "@/components/auth/forbidden";
import { TeamManagement } from "@/features/team/team-management";

export const metadata = {
  title: "Team Collaboration - Annex Mail",
};

export default async function TeamPage() {
  const session = await auth();
  if (!session || !session.user || !session.user.organizationId) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "OWNER" && role !== "ADMIN") {
    return <Forbidden />;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <TeamManagement currentUserRole={role} currentUserId={session.user.id} />
    </div>
  );
}
