"use client";

import { CURRENCY_SYMBOL } from "@/lib/currency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, LoaderCircle, Plus, Save, Search, Trash2 } from "lucide-react";

type Variant = { id: number; price: string; salePrice: string | null; isDefault: boolean };
type ProductOption = { id: number; title: string; variants: Variant[] };
type BundleItem = { productVariantId: number; productTitle: string; variantPrice: number; quantity: number };

const input = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none focus:border-accent-strong";
const label = "text-[13px] font-semibold text-ink-secondary";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function BundleForm({ id }: { id?: number }) {
  const router = useRouter();
  const editing = Boolean(id);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [items, setItems] = useState<BundleItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const productsResponse = await fetch("/api/products?perPage=200", { cache: "no-store" });
        const productsPayload = await productsResponse.json();
        setProducts((productsPayload.data ?? []) as ProductOption[]);
        if (editing) {
          const response = await fetch(`/api/bundles/${id}`, { cache: "no-store" });
          const payload = await response.json();
          const value = payload.data ?? payload;
          if (!response.ok) throw new Error(apiMessage(payload, "The bundle could not be loaded."));
          setTitle(value.title); setSlug(value.slug); setDescription(value.description ?? "");
          setBundlePrice(String(value.bundlePrice)); setStatus(value.status);
          setStartsAt(value.startsAt?.slice(0, 16) ?? ""); setEndsAt(value.endsAt?.slice(0, 16) ?? "");
          setItems(value.items.map((item: { productVariantId: number; quantity: number; productVariant: { price: string; salePrice: string | null; product: { title: string } } }) => ({
            productVariantId: item.productVariantId,
            productTitle: item.productVariant.product.title,
            variantPrice: Number(item.productVariant.salePrice ?? item.productVariant.price),
            quantity: item.quantity,
          })));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "The bundle could not be loaded.");
      } finally { setLoading(false); }
    }, 0);
    return () => clearTimeout(timer);
  }, [editing, id]);

  const filteredProducts = useMemo(() => products.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())).slice(0, 20), [products, q]);
  const regularTotal = useMemo(() => items.reduce((sum, item) => sum + item.variantPrice * item.quantity, 0), [items]);

  function addVariant(product: ProductOption, variant: Variant) {
    if (items.some((item) => item.productVariantId === variant.id)) return;
    setItems((current) => [...current, { productVariantId: variant.id, productTitle: product.title, variantPrice: Number(variant.salePrice ?? variant.price), quantity: 1 }]);
  }
  function setQty(variantId: number, quantity: number) { setItems((current) => current.map((item) => item.productVariantId === variantId ? { ...item, quantity: Math.max(1, quantity) } : item)); }
  function removeItem(variantId: number) { setItems((current) => current.filter((item) => item.productVariantId !== variantId)); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!items.length) { setError("Add at least one product to the bundle."); return; }
    if (startsAt && endsAt && startsAt >= endsAt) { setError("End date must be after the start date."); return; }
    setSaving(true); setError("");
    const body = {
      title, slug, description: description || undefined, bundlePrice: Number(bundlePrice), status,
      startsAt: startsAt || undefined, endsAt: endsAt || undefined,
      items: items.map((item) => ({ productVariantId: item.productVariantId, quantity: item.quantity })),
    };
    try {
      const response = await fetch(editing ? `/api/bundles/${id}` : "/api/bundles", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "The bundle could not be saved."));
      router.push("/bundles");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The bundle could not be saved.");
    } finally { setSaving(false); }
  }

  if (loading) return <LoaderCircle className="mx-auto mt-32 h-6 w-6 animate-spin text-ink-muted" />;

  return (
    <form onSubmit={(event) => void submit(event)} className="w-full pb-20">
      <p className="text-xs text-ink-muted">Marketing / Bundles</p>
      <h1 className="mt-2 text-[22px] font-semibold text-ink">{editing ? "Edit" : "Add"} bundle</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">A fixed-price grouping of products sold together, priced below the sum of its parts.</p>
      {error ? <div role="alert" className="mt-4 flex gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink"><AlertTriangle className="h-4 w-4" />{error}</div> : null}

      <section className="mt-4 space-y-6 rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <label className={label}>Bundle title<input value={title} onChange={(event) => { setTitle(event.target.value); if (!editing) setSlug(slugify(event.target.value)); }} className={input} /></label>
          <label className={label}>Status<select value={status} onChange={(event) => setStatus(event.target.value as "ACTIVE" | "INACTIVE")} className={input}><option value="ACTIVE">Enabled</option><option value="INACTIVE">Disabled</option></select></label>
        </div>
        <label className={label}>Slug<input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} className={input} /></label>
        <label className={`${label} block`}>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={`${input} h-auto py-3`} /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={label}>Starts<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={input} /></label>
          <label className={label}>Ends<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={input} /></label>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Bundle items</h2>
        <label className="relative mt-3 block max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search products to add" className="h-9 w-full rounded-md border border-border-strong pl-9 pr-3 text-xs" /></label>
        {q ? (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border">
            {filteredProducts.map((product) => (
              <div key={product.id} className="border-b border-border p-2 last:border-0">
                <p className="px-1 text-xs font-semibold text-ink">{product.title}</p>
                {product.variants.map((variant) => {
                  const added = items.some((item) => item.productVariantId === variant.id);
                  return <button key={variant.id} type="button" onClick={() => addVariant(product, variant)} disabled={added} className="mt-1 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-ink-secondary hover:bg-neutral-tint disabled:opacity-50">
                    <span>{CURRENCY_SYMBOL}{Number(variant.salePrice ?? variant.price).toFixed(2)}{variant.isDefault ? " · default" : ""}</span>
                    {added ? <Check className="h-3.5 w-3.5 text-positive-tint-ink" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>;
                })}
              </div>
            ))}
            {!filteredProducts.length ? <p className="p-3 text-center text-xs text-ink-muted">No matching products.</p> : null}
          </div>
        ) : null}

        {items.length ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-left">
              <thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-ink-muted"><tr><th className="px-3 py-3">Product</th><th className="px-3 py-3">Unit price</th><th className="px-3 py-3">Qty</th><th className="w-12 px-3 py-3" /></tr></thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.productVariantId}>
                    <td className="px-3 py-3 text-xs font-semibold text-ink">{item.productTitle}</td>
                    <td className="px-3 py-3 text-xs text-ink-muted">{CURRENCY_SYMBOL}{item.variantPrice.toFixed(2)}</td>
                    <td className="px-3 py-3"><input type="number" min="1" value={item.quantity} onChange={(event) => setQty(item.productVariantId, Number(event.target.value))} className="h-8 w-16 rounded-md border border-border-strong px-2 text-xs" /></td>
                    <td className="px-3 py-3"><button type="button" onClick={() => removeItem(item.productVariantId)} aria-label="Remove item" className="flex h-7 w-7 items-center justify-center rounded-md text-danger hover:bg-danger-tint"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 rounded-md border border-dashed border-border-strong p-5 text-center text-xs text-ink-muted">Search above and add at least one product.</p>}

        <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
          <p className="text-xs text-ink-muted">Regular total: <span className="font-semibold text-ink">{CURRENCY_SYMBOL}{regularTotal.toFixed(2)}</span></p>
          <label className={label}>Bundle price ({CURRENCY_SYMBOL})<input type="number" min="0.01" step="0.01" value={bundlePrice} onChange={(event) => setBundlePrice(event.target.value)} className={input} /></label>
        </div>
        {bundlePrice && regularTotal > 0 ? <p className="mt-2 text-xs text-positive-tint-ink">Customer saves {CURRENCY_SYMBOL}{Math.max(0, regularTotal - Number(bundlePrice)).toFixed(2)} vs. buying separately.</p> : null}
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-between border-t border-border bg-surface/95 px-4 py-3 lg:left-64">
        <Link href="/bundles" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-xs font-semibold"><ArrowLeft className="h-4 w-4" />Back</Link>
        <button disabled={saving || !title || !slug || !bundlePrice || !items.length} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save bundle</button>
      </div>
    </form>
  );
}
