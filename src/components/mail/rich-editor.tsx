"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function RichEditor({ content, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), Image],
    content,
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getHTML());
    },
  });

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt("Enter Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 focus-within:ring-1 focus-within:ring-zinc-700">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900/40 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 ${
            editor.isActive("bold") ? "bg-zinc-800 text-zinc-100" : ""
          }`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 ${
            editor.isActive("italic") ? "bg-zinc-800 text-zinc-100" : ""
          }`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 ${
            editor.isActive("bulletList") ? "bg-zinc-800 text-zinc-100" : ""
          }`}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 ${
            editor.isActive("orderedList") ? "bg-zinc-800 text-zinc-100" : ""
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addLink}
          className={`h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 ${
            editor.isActive("link") ? "bg-zinc-800 text-zinc-100" : ""
          }`}
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addImage}
          className="h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-zinc-800" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent
        editor={editor}
        className="prose prose-invert min-h-[160px] max-w-none p-4 text-zinc-200 focus:ring-0 focus:outline-none [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none [&_a]:text-zinc-400 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
