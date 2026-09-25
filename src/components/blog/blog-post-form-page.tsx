"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, LoaderCircle, Save } from "lucide-react";
import { BlogContentBlocks, blocksFromPost, blocksToHtml, hasContent, newBlock, type ContentBlock } from "@/components/blog/blog-content-blocks";
import { TagInput } from "@/components/ui/tag-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SeoPanel, ScoreRing } from "@/components/blog/seo-panel";
import { analyzeSeo } from "@/components/blog/seo-analysis";
import { collectionFromApi } from "@/lib/api-response";

type Option = { id: number; title?: string; name?: string };
const SITE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3002";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "text-[13px] font-semibold text-ink-secondary";
const cardClass = "rounded-xl border border-border bg-surface p-5 shadow-card";
function message(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function BlogPostFormPage({ postId }: { postId?: number }) {
  const router = useRouter(), editing = Number.isInteger(postId);
  const [categories, setCategories] = useState<Option[]>([]), [authors, setAuthors] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(""), [slug, setSlug] = useState(""), [excerpt, setExcerpt] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => [newBlock("text")]);
  const [blogCategoryId, setBlogCategoryId] = useState(""), [authorId, setAuthorId] = useState(""), [tags, setTags] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false), [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [metaTitle, setMetaTitle] = useState(""), [metaDescription, setMetaDescription] = useState(""), [keywords, setKeywords] = useState<string[]>([]);
  const [editingSlug, setEditingSlug] = useState(false);
  const [saving, setSaving] = useState(false), [error, setError] = useState("");

  useEffect(() => { const timer = window.setTimeout(async () => { try { const [categoriesResponse, authorsResponse] = await Promise.all([fetch("/api/blog/categories"), fetch("/api/blog/authors")]); setCategories(collectionFromApi<Option>(await categoriesResponse.json())); setAuthors(collectionFromApi<Option>(await authorsResponse.json())); if (editing) { const response = await fetch(`/api/blog/posts/${postId}`); const payload = await response.json(); if (!response.ok) throw new Error(message(payload, "Post could not be loaded.")); const item = payload.data ?? payload; setTitle(item.title); setSlug(item.slug); setExcerpt(item.excerpt ?? ""); setBlocks(blocksFromPost(item)); setBlogCategoryId(item.blogCategoryId ? String(item.blogCategoryId) : ""); setAuthorId(item.authorId ? String(item.authorId) : ""); setTags(Array.isArray(item.tags) ? item.tags.filter((tag: unknown): tag is string => typeof tag === "string") : []); setIsFeatured(Boolean(item.isFeatured)); setStatus(item.status); setMetaTitle(item.metaTitle ?? ""); setMetaDescription(item.metaDescription ?? ""); setKeywords(typeof item.focusKeyword === "string" ? item.focusKeyword.split(",").map((keyword: string) => keyword.trim()).filter(Boolean) : []); } } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Post could not be loaded."); } finally { setLoading(false); } }, 0); return () => window.clearTimeout(timer); }, [postId, editing]);

  const content = useMemo(() => blocksToHtml(blocks), [blocks]);
  // One analysis per keyword; the first (primary) keyword drives the headline score.
  const results = useMemo(() => (keywords.length ? keywords : [""]).map((focusKeyword) => analyzeSeo({ title, slug, metaTitle, metaDescription, excerpt, focusKeyword, contentHtml: content, siteHost: SITE_HOST })), [title, slug, metaTitle, metaDescription, excerpt, keywords, content]);
  const result = results[0];

  function updateTitle(value: string) { const generated = slugify(title); setTitle(value); if (!slug || slug === generated) setSlug(slugify(value)); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !slug.trim() || !hasContent(blocks)) { setError("Title, friendly URL and at least one content block are required."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(editing ? `/api/blog/posts/${postId}` : "/api/blog/posts", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), slug: slug.trim(), excerpt: excerpt.trim() || undefined, content, contentBlocks: blocks, blogCategoryId: blogCategoryId ? Number(blogCategoryId) : undefined, authorId: authorId ? Number(authorId) : undefined, tags, isFeatured, status, metaTitle: metaTitle.trim() || null, metaDescription: metaDescription.trim() || null, focusKeyword: keywords.join(", ") || null }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, "Post could not be saved."));
      router.push("/blog"); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Post could not be saved."); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-80 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" /></div>;
  return (
    <form onSubmit={(event) => void submit(event)} className="w-full pb-20">
      <nav className="flex items-center gap-1.5 text-xs text-ink-muted"><Link href="/blog" className="hover:text-ink">Blog</Link><ChevronRight className="h-3.5 w-3.5" /><span>{editing ? "Edit post" : "Add post"}</span></nav>
      <h1 className="mt-2 text-[22px] font-semibold text-ink">{editing ? "Edit post" : "Add post"}</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Buying guides and news shown on the storefront blog.</p>
      {error ? <div role="alert" className="mt-4 flex gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className={cardClass}>
            <input autoFocus={!editing} value={title} onChange={(event) => updateTitle(event.target.value)} maxLength={255} placeholder="Add post title" aria-label="Post title" className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-lg font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-accent-strong" />
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-muted">
              <span className="font-semibold text-ink-secondary">Permalink:</span>
              <span className="break-all">{SITE_URL}/blog/</span>
              {editingSlug
                ? <input autoFocus value={slug} onChange={(event) => setSlug(slugify(event.target.value))} onBlur={() => setEditingSlug(false)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setEditingSlug(false); } }} aria-label="Friendly URL" className="h-7 min-w-40 rounded border border-border-strong px-2 font-mono text-xs text-ink outline-none focus:border-accent-strong" />
                : <span className="font-mono text-ink">{slug || "post-url"}</span>}
              <button type="button" onClick={() => setEditingSlug((value) => !value)} className="rounded border border-border px-2 py-0.5 text-[11.5px] font-semibold text-ink-secondary hover:bg-canvas">{editingSlug ? "Done" : "Edit"}</button>
            </div>

            <div className="mt-5">
              <BlogContentBlocks blocks={blocks} onChange={setBlocks} />
              <p className="mt-2 text-xs text-ink-muted">{result.wordCount.toLocaleString("en-GB")} words · about {result.readingMinutes} min read</p>
            </div>

            <label className={`${labelClass} mt-5 block`}>Excerpt<textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} rows={2} placeholder="Short summary shown on blog listing cards." className={`${inputClass} h-auto resize-y py-3`} /></label>
          </section>

          <SeoPanel title={title} excerpt={excerpt} slug={slug} siteHost={SITE_HOST} keywords={keywords} setKeywords={setKeywords} results={results} metaTitle={metaTitle} setMetaTitle={setMetaTitle} metaDescription={metaDescription} setMetaDescription={setMetaDescription} />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-5">
          <section className={cardClass}>
            <h2 className="text-sm font-semibold text-ink">Publish</h2>
            <label className={`${labelClass} mt-3 block`}>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={inputClass}><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option></select></label>
            <label className="mt-4 flex items-center gap-3 text-[13px] font-semibold text-ink-secondary"><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} className="h-4 w-4 accent-ink" />Feature this post</label>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-2.5"><ScoreRing score={result.seoScore} size={44} label="SEO score" /><span className="text-[11.5px] font-semibold leading-tight text-ink-secondary">SEO<br />score</span></div>
              <div className="flex items-center gap-2.5"><ScoreRing score={result.readabilityScore} size={44} label="Readability score" /><span className="text-[11.5px] font-semibold leading-tight text-ink-secondary">Readability</span></div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-sm font-semibold text-ink">Organise</h2>
            <div className="mt-3"><span className={labelClass}>Category</span><SearchableSelect ariaLabel="Category" value={blogCategoryId} onChange={setBlogCategoryId} emptyLabel="No category" searchPlaceholder="Search categories…" options={categories.map((category) => ({ value: String(category.id), label: category.title ?? "" }))} /></div>
            <div className="mt-4"><span className={labelClass}>Author</span><SearchableSelect ariaLabel="Author" value={authorId} onChange={setAuthorId} emptyLabel="No author" searchPlaceholder="Search authors…" options={authors.map((author) => ({ value: String(author.id), label: author.name ?? "" }))} /></div>
            <div className="mt-4"><span className={labelClass}>Tags</span><TagInput tags={tags} onChange={setTags} placeholder="Type a tag, press Enter or comma" /><span className="mt-1.5 block text-[11.5px] text-ink-muted">Press Enter or comma to add a tag.</span></div>
          </section>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64"><div className="flex items-center justify-between"><Link href="/blog" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3.5 text-[13px] font-semibold text-ink-secondary"><ArrowLeft className="h-4 w-4" />Back to blog</Link><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editing ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}{editing ? "Save changes" : "Create post"}</button></div></div>
    </form>
  );
}
