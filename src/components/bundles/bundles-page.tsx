"use client";

import { CURRENCY_SYMBOL } from "@/lib/currency";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, Eye, LoaderCircle, MoreHorizontal, PackagePlus, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type BundleStatus = "ACTIVE" | "INACTIVE";
type Bundle = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  bundlePrice: string;
  startsAt: string | null;
  endsAt: string | null;
  status: BundleStatus;
  items: { productVariantId: number; quantity: number; productVariant: { title: string; price: string; salePrice: string | null; stockQty: number; product: { id: number; title: string } } }[];
};
type Meta = { page: number; perPage: number; total: number; totalPages: number };

const emptyMeta: Meta = { page: 1, perPage: 20, total: 0, totalPages: 0 };
function collection(payload: unknown): Bundle[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as { data?: unknown; items?: unknown };
  if (Array.isArray(record.data)) return record.data as Bundle[];
  if (Array.isArray(record.items)) return record.items as Bundle[];
  if (record.data && typeof record.data === "object" && "items" in record.data && Array.isArray((record.data as { items: unknown }).items)) return (record.data as { items: Bundle[] }).items;
  return [];
}
function pageMeta(payload: unknown): Meta {
  if (!payload || typeof payload !== "object") return emptyMeta;
  const record = payload as { meta?: Meta; data?: { meta?: Meta } };
  return record.meta ?? record.data?.meta ?? emptyMeta;
}
function apiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload && typeof (payload as { message?: unknown }).message === "string") return (payload as { message: string }).message;
  return fallback;
}
type Schedule = "LIVE" | "SCHEDULED" | "EXPIRED";
const PER_PAGE_OPTIONS = [20, 50, 100] as const;
// Mirrors the API's schedule filter: where "now" falls in the startsAt/endsAt window.
function scheduleOf(bundle: Bundle): Schedule {
  const now = Date.now();
  if (bundle.startsAt && new Date(bundle.startsAt).getTime() > now) return "SCHEDULED";
  if (bundle.endsAt && new Date(bundle.endsAt).getTime() < now) return "EXPIRED";
  return "LIVE";
}
function money(value: number | string) { return `${CURRENCY_SYMBOL}${Number(value).toFixed(2)}`; }
function dateText(value: string | null) { return value ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }
function cell(value: unknown) { return `"${String(value ?? "").replace(/^[\s]*[=+\-@]/, "'$&").replaceAll('"', '""')}"`; }

export function BundlesPage() {
  const [items, setItems] = useState<Bundle[]>([]);
  const [meta, setMeta] = useState<Meta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BundleStatus | "">("");
  const [schedule, setSchedule] = useState<Schedule | "">("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(20);
  const [viewing, setViewing] = useState<Bundle | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useCallback((requestedPage = page, size = perPage) => {
    const params = new URLSearchParams({ page: String(requestedPage), perPage: String(size) });
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (schedule) params.set("schedule", schedule);
    return params;
  }, [page, perPage, search, status, schedule]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/bundles?${query()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "Bundles could not be loaded."));
      setItems(collection(payload));
      setMeta(pageMeta(payload));
      setSelected(new Set());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Bundles could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const filtersActive = Boolean(searchInput || status || schedule);
  const from = meta.total ? (meta.page - 1) * meta.perPage + 1 : 0;
  const to = Math.min(meta.page * meta.perPage, meta.total);
  const allSelected = items.length > 0 && items.every((bundle) => selected.has(bundle.id));

  function toggleOne(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulkAction(action: "ACTIVE" | "INACTIVE" | "DELETE", confirmed = false) {
    const ids = [...selected];
    if (!ids.length || mutating) return;
    if (action === "DELETE" && !confirmed) { setDeleteDialogOpen(true); return; }
    setMutating(true);
    setError("");
    setNotice("");
    try {
      for (const id of ids) {
        const response = await fetch(`/api/bundles/${id}`, {
          method: action === "DELETE" ? "DELETE" : "PATCH",
          ...(action === "DELETE" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action }) }),
        });
        if (!response.ok && !(action === "DELETE" && response.status === 204)) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(apiMessage(payload, `Bundle ${id} could not be ${action === "DELETE" ? "deleted" : "updated"}.`));
        }
      }
      setSelected(new Set());
      setDeleteDialogOpen(false);
      setNotice(action === "DELETE" ? `${ids.length} ${ids.length === 1 ? "bundle" : "bundles"} deleted.` : `${ids.length} ${ids.length === 1 ? "bundle" : "bundles"} ${action === "ACTIVE" ? "enabled" : "disabled"}.`);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The selected bundles could not be updated.");
    } finally {
      setMutating(false);
    }
  }

  async function updateOneStatus(bundle: Bundle, nextStatus: BundleStatus) {
    setMutating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/bundles/${bundle.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "Bundle status could not be updated."));
      setNotice(`Bundle ${nextStatus === "ACTIVE" ? "enabled" : "disabled"}.`);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Bundle status could not be updated.");
    } finally {
      setMutating(false);
    }
  }

  async function duplicateBundle(bundle: Bundle) {
    setMutating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${bundle.title} Copy`,
          slug: `${bundle.slug}-copy-${Date.now().toString(36)}`,
          description: bundle.description ?? undefined,
          bundlePrice: Number(bundle.bundlePrice),
          status: "INACTIVE",
          items: bundle.items.map((item) => ({ productVariantId: item.productVariantId, quantity: item.quantity })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiMessage(payload, "Bundle could not be duplicated."));
      setNotice(`Created inactive copy of “${bundle.title}”.`);
      await load();
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Bundle could not be duplicated.");
    } finally {
      setMutating(false);
    }
  }

  async function deleteOne(bundle: Bundle) {
    setMutating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/bundles/${bundle.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) throw new Error(apiMessage(await response.json().catch(() => ({})), "Bundle could not be deleted."));
      setNotice(`Bundle “${bundle.title}” deleted.`);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Bundle could not be deleted.");
    } finally {
      setMutating(false);
    }
  }

  async function exportBundles() {
    setExporting(true);
    setError("");
    try {
      const firstResponse = await fetch(`/api/bundles?${query(1, 100)}`, { cache: "no-store" });
      const firstPayload = await firstResponse.json().catch(() => ({}));
      if (!firstResponse.ok) throw new Error(apiMessage(firstPayload, "Bundles could not be exported."));
      const all = collection(firstPayload);
      const totalPages = pageMeta(firstPayload).totalPages;
      for (let requestedPage = 2; requestedPage <= totalPages; requestedPage++) {
        const response = await fetch(`/api/bundles?${query(requestedPage, 100)}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiMessage(payload, "Bundles could not be exported."));
        all.push(...collection(payload));
      }
      const rows = [
        ["ID", "Title", "Slug", "Description", "Items", "Bundle price", "Status", "Starts", "Ends"],
        ...all.map((bundle) => [bundle.id, bundle.title, bundle.slug, bundle.description ?? "", bundle.items.map((item) => `${item.productVariant.product.title} x ${item.quantity}`).join("; "), bundle.bundlePrice, bundle.status, bundle.startsAt ?? "", bundle.endsAt ?? ""]),
      ];
      const content = rows.map((row) => row.map(cell).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bundles-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "The bundle export failed.");
    } finally {
      setExporting(false);
    }
  }

  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs text-ink-muted">Marketing</p><h1 className="mt-2 text-[22px] font-semibold text-ink">Bundles</h1><p className="mt-1 text-[13.5px] text-ink-muted">Fixed-price product groupings sold together below the sum of their parts.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button><button type="button" onClick={() => void exportBundles()} disabled={exporting || !meta.total} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Download className="h-4 w-4" />{exporting ? "Exporting…" : "Export bundles"}</button><Link href="/bundles/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white"><Plus className="h-4 w-4" />Add bundle</Link></div>
    </div>

    <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
        <div><h2 className="text-[13.5px] font-semibold text-ink">Bundles ({meta.total})</h2><p className="mt-0.5 text-[11.5px] text-ink-muted">Select rows to enable, disable or delete bundles.</p></div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:ml-auto lg:max-w-2xl">
          <label className="relative flex-1"><span className="sr-only">Search bundles</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Bundle name, slug or product" className="h-9 w-full rounded-md border border-border-strong pl-9 pr-3 text-xs" /></label>
          <select value={status} onChange={(event) => { setStatus(event.target.value as BundleStatus | ""); setPage(1); }} aria-label="Filter by bundle status" className="h-9 rounded-md border border-border-strong bg-surface px-3 text-xs text-ink-secondary"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
          <select value={schedule} onChange={(event) => { setSchedule(event.target.value as Schedule | ""); setPage(1); }} aria-label="Filter by schedule" className="h-9 rounded-md border border-border-strong bg-surface px-3 text-xs text-ink-secondary"><option value="">Any schedule</option><option value="LIVE">Within dates</option><option value="SCHEDULED">Starts later</option><option value="EXPIRED">Ended</option></select>
          {filtersActive ? <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setStatus(""); setSchedule(""); setPage(1); }} className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><X className="h-4 w-4" />Clear</button> : null}
        </div>
      </div>
      {notice ? <div role="status" className="border-b border-positive-tint-border bg-positive-tint px-4 py-2.5 text-xs text-positive-tint-ink">{notice}</div> : null}
      {error ? <div role="alert" className="flex items-start gap-2 border-b border-danger-tint-border bg-danger-tint px-4 py-3 text-xs text-danger-tint-ink"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      {selected.size > 0 ? <div className="flex flex-col gap-2 bg-ink px-4 py-3 text-white sm:flex-row sm:items-center"><span className="text-xs font-semibold">{selected.size} selected</span><select aria-label="Bulk bundle action" disabled={mutating} defaultValue="" onChange={(event) => { const action = event.target.value; event.target.value = ""; if (action === "ACTIVE" || action === "INACTIVE" || action === "DELETE") void applyBulkAction(action); }} className="h-9 rounded-md border border-white/20 bg-white/10 px-2 text-xs sm:ml-auto"><option value="" className="text-ink">Choose action…</option><option value="ACTIVE" className="text-ink">Enable</option><option value="INACTIVE" className="text-ink">Disable</option><option value="DELETE" className="text-ink">Delete</option></select><button type="button" disabled={mutating} onClick={() => setSelected(new Set())} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"><X className="h-3.5 w-3.5" />Clear selection</button></div> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-ink-muted"><tr><th className="w-12 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((bundle) => bundle.id)))} aria-label="Select all bundles on this page" /></th><th className="px-4 py-3">Bundle</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-border">
            {loading ? <tr><td colSpan={6} className="h-36"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></td></tr>
              : !items.length ? <tr><td colSpan={6} className="p-10 text-center text-[13px] text-ink-muted"><PackagePlus className="mx-auto mb-2 h-6 w-6" />{filtersActive ? "No bundles match these filters." : "No bundles yet."}</td></tr>
                : items.map((bundle) => <tr key={bundle.id} className="hover:bg-canvas/70"><td className="px-4 py-3"><input type="checkbox" checked={selected.has(bundle.id)} onChange={() => toggleOne(bundle.id)} aria-label={`Select ${bundle.title}`} /></td><td className="px-4 py-3"><button type="button" onClick={() => setViewing(bundle)} title="Quick view" className="text-left text-[13px] font-semibold text-ink hover:text-accent-strong hover:underline">{bundle.title}</button><p className="mt-0.5 font-mono text-[10.5px] text-ink-muted">{bundle.slug}</p></td><td className="px-4 py-3 text-xs text-ink-muted">{bundle.items.length}</td><td className="px-4 py-3 text-xs font-semibold text-ink">{CURRENCY_SYMBOL}{Number(bundle.bundlePrice).toFixed(2)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10.5px] font-semibold ${bundle.status === "ACTIVE" ? "bg-positive-tint text-positive-tint-ink" : "bg-neutral-tint text-ink-muted"}`}>{bundle.status === "ACTIVE" ? "Active" : "Inactive"}</span>{scheduleOf(bundle) !== "LIVE" ? <span className="ml-1.5 rounded-full bg-accent-tint px-2 py-1 text-[10.5px] font-semibold text-accent-tint-ink">{scheduleOf(bundle) === "SCHEDULED" ? "Starts later" : "Ended"}</span> : null}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => setViewing(bundle)} aria-label={`Quick view ${bundle.title}`} title="Quick view" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><Eye className="h-4 w-4" /></button><BundleRowActions bundle={bundle} disabled={mutating} onDuplicate={() => void duplicateBundle(bundle)} onStatus={(next) => void updateOneStatus(bundle, next)} onDelete={() => void deleteOne(bundle)} /></div></td></tr>)}
          </tbody>
        </table>
      </div>
      {meta.total ? <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-ink-muted"><span>Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{meta.total}</strong></span><div className="flex items-center gap-3"><label className="flex items-center gap-2">Rows per page<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className="h-9 rounded-md border border-border-strong bg-surface px-2 text-xs text-ink">{PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><span>Page {meta.page} of {Math.max(meta.totalPages, 1)}</span><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></footer> : null}
    </section>
    <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!mutating) setDeleteDialogOpen(open); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete selected bundles?</DialogTitle>
          <DialogDescription>{selected.size} {selected.size === 1 ? "bundle will" : "bundles will"} be removed from the storefront. This action can’t be undone from this screen.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" disabled={mutating} onClick={() => setDeleteDialogOpen(false)} className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint disabled:opacity-50">Cancel</button>
          <button type="button" disabled={mutating || selected.size === 0} onClick={() => void applyBulkAction("DELETE", true)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-danger px-3 text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-50">{mutating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{mutating ? "Deleting…" : "Delete bundles"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {viewing ? <BundleQuickView bundle={viewing} onClose={() => setViewing(null)} /> : null}
  </div>;
}

function BundleQuickView({ bundle, onClose }: { bundle: Bundle; onClose: () => void }) {
  // What the items would cost bought separately, at their current (sale) prices.
  const partsTotal = bundle.items.reduce((sum, item) => sum + Number(item.productVariant.salePrice ?? item.productVariant.price) * item.quantity, 0);
  const saving = partsTotal - Number(bundle.bundlePrice);
  const available = Math.min(...bundle.items.map((item) => Math.floor(item.productVariant.stockQty / item.quantity)));
  const schedule = scheduleOf(bundle);
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">
    <SheetHeader><SheetTitle>{bundle.title}</SheetTitle><SheetDescription className="font-mono text-[11px]">{bundle.slug}</SheetDescription></SheetHeader>
    <div className="space-y-5 px-4 pb-6">
      <div className="flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-1 text-[10.5px] font-semibold ${bundle.status === "ACTIVE" ? "bg-positive-tint text-positive-tint-ink" : "bg-neutral-tint text-ink-muted"}`}>{bundle.status === "ACTIVE" ? "Active" : "Inactive"}</span>{bundle.startsAt || bundle.endsAt ? <span className="rounded-full bg-neutral-tint px-2 py-1 text-[10.5px] font-semibold text-ink-muted">{schedule === "LIVE" ? "Within dates" : schedule === "SCHEDULED" ? "Starts later" : "Ended"}</span> : null}</div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-canvas p-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">Bundle price</p><p className="mt-1 text-[15px] font-semibold text-ink">{money(bundle.bundlePrice)}</p></div>
        <div className="rounded-lg bg-canvas p-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">Bought separately</p><p className="mt-1 text-[15px] font-semibold text-ink">{money(partsTotal)}</p></div>
        <div className="rounded-lg bg-canvas p-3"><p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">Customer saves</p><p className={`mt-1 text-[15px] font-semibold ${saving > 0 ? "text-positive-tint-ink" : "text-danger-tint-ink"}`}>{money(saving)}{partsTotal > 0 ? <span className="ml-1 text-[11px] font-medium">({Math.round((saving / partsTotal) * 100)}%)</span> : null}</p></div>
      </div>
      {saving <= 0 ? <p className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink"><AlertTriangle className="h-4 w-4 shrink-0" />The bundle costs the same as or more than buying the items separately.</p> : null}
      <div>
        <h3 className="text-[13px] font-semibold text-ink">Items ({bundle.items.length})</h3>
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border">{bundle.items.map((item) => { const unit = Number(item.productVariant.salePrice ?? item.productVariant.price); return <li key={item.productVariantId} className="flex items-start justify-between gap-3 p-3"><div className="min-w-0"><Link href={`/products/${item.productVariant.product.id}`} className="text-[13px] font-medium text-ink hover:text-accent-strong hover:underline">{item.productVariant.product.title}</Link><p className="mt-0.5 text-[11.5px] text-ink-muted">{item.productVariant.title} · <span className={item.productVariant.stockQty < item.quantity ? "font-semibold text-danger-tint-ink" : ""}>{item.productVariant.stockQty} in stock</span></p></div><div className="shrink-0 text-right text-xs"><p className="font-semibold text-ink">{item.quantity} × {money(unit)}</p><p className="mt-0.5 text-ink-muted">{money(unit * item.quantity)}</p></div></li>; })}</ul>
        <p className="mt-2 text-xs text-ink-muted">Stock covers <strong className="text-ink">{Math.max(available, 0)}</strong> {available === 1 ? "bundle" : "bundles"}.</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-ink-muted">Starts</dt><dd className="mt-0.5 font-medium text-ink">{dateText(bundle.startsAt)}</dd></div><div><dt className="text-ink-muted">Ends</dt><dd className="mt-0.5 font-medium text-ink">{dateText(bundle.endsAt)}</dd></div></dl>
      {bundle.description ? <div><h3 className="text-[13px] font-semibold text-ink">Description</h3><p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink-secondary">{bundle.description}</p></div> : null}
      <Link href={`/bundles/${bundle.id}/edit`} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white"><Pencil className="h-4 w-4" />Edit bundle</Link>
    </div>
  </SheetContent></Sheet>;
}

function BundleRowActions({ bundle, disabled, onDuplicate, onStatus, onDelete }: { bundle: Bundle; disabled: boolean; onDuplicate: () => void; onStatus: (status: BundleStatus) => void; onDelete: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function toggleMenu() {
    if (open) {
      setOpen(false);
      setConfirming(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 192;
    const menuHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPosition({
      top: Math.max(8, spaceBelow >= menuHeight + 8 ? rect.bottom + 4 : rect.top - menuHeight - 4),
      left: Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth)),
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const closeFromPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirming(false);
        buttonRef.current?.focus();
      }
    };
    const closeFromViewportChange = () => { setOpen(false); setConfirming(false); };
    document.addEventListener("pointerdown", closeFromPointer);
    document.addEventListener("keydown", closeFromKeyboard);
    window.addEventListener("resize", closeFromViewportChange);
    window.addEventListener("scroll", closeFromViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", closeFromPointer);
      document.removeEventListener("keydown", closeFromKeyboard);
      window.removeEventListener("resize", closeFromViewportChange);
      window.removeEventListener("scroll", closeFromViewportChange, true);
    };
  }, [open]);

  const menu = open ? createPortal(
    <div ref={menuRef} role="menu" aria-label={`Actions for ${bundle.title}`} style={{ top: position.top, left: position.left }} className="fixed z-[70] w-48 rounded-lg border border-border bg-surface p-1.5 shadow-panel">
      {confirming ? <div className="p-2"><p className="text-xs font-medium leading-5 text-danger-tint-ink">Delete this bundle? It will be removed from the storefront.</p><div className="mt-2 flex gap-1.5"><button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-border px-2 py-1.5 text-[10.5px] font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => { setOpen(false); onDelete(); }} className="rounded-md bg-danger px-2 py-1.5 text-[10.5px] font-semibold text-white">Delete</button></div></div> : <>
        <Link href={`/bundles/${bundle.id}/edit`} role="menuitem" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-neutral-tint"><Pencil className="h-4 w-4" />Edit bundle</Link>
        <button type="button" role="menuitem" disabled={disabled} onClick={() => { setOpen(false); onDuplicate(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><Copy className="h-4 w-4" />Duplicate bundle</button>
        <button type="button" role="menuitem" disabled={disabled} onClick={() => { setOpen(false); onStatus(bundle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-ink-secondary hover:bg-neutral-tint disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{bundle.status === "ACTIVE" ? "Disable bundle" : "Enable bundle"}</button>
        <button type="button" role="menuitem" disabled={disabled} onClick={() => setConfirming(true)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-danger-tint-ink hover:bg-danger-tint disabled:opacity-50"><Trash2 className="h-4 w-4" />Delete bundle</button>
      </>}
    </div>,
    document.body,
  ) : null;

  return <><button ref={buttonRef} type="button" disabled={disabled} onClick={toggleMenu} aria-label={`Actions for ${bundle.title}`} aria-haspopup="menu" aria-expanded={open} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink disabled:opacity-50"><MoreHorizontal className="h-4 w-4" /></button>{menu}</>;
}