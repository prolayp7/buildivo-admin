"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { Image as ImageIcon, LoaderCircle, Search, X } from "lucide-react";
import { collectionFromApi } from "@/lib/api-response";
import { mediaFileUrl } from "@/lib/media";

export interface PickedProduct {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  price: number | null;
}

interface ApiProductResult {
  id: number;
  title: string;
  slug: string;
  featuredMedia: { url: string } | null;
  variants: { price: string; salePrice: string | null; isDefault: boolean }[];
}

function toPicked(product: ApiProductResult): PickedProduct {
  const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    image: product.featuredMedia?.url ?? null,
    price: variant ? Number(variant.salePrice ?? variant.price) : null,
  };
}

function Thumb({ image, size }: { image: string | null; size: number }) {
  const src = image ? (image.startsWith("/uploads/") ? mediaFileUrl(image) : image) : null;
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-neutral-tint" style={{ width: size, height: size }}>
      {src ? <NextImage unoptimized src={src} width={size} height={size} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-4 w-4 text-ink-faint" />}
    </span>
  );
}

/** Debounced product search-and-select, showing a thumbnail + title + price
 * preview of the actual selected product - so the admin sees exactly what a
 * linked slide will resolve to before saving. */
export function ProductPicker({ value, onChange }: { value: PickedProduct | null; onChange: (product: PickedProduct | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !query.trim()) { setResults([]); return; }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/products?q=${encodeURIComponent(query.trim())}&perPage=8`);
        const payload = await response.json().catch(() => ({}));
        setResults(collectionFromApi<ApiProductResult>(payload));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-canvas p-3">
        <Thumb image={value.image} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{value.title}</p>
          <p className="text-xs text-ink-muted">{value.price != null ? `£${value.price.toFixed(2)}` : "No price set"}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint" aria-label="Remove linked product">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search products by name or SKU"
          className="h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-[13px] outline-none focus:border-accent-strong"
        />
      </label>
      {open && query.trim() ? (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
          {searching ? (
            <div className="flex items-center justify-center p-4"><LoaderCircle className="h-4 w-4 animate-spin text-ink-muted" /></div>
          ) : results.length ? (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => { onChange(toPicked(product)); setOpen(false); setQuery(""); }}
                className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-neutral-tint"
              >
                <Thumb image={product.featuredMedia?.url ?? null} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{product.title}</p>
                  <p className="text-xs text-ink-muted">{(() => { const v = product.variants.find((x) => x.isDefault) ?? product.variants[0]; return v ? `£${Number(v.salePrice ?? v.price).toFixed(2)}` : "No price set"; })()}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="p-4 text-center text-xs text-ink-muted">No products found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
