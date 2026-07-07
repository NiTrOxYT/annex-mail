import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Forbidden } from "@/components/auth/forbidden";
import { DiagnosticsView } from "@/features/diagnostics/diagnostics-view";

export const metadata = {
  title: "System Diagnostics - Annex Mail",
};

export default async function DiagnosticsPage() {
  const session = await auth();
  if (!session || !session.user || !session.user.organizationId) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "OWNER") {
    return <Forbidden />;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <DiagnosticsView />
    </div>
  );
}
