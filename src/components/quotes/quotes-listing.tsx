"use client";

import { CURRENCY_SYMBOL } from "@/lib/currency";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FileQuestion, LoaderCircle } from "lucide-react";
import { collectionFromApi } from "@/lib/api-response";

type QuoteStatus = "NEW" | "REVIEWING" | "QUOTED" | "ACCEPTED" | "DECLINED" | "EXPIRED";
type QuoteRequest = { id: number; uuid: string; companyName: string | null; contactName: string; email: string; status: QuoteStatus; quotedTotal: string | null; createdAt: string; items: { id: number; quantity: number }[] };

function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
const statusTone: Record<QuoteStatus, string> = { NEW: "bg-accent-tint text-accent-tint-ink", REVIEWING: "bg-accent-tint text-accent-tint-ink", QUOTED: "bg-positive-tint text-positive-tint-ink", ACCEPTED: "bg-positive-tint text-positive-tint-ink", DECLINED: "bg-danger-tint text-danger-tint-ink", EXPIRED: "bg-neutral-tint text-ink-muted" };

export function QuotesListing() {
  const [items, setItems] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | QuoteStatus>("NEW");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: "1", perPage: "100" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const response = await fetch(`/api/quotes?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(apiMessage(payload, "Quote requests could not be loaded."));
      setItems(collectionFromApi<QuoteRequest>(payload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Quote requests could not be loaded.");
    } finally { setLoading(false); }
  }, [statusFilter]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const newCount = items.filter((item) => item.status === "NEW").length;

  return (
    <div className="w-full">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Quote requests</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Trade &amp; bulk-order Request-a-Quote submissions from the storefront.</p>
      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      <div className="mt-5 flex flex-wrap gap-1 border-b border-border">
        {([{ id: "NEW", label: `New${newCount ? ` (${newCount})` : ""}` }, { id: "REVIEWING", label: "Reviewing" }, { id: "QUOTED", label: "Quoted" }, { id: "ACCEPTED", label: "Accepted" }, { id: "DECLINED", label: "Declined" }, { id: "EXPIRED", label: "Expired" }, { id: "ALL", label: "All" }] as const).map((item) => (
          <button key={item.id} type="button" onClick={() => setStatusFilter(item.id)} className={`relative px-3 py-2.5 text-[13px] font-semibold ${statusFilter === item.id ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-ink" : "text-ink-muted hover:text-ink"}`}>{item.label}</button>
        ))}
      </div>
      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-ink-muted">
            <tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Quoted total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="h-36"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr>
            ) : items.map((quote) => (
              <tr key={quote.id}>
                <td className="px-4 py-3"><p className="text-[13px] font-semibold text-ink">{quote.contactName}</p><p className="mt-0.5 text-[11px] text-ink-muted">{quote.companyName ? `${quote.companyName} · ` : ""}{quote.email}</p></td>
                <td className="px-4 py-3 text-xs text-ink-muted">{quote.items.length} line{quote.items.length === 1 ? "" : "s"}</td>
                <td className="px-4 py-3 text-xs font-semibold text-ink">{quote.quotedTotal ? `${CURRENCY_SYMBOL}${Number(quote.quotedTotal).toFixed(2)}` : "—"}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusTone[quote.status]}`}>{quote.status}</span></td>
                <td className="px-4 py-3 text-xs text-ink-muted">{new Date(quote.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 text-right"><Link href={`/quotes/${quote.id}`} className="text-xs font-semibold text-ink-secondary">Review</Link></td>
              </tr>
            ))}
            {!loading && !items.length ? <tr><td colSpan={6} className="p-10 text-center text-[13px] text-ink-muted"><FileQuestion className="mx-auto mb-2 h-6 w-6 text-ink-muted" />No quote requests in this view.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
