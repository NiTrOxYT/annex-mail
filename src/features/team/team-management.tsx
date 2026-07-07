"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  KeyRound,
  Trash2,
  Shield,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/skeleton-loader";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "DISABLED";
  mustChangePassword: boolean;
  createdAt: string;
}

interface TeamManagementProps {
  currentUserRole: string;
  currentUserId: string;
}

export function TeamManagement({
  currentUserRole,
  currentUserId,
}: TeamManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Selected member for edit/reset/delete
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Add Member form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"OWNER" | "ADMIN" | "MEMBER">(
    "MEMBER",
  );
  const [forcePasswordChange, setForcePasswordChange] = useState(true);

  // Edit Member form state
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"OWNER" | "ADMIN" | "MEMBER">(
    "MEMBER",
  );
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "DISABLED">("ACTIVE");
  const [editAvatar, setEditAvatar] = useState("");

  // Reset password form state
  const [tempPassword, setTempPassword] = useState("");

  // Action status/errors
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMembers = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/team?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setMembers(body.data);
        }
      }
    } catch (err) {
      console.error("Failed to load team members", err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  const triggerToast = (success: string | null, error: string | null) => {
    setSuccessMsg(success);
    setErrorMsg(error);
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 4000);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      triggerToast(null, "Please fill in all required fields.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          forcePasswordChange,
        }),
      });
      const body = await res.json();
      if (body.success) {
        // Optimistic append / refetch
        fetchMembers();
        setAddOpen(false);
        // Reset inputs
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setNewRole("MEMBER");
        setForcePasswordChange(true);
        triggerToast("Team member created successfully.", null);
      } else {
        triggerToast(
          null,
          body.error?.message || "Failed to create team member.",
        );
      }
    } catch {
      triggerToast(null, "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/team/${selectedMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          status: editStatus,
          avatar: editAvatar || undefined,
        }),
      });
      const body = await res.json();
      if (body.success) {
        fetchMembers();
        setEditOpen(false);
        triggerToast("Team member updated successfully.", null);
      } else {
        triggerToast(null, body.error?.message || "Failed to update member.");
      }
    } catch {
      triggerToast(null, "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !tempPassword) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/team/${selectedMember.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temporaryPassword: tempPassword }),
      });
      const body = await res.json();
      if (body.success) {
        setResetOpen(false);
        setTempPassword("");
        triggerToast("Temporary password set successfully.", null);
      } else {
        triggerToast(null, body.error?.message || "Failed to reset password.");
      }
    } catch {
      triggerToast(null, "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/team/${selectedMember.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (body.success) {
        fetchMembers();
        setDeleteOpen(false);
        triggerToast("Team member deleted successfully.", null);
      } else {
        triggerToast(null, body.error?.message || "Failed to delete member.");
      }
    } catch {
      triggerToast(null, "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditRole(member.role);
    setEditStatus(member.status);
    setEditAvatar(member.avatar || "");
    setEditOpen(true);
  };

  const openReset = (member: TeamMember) => {
    setSelectedMember(member);
    setTempPassword("");
    setResetOpen(true);
  };

  const openDelete = (member: TeamMember) => {
    setSelectedMember(member);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Team Management
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Provision users, allocate RBAC permission tiers, and audit
            organization access control.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="h-9 cursor-pointer rounded-lg bg-zinc-100 px-4 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.98]"
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email address..."
            className="h-9 border-zinc-800 bg-zinc-900/40 pl-9 text-xs text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 text-xs text-zinc-300 focus:ring-1 focus:ring-zinc-700 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="OWNER">Owner</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 text-xs text-zinc-300 focus:ring-1 focus:ring-zinc-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {/* Members Grid/Table Card */}
      <Card className="rounded-xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-zinc-400" />
            <CardTitle className="text-sm font-semibold tracking-tight text-zinc-100">
              Active Organization Roster
            </CardTitle>
          </div>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400">
            {members.length} Total
          </span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-in fade-in p-2 duration-200">
              <ListSkeleton />
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Team Members Found"
              description="No organization roster members matched your current filter search terms."
            />
          ) : (
            <div>
              {/* Desktop View */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead>
                    <tr className="border-b border-zinc-800/80 font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                      <th className="pb-3 pl-2">User</th>
                      <th className="pb-3">Email Address</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Created</th>
                      <th className="pr-2 pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="group hover:bg-zinc-900/10"
                      >
                        <td className="py-3.5 pl-2 font-medium text-zinc-200">
                          <div className="flex items-center gap-2.5">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="h-7 w-7 rounded-full border border-zinc-800 object-cover"
                              />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 font-mono text-[10px] text-zinc-500">
                                {member.name?.[0]?.toUpperCase() || "U"}
                              </div>
                            )}
                            <div>
                              <span className="block">
                                {member.name || "Anonymous"}
                              </span>
                              {member.mustChangePassword && (
                                <span className="mt-0.5 inline-block rounded border border-amber-500/20 bg-amber-500/10 px-1 py-[1px] font-mono text-[8px] font-medium text-amber-500">
                                  Temp Pass
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-zinc-400">
                          {member.email}
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1 font-medium text-zinc-300">
                            <Shield className="h-3.5 w-3.5 text-zinc-500" />
                            {member.role === "OWNER"
                              ? "Owner"
                              : member.role === "ADMIN"
                                ? "Admin"
                                : "Member"}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {member.status === "ACTIVE" ? (
                            <span className="text-emerald-450 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold">
                              <span className="h-1 w-1 rounded-full bg-emerald-500" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-red-450 inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold">
                              <span className="h-1 w-1 rounded-full bg-red-500" />
                              DISABLED
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 font-mono text-zinc-500">
                          {new Date(member.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(member)}
                              className="h-8 w-8 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                              title="Edit Profile & Role"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openReset(member)}
                              className="h-8 w-8 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                              title="Set Temporary Password"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDelete(member)}
                              disabled={member.userId === currentUserId}
                              className="h-8 w-8 text-zinc-500 hover:bg-red-950/40 hover:text-red-400 disabled:opacity-30"
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block space-y-3 md:hidden">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/20 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="h-8 w-8 rounded-full border border-zinc-800 object-cover"
                          />
                        ) : (
                          <div className="bg-zinc-905 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 font-mono text-[10px] text-zinc-400">
                            {member.name?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div>
                          <span className="block text-xs font-semibold text-zinc-200">
                            {member.name || "Anonymous"}
                          </span>
                          {member.mustChangePassword && (
                            <span className="mt-0.5 inline-block rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[8px] font-medium text-amber-500">
                              Temp Pass
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                        <Shield className="h-3 w-3 text-zinc-500" />
                        {member.role === "OWNER"
                          ? "Owner"
                          : member.role === "ADMIN"
                            ? "Admin"
                            : "Member"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="truncate font-mono text-[10px] text-zinc-400">
                        {member.email}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[9px] text-zinc-500">
                          Joined:{" "}
                          {new Date(member.createdAt).toLocaleDateString()}
                        </span>
                        {member.status === "ACTIVE" ? (
                          <span className="text-emerald-450 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[8px] font-semibold">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-red-450 inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 font-mono text-[8px] font-semibold">
                            DISABLED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-zinc-800/40 pt-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(member)}
                        className="h-8 gap-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReset(member)}
                        className="h-8 gap-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      >
                        <KeyRound className="h-3 w-3" />
                        Reset
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDelete(member)}
                        disabled={member.userId === currentUserId}
                        className="h-8 gap-1.5 text-xs text-red-400 hover:bg-red-950/20 disabled:opacity-30"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD MEMBER DIALOG */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-200">
              Provision New Team Member
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="h-9 border-zinc-800 bg-zinc-900/40 text-xs text-zinc-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Email Address
              </label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@annex-consultancy.com"
                className="h-9 border-zinc-800 bg-zinc-900/40 text-xs text-zinc-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Temporary Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 border-zinc-800 bg-zinc-900/40 text-xs text-zinc-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Access Role
              </label>
              <select
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value as "OWNER" | "ADMIN" | "MEMBER")
                }
                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="MEMBER">Member (Operational scope)</option>
                <option value="ADMIN">Admin (Administration scope)</option>
                {currentUserRole === "OWNER" && (
                  <option value="OWNER">Owner (Full root access)</option>
                )}
              </select>
            </div>
            <div className="flex items-center gap-2.5 pt-1.5">
              <input
                type="checkbox"
                id="forcePasswordChange"
                checked={forcePasswordChange}
                onChange={(e) => setForcePasswordChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-900 text-zinc-100 accent-zinc-200"
              />
              <label
                htmlFor="forcePasswordChange"
                className="text-xs text-zinc-400 select-none"
              >
                Force password change on first login
              </label>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddOpen(false)}
                className="h-9 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="h-9 bg-zinc-100 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
              >
                {actionLoading ? "Provisioning..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MEMBER DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-200">
              Edit Member Attributes
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditMember} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
                className="h-9 border-zinc-800 bg-zinc-900/40 text-xs text-zinc-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Avatar Image Link
              </label>
              <Input
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="h-9 border-zinc-800 bg-zinc-900/40 text-xs text-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Access Role
              </label>
              <select
                value={editRole}
                disabled={
                  selectedMember?.role === "OWNER" &&
                  currentUserRole !== "OWNER"
                }
                onChange={(e) =>
                  setEditRole(e.target.value as "OWNER" | "ADMIN" | "MEMBER")
                }
                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-300 focus:outline-none disabled:opacity-40"
              >
                <option value="MEMBER">Member (Operational scope)</option>
                <option value="ADMIN">Admin (Administration scope)</option>
                {currentUserRole === "OWNER" && (
                  <option value="OWNER">Owner (Full root access)</option>
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value as "ACTIVE" | "DISABLED")
                }
                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="ACTIVE">Active (Login permitted)</option>
                <option value="DISABLED">Disabled (Login blocked)</option>
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
                className="h-9 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="h-9 bg-zinc-100 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-tight text-zinc-200">
              Reset Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            <p className="text-xs text-zinc-400">
              Provide a temporary password for{" "}
              <span className="font-medium text-zinc-200">
                {selectedMember?.email}
              </span>
              . They will be forced to change it on their next login attempt.
            </p>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                Temporary Password
              </label>
              <Input
                type="password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 border-zinc-800 bg-zinc-900/40 text-xs text-zinc-200"
                required
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetOpen(false)}
                className="h-9 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="h-9 bg-zinc-100 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
              >
                {actionLoading ? "Resetting..." : "Set Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE MEMBER DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-950/40 text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-sm font-semibold tracking-tight text-zinc-200">
              Remove Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-center">
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-zinc-200">
                {selectedMember?.email}
              </span>
              ?
            </p>
            <p className="font-mono text-[10px] text-zinc-500">
              This action is permanent and will instantly revoke all platform
              access rules.
            </p>
          </div>
          <DialogFooter className="flex items-center justify-center gap-2 pt-4 sm:justify-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              className="h-9 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteMember}
              disabled={actionLoading}
              className="h-9 bg-red-600 text-xs font-semibold text-zinc-100 hover:bg-red-700"
            >
              {actionLoading ? "Removing..." : "Confirm Removal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOAST SYSTEM */}
      {(successMsg || errorMsg) && (
        <div className="animate-in fade-in slide-in-from-bottom-2 fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900 px-4 py-3 text-xs font-medium shadow-2xl">
          {successMsg ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-zinc-200">{successMsg}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-zinc-200">{errorMsg}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
