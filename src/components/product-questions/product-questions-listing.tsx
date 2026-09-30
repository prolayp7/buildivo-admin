"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, LoaderCircle, MessageCircleQuestion, Search, Send, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";

type QuestionStatus = "PENDING" | "PUBLISHED" | "REJECTED";
type Answer = { id: number; answer: string; createdAt: string };
type Question = { id: number; name: string; question: string; status: QuestionStatus; createdAt: string; product: { id: number; title: string }; answers: Answer[] };

function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
type Meta = { page: number; perPage: number; total: number; totalPages: number; summary?: { pendingCount: number } };
const PER_PAGE_OPTIONS = [20, 50, 100] as const;
const fieldClass = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent-strong";
const emptyFilters = { q: "", dateFrom: "", dateTo: "" };
const statusTone: Record<QuestionStatus, string> = { PENDING: "bg-accent-tint text-accent-tint-ink", PUBLISHED: "bg-positive-tint text-positive-tint-ink", REJECTED: "bg-danger-tint text-danger-tint-ink" };

export function ProductQuestionsListing() {
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | QuestionStatus>("PENDING");
  const [filters, setFilters] = useState(emptyFilters), [search, setSearch] = useState(""); // search = debounced filters.q
  const [page, setPage] = useState(1), [perPage, setPerPage] = useState<number>(20), [meta, setMeta] = useState<Meta | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("q", search);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      const response = await fetch(`/api/product-questions?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(apiMessage(payload, "Questions could not be loaded."));
      setItems((payload.data ?? []) as Question[]); setMeta(payload.meta as Meta);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Questions could not be loaded.");
    } finally { setLoading(false); }
  }, [statusFilter, page, perPage, search, filters.dateFrom, filters.dateTo]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(filters.q.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [filters.q]);
  const setFilter = (patch: Partial<typeof emptyFilters>) => { setFilters((current) => ({ ...current, ...patch })); if (!("q" in patch)) setPage(1); };
  const filtered = Boolean(search || filters.dateFrom || filters.dateTo);

  async function publish(question: Question) {
    const answer = (drafts[question.id] ?? "").trim();
    if (!answer) { setError("Write an answer before publishing."); return; }
    setMutatingId(question.id); setError("");
    try {
      const response = await fetch(`/api/product-questions/${question.id}/answer`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer }) });
      if (!response.ok) throw new Error(apiMessage(await response.json().catch(() => ({})), "The answer could not be published."));
      setDrafts((current) => { const next = { ...current }; delete next[question.id]; return next; });
      await load();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "The answer could not be published.");
    } finally { setMutatingId(null); }
  }

  async function reject(question: Question) {
    setMutatingId(question.id); setError("");
    try {
      const response = await fetch(`/api/product-questions/${question.id}/reject`, { method: "PATCH" });
      if (!response.ok) throw new Error(apiMessage(await response.json().catch(() => ({})), "The question could not be rejected."));
      await load();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "The question could not be rejected.");
    } finally { setMutatingId(null); }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/product-questions/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) throw new Error(apiMessage(await response.json().catch(() => ({})), "The question could not be deleted."));
      setDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The question could not be deleted.");
    } finally { setDeleting(false); }
  }

  const pendingCount = meta?.summary?.pendingCount ?? 0;
  const from = meta && meta.total ? (meta.page - 1) * meta.perPage + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.perPage, meta.total) : 0;
  const pageButton = "flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-secondary hover:bg-neutral-tint disabled:opacity-40";

  return (
    <div className="w-full">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Product Q&amp;A</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Answer or reject customer-submitted product questions before they go live.</p>
      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      <div className="mt-5 flex gap-1 border-b border-border">
        {([{ id: "PENDING", label: `Pending${pendingCount ? ` (${pendingCount})` : ""}` }, { id: "PUBLISHED", label: "Published" }, { id: "REJECTED", label: "Rejected" }, { id: "ALL", label: "All" }] as const).map((item) => (
          <button key={item.id} type="button" onClick={() => { setStatusFilter(item.id); setPage(1); }} className={`relative px-3 py-2.5 text-[13px] font-semibold ${statusFilter === item.id ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-ink" : "text-ink-muted hover:text-ink"}`}>{item.label}</button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-card">
        <label className="relative min-w-[240px] max-w-160 flex-1"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><input value={filters.q} onChange={(event) => setFilter({ q: event.target.value })} placeholder="Question, product, answer, customer name or email" className={`${fieldClass} w-full pl-8`} /></label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">From<DatePicker type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(value) => setFilter({ dateFrom: value })} className={`${fieldClass} mt-1 w-36`} /></label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">To<DatePicker type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(value) => setFilter({ dateTo: value })} className={`${fieldClass} mt-1 w-36`} /></label>
        {filtered ? <button type="button" onClick={() => { setFilters(emptyFilters); setSearch(""); setPage(1); }} className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-[13px] font-semibold text-ink-secondary hover:bg-neutral-tint"><X className="h-4 w-4" />Clear</button> : null}
      </div>
      {filtered && meta ? <p className="mt-2 text-xs text-ink-muted">Matching: <strong className="text-ink">{meta.total}</strong> {meta.total === 1 ? "question" : "questions"}</p> : null}
      {loading ? (
        <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-ink-muted" /></div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((question) => (
            <div key={question.id} className="rounded-xl border border-border bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusTone[question.status]}`}>{question.status}</span>
                    <p className="text-[11px] text-ink-muted">{question.product.title} · {question.name} · {new Date(question.createdAt).toLocaleDateString("en-GB")}</p>
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium text-ink">{question.question}</p>
                  {question.answers.length ? (
                    <div className="mt-2 space-y-1.5">{question.answers.map((answer) => <p key={answer.id} className="rounded-md bg-canvas px-3 py-2 text-xs leading-5 text-ink-secondary">{answer.answer}</p>)}</div>
                  ) : question.status === "PENDING" ? (
                    <textarea value={drafts[question.id] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [question.id]: event.target.value }))} rows={2} placeholder="Write an answer to publish alongside this question…" className="mt-2 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent-strong" />
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {question.status === "PENDING" ? (
                    <>
                      <button type="button" onClick={() => void publish(question)} disabled={mutatingId === question.id} aria-label="Publish answer" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-positive-tint-ink hover:bg-positive-tint disabled:opacity-50">
                        {mutatingId === question.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Publish
                      </button>
                      <button type="button" onClick={() => void reject(question)} disabled={mutatingId === question.id} aria-label="Reject question" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-danger-tint-ink hover:bg-danger-tint disabled:opacity-50">
                        <X className="h-3.5 w-3.5" />Reject
                      </button>
                    </>
                  ) : null}
                  <button type="button" onClick={() => setDeleteTarget(question)} aria-label="Delete question" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!items.length ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-card">
              <MessageCircleQuestion className="mx-auto h-6 w-6 text-ink-muted" />
              <p className="mt-3 text-[13px] text-ink-muted">{filtered ? "No questions match these filters." : "No questions in this view."}</p>
            </div>
          ) : null}
          {meta && meta.total ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-ink-muted shadow-card">
              <span>Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{meta.total}</strong></span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">Per page<select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className={fieldClass}>{PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                <span>Page {meta.page} of {Math.max(meta.totalPages, 1)}</span>
                <button type="button" disabled={meta.page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" className={pageButton}><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Next page" className={pageButton}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          ) : null}
        </div>
      )}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete question?</DialogTitle><DialogDescription>This permanently removes the question and any answer.</DialogDescription></DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setDeleteTarget(null)} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button>
            <button type="button" onClick={() => void remove()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-4 text-xs font-semibold text-white disabled:opacity-50">
              {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
