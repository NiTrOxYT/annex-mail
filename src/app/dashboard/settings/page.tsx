import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Forbidden } from "@/components/auth/forbidden";
import { SettingsView } from "@/features/settings/settings-view";

export const metadata = {
  title: "Settings - Annex Mail",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session || !session.user || !session.user.organizationId) {
    redirect("/login");
  }

  const role = session.user.role;
  // Members (EMPLOYEE) cannot access settings. Admins and Owners can.
  if (role !== "OWNER" && role !== "ADMIN") {
    return <Forbidden />;
  }

  return <SettingsView />;
}
