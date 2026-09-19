"use client";

import { CURRENCY_SYMBOL } from "@/lib/currency";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, Plus, Tag, Trash2 } from "lucide-react";

type Variant = { id: number; title: string; price: string; salePrice: string | null };
type Tier = { id: number; minQty: number; unitPrice: string };

function message(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload && typeof (payload as { message?: unknown }).message === "string") return (payload as { message: string }).message; return fallback; }

export function ProductPriceTiersEditor({ productId }: { productId: number }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [tiersByVariant, setTiersByVariant] = useState<Record<number, Tier[]>>({});
  const [drafts, setDrafts] = useState<Record<number, { minQty: string; unitPrice: string }>>({});
  const [loading, setLoading] = useState(true);
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const variantsResponse = await fetch(`/api/products/${productId}/variants`, { cache: "no-store" });
      const variantsPayload = await variantsResponse.json();
      if (!variantsResponse.ok) throw new Error(message(variantsPayload, "Variants could not be loaded."));
      const loadedVariants = (variantsPayload.data ?? variantsPayload) as Variant[];
      setVariants(loadedVariants);
      const entries = await Promise.all(loadedVariants.map(async (variant) => {
        const response = await fetch(`/api/products/${productId}/variants/${variant.id}/price-tiers`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        return [variant.id, (payload.data ?? payload ?? []) as Tier[]] as const;
      }));
      setTiersByVariant(Object.fromEntries(entries));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Wholesale pricing could not be loaded.");
    } finally { setLoading(false); }
  }, [productId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function addTier(variant: Variant) {
    const draft = drafts[variant.id];
    const minQty = Number(draft?.minQty);
    const unitPrice = Number(draft?.unitPrice);
    if (!minQty || minQty < 2) { setError("Minimum quantity must be 2 or more."); return; }
    if (!unitPrice || unitPrice <= 0) { setError("Unit price must be greater than zero."); return; }
    setSavingVariantId(variant.id); setError("");
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variant.id}/price-tiers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minQty, unitPrice }) });
      if (!response.ok) throw new Error(message(await response.json().catch(() => ({})), "The price tier could not be saved."));
      setDrafts((current) => ({ ...current, [variant.id]: { minQty: "", unitPrice: "" } }));
      await load();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "The price tier could not be saved.");
    } finally { setSavingVariantId(null); }
  }

  async function removeTier(variant: Variant, tier: Tier) {
    setSavingVariantId(variant.id); setError("");
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variant.id}/price-tiers/${tier.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) throw new Error(message(await response.json().catch(() => ({})), "The price tier could not be removed."));
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "The price tier could not be removed.");
    } finally { setSavingVariantId(null); }
  }

  if (loading) return <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-ink-muted" /></div>;

  return (
    <div className="space-y-6">
      <div><h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink"><Tag className="h-4 w-4" />Bulk &amp; wholesale pricing</h2><p className="mt-1 text-xs leading-5 text-ink-muted">Quantity-break pricing: a customer ordering at least the given quantity pays the tier&rsquo;s unit price instead of the regular or sale price.</p></div>
      {error ? <p role="alert" className="rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">{error}</p> : null}
      {variants.map((variant) => {
        const tiers = [...(tiersByVariant[variant.id] ?? [])].sort((a, b) => a.minQty - b.minQty);
        const draft = drafts[variant.id] ?? { minQty: "", unitPrice: "" };
        return (
          <section key={variant.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold text-ink">{variant.title}</p><p className="text-[11px] text-ink-muted">Regular {CURRENCY_SYMBOL}{Number(variant.salePrice ?? variant.price).toFixed(2)}</p></div>
            {tiers.length ? (
              <table className="mt-3 w-full text-left"><thead className="text-[10.5px] uppercase tracking-wide text-ink-muted"><tr><th className="py-1.5">Min qty</th><th className="py-1.5">Unit price</th><th className="w-10 py-1.5" /></tr></thead>
                <tbody className="divide-y divide-border">{tiers.map((tier) => (
                  <tr key={tier.id}><td className="py-2 text-xs text-ink">{tier.minQty}+</td><td className="py-2 text-xs text-ink">{CURRENCY_SYMBOL}{Number(tier.unitPrice).toFixed(2)}</td>
                    <td className="py-2"><button type="button" onClick={() => void removeTier(variant, tier)} disabled={savingVariantId === variant.id} aria-label="Remove tier" className="flex h-7 w-7 items-center justify-center rounded-md text-danger hover:bg-danger-tint disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button></td></tr>
                ))}</tbody>
              </table>
            ) : <p className="mt-3 text-xs text-ink-muted">No bulk pricing tiers set for this combination.</p>}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-[11px] font-semibold text-ink-secondary">Min qty<input type="number" min="2" value={draft.minQty} onChange={(event) => setDrafts((current) => ({ ...current, [variant.id]: { ...draft, minQty: event.target.value } }))} className="mt-1 h-8 w-20 rounded-md border border-border-strong px-2 text-xs" /></label>
              <label className="text-[11px] font-semibold text-ink-secondary">Unit price ({CURRENCY_SYMBOL})<input type="number" min="0.01" step="0.01" value={draft.unitPrice} onChange={(event) => setDrafts((current) => ({ ...current, [variant.id]: { ...draft, unitPrice: event.target.value } }))} className="mt-1 h-8 w-28 rounded-md border border-border-strong px-2 text-xs" /></label>
              <button type="button" onClick={() => void addTier(variant)} disabled={savingVariantId === variant.id} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50">{savingVariantId === variant.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Add tier</button>
            </div>
          </section>
        );
      })}
      {!variants.length ? <div className="flex items-start gap-3 rounded-md bg-neutral-tint p-4 ring-1 ring-inset ring-border"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" /><p className="text-xs leading-5 text-ink-muted">This product has no saved combinations yet.</p></div> : null}
    </div>
  );
}
