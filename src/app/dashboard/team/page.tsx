import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield } from "lucide-react";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Team Collaboration - Annex Mail",
};

export default async function TeamPage() {
  const session = await auth();
  if (!session || !session.user || !session.user.organizationId) {
    redirect("/login");
  }

  const orgId = session.user.organizationId;

  // Fetch all members of the organization with user details
  const members = await db.member.findMany({
    where: { organizationId: orgId },
    include: {
      user: true,
    },
    orderBy: {
      role: "asc",
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Team
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage organization members, role allocations, and platform permission
          parameters.
        </p>
      </div>

      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-zinc-400" />
            <CardTitle className="text-sm font-semibold tracking-tight text-zinc-100">
              Active Members
            </CardTitle>
          </div>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400">
            {members.length} Total
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800/80 font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                  <th className="pb-3 pl-2">User</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">System Access Role</th>
                  <th className="pr-2 pb-3 text-right">Membership Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-900/10">
                    <td className="py-3.5 pl-2 font-medium text-zinc-200">
                      <div className="flex items-center gap-2.5">
                        <div className="border-zinc-850 flex h-7 w-7 items-center justify-center rounded-full border bg-zinc-900 font-mono text-[10px] text-zinc-400">
                          {member.user.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <span>{member.user.name || "Anonymous"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-zinc-400">
                      {member.user.email}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300">
                        <Shield className="h-3 w-3 text-zinc-500" />
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-400">
                        <span className="h-1 w-1 rounded-full bg-emerald-500" />
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
