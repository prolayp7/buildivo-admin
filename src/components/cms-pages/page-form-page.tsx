"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, LoaderCircle, Lock, Save } from "lucide-react";
import { BlogContentBlocks, blocksToHtml, hasContent, newBlock, type ContentBlock } from "@/components/blog/blog-content-blocks";
import { SeoPanel, ScoreRing } from "@/components/blog/seo-panel";
import { analyzeSeo } from "@/components/blog/seo-analysis";
import { pageBlocksFromJson, pageBlocksToJson } from "@/components/cms-pages/page-blocks";

const SITE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3002";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "text-[13px] font-semibold text-ink-secondary";
const cardClass = "rounded-xl border border-border bg-surface p-5 shadow-card";
function message(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function PageFormPage({ pageId }: { pageId?: number }) {
  const router = useRouter(), editing = Number.isInteger(pageId);
  const [loading, setLoading] = useState(Boolean(editing));
  const [title, setTitle] = useState(""), [slug, setSlug] = useState(""), [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [isSystemPage, setIsSystemPage] = useState(false), [editingSlug, setEditingSlug] = useState(false);
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => [newBlock("text")]);
  const [metaTitle, setMetaTitle] = useState(""), [metaDescription, setMetaDescription] = useState(""), [keywords, setKeywords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false), [error, setError] = useState("");

  useEffect(() => { if (!editing) return; const timer = window.setTimeout(async () => { try { const response = await fetch(`/api/cms/pages/${pageId}`); const payload = await response.json(); if (!response.ok) throw new Error(message(payload, "Page could not be loaded.")); const item = payload.data ?? payload; setTitle(item.title); setSlug(item.slug); setStatus(item.status); setIsSystemPage(Boolean(item.isSystemPage)); setMetaTitle(item.metaTitle ?? ""); setMetaDescription(item.metaDescription ?? ""); setKeywords(typeof item.focusKeyword === "string" ? item.focusKeyword.split(",").map((keyword: string) => keyword.trim()).filter(Boolean) : []); setBlocks(pageBlocksFromJson(item.contentBlocks)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Page could not be loaded."); } finally { setLoading(false); } }, 0); return () => window.clearTimeout(timer); }, [pageId, editing]);

  const content = useMemo(() => blocksToHtml(blocks), [blocks]);
  // One analysis per keyword; the first (primary) keyword drives the headline score.
  const results = useMemo(() => (keywords.length ? keywords : [""]).map((focusKeyword) => analyzeSeo({ title, slug, metaTitle, metaDescription, excerpt: "", focusKeyword, contentHtml: content, siteHost: SITE_HOST })), [title, slug, metaTitle, metaDescription, keywords, content]);
  const result = results[0];

  function updateTitle(value: string) { const generated = slugify(title); setTitle(value); if (!isSystemPage && (!slug || slug === generated)) setSlug(slugify(value)); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !slug.trim()) { setError("Page title and friendly URL are required."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(editing ? `/api/cms/pages/${pageId}` : "/api/cms/pages", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), slug: slug.trim(), status, contentBlocks: hasContent(blocks) ? pageBlocksToJson(blocks) : [], metaTitle: metaTitle.trim() || null, metaDescription: metaDescription.trim() || null, focusKeyword: keywords.join(", ") || null }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, "Page could not be saved."));
      router.push("/cms/pages"); router.refresh();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Page could not be saved."); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-80 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" /></div>;
  return (
    <form onSubmit={(event) => void submit(event)} className="w-full pb-20">
      <nav className="flex items-center gap-1.5 text-xs text-ink-muted"><Link href="/cms/pages" className="hover:text-ink">Pages</Link><ChevronRight className="h-3.5 w-3.5" /><span>{editing ? "Edit page" : "Add page"}</span></nav>
      <h1 className="mt-2 text-[22px] font-semibold text-ink">{editing ? "Edit page" : "Add page"}</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Standalone storefront content, built from text sections, images and videos.</p>
      {error ? <div role="alert" className="mt-4 flex gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className={cardClass}>
            <input autoFocus={!editing} value={title} onChange={(event) => updateTitle(event.target.value)} maxLength={255} placeholder="Add page title" aria-label="Page title" className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-lg font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-accent-strong" />
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-muted">
              <span className="font-semibold text-ink-secondary">Permalink:</span>
              <span className="break-all">{SITE_URL}/</span>
              {editingSlug
                ? <input autoFocus value={slug} onChange={(event) => setSlug(slugify(event.target.value))} onBlur={() => setEditingSlug(false)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setEditingSlug(false); } }} aria-label="Friendly URL" className="h-7 min-w-40 rounded border border-border-strong px-2 font-mono text-xs text-ink outline-none focus:border-accent-strong" />
                : <span className="font-mono text-ink">{slug || "page-url"}</span>}
              {isSystemPage
                ? <span title="This is a system page. Its URL is used by the storefront and can't be changed." className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11.5px] font-semibold text-ink-muted"><Lock className="h-3 w-3" />System page</span>
                : <button type="button" onClick={() => setEditingSlug((value) => !value)} className="rounded border border-border px-2 py-0.5 text-[11.5px] font-semibold text-ink-secondary hover:bg-canvas">{editingSlug ? "Done" : "Edit"}</button>}
            </div>
            <div className="mt-5">
              <BlogContentBlocks blocks={blocks} onChange={setBlocks} sectionHeadings mediaCollection="pages" />
              <p className="mt-2 text-xs text-ink-muted">{result.wordCount.toLocaleString("en-GB")} words · about {result.readingMinutes} min read</p>
            </div>
          </section>

          <SeoPanel pathPrefix="" noun="page" results={results} title={title} excerpt="" slug={slug} siteHost={SITE_HOST} keywords={keywords} setKeywords={setKeywords} metaTitle={metaTitle} setMetaTitle={setMetaTitle} metaDescription={metaDescription} setMetaDescription={setMetaDescription} />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-5">
          <section className={cardClass}>
            <h2 className="text-sm font-semibold text-ink">Publish</h2>
            <label className={`${labelClass} mt-3 block`}>Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={inputClass}><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option></select></label>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-2.5"><ScoreRing score={result.seoScore} size={44} label="SEO score" /><span className="text-[11.5px] font-semibold leading-tight text-ink-secondary">SEO<br />score</span></div>
              <div className="flex items-center gap-2.5"><ScoreRing score={result.readabilityScore} size={44} label="Readability score" /><span className="text-[11.5px] font-semibold leading-tight text-ink-secondary">Readability</span></div>
            </div>
          </section>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64"><div className="flex items-center justify-between"><Link href="/cms/pages" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3.5 text-[13px] font-semibold text-ink-secondary"><ArrowLeft className="h-4 w-4" />Back to pages</Link><button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editing ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}{editing ? "Save changes" : "Create page"}</button></div></div>
    </form>
  );
}
