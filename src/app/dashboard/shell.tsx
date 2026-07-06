"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Mail,
  Send,
  FileText,
  Layout,
  Users,
  History,
  Settings,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  PenSquare,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { GlobalComposer } from "@/components/mail/global-composer";

interface User {
  name: string;
  email: string;
  role: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: User;
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Inbox", href: "/dashboard/inbox", icon: Mail },
    { name: "Sent", href: "/dashboard/sent", icon: Send },
    { name: "Drafts", href: "/dashboard/drafts", icon: FileText },
    { name: "Templates", href: "/dashboard/templates", icon: Layout },
    { name: "Team", href: "/dashboard/team", icon: Users },
    { name: "Logs", href: "/dashboard/logs", icon: History },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const getBreadcrumb = () => {
    const activeItem = navigation.find((item) => item.href === pathname);
    return activeItem ? activeItem.name : "Platform";
  };

  const handleComposerSent = () => {
    // Refresh current page data after successful send
    router.refresh();
  };

  const renderSidebar = () => (
    <div className="flex h-full flex-col border-r border-zinc-800/80 bg-zinc-950 p-4 font-sans text-zinc-300">
      {/* Brand Header */}
      <div className="mb-5 flex items-center gap-2 border-b border-zinc-800/40 px-2 py-3">
        <div className="flex h-5.5 w-5.5 items-center justify-center rounded bg-zinc-100 text-xs font-bold text-zinc-950 select-none">
          A
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-100">
          Annex Mail
        </span>
      </div>

      {/* ── Compose CTA ── */}
      <button
        onClick={() => {
          setComposerOpen(true);
          setIsMobileOpen(false);
        }}
        className="mb-4 flex w-full items-center gap-2.5 rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-2.5 text-left text-sm font-semibold text-zinc-100 transition-all hover:border-zinc-600 hover:bg-zinc-800/70 active:scale-[0.98]"
      >
        <PenSquare className="h-4 w-4 text-zinc-400" />
        Compose
      </button>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "border border-zinc-800 bg-zinc-900 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
              }`}
            >
              <Icon
                className={`h-4.5 w-4.5 ${isActive ? "text-zinc-200" : "text-zinc-500"}`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="mt-auto border-t border-zinc-800/40 pt-4">
        <div className="mb-3 flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-200">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-zinc-200">
              {user.name}
            </p>
            <p className="font-mono text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
              {user.role}
            </p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="h-9.5 w-full cursor-pointer justify-start gap-3 rounded-lg px-3 text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
        >
          <LogOut className="h-4 w-4 text-zinc-500" />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 font-sans">
      {/* Desktop Sidebar (Persistent) */}
      <div className="hidden h-full md:flex md:w-60 md:shrink-0 md:flex-col">
        {renderSidebar()}
      </div>

      {/* Main Container */}
      <div className="flex h-full min-w-0 flex-1 flex-col bg-zinc-950">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Button */}
            <Button
              onClick={() => setIsMobileOpen(true)}
              variant="ghost"
              size="icon"
              className="cursor-pointer text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-mono text-sm font-medium tracking-wider text-zinc-400 uppercase">
              {getBreadcrumb()}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile compose button */}
            <button
              onClick={() => setComposerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-zinc-800/70 md:hidden"
            >
              <PenSquare className="h-3.5 w-3.5" />
              Compose
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-zinc-800/60 bg-zinc-900/40 px-3 py-1 font-mono text-xs text-zinc-400 sm:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Active Mail Synchronization
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Modal Drawer */}
        <Dialog open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <DialogContent className="animate-in slide-in-from-left fixed inset-y-0 left-0 z-50 h-full w-60 border-r border-zinc-800 bg-zinc-950 p-0 shadow-lg duration-300">
            <DialogTitle className="sr-only">Navigation Drawer</DialogTitle>
            <div className="absolute top-4 right-4">
              <Button
                onClick={() => setIsMobileOpen(false)}
                variant="ghost"
                size="icon"
                className="cursor-pointer text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {renderSidebar()}
          </DialogContent>
        </Dialog>

        {/* Content Area */}
        <main className="w-full max-w-full flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Global Floating Composer */}
      {composerOpen && (
        <GlobalComposer
          onClose={() => setComposerOpen(false)}
          onSent={handleComposerSent}
        />
      )}
    </div>
  );
}
