"use client";

import { useState } from "react";
import { X, Paperclip, Send, Save, Trash2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichEditor } from "./rich-editor";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export interface AttachmentFile {
  id?: string;
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  content: string; // Base64 encoding
}

interface ComposerProps {
  onClose: () => void;
  onSend: (data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    attachments: AttachmentFile[];
  }) => Promise<void>;
  onSaveDraft?: (data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
  }) => Promise<void>;
  defaultTo?: string[];
  defaultSubject?: string;
  defaultBody?: string;
}

export function Composer({
  onClose,
  onSend,
  onSaveDraft,
  defaultTo = [],
  defaultSubject = "",
  defaultBody = "",
}: ComposerProps) {
  const [to, setTo] = useState<string>(defaultTo.join(", "));
  const [cc, setCc] = useState<string>("");
  const [bcc, setBcc] = useState<string>("");
  const [subject, setSubject] = useState<string>(defaultSubject);
  const [body, setBody] = useState<string>(defaultBody);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachmentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 10MB attachment size limit.`);
        continue;
      }

      const reader = new FileReader();
      const filePromise = new Promise<AttachmentFile>((resolve) => {
        reader.onload = () => {
          const base64Content = (reader.result as string).split(",")[1];
          resolve({
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            storagePath: `temp/${Date.now()}_${file.name}`,
            content: base64Content,
          });
        };
      });
      reader.readAsDataURL(file);
      const uploadedFile = await filePromise;
      newAttachments.push(uploadedFile);
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      alert("Please specify at least one recipient in the 'To' field.");
      return;
    }
    setIsSending(true);
    try {
      const toList = to
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      const ccList = cc
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      const bccList = bcc
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      await onSend({
        to: toList,
        cc: ccList.length > 0 ? ccList : undefined,
        bcc: bccList.length > 0 ? bccList : undefined,
        subject,
        body,
        attachments,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to send email. Please verify details.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
      <CardHeader className="border-zinc-850 flex shrink-0 flex-row items-center justify-between border-b bg-zinc-900/20 p-4">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-4.5 w-4.5 text-zinc-400" />
          <h3 className="text-sm font-semibold tracking-tight text-zinc-200">
            New Message
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-200"
        >
          <X className="h-4.5 w-4.5" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
            <span className="w-12 shrink-0 font-mono text-xs text-zinc-500">
              From
            </span>
            <span className="font-sans text-xs text-zinc-300">
              Annex &lt;business@annex-consultancy.com&gt;
            </span>
          </div>

          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
            <span className="w-12 shrink-0 font-mono text-xs text-zinc-500">
              To
            </span>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipients separated by commas"
              className="h-6 border-0 bg-transparent p-0 text-xs text-zinc-200 focus-visible:border-0 focus-visible:ring-0"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="h-6 px-2 font-mono text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cc/Bcc
            </Button>
          </div>

          {showCcBcc && (
            <>
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                <span className="w-12 shrink-0 font-mono text-xs text-zinc-500">
                  Cc
                </span>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="carbon copy list"
                  className="h-6 border-0 bg-transparent p-0 text-xs text-zinc-200 focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                <span className="w-12 shrink-0 font-mono text-xs text-zinc-500">
                  Bcc
                </span>
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="blind carbon copy list"
                  className="h-6 border-0 bg-transparent p-0 text-xs text-zinc-200 focus-visible:ring-0"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
            <span className="w-12 shrink-0 font-mono text-xs text-zinc-500">
              Subject
            </span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject header"
              className="h-6 border-0 bg-transparent p-0 text-xs text-zinc-200 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="pt-2">
          <RichEditor content={body} onChange={setBody} />
        </div>

        {attachments.length > 0 && (
          <div className="space-y-1.5 border-t border-zinc-900 pt-2">
            <h4 className="font-mono text-xs text-zinc-500">
              Attachments ({attachments.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300"
                >
                  <span className="max-w-[150px] truncate">{att.filename}</span>
                  <span className="text-[10px] text-zinc-500">
                    ({Math.round(att.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-zinc-850 flex shrink-0 items-center justify-between border-t bg-zinc-900/10 p-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="h-9 cursor-pointer rounded-lg bg-zinc-100 text-xs font-medium text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.98]"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isSending ? "Sending..." : "Send"}
          </Button>

          <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-0 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200">
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onSaveDraft({
                  to: to
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean),
                  cc: cc
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean),
                  bcc: bcc
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean),
                  subject,
                  body,
                })
              }
              className="h-9 rounded-lg border-zinc-800 bg-transparent text-xs text-zinc-400 hover:text-zinc-200"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Draft
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 rounded-lg text-xs text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Discard
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
