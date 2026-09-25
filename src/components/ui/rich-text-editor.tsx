"use client";

import { Fragment, useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import { AlignCenter, AlignLeft, AlignRight, Bold, Heading2, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Strikethrough, UnderlineIcon, Undo2, Unlink } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EditorContextMenu, type EditorAction } from "@/components/ui/editor-context-menu";
import { LinkDialog, type LinkInitial, type LinkSubmit } from "@/components/ui/link-dialog";

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
  minHeight?: "sm" | "lg";
  maxLength?: number;
  onCharacterCountChange?: (count: number) => void;
  disabled?: boolean;
  className?: string;
};

function ToolbarButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger render={<button type="button" aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick} className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-neutral-tint hover:text-ink disabled:pointer-events-none disabled:opacity-40", active && "bg-neutral-tint text-ink")} />}>{children}</TooltipTrigger><TooltipContent side="top">{label}</TooltipContent></Tooltip>;
}

export function RichTextEditor({ value, onChange, ariaLabel, placeholder = "Start writing…", minHeight = "sm", maxLength, onCharacterCountChange, disabled = false, className }: RichTextEditorProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ initial: LinkInitial; needsText: boolean } | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: value || "",
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ autolink: true, openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CharacterCount.configure({ limit: maxLength }),
    ],
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        class: cn("rich-text-content px-3 py-3 text-[13px] leading-6 text-ink outline-none", minHeight === "lg" ? "min-h-64" : "min-h-32"),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.isEmpty ? "" : currentEditor.getHTML();
      onChange(html);
      onCharacterCountChange?.(currentEditor.storage.characterCount.characters());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || editor.getHTML() === value || (editor.isEmpty && !value)) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
    onCharacterCountChange?.(editor.storage.characterCount.characters());
  }, [editor, onCharacterCountChange, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
      strike: currentEditor?.isActive("strike") ?? false,
      heading: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      blockquote: currentEditor?.isActive("blockquote") ?? false,
      link: currentEditor?.isActive("link") ?? false,
      hasSelection: currentEditor ? !currentEditor.state.selection.empty : false,
      alignLeft: currentEditor?.isActive({ textAlign: "left" }) ?? false,
      alignCenter: currentEditor?.isActive({ textAlign: "center" }) ?? false,
      alignRight: currentEditor?.isActive({ textAlign: "right" }) ?? false,
      canUndo: currentEditor?.can().undo() ?? false,
      canRedo: currentEditor?.can().redo() ?? false,
    }),
  });
  const toolbarState = state ?? {
    bold: false, italic: false, underline: false, strike: false, heading: false,
    bulletList: false, orderedList: false, blockquote: false, link: false, hasSelection: false,
    alignLeft: false, alignCenter: false, alignRight: false,
    canUndo: false, canRedo: false,
  };

  function openLinkDialog() {
    if (!editor) return;
    const active = editor.isActive("link");
    const attrs = editor.getAttributes("link");
    setLinkDialog({
      initial: active ? { href: attrs.href ?? "", target: attrs.target ?? null, rel: attrs.rel ?? null } : null,
      needsText: !active && editor.state.selection.empty,
    });
  }

  function applyLink(value: LinkSubmit) {
    if (!editor) return;
    const rel = [value.newTab ? "noopener noreferrer" : "", value.nofollow ? "nofollow" : ""].filter(Boolean).join(" ") || null;
    const attrs = { href: value.href, target: value.newTab ? "_blank" : null, rel };
    const chain = editor.chain().focus();
    if (editor.isActive("link")) chain.extendMarkRange("link").setLink(attrs).run();
    else if (!editor.state.selection.empty) chain.setLink(attrs).run();
    else chain.insertContent({ type: "text", text: value.text, marks: [{ type: "link", attrs }] }).run();
    setLinkDialog(null);
  }

  function removeLink() {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDialog(null);
  }

  if (!editor) return <div className={cn("min-h-40 animate-pulse rounded-md border border-border-strong bg-neutral-tint", className)} aria-label={`Loading ${ariaLabel}`} />;

  const run = () => editor.chain().focus();
  const t = toolbarState;
  const groups: EditorAction[][] = [
    [
      { id: "undo", label: "Undo", icon: Undo2, disabled: !t.canUndo, run: () => run().undo().run() },
      { id: "redo", label: "Redo", icon: Redo2, disabled: !t.canRedo, run: () => run().redo().run() },
    ],
    [
      { id: "heading", label: "Heading", icon: Heading2, active: t.heading, run: () => run().toggleHeading({ level: 2 }).run() },
      { id: "bold", label: "Bold", icon: Bold, active: t.bold, run: () => run().toggleBold().run() },
      { id: "italic", label: "Italic", icon: Italic, active: t.italic, run: () => run().toggleItalic().run() },
      { id: "underline", label: "Underline", icon: UnderlineIcon, active: t.underline, run: () => run().toggleUnderline().run() },
      { id: "strike", label: "Strikethrough", icon: Strikethrough, active: t.strike, run: () => run().toggleStrike().run() },
    ],
    [
      { id: "bullet", label: "Bullet list", icon: List, active: t.bulletList, run: () => run().toggleBulletList().run() },
      { id: "ordered", label: "Numbered list", icon: ListOrdered, active: t.orderedList, run: () => run().toggleOrderedList().run() },
      { id: "quote", label: "Block quote", icon: Quote, active: t.blockquote, run: () => run().toggleBlockquote().run() },
    ],
    [
      { id: "left", label: "Align left", icon: AlignLeft, active: t.alignLeft, run: () => run().setTextAlign("left").run() },
      { id: "center", label: "Align center", icon: AlignCenter, active: t.alignCenter, run: () => run().setTextAlign("center").run() },
      { id: "right", label: "Align right", icon: AlignRight, active: t.alignRight, run: () => run().setTextAlign("right").run() },
    ],
    [
      { id: "link", label: t.link ? "Edit link" : "Add link", icon: Link2, active: t.link, run: openLinkDialog },
      { id: "unlink", label: "Remove link", icon: Unlink, disabled: !t.link, run: () => run().unsetLink().run() },
      { id: "clear", label: "Clear formatting", icon: RemoveFormatting, run: () => run().clearNodes().unsetAllMarks().run() },
    ],
  ];
  // In the context menu, linking needs selected text (or an existing link to edit).
  const menuGroups = groups.map((group) => group.map((action) => (action.id === "link" ? { ...action, disabled: !(t.hasSelection || t.link) } : action)));

  return (
    <div className={cn("mt-2 overflow-hidden rounded-md border border-border-strong bg-surface focus-within:border-accent-strong focus-within:ring-1 focus-within:ring-accent-strong", className)}>
      <div role="toolbar" aria-label={`${ariaLabel} formatting`} className="flex flex-wrap items-center gap-0.5 border-b border-border bg-canvas px-2 py-1.5">
        {groups.map((group, index) => (
          <Fragment key={index}>
            {index > 0 ? <span className="mx-1 h-5 w-px bg-border" /> : null}
            {group.map((action) => { const Icon = action.icon; return <ToolbarButton key={action.id} label={action.label} active={action.active} disabled={disabled || action.disabled} onClick={action.run}><Icon className="h-4 w-4" /></ToolbarButton>; })}
          </Fragment>
        ))}
      </div>
      <div onContextMenu={(event) => { if (disabled || event.shiftKey) return; event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY }); }}>
        <EditorContent editor={editor} />
      </div>
      {contextMenu ? <EditorContextMenu x={contextMenu.x} y={contextMenu.y} groups={menuGroups} onClose={() => setContextMenu(null)} /> : null}
      {linkDialog ? <LinkDialog initial={linkDialog.initial} needsText={linkDialog.needsText} onSubmit={applyLink} onRemove={removeLink} onClose={() => setLinkDialog(null)} /> : null}
      {maxLength ? <div className="border-t border-border px-3 py-1.5 text-right text-[10.5px] text-ink-muted" aria-live="polite">{editor.storage.characterCount.characters()} of {maxLength} characters</div> : null}
    </div>
  );
}
