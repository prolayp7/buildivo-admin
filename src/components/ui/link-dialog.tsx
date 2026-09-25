"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, FileText, FolderTree, LoaderCircle, Package, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { collectionFromApi } from "@/lib/api-response";
import { cn } from "@/lib/cn";

export type LinkKind = "product" | "category" | "blog" | "external";
export type LinkSubmit = { href: string; newTab: boolean; nofollow: boolean; text: string };
export type LinkInitial = { href: string; target: string | null; rel: string | null } | null;
type Choice = { key: string; title: string; subtitle: string; href: string };

const KINDS: { id: LinkKind; label: string; icon: typeof Package }[] = [
  { id: "product", label: "Product", icon: Package },
  { id: "category", label: "Category", icon: FolderTree },
  { id: "blog", label: "Blog post", icon: FileText },
  { id: "external", label: "External URL", icon: ExternalLink },
];
const inputClass = "mt-1.5 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "block text-xs font-semibold text-ink-secondary";

// Storefront URL patterns (buildivo src/app/(storefront)): /p/[slug], /c/[slug], /blog/[slug].
const PREFIX: Record<Exclude<LinkKind, "external">, string> = { product: "/p/", category: "/c/", blog: "/blog/" };
function inferKind(href: string): LinkKind {
  return (Object.keys(PREFIX) as (keyof typeof PREFIX)[]).find((kind) => href.startsWith(PREFIX[kind])) ?? "external";
}
function normaliseExternal(value: string) {
  const url = value.trim();
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url) ? url : `https://${url}`;
}

type Item = { title?: string; slug?: string; sku?: string; status?: string; parent?: { title?: string } | null };
async function fetchList(url: string): Promise<Item[]> {
  const response = await fetch(url, { cache: "no-store" });
  return response.ok ? collectionFromApi<Item>(await response.json().catch(() => ({}))) : [];
}
const toChoices = (kind: Exclude<LinkKind, "external">, items: Item[]): Choice[] =>
  items.filter((item) => item.slug && item.title).map((item) => ({
    key: `${kind}-${item.slug}`,
    title: item.title as string,
    subtitle: [kind === "category" ? item.parent?.title : null, kind === "product" ? item.sku : null, kind === "blog" && item.status !== "PUBLISHED" ? "Draft" : null].filter(Boolean).join(" · ") || `${PREFIX[kind]}${item.slug}`,
    href: `${PREFIX[kind]}${item.slug}`,
  }));

export function LinkDialog({ initial, needsText, onSubmit, onRemove, onClose }: {
  initial: LinkInitial;
  needsText: boolean;
  onSubmit: (value: LinkSubmit) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const startKind = initial ? inferKind(initial.href) : "product";
  const [kind, setKind] = useState<LinkKind>(startKind);
  const [href, setHref] = useState(initial?.href ?? "");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [newTab, setNewTab] = useState(initial ? initial.target === "_blank" : startKind === "external");
  const [nofollow, setNofollow] = useState(Boolean(initial?.rel?.includes("nofollow")));
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (kind === "external") return;
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      if (kind === "product" && !query.trim()) { setChoices([]); return; }
      setLoading(true);
      const url = kind === "product" ? `/api/products?q=${encodeURIComponent(query.trim())}&perPage=8`
        : kind === "category" ? "/api/catalog/categories?page=1&perPage=100"
        : "/api/blog/posts?perPage=100";
      const items = await fetchList(url).catch(() => []);
      if (id !== requestId.current) return;
      const all = toChoices(kind, items);
      const needle = query.trim().toLowerCase();
      setChoices(kind === "product" || !needle ? all : all.filter((choice) => `${choice.title} ${choice.href}`.toLowerCase().includes(needle)));
      setLoading(false);
    }, kind === "product" ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [kind, query]);

  function changeKind(next: LinkKind) {
    if (next === kind) return;
    setKind(next); setQuery(""); setChoices([]); setError("");
    if (inferKind(href) !== next) setHref("");
    setNewTab(next === "external");
  }

  function pick(choice: Choice) {
    setHref(choice.href); setError("");
    if (!text.trim()) setText(choice.title);
  }

  function submit() {
    const finalHref = kind === "external" ? (href.trim() ? normaliseExternal(href) : "") : href;
    if (!finalHref) { setError(kind === "external" ? "Enter a URL." : `Choose a ${KINDS.find((k) => k.id === kind)?.label.toLowerCase()} to link to.`); return; }
    if (needsText && !text.trim()) { setError("Enter the link text."); return; }
    onSubmit({ href: finalHref, newTab, nofollow, text: text.trim() });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit link" : "Insert link"}</DialogTitle>
          <DialogDescription>Link to a page on your store or to another website.</DialogDescription>
        </DialogHeader>

        <div role="tablist" aria-label="Link type" className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1 sm:grid-cols-4">
          {KINDS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={kind === id} onClick={() => changeKind(id)} className={cn("flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors", kind === id ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink")}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {kind === "external" ? (
          <label className={labelClass}>URL<input autoFocus value={href} onChange={(event) => { setHref(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submit(); } }} placeholder="https://example.com/page" className={inputClass} /></label>
        ) : (
          <div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === "product" ? "Search products by name or SKU…" : `Search ${kind === "category" ? "categories" : "blog posts"}…`} aria-label="Search" className="h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong" />
            </label>
            <div role="listbox" aria-label="Link target" className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border">
              {loading ? <p className="flex items-center justify-center gap-2 p-5 text-xs text-ink-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Loading…</p>
                : choices.length ? choices.map((choice) => (
                  <button key={choice.key} type="button" role="option" aria-selected={href === choice.href} onClick={() => pick(choice)} className={cn("flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-canvas", href === choice.href && "bg-accent-tint")}>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-ink">{choice.title}</span><span className="block truncate text-[11.5px] text-ink-muted">{choice.subtitle}</span></span>
                    {href === choice.href ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
                  </button>
                ))
                : <p className="p-5 text-center text-xs text-ink-muted">{kind === "product" && !query.trim() ? "Type to search your products." : "No matches."}</p>}
            </div>
            {href && inferKind(href) === kind ? <p className="mt-2 text-xs text-ink-muted">Links to <span className="font-mono text-ink-secondary">{href}</span></p> : null}
          </div>
        )}

        {needsText ? <label className={labelClass}>Link text<input value={text} onChange={(event) => { setText(event.target.value); setError(""); }} placeholder="The words readers will click" className={inputClass} /></label> : null}

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-secondary"><input type="checkbox" checked={newTab} onChange={(event) => setNewTab(event.target.checked)} className="h-4 w-4 accent-ink" />Open in a new tab</label>
          {kind === "external" ? <label className="flex items-center gap-2 text-[13px] font-medium text-ink-secondary"><input type="checkbox" checked={nofollow} onChange={(event) => setNofollow(event.target.checked)} className="h-4 w-4 accent-ink" />Add nofollow</label> : null}
        </div>

        {error ? <p role="alert" className="text-xs text-danger-tint-ink">{error}</p> : null}

        <DialogFooter>
          {initial ? <button type="button" onClick={onRemove} className="mr-auto h-9 rounded-md px-3 text-xs font-semibold text-danger hover:bg-danger-tint">Remove link</button> : null}
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary hover:bg-canvas">Cancel</button>
          <button type="button" onClick={submit} className="h-9 rounded-md bg-ink px-4 text-xs font-semibold text-white hover:bg-[#1d2939]">{initial ? "Update link" : "Insert link"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
