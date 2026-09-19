"use client";

import { CURRENCY_SYMBOL } from "@/lib/currency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, LoaderCircle, Save } from "lucide-react";

type QuoteStatus = "NEW" | "REVIEWING" | "QUOTED" | "ACCEPTED" | "DECLINED" | "EXPIRED";
type QuoteItem = { id: number; quantity: number; quotedUnitPrice: string | null; productVariant: { id: number; title: string; price: string; salePrice: string | null; product: { id: number; title: string; slug: string } } };
type QuoteRequest = { id: number; uuid: string; companyName: string | null; contactName: string; email: string; phone: string | null; message: string | null; status: QuoteStatus; quotedTotal: string | null; adminNote: string | null; createdAt: string; respondedAt: string | null; items: QuoteItem[]; user: { id: number; email: string; firstName: string; lastName: string } | null };

const input = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none focus:border-accent-strong";
const label = "text-[13px] font-semibold text-ink-secondary";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }

export function QuoteDetail({ id }: { id: number }) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [status, setStatus] = useState<QuoteStatus>("NEW");
  const [quotedTotal, setQuotedTotal] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [itemPrices, setItemPrices] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/quotes/${id}`, { cache: "no-store" });
      const payload = await response.json();
      const data = payload.data ?? payload;
      if (!response.ok) throw new Error(apiMessage(payload, "The quote request could not be loaded."));
      setQuote(data as QuoteRequest);
      setStatus(data.status);
      setQuotedTotal(data.quotedTotal ? String(data.quotedTotal) : "");
      setAdminNote(data.adminNote ?? "");
      setItemPrices(Object.fromEntries((data.items as QuoteItem[]).map((item) => [item.id, item.quotedUnitPrice ? String(item.quotedUnitPrice) : String(item.productVariant.salePrice ?? item.productVariant.price)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The quote request could not be loaded.");
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function submit() {
    setSaving(true); setError("");
    try {
      const body = {
        status,
        quotedTotal: quotedTotal ? Number(quotedTotal) : undefined,
        adminNote: adminNote || undefined,
        items: quote?.items.map((item) => ({ id: item.id, quotedUnitPrice: Number(itemPrices[item.id] ?? 0) })),
      };
      const response = await fetch(`/api/quotes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "The quote could not be saved."));
      router.push("/quotes");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The quote could not be saved.");
    } finally { setSaving(false); }
  }

  if (loading) return <LoaderCircle className="mx-auto mt-32 h-6 w-6 animate-spin text-ink-muted" />;
  if (!quote) return <p className="mt-10 text-center text-[13px] text-ink-muted">{error || "Quote request not found."}</p>;

  const itemsTotal = quote.items.reduce((sum, item) => sum + Number(itemPrices[item.id] ?? 0) * item.quantity, 0);

  return (
    <div className="w-full pb-20">
      <p className="text-xs text-ink-muted">Sales / Quote requests</p>
      <h1 className="mt-2 text-[22px] font-semibold text-ink">{quote.contactName}</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">{quote.companyName ? `${quote.companyName} · ` : ""}{quote.email}{quote.phone ? ` · ${quote.phone}` : ""} · submitted {new Date(quote.createdAt).toLocaleDateString("en-GB")}</p>
      {error ? <div role="alert" className="mt-4 flex gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink"><AlertTriangle className="h-4 w-4" />{error}</div> : null}

      {quote.message ? <section className="mt-5 rounded-xl border border-border bg-surface p-4 shadow-card"><h2 className="text-xs font-semibold text-ink-secondary">Customer message</h2><p className="mt-2 text-[13px] leading-6 text-ink">{quote.message}</p></section> : null}

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <div className="border-b border-border p-4"><h2 className="text-[13.5px] font-semibold text-ink">Requested items</h2></div>
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-ink-muted"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">List price</th><th className="px-4 py-3">Quoted unit price ({CURRENCY_SYMBOL})</th></tr></thead>
          <tbody className="divide-y divide-border">
            {quote.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3"><p className="text-[13px] font-semibold text-ink">{item.productVariant.product.title}</p><p className="mt-0.5 text-[11px] text-ink-muted">{item.productVariant.title}</p></td>
                <td className="px-4 py-3 text-xs text-ink-muted">{item.quantity}</td>
                <td className="px-4 py-3 text-xs text-ink-muted">{CURRENCY_SYMBOL}{Number(item.productVariant.salePrice ?? item.productVariant.price).toFixed(2)}</td>
                <td className="px-4 py-3"><input type="number" min="0" step="0.01" value={itemPrices[item.id] ?? ""} onChange={(event) => setItemPrices((current) => ({ ...current, [item.id]: event.target.value }))} className="h-9 w-32 rounded-md border border-border-strong px-2.5 text-xs" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-border px-4 py-3 text-right text-[13px] font-semibold text-ink">Items total: {CURRENCY_SYMBOL}{itemsTotal.toFixed(2)}</p>
      </section>

      <section className="mt-4 space-y-5 rounded-xl border border-border bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Response</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={label}>Status<select value={status} onChange={(event) => setStatus(event.target.value as QuoteStatus)} className={input}><option value="NEW">New</option><option value="REVIEWING">Reviewing</option><option value="QUOTED">Quoted</option><option value="ACCEPTED">Accepted</option><option value="DECLINED">Declined</option><option value="EXPIRED">Expired</option></select></label>
          <label className={label}>Quoted total ({CURRENCY_SYMBOL})<input type="number" min="0" step="0.01" value={quotedTotal} onChange={(event) => setQuotedTotal(event.target.value)} placeholder={itemsTotal.toFixed(2)} className={input} /></label>
        </div>
        <label className={`${label} block`}>Internal note<textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={3} className={`${input} h-auto py-3`} /></label>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-between border-t border-border bg-surface/95 px-4 py-3 lg:left-64">
        <Link href="/quotes" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-xs font-semibold"><ArrowLeft className="h-4 w-4" />Back</Link>
        <button type="button" onClick={() => void submit()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save response</button>
      </div>
    </div>
  );
}
