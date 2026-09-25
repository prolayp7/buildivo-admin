"use client";

import { ChangeEvent, useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon, LoaderCircle, Plus, Trash2, Type, Upload, Video } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { mediaFileUrl } from "@/lib/media";
import { cn } from "@/lib/cn";

export type BlockType = "text" | "image" | "video";
export type TextBlock = { id: string; type: "text"; html: string; heading?: string };
export type ImageBlock = { id: string; type: "image"; url: string; alt: string; caption: string };
export type VideoBlock = { id: string; type: "video"; url: string; caption: string };
export type ContentBlock = TextBlock | ImageBlock | VideoBlock;

const inputClass = "mt-1.5 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "block text-xs font-semibold text-ink-secondary";
const meta: Record<BlockType, { label: string; icon: typeof Type }> = { text: { label: "Text", icon: Type }, image: { label: "Image", icon: ImageIcon }, video: { label: "Video", icon: Video } };

export function newBlock(type: BlockType): ContentBlock {
  const id = crypto.randomUUID();
  return type === "text" ? { id, type, html: "" } : type === "image" ? { id, type, url: "", alt: "", caption: "" } : { id, type, url: "", caption: "" };
}

export function youTubeId(url: string): string | null {
  const match = url.trim().match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
  return match ? match[1] : null;
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plainText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();

// Compiled HTML kept in BlogPost.content so search/SEO analysis and any HTML consumer keep working.
// Image src is stored as uploaded (may be a relative /uploads path); a storefront should prefer contentBlocks.
export function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks.map((block) => {
    if (block.type === "text") {
      const heading = block.heading?.trim() ? `<h2>${escapeHtml(block.heading.trim())}</h2>` : "";
      const body = plainText(block.html) || /<img|<iframe/i.test(block.html) ? block.html : "";
      return [heading, body].filter(Boolean).join("\n");
    }
    const caption = block.caption.trim() ? `<figcaption>${escapeHtml(block.caption.trim())}</figcaption>` : "";
    if (block.type === "image") return block.url ? `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt.trim())}" loading="lazy" />${caption}</figure>` : "";
    const id = youTubeId(block.url);
    return id ? `<figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${escapeHtml(block.caption.trim() || "YouTube video")}" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>${caption}</figure>` : "";
  }).filter(Boolean).join("\n");
}

export function hasContent(blocks: ContentBlock[]) {
  return blocks.some((block) => block.type === "text" ? plainText(block.html).length > 0 || Boolean(block.heading?.trim()) : block.type === "image" ? Boolean(block.url) : Boolean(youTubeId(block.url)));
}

// Posts created before blocks existed only have `content` HTML - show it as one text block.
export function blocksFromPost(post: { content?: string; contentBlocks?: unknown }): ContentBlock[] {
  if (Array.isArray(post.contentBlocks) && post.contentBlocks.length) {
    const blocks = post.contentBlocks.flatMap((raw): ContentBlock[] => {
      const item = raw as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id : crypto.randomUUID();
      const str = (value: unknown) => (typeof value === "string" ? value : "");
      if (item.type === "text") return [{ id, type: "text", html: str(item.html) }];
      if (item.type === "image") return [{ id, type: "image", url: str(item.url), alt: str(item.alt), caption: str(item.caption) }];
      if (item.type === "video") return [{ id, type: "video", url: str(item.url), caption: str(item.caption) }];
      return [];
    });
    if (blocks.length) return blocks;
  }
  return [{ ...(newBlock("text") as TextBlock), html: post.content ?? "" }];
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn("flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors disabled:cursor-not-allowed disabled:opacity-30", danger ? "hover:bg-danger-tint hover:text-danger" : "hover:bg-neutral-tint hover:text-ink")}>{children}</button>;
}

function AddButtons({ onAdd, size = "md" }: { onAdd: (type: BlockType) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {(Object.keys(meta) as BlockType[]).map((type) => {
        const { label, icon: Icon } = meta[type];
        return <button key={type} type="button" onClick={() => onAdd(type)} className={cn("inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface font-semibold text-ink-secondary transition-colors hover:border-ink hover:text-ink", size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-[13px]")}><Plus className="h-3.5 w-3.5" /><Icon className="h-3.5 w-3.5" />{label}</button>;
      })}
    </div>
  );
}

function InsertRow({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      {open ? <AddButtons size="sm" onAdd={(type) => { setOpen(false); onAdd(type); }} /> : <button type="button" onClick={() => setOpen(true)} aria-label="Insert a block here" title="Insert a block here" className="flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-muted hover:border-ink hover:text-ink"><Plus className="h-3.5 w-3.5" /></button>}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function ImageEditor({ block, onChange, collection }: { block: ImageBlock; onChange: (patch: Partial<ImageBlock>) => void; collection: string }) {
  const [uploading, setUploading] = useState(false), [error, setError] = useState(""), [pasted, setPasted] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setError("Choose a JPG, PNG or WebP image no larger than 2 MB."); return; }
    setUploading(true); setError("");
    try {
      const body = new FormData();
      body.set("file", file); body.set("ownerType", "LIBRARY"); body.set("ownerId", "0"); body.set("collection", collection); body.set("altText", block.alt.trim() || file.name);
      const response = await fetch("/api/media", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload?.message === "string" ? payload.message : "The image could not be uploaded.");
      onChange({ url: (payload.data ?? payload).url });
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "The image could not be uploaded."); } finally { setUploading(false); }
  }

  const src = block.url.startsWith("/uploads/") ? mediaFileUrl(block.url) : block.url;
  return (
    <div className="space-y-3">
      {block.url ? (
        <div className="relative flex max-h-72 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={block.alt || "Blog image preview"} className="max-h-72 w-auto object-contain" />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border-strong bg-canvas p-5 text-center">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white hover:bg-[#1d2939]">
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Upload image
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} disabled={uploading} className="sr-only" />
          </label>
          <p className="mt-2 text-xs text-ink-muted">JPG, PNG or WebP, up to 2 MB</p>
          <div className="mx-auto mt-4 flex max-w-md items-center gap-2">
            <input value={pasted} onChange={(event) => setPasted(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (pasted.trim()) onChange({ url: pasted.trim() }); } }} placeholder="…or paste an image URL and press Enter" aria-label="Image URL" className="h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong" />
          </div>
        </div>
      )}
      {error ? <p role="alert" className="text-xs text-danger-tint-ink">{error}</p> : null}
      {block.url ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={labelClass}>Alt text<input value={block.alt} onChange={(event) => onChange({ alt: event.target.value })} placeholder="Describe the image (helps SEO and accessibility)" className={inputClass} /></label>
            <label className={labelClass}>Caption (optional)<input value={block.caption} onChange={(event) => onChange({ caption: event.target.value })} placeholder="Shown under the image" className={inputClass} /></label>
          </div>
          <button type="button" onClick={() => onChange({ url: "" })} className="text-xs font-semibold text-ink-secondary underline underline-offset-2 hover:text-ink">Replace image</button>
        </>
      ) : null}
    </div>
  );
}

function VideoEditor({ block, onChange }: { block: VideoBlock; onChange: (patch: Partial<VideoBlock>) => void }) {
  const id = youTubeId(block.url);
  return (
    <div className="space-y-3">
      <label className={labelClass}>YouTube link<input value={block.url} onChange={(event) => onChange({ url: event.target.value })} placeholder="https://www.youtube.com/watch?v=…" className={inputClass} /></label>
      {block.url.trim() && !id ? <p role="alert" className="text-xs text-danger-tint-ink">That doesn&apos;t look like a YouTube link. Use a watch, youtu.be, shorts or embed URL.</p> : null}
      {id ? <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-ink"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="YouTube preview" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" className="h-full w-full" /></div> : null}
      <label className={labelClass}>Caption (optional)<input value={block.caption} onChange={(event) => onChange({ caption: event.target.value })} placeholder="Shown under the video" className={inputClass} /></label>
    </div>
  );
}

export function BlogContentBlocks({ blocks, onChange, sectionHeadings = false, mediaCollection = "blog" }: { blocks: ContentBlock[]; onChange: (blocks: ContentBlock[]) => void; sectionHeadings?: boolean; mediaCollection?: string }) {
  const update = (id: string, patch: Partial<ContentBlock>) => onChange(blocks.map((block) => (block.id === id ? ({ ...block, ...patch } as ContentBlock) : block)));
  const insert = (index: number, type: BlockType) => onChange([...blocks.slice(0, index), newBlock(type), ...blocks.slice(index)]);
  const move = (index: number, delta: -1 | 1) => { const next = [...blocks]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; onChange(next); };
  const remove = (index: number) => {
    const block = blocks[index];
    const filled = block.type === "text" ? plainText(block.html).length > 0 || Boolean(block.heading?.trim()) : Boolean(block.url);
    if (filled && !window.confirm(`Delete this ${meta[block.type].label.toLowerCase()} block?`)) return;
    onChange(blocks.filter((_, i) => i !== index));
  };

  return (
    <div>
      {blocks.map((block, index) => {
        const { label, icon: Icon } = meta[block.type];
        return (
          <div key={block.id}>
            {index > 0 ? <InsertRow onAdd={(type) => insert(index, type)} /> : null}
            <section className="rounded-lg border border-border bg-surface" aria-label={`${label} block ${index + 1}`}>
              <div className="flex items-center gap-2 border-b border-border bg-canvas px-3 py-1.5">
                <Icon className="h-4 w-4 text-ink-muted" />
                <span className="text-xs font-semibold text-ink-secondary">{label} <span className="font-normal text-ink-muted">· block {index + 1} of {blocks.length}</span></span>
                <div className="ml-auto flex items-center gap-0.5">
                  <IconButton label="Move block up" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></IconButton>
                  <IconButton label="Move block down" onClick={() => move(index, 1)} disabled={index === blocks.length - 1}><ArrowDown className="h-4 w-4" /></IconButton>
                  <IconButton label="Delete block" onClick={() => remove(index)} danger><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </div>
              <div className="p-3">
                {block.type === "text" ? (
                  <>
                    {sectionHeadings ? <input value={block.heading ?? ""} onChange={(event) => update(block.id, { heading: event.target.value })} placeholder="Section heading (optional)" aria-label={`Section ${index + 1} heading`} className="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-accent-strong" /> : null}
                    <RichTextEditor value={block.html} onChange={(html) => update(block.id, { html })} ariaLabel={`Text block ${index + 1}`} placeholder="Write this section…" minHeight="sm" />
                  </>
                )
                  : block.type === "image" ? <ImageEditor block={block} collection={mediaCollection} onChange={(patch) => update(block.id, patch)} />
                  : <VideoEditor block={block} onChange={(patch) => update(block.id, patch)} />}
              </div>
            </section>
          </div>
        );
      })}
      <div className={cn("rounded-lg border border-dashed border-border-strong bg-canvas p-4 text-center", blocks.length && "mt-3")}>
        <p className="mb-3 text-xs text-ink-muted">{blocks.length ? "Add another section" : "This post is empty. Add your first section"}</p>
        <AddButtons onAdd={(type) => insert(blocks.length, type)} />
      </div>
    </div>
  );
}
