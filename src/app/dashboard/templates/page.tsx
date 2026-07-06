"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Layout, Plus, Trash2, Edit, X, RefreshCw } from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  description?: string;
  subject: string;
  html: string;
  variables: string[];
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Editor Modal States
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    subject: "",
    html: "",
    variablesString: "",
  });

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          setTemplates(body.data);
        } else {
          setError(body.error?.message || "Failed to load templates.");
        }
      } else {
        setError("Network error fetching templates.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const openCreateModal = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      category: "sales",
      description: "",
      subject: "",
      html: "",
      variablesString: "first_name, sender_name",
    });
    setIsOpen(true);
  };

  const openEditModal = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setFormData({
      name: tpl.name,
      category: tpl.category,
      description: tpl.description || "",
      subject: tpl.subject,
      html: tpl.html,
      variablesString: tpl.variables.join(", "),
    });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.subject.trim() ||
      !formData.html.trim()
    ) {
      return;
    }

    const variables = formData.variablesString
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const payload = {
      name: formData.name,
      category: formData.category,
      description: formData.description,
      subject: formData.subject,
      html: formData.html,
      variables,
    };

    try {
      const url = selectedTemplate
        ? `/api/templates/${selectedTemplate.id}`
        : "/api/templates";
      const method = selectedTemplate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setIsOpen(false);
          fetchTemplates();
        } else {
          alert(body.error?.message || "Failed to save template.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error saving template.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTemplates();
      } else {
        alert("Failed to delete template.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting template.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans text-zinc-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Templates
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Save and inject reusable text patterns for rapid replies and compose
            flows.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12 text-center text-sm text-zinc-500">
          No templates found. Create one to get started!
        </div>
      ) : (
        /* Template Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/30 transition-all hover:border-zinc-700/80"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-zinc-400 uppercase">
                    {tpl.category}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEditModal(tpl)}
                      className="text-zinc-450 rounded p-1 transition-all hover:bg-zinc-800 hover:text-zinc-200"
                      title="Edit Template"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="text-zinc-450 rounded p-1 transition-all hover:bg-zinc-800 hover:text-red-400"
                      title="Delete Template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <CardTitle className="mt-2.5 text-sm leading-tight font-semibold text-zinc-200">
                  {tpl.name}
                </CardTitle>
                {tpl.description && (
                  <CardDescription className="mt-1 text-xs leading-normal text-zinc-500">
                    {tpl.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="border-zinc-850 border-t pt-3">
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="block font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                      Subject
                    </span>
                    <span className="font-medium text-zinc-300">
                      {tpl.subject}
                    </span>
                  </div>
                  {tpl.variables.length > 0 && (
                    <div>
                      <span className="block font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
                        Variables
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tpl.variables.map((v) => (
                          <span
                            key={v}
                            className="rounded bg-zinc-800/40 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400"
                          >
                            {"{{"}
                            {v}
                            {"}}"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <Layout className="h-4.5 w-4.5 text-zinc-400" />
              {selectedTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-zinc-500 uppercase">
                  Template Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Sales Follow-up"
                  required
                  className="w-full border-zinc-800 bg-zinc-900/40 text-zinc-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] text-zinc-500 uppercase">
                  Category
                </label>
                <Input
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g. sales, support"
                  required
                  className="w-full border-zinc-800 bg-zinc-900/40 text-zinc-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] text-zinc-500 uppercase">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional short descriptive note"
                className="w-full border-zinc-800 bg-zinc-900/40 text-zinc-300"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] text-zinc-500 uppercase">
                Email Subject Blueprint
              </label>
              <Input
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Subject header (can contain {{variables}})"
                required
                className="w-full border-zinc-800 bg-zinc-900/40 text-zinc-300"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] text-zinc-500 uppercase">
                HTML Content Blueprint
              </label>
              <textarea
                value={formData.html}
                onChange={(e) =>
                  setFormData({ ...formData, html: e.target.value })
                }
                placeholder="Write HTML content here..."
                required
                rows={6}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 text-zinc-300 focus:ring-1 focus:ring-zinc-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[10px] text-zinc-500 uppercase">
                Variables (comma-separated)
              </label>
              <Input
                value={formData.variablesString}
                onChange={(e) =>
                  setFormData({ ...formData, variablesString: e.target.value })
                }
                placeholder="e.g. first_name, discount_rate"
                className="w-full border-zinc-800 bg-zinc-900/40 text-zinc-300"
              />
            </div>

            <div className="flex justify-end gap-2.5 border-t border-zinc-800 pt-4">
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/20 px-3.5 py-1.5 text-zinc-400 transition-all hover:text-zinc-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="cursor-pointer rounded-lg bg-zinc-100 px-4 py-1.5 font-semibold text-zinc-950 transition-all hover:bg-zinc-200"
              >
                {selectedTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
