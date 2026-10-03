"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import type { ProductListItem } from "@/lib/products";

export type CompatibleProduct = Pick<ProductListItem, "id" | "title" | "slug" | "sku">;

const inputClass = "h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";

export function CompatibilityProductsEditor({
  productId,
  selected,
  onChange,
}: {
  productId?: number;
  selected: CompatibleProduct[];
  onChange: (products: CompatibleProduct[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const search = query.trim();
    if (search.length < 2) {
      setResults([]);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/products?q=${encodeURIComponent(search)}&perPage=8`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof payload.message === "string" ? payload.message : "Products could not be searched.");
        setResults((payload.data ?? []).filter((item: ProductListItem) => item.id !== productId && !selected.some((current) => current.id === item.id)));
      } catch (searchError) {
        if (!(searchError instanceof DOMException && searchError.name === "AbortError")) {
          setError(searchError instanceof Error ? searchError.message : "Products could not be searched.");
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [productId, query, selected]);

  function add(product: ProductListItem) {
    onChange([...selected, { id: product.id, title: product.title, slug: product.slug, sku: product.sku }]);
    setQuery("");
    setResults([]);
  }

  return (
    <section className="border-t border-border pt-6">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-ink">Compatible products</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-muted">Link exact products that work together. Links apply in both directions and supplement automatic platform and specification matching.</p>
      </div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Search products to mark compatible</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product name, SKU or MPN" className={`${inputClass} pl-9 pr-10`} />
        {loading ? <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-muted" /> : null}
      </label>
      {error ? <p role="alert" className="mt-2 text-xs text-danger-tint-ink">{error}</p> : null}
      {query.trim().length >= 2 && !loading && !error ? (
        <div className="mt-2 max-h-64 max-w-xl overflow-y-auto rounded-md border border-border bg-surface" aria-live="polite">
          {results.length ? results.map((product) => (
            <button key={product.id} type="button" onClick={() => add(product)} className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-neutral-tint focus-visible:outline-2 focus-visible:outline-accent-strong">
              <span className="min-w-0"><span className="block truncate text-xs font-semibold text-ink">{product.title}</span><span className="mt-0.5 block truncate text-[10.5px] text-ink-muted">{product.sku || product.mpn || product.slug}</span></span>
              <Plus className="h-4 w-4 shrink-0 text-ink-muted" />
            </button>
          )) : <p className="px-3 py-3 text-xs text-ink-muted">No matching products found.</p>}
        </div>
      ) : null}
      {selected.length ? (
        <ul className="mt-3 max-w-xl divide-y divide-border rounded-md border border-border">
          {selected.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0"><span className="block truncate text-xs font-semibold text-ink">{product.title}</span><span className="mt-0.5 block truncate text-[10.5px] text-ink-muted">{product.sku || product.slug}</span></span>
              <button type="button" onClick={() => onChange(selected.filter((item) => item.id !== product.id))} aria-label={`Remove ${product.title} from compatible products`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink focus-visible:outline-2 focus-visible:outline-accent-strong"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-xs text-ink-muted">No explicit compatible products selected.</p>}
    </section>
  );
}
