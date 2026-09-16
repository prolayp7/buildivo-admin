"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, Menu as MenuIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IconPicker } from "@/components/ui/icon-picker";
import { collectionFromApi } from "@/lib/api-response";

type Status = "ACTIVE" | "INACTIVE";
type MenuItem = { id: number; parentId: number | null; label: string; href: string | null; icon: string | null; categoryId: number | null; sortOrder: number; status: Status };
type Menu = { id: number; name: string; slug: string; location: "HEADER" | "FOOTER"; status: Status; items: MenuItem[] };
const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }

export function MenusListing() {
  const [menus, setMenus] = useState<Menu[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [itemEditing, setItemEditing] = useState<MenuItem | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null), [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch("/api/menus", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(apiMessage(payload, "Menus could not be loaded.")); const list = collectionFromApi<Menu>(payload); setMenus(list); setSelectedId((current) => current && list.some((menu) => menu.id === current) ? current : (list[0]?.id ?? null)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Menus could not be loaded."); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const selected = menus.find((menu) => menu.id === selectedId) ?? null;
  // API orders by parentId ascending, which pushes NULL (top-level) parents
  // after their own children - rebuild tree order so each parent is
  // immediately followed by its children (only one level deep, see the
  // "Parent item" select below).
  const orderedItems = selected ? selected.items.filter((item) => !item.parentId).flatMap((parent) => [parent, ...selected.items.filter((item) => item.parentId === parent.id)]) : [];

  async function removeItem() { if (!deleteTarget || !selected) return; setDeleting(true); try { const response = await fetch(`/api/menus/${selected.id}/items/${deleteTarget.id}`, { method: "DELETE" }); if (!response.ok && response.status !== 204) throw new Error(apiMessage(await response.json().catch(() => ({})), "Menu item could not be deleted.")); setDeleteTarget(null); await load(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Menu item could not be deleted."); } finally { setDeleting(false); } }

  return <div className="w-full"><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Menus</h1><p className="mt-1 text-[13.5px] text-ink-muted">Header and footer navigation.</p>
  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">{loading ? <div className="p-6 text-center"><LoaderCircle className="mx-auto h-5 w-5 animate-spin text-ink-muted" /></div> : <ul className="divide-y divide-border">{menus.map((menu) => <li key={menu.id}><button type="button" onClick={() => setSelectedId(menu.id)} className={`flex w-full items-center gap-2.5 p-3.5 text-left ${selectedId === menu.id ? "bg-canvas" : "hover:bg-canvas/60"}`}><MenuIcon className="h-4 w-4 shrink-0 text-ink-muted" /><span className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{menu.name}</p><p className="mt-0.5 text-[10.5px] text-ink-muted">{menu.location} · {menu.items.length} items</p></span></button></li>)}{!menus.length ? <li className="p-6 text-center text-[13px] text-ink-muted">No menus yet.</li> : null}</ul>}</div>
    </div>
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">{!selected ? <p className="p-8 text-center text-[13px] text-ink-muted">Select or create a menu to manage its items.</p> : <>
      <div className="flex items-center justify-between border-b border-border p-4"><div><h2 className="text-[14px] font-semibold text-ink">{selected.name}</h2><p className="mt-0.5 text-xs text-ink-muted">{selected.location.toLowerCase()} navigation</p></div><button type="button" onClick={() => setItemEditing("new")} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-xs font-semibold text-white hover:bg-[#1d2939]"><Plus className="h-4 w-4" />Add item</button></div>
      <div className="divide-y divide-border">{orderedItems.map((item) => <div key={item.id} className="flex items-center gap-3 p-3.5" style={{ paddingLeft: item.parentId ? "2.5rem" : "0.875rem" }}><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-ink">{item.label}</p><p className="mt-0.5 truncate text-xs text-ink-muted">{item.categoryId ? `Category #${item.categoryId}` : item.href ?? "—"}</p></div><span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${item.status === "ACTIVE" ? "bg-positive-tint text-positive-tint-ink" : "bg-neutral-tint text-ink-muted"}`}>{item.status}</span><button type="button" onClick={() => setItemEditing(item)} aria-label={`Edit ${item.label}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.label}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button></div>)}{!selected.items.length ? <p className="p-8 text-center text-[13px] text-ink-muted">No items in this menu yet.</p> : null}</div>
    </>}</section>
  </div>
  {itemEditing && selected ? <ItemDialog menu={selected} item={itemEditing === "new" ? null : itemEditing} onClose={() => setItemEditing(null)} onSaved={load} /> : null}
  <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Delete menu item?</DialogTitle><DialogDescription>{deleteTarget ? `"${deleteTarget.label}" and any child items will be removed.` : ""}</DialogDescription></DialogHeader><DialogFooter><button type="button" onClick={() => setDeleteTarget(null)} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => void removeItem()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-4 text-xs font-semibold text-white disabled:opacity-50">{deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function ItemDialog({ menu, item, onClose, onSaved }: { menu: Menu; item: MenuItem | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [label, setLabel] = useState(item?.label ?? ""), [href, setHref] = useState(item?.href ?? ""), [icon, setIcon] = useState(item?.icon ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(item?.categoryId ?? null);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryResults, setCategoryResults] = useState<{ id: number; title: string }[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [parentId, setParentId] = useState(item?.parentId != null ? String(item.parentId) : "");
  const [status, setStatus] = useState<Status>(item?.status ?? "ACTIVE"), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const parentOptions = menu.items.filter((candidate) => candidate.id !== item?.id && !candidate.parentId);

  // Editing an item that already has a category: resolve its title once for
  // display, rather than loading every category up front just to label one.
  useEffect(() => {
    if (!item?.categoryId) return;
    let cancelled = false;
    fetch(`/api/catalog/categories/${item.categoryId}`).then((response) => response.json()).then((payload) => {
      const category = payload.data ?? payload;
      if (!cancelled && category?.title) setCategoryLabel(category.title);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [item?.categoryId]);

  useEffect(() => {
    const query = categorySearch.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (query.length < 2) { setCategoryResults([]); return; }
      setCategoryLoading(true);
      try {
        const response = await fetch(`/api/catalog/categories?q=${encodeURIComponent(query)}&perPage=8`, { signal: controller.signal });
        const payload = await response.json();
        if (response.ok) setCategoryResults(collectionFromApi<{ id: number; title: string }>(payload));
      } catch (searchError) {
        if (!(searchError instanceof DOMException && searchError.name === "AbortError")) setCategoryResults([]);
      } finally { setCategoryLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [categorySearch]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const body = { label: label.trim(), href: href.trim() || undefined, icon: icon.trim() || undefined, categoryId: categoryId ?? undefined, parentId: parentId ? Number(parentId) : undefined, status };
    try { const response = await fetch(item ? `/api/menus/${menu.id}/items/${item.id}` : `/api/menus/${menu.id}/items`, { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Menu item could not be saved.")); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Menu item could not be saved."); } finally { setSaving(false); }
  }
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>{item ? "Edit menu item" : "Add menu item"}</SheetTitle><SheetDescription>{menu.name}</SheetDescription></SheetHeader><form onSubmit={(event) => void submit(event)} className="flex flex-1 flex-col"><div className="flex-1">{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}<label className="text-[13px] font-semibold text-ink-secondary">Label<input required value={label} onChange={(event) => setLabel(event.target.value)} className={inputClass} /></label>
  <div className="mt-4"><p className="text-[13px] font-semibold text-ink-secondary">Category</p>
    {categoryId ? (
      <div className="mt-2 flex items-center justify-between rounded-md border border-border-strong bg-canvas px-3 py-2.5">
        <span className="text-[13px] font-semibold text-ink">{categoryLabel || `Category #${categoryId}`}</span>
        <button type="button" onClick={() => { setCategoryId(null); setCategoryLabel(""); }} aria-label="Clear category" className="text-ink-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button>
      </div>
    ) : (
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Type to search categories…" className={`${inputClass} mt-0 pl-9`} />
        {categoryLoading ? <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-muted" /> : null}
        {categoryResults.length ? (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-card">
            {categoryResults.map((category) => (
              <button key={category.id} type="button" onClick={() => { setCategoryId(category.id); setCategoryLabel(category.title); setCategorySearch(""); setCategoryResults([]); }} className="flex w-full items-center px-3 py-2.5 text-left text-[13px] text-ink hover:bg-neutral-tint">
                {category.title}
              </button>
            ))}
          </div>
        ) : categorySearch.trim().length >= 2 && !categoryLoading ? <p className="mt-2 text-xs text-ink-muted">No matching categories.</p> : null}
      </div>
    )}
  </div>
  <label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Link URL {categoryId ? "(unused while a category is selected)" : "(optional)"}<input value={href} onChange={(event) => setHref(event.target.value)} placeholder="e.g. /deals" disabled={Boolean(categoryId)} className={`${inputClass} disabled:opacity-50`} /></label>
  <label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Icon (optional)<IconPicker value={icon} onChange={setIcon} /><span className="mt-1 block text-[10.5px] font-normal text-ink-muted">Leave blank on a category-linked item to use that category&rsquo;s own icon.</span></label><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Parent item (optional)<select value={parentId} onChange={(event) => setParentId(event.target.value)} className={inputClass}><option value="">Top level</option>{parentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div><SheetFooter><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving || !label.trim()} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></SheetFooter></form></SheetContent></Sheet>;
}
