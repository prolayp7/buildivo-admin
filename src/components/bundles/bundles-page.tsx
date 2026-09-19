"use client";

import { CURRENCY_SYMBOL } from "@/lib/currency";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, PackagePlus, Plus, Search } from "lucide-react";

type Bundle = { id: number; title: string; slug: string; bundlePrice: string; status: "ACTIVE" | "INACTIVE"; items: { id: number }[] };

export function BundlesPage() {
  const [items, setItems] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch("/api/bundles?page=1&perPage=100", { cache: "no-store" });
      const payload = await response.json();
      setItems((payload.data?.items ?? payload.items ?? []) as Bundle[]);
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const shown = useMemo(() => items.filter((item) => item.title.toLowerCase().includes(q.toLowerCase())), [items, q]);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ink-muted">Marketing</p>
          <h1 className="mt-2 text-[22px] font-semibold text-ink">Bundles</h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">Fixed-price product groupings sold together below the sum of their parts.</p>
        </div>
        <Link href="/bundles/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white"><Plus className="h-4 w-4" />Add bundle</Link>
      </div>
      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-[13.5px] font-semibold text-ink">Bundles ({shown.length})</h2>
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search bundles" className="h-9 w-64 rounded-md border border-border-strong pl-9 pr-3 text-xs" /></label>
        </div>
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-ink-muted"><tr><th className="px-4 py-3">Bundle</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="h-36"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr>
            ) : shown.map((bundle) => (
              <tr key={bundle.id}>
                <td className="px-4 py-3"><p className="text-[13px] font-semibold text-ink">{bundle.title}</p><p className="mt-0.5 font-mono text-[10.5px] text-ink-muted">{bundle.slug}</p></td>
                <td className="px-4 py-3 text-xs text-ink-muted">{bundle.items.length}</td>
                <td className="px-4 py-3 text-xs font-semibold text-ink">{CURRENCY_SYMBOL}{Number(bundle.bundlePrice).toFixed(2)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10.5px] font-semibold ${bundle.status === "ACTIVE" ? "bg-success-tint text-success" : "bg-neutral-tint text-ink-muted"}`}>{bundle.status === "ACTIVE" ? "Enabled" : "Disabled"}</span></td>
                <td className="px-4 py-3 text-right"><Link href={`/bundles/${bundle.id}/edit`} className="text-xs font-semibold text-ink-secondary">Edit</Link></td>
              </tr>
            ))}
            {!loading && !shown.length ? <tr><td colSpan={5} className="p-10 text-center text-[13px] text-ink-muted"><PackagePlus className="mx-auto mb-2 h-6 w-6 text-ink-muted" />No bundles yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
