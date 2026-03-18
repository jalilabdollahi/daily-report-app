"use client";

import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: true,
    protocols: ["http", "https", "mailto"],
  }),
  Placeholder.configure({
    placeholder: "Write your daily report...",
  }),
];

export function TaskRichTextEditor({
  className,
  onChange,
  value,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: value,
    editorProps: {
      attributes: {
        class:
          "tiptap-editor min-h-[220px] rounded-b-[1.5rem] border border-t-0 border-input bg-background/80 px-4 py-4 text-sm focus:outline-none",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "<p></p>", {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const toolbarButtons = [
    {
      icon: Bold,
      label: "Bold",
      active: editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      label: "Italic",
      active: editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: UnderlineIcon,
      label: "Underline",
      active: editor.isActive("underline"),
      onClick: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      icon: Strikethrough,
      label: "Strikethrough",
      active: editor.isActive("strike"),
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      icon: Heading1,
      label: "Heading 1",
      active: editor.isActive("heading", { level: 1 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      icon: Heading2,
      label: "Heading 2",
      active: editor.isActive("heading", { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: Heading3,
      label: "Heading 3",
      active: editor.isActive("heading", { level: 3 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: List,
      label: "Bullet list",
      active: editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: "Numbered list",
      active: editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: Quote,
      label: "Blockquote",
      active: editor.isActive("blockquote"),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: Code2,
      label: "Code block",
      active: editor.isActive("codeBlock"),
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      icon: Link2,
      label: "Link",
      active: editor.isActive("link"),
      onClick: () => {
        const previousUrl = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Enter a URL", previousUrl ?? "");

        if (url === null) {
          return;
        }

        if (!url.trim()) {
          editor.chain().focus().unsetLink().run();
          return;
        }

        editor.chain().focus().setLink({ href: url.trim() }).run();
      },
    },
    {
      icon: Minus,
      label: "Horizontal rule",
      active: false,
      onClick: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: Pilcrow,
      label: "Paragraph",
      active: editor.isActive("paragraph"),
      onClick: () => editor.chain().focus().setParagraph().run(),
    },
  ];

  return (
    <div className={cn("space-y-0", className)}>
      <div className="flex flex-wrap gap-2 rounded-t-[1.5rem] border border-input bg-secondary/35 p-3">
        {toolbarButtons.map((button) => {
          const Icon = button.icon;

          return (
            <Button
              className="rounded-xl"
              key={button.label}
              onClick={button.onClick}
              size="sm"
              type="button"
              variant={button.active ? "default" : "outline"}
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only">{button.label}</span>
            </Button>
          );
        })}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
