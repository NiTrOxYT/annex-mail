import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { db } from "@/lib/db/db";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sent Messages - Annex Mail",
};

export default async function SentPage() {
  const session = await auth();
  if (!session || !session.user || !session.user.organizationId) {
    redirect("/login");
  }

  const orgId = session.user.organizationId;

  // Query sent messages
  const sentMessages = await db.message.findMany({
    where: {
      conversation: { organizationId: orgId },
      direction: "OUTBOUND",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans text-zinc-300">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Sent
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Outgoing team mail delivery history sent through Brevo SMTP API.
        </p>
      </div>

      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <Send className="h-4.5 w-4.5 text-zinc-400" />
            <CardTitle className="text-sm font-semibold tracking-tight text-zinc-100">
              Outbound Transmission Log
            </CardTitle>
          </div>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400">
            {sentMessages.length} Messages
          </span>
        </CardHeader>
        <CardContent>
          {sentMessages.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              No outgoing messages found in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead>
                  <tr className="border-b border-zinc-800/80 font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                    <th className="pb-3 pl-2">Recipients</th>
                    <th className="pb-3">Subject</th>
                    <th className="pb-3">Delivery Status</th>
                    <th className="pr-2 pb-3 text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {sentMessages.map((msg) => {
                    const status = msg.deliveryStatus;
                    const isFailed = status === "FAILED";
                    const isQueued = status === "QUEUED";

                    return (
                      <tr key={msg.id} className="hover:bg-zinc-900/10">
                        <td className="max-w-[200px] truncate py-3.5 pl-2 font-medium text-zinc-200">
                          {msg.recipients.join(", ")}
                        </td>
                        <td className="max-w-[300px] truncate py-3.5 font-medium text-zinc-300">
                          {msg.subject}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase ${
                              isFailed
                                ? "border-red-500/20 bg-red-500/10 text-red-400"
                                : isQueued
                                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {isFailed ? (
                              <AlertCircle className="text-red-555 h-3 w-3" />
                            ) : isQueued ? (
                              <Clock className="text-amber-555 h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="text-emerald-555 h-3 w-3" />
                            )}
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-right font-mono text-zinc-500">
                          {new Date(msg.createdAt).toLocaleString([], {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
