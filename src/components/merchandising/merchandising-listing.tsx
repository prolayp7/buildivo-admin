"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { AlertTriangle, BadgeCheck, Image as ImageIcon, LoaderCircle, Megaphone, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { collectionFromApi } from "@/lib/api-response";
import { mediaFileUrl, type MediaItem } from "@/lib/media";
import { ProductPicker, type PickedProduct } from "./product-picker";

type Status = "ACTIVE" | "INACTIVE";
type BadgePlacement = "TRUST_STRIP" | "HERO_FLOATING";
type TrustBadge = { id: number; label: string; caption: string | null; icon: string | null; placement: BadgePlacement; sortOrder: number; status: Status };
type LinkType = "PRODUCT" | "CATEGORY" | "BRAND" | "CUSTOM_URL";
type HeroSlide = {
  id: number; eyebrow: string | null; heading: string; highlight: string | null; ending: string | null;
  description: string | null; overlayBadge: string | null; specification: string | null;
  image: string | null; imageAlt: string | null; imageFit: string | null; imagePosition: string | null;
  ctaLabel: string | null; linkType: LinkType; productId: number | null; categoryId: number | null; customUrl: string | null;
  product: { id: number; title: string; slug: string; image: string | null; price: number | null } | null; category: { id: number; title: string; slug: string } | null;
  sortOrder: number; status: Status;
};
type Banner = { id: number; title: string; slug: string; linkType: LinkType; productId: number | null; categoryId: number | null; brandId: number | null; customUrl: string | null; position: string; displayOrder: number; status: Status };
type SectionType = "NEWLY_ADDED" | "FEATURED" | "BEST_SELLER" | "TOP_RATED" | "MANUAL";
type FeaturedSection = { id: number; title: string; slug: string; sectionType: SectionType; categoryId: number | null; sortOrder: number; status: Status; manualProducts: { productId: number }[] };
const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function statusBadge(status: Status) { return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${status === "ACTIVE" ? "bg-positive-tint text-positive-tint-ink" : "bg-neutral-tint text-ink-muted"}`}>{status}</span>; }

export function MerchandisingListing() {
  const [tab, setTab] = useState<"hero" | "banners" | "sections">("hero");
  const [slides, setSlides] = useState<HeroSlide[]>([]), [badges, setBadges] = useState<TrustBadge[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]), [sections, setSections] = useState<FeaturedSection[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [slideEditing, setSlideEditing] = useState<HeroSlide | "new" | null>(null);
  const [bannerEditing, setBannerEditing] = useState<Banner | "new" | null>(null);
  const [sectionEditing, setSectionEditing] = useState<FeaturedSection | "new" | null>(null);
  const [badgeEditing, setBadgeEditing] = useState<TrustBadge | "new-strip" | "new-floating" | null>(null);
  const [deleteSlide, setDeleteSlide] = useState<HeroSlide | null>(null), [deleteBanner, setDeleteBanner] = useState<Banner | null>(null), [deleteSection, setDeleteSection] = useState<FeaturedSection | null>(null);
  const [deleteBadge, setDeleteBadge] = useState<TrustBadge | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [slidesRes, badgesRes, bannersRes, sectionsRes] = await Promise.all([fetch("/api/hero-slides", { cache: "no-store" }), fetch("/api/hero-trust-badges", { cache: "no-store" }), fetch("/api/banners", { cache: "no-store" }), fetch("/api/featured-sections", { cache: "no-store" })]);
      const slidesPayload = await slidesRes.json(); if (!slidesRes.ok) throw new Error(apiMessage(slidesPayload, "Hero slides could not be loaded.")); setSlides(collectionFromApi<HeroSlide>(slidesPayload));
      const badgesPayload = await badgesRes.json().catch(() => ({})); if (badgesRes.ok) setBadges(collectionFromApi<TrustBadge>(badgesPayload));
      const bannersPayload = await bannersRes.json().catch(() => ({})); if (bannersRes.ok) setBanners(collectionFromApi<Banner>(bannersPayload));
      const sectionsPayload = await sectionsRes.json().catch(() => ({})); if (sectionsRes.ok) setSections(collectionFromApi<FeaturedSection>(sectionsPayload));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Merchandising data could not be loaded."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function removeSlide() { if (!deleteSlide) return; setDeleting(true); try { const response = await fetch(`/api/hero-slides/${deleteSlide.id}`, { method: "DELETE" }); if (!response.ok && response.status !== 204) throw new Error(apiMessage(await response.json().catch(() => ({})), "Slide could not be deleted.")); setDeleteSlide(null); await load(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Slide could not be deleted."); } finally { setDeleting(false); } }
  async function removeBanner() { if (!deleteBanner) return; setDeleting(true); try { const response = await fetch(`/api/banners/${deleteBanner.id}`, { method: "DELETE" }); if (!response.ok && response.status !== 204) throw new Error(apiMessage(await response.json().catch(() => ({})), "Banner could not be deleted.")); setDeleteBanner(null); await load(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Banner could not be deleted."); } finally { setDeleting(false); } }
  async function removeSection() { if (!deleteSection) return; setDeleting(true); try { const response = await fetch(`/api/featured-sections/${deleteSection.id}`, { method: "DELETE" }); if (!response.ok && response.status !== 204) throw new Error(apiMessage(await response.json().catch(() => ({})), "Featured section could not be deleted.")); setDeleteSection(null); await load(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Featured section could not be deleted."); } finally { setDeleting(false); } }
  async function removeBadge() { if (!deleteBadge) return; setDeleting(true); try { const response = await fetch(`/api/hero-trust-badges/${deleteBadge.id}`, { method: "DELETE" }); if (!response.ok && response.status !== 204) throw new Error(apiMessage(await response.json().catch(() => ({})), "Trust badge could not be deleted.")); setDeleteBadge(null); await load(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Trust badge could not be deleted."); } finally { setDeleting(false); } }
  const stripBadges = badges.filter((badge) => badge.placement === "TRUST_STRIP");
  const floatingBadge = badges.find((badge) => badge.placement === "HERO_FLOATING") ?? null;

  return <div className="w-full"><h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Merchandising</h1><p className="mt-1 text-[13.5px] text-ink-muted">Homepage hero, promotional banners and featured product rails.</p>
  {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="mt-5 flex gap-1 border-b border-border">{([{ id: "hero", label: "Hero" }, { id: "banners", label: "Banners" }, { id: "sections", label: "Featured sections" }] as const).map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`relative px-3 py-2.5 text-[13px] font-semibold ${tab === item.id ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-ink" : "text-ink-muted hover:text-ink"}`}>{item.label}</button>)}</div>
  {loading ? <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-ink-muted" /></div> : tab === "hero" ? <>
    <div className="mt-4 flex justify-end"><button type="button" onClick={() => setSlideEditing("new")} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-xs font-semibold text-white hover:bg-[#1d2939]"><Plus className="h-4 w-4" />Add slide</button></div>
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="divide-y divide-border">{slides.map((slide) => { const linkSummary = slide.linkType === "PRODUCT" ? (slide.product ? `Product: ${slide.product.title}` : "Product: (removed)") : slide.linkType === "CATEGORY" ? (slide.category ? `Category: ${slide.category.title}` : "Category: (removed)") : slide.linkType === "CUSTOM_URL" ? (slide.customUrl ?? "—") : "—"; return <div key={slide.id} className="flex items-center gap-3 p-4">{slide.image ? <NextImage unoptimized src={slide.image.startsWith("/uploads/") ? mediaFileUrl(slide.image) : slide.image} width={56} height={36} alt="" className="h-9 w-14 shrink-0 rounded-md object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><ImageIcon className="h-4 w-4" /></span>}<div className="min-w-0 flex-1">{slide.eyebrow ? <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">{slide.eyebrow}</p> : null}<p className="text-[13px] font-semibold text-ink">{slide.heading} {slide.highlight} {slide.ending}</p><p className="mt-0.5 truncate text-xs text-ink-muted">{linkSummary}{slide.ctaLabel ? ` · CTA: ${slide.ctaLabel}` : ""}</p></div>{statusBadge(slide.status)}<button type="button" onClick={() => setSlideEditing(slide)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit</button><button type="button" onClick={() => setDeleteSlide(slide)} aria-label={`Delete ${slide.heading}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button></div>; })}{!slides.length ? <p className="p-6 text-center text-[13px] text-ink-muted">No hero slides yet.</p> : null}</div></section>
    <h2 className="mt-6 text-[14px] font-semibold text-ink">Floating hero badge</h2>
    <p className="mt-1 text-xs text-ink-muted">The small card floating over the hero image, e.g. &quot;Sub-2hr Click &amp; Collect&quot;.</p>
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card">{floatingBadge ? <div className="flex items-center gap-3 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><BadgeCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-ink">{floatingBadge.label}</p>{floatingBadge.caption ? <p className="mt-0.5 truncate text-xs text-ink-muted">{floatingBadge.caption}</p> : null}</div>{statusBadge(floatingBadge.status)}<button type="button" onClick={() => setBadgeEditing(floatingBadge)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit</button><button type="button" onClick={() => setDeleteBadge(floatingBadge)} aria-label={`Delete ${floatingBadge.label}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button></div> : <div className="flex items-center justify-between gap-3 p-4"><p className="text-[13px] text-ink-muted">No floating badge set.</p><button type="button" onClick={() => setBadgeEditing("new-floating")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Plus className="h-3.5 w-3.5" />Add</button></div>}</section>

    <div className="mt-6 flex items-center justify-between"><h2 className="text-[14px] font-semibold text-ink">Trust strip badges</h2><button type="button" onClick={() => setBadgeEditing("new-strip")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Plus className="h-3.5 w-3.5" />Add badge</button></div>
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="divide-y divide-border">{stripBadges.map((badge) => <div key={badge.id} className="flex items-center gap-3 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><BadgeCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-ink">{badge.label}</p>{badge.caption ? <p className="mt-0.5 truncate text-xs text-ink-muted">{badge.caption}</p> : null}</div>{statusBadge(badge.status)}<button type="button" onClick={() => setBadgeEditing(badge)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit</button><button type="button" onClick={() => setDeleteBadge(badge)} aria-label={`Delete ${badge.label}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button></div>)}{!stripBadges.length ? <p className="p-6 text-center text-[13px] text-ink-muted">No trust badges yet.</p> : null}</div></section>
  </> : tab === "banners" ? <>
    <div className="mt-4 flex justify-end"><button type="button" onClick={() => setBannerEditing("new")} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-xs font-semibold text-white hover:bg-[#1d2939]"><Plus className="h-4 w-4" />Add banner</button></div>
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="divide-y divide-border">{banners.map((banner) => <div key={banner.id} className="flex items-center gap-3 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Megaphone className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-ink">{banner.title}</p><p className="mt-0.5 text-xs text-ink-muted">{banner.position} · {banner.linkType.replace("_", " ").toLowerCase()}</p></div>{statusBadge(banner.status)}<button type="button" onClick={() => setBannerEditing(banner)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit</button><button type="button" onClick={() => setDeleteBanner(banner)} aria-label={`Delete ${banner.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button></div>)}{!banners.length ? <p className="p-6 text-center text-[13px] text-ink-muted">No banners yet.</p> : null}</div></section>
  </> : <>
    <div className="mt-4 flex justify-end"><button type="button" onClick={() => setSectionEditing("new")} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-xs font-semibold text-white hover:bg-[#1d2939]"><Plus className="h-4 w-4" />Add section</button></div>
    <section className="mt-3 overflow-hidden rounded-xl border border-border bg-surface shadow-card"><div className="divide-y divide-border">{sections.map((section) => <div key={section.id} className="flex items-center gap-3 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Sparkles className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-ink">{section.title}</p><p className="mt-0.5 text-xs text-ink-muted">{section.sectionType.replace("_", " ").toLowerCase()}{section.sectionType === "MANUAL" ? ` · ${section.manualProducts.length} products` : ""}</p></div>{statusBadge(section.status)}<button type="button" onClick={() => setSectionEditing(section)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit</button><button type="button" onClick={() => setDeleteSection(section)} aria-label={`Delete ${section.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-tint hover:text-danger-tint-ink"><Trash2 className="h-4 w-4" /></button></div>)}{!sections.length ? <p className="p-6 text-center text-[13px] text-ink-muted">No featured sections yet.</p> : null}</div></section>
  </>}
  {slideEditing ? <SlideDialog slide={slideEditing === "new" ? null : slideEditing} onClose={() => setSlideEditing(null)} onSaved={load} /> : null}
  {bannerEditing ? <BannerDialog banner={bannerEditing === "new" ? null : bannerEditing} onClose={() => setBannerEditing(null)} onSaved={load} /> : null}
  {sectionEditing ? <SectionDialog section={sectionEditing === "new" ? null : sectionEditing} onClose={() => setSectionEditing(null)} onSaved={load} /> : null}
  {badgeEditing ? <BadgeDialog badge={typeof badgeEditing === "string" ? null : badgeEditing} defaultPlacement={badgeEditing === "new-floating" ? "HERO_FLOATING" : "TRUST_STRIP"} nextSortOrder={badges.length} onClose={() => setBadgeEditing(null)} onSaved={load} /> : null}
  <Dialog open={Boolean(deleteSlide)} onOpenChange={(open) => { if (!open) setDeleteSlide(null); }}><DialogContent><DialogHeader><DialogTitle>Delete hero slide?</DialogTitle><DialogDescription>{deleteSlide ? `"${deleteSlide.heading}" will be removed from the homepage.` : ""}</DialogDescription></DialogHeader><DialogFooter><button type="button" onClick={() => setDeleteSlide(null)} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => void removeSlide()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-4 text-xs font-semibold text-white disabled:opacity-50">{deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</button></DialogFooter></DialogContent></Dialog>
  <Dialog open={Boolean(deleteBanner)} onOpenChange={(open) => { if (!open) setDeleteBanner(null); }}><DialogContent><DialogHeader><DialogTitle>Delete banner?</DialogTitle><DialogDescription>{deleteBanner ? `"${deleteBanner.title}" will be removed.` : ""}</DialogDescription></DialogHeader><DialogFooter><button type="button" onClick={() => setDeleteBanner(null)} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => void removeBanner()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-4 text-xs font-semibold text-white disabled:opacity-50">{deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</button></DialogFooter></DialogContent></Dialog>
  <Dialog open={Boolean(deleteSection)} onOpenChange={(open) => { if (!open) setDeleteSection(null); }}><DialogContent><DialogHeader><DialogTitle>Delete featured section?</DialogTitle><DialogDescription>{deleteSection ? `"${deleteSection.title}" will be removed from the storefront.` : ""}</DialogDescription></DialogHeader><DialogFooter><button type="button" onClick={() => setDeleteSection(null)} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => void removeSection()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-4 text-xs font-semibold text-white disabled:opacity-50">{deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</button></DialogFooter></DialogContent></Dialog>
  <Dialog open={Boolean(deleteBadge)} onOpenChange={(open) => { if (!open) setDeleteBadge(null); }}><DialogContent><DialogHeader><DialogTitle>Delete trust badge?</DialogTitle><DialogDescription>{deleteBadge ? `"${deleteBadge.label}" will be removed.` : ""}</DialogDescription></DialogHeader><DialogFooter><button type="button" onClick={() => setDeleteBadge(null)} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="button" onClick={() => void removeBadge()} disabled={deleting} className="inline-flex h-9 items-center gap-2 rounded-md bg-danger px-4 text-xs font-semibold text-white disabled:opacity-50">{deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function BadgeDialog({ badge, defaultPlacement, nextSortOrder, onClose, onSaved }: { badge: TrustBadge | null; defaultPlacement: BadgePlacement; nextSortOrder: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const placement = badge?.placement ?? defaultPlacement;
  const [label, setLabel] = useState(badge?.label ?? ""), [caption, setCaption] = useState(badge?.caption ?? "");
  const [icon, setIcon] = useState(badge?.icon ?? "");
  const [status, setStatus] = useState<Status>(badge?.status ?? "ACTIVE"), [saving, setSaving] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!label.trim()) return; setSaving(true); setError("");
    const body = { label: label.trim(), caption: caption.trim() || undefined, icon: icon.trim() || undefined, placement, status, sortOrder: badge?.sortOrder ?? nextSortOrder };
    try { const response = await fetch(badge ? `/api/hero-trust-badges/${badge.id}` : "/api/hero-trust-badges", { method: badge ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Trust badge could not be saved.")); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Trust badge could not be saved."); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{badge ? "Edit trust badge" : placement === "HERO_FLOATING" ? "Add floating hero badge" : "Add trust strip badge"}</DialogTitle><DialogDescription>{placement === "HERO_FLOATING" ? "Shown floating over the hero image." : "Shown in the homepage trust strip."}</DialogDescription></DialogHeader><form onSubmit={(event) => void submit(event)}>{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}<label className="block text-[13px] font-semibold text-ink-secondary">Label<input required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Sub-2hr Click & Collect" className={inputClass} /></label><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Caption (optional second line)<input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="e.g. Available across 240 branches" className={inputClass} /></label><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Material Symbols icon name (optional)<input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="e.g. bolt" className={inputClass} /></label><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><DialogFooter className="mt-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form></DialogContent></Dialog>;
}

function SlideDialog({ slide, onClose, onSaved }: { slide: HeroSlide | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [eyebrow, setEyebrow] = useState(slide?.eyebrow ?? "");
  const [heading, setHeading] = useState(slide?.heading ?? ""), [highlight, setHighlight] = useState(slide?.highlight ?? ""), [ending, setEnding] = useState(slide?.ending ?? "");
  const [description, setDescription] = useState(slide?.description ?? "");
  const [overlayBadge, setOverlayBadge] = useState(slide?.overlayBadge ?? ""), [specification, setSpecification] = useState(slide?.specification ?? "");
  const image = slide?.image ?? null;
  const [imageFile, setImageFile] = useState<File | null>(null), [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState(slide?.imageAlt ?? ""), [imageFit, setImageFit] = useState<"cover" | "contain">((slide?.imageFit as "cover" | "contain") ?? "cover");
  const [imagePosition, setImagePosition] = useState(slide?.imagePosition ?? "center");
  const [ctaLabel, setCtaLabel] = useState(slide?.ctaLabel ?? "");
  const [linkType, setLinkType] = useState<LinkType>(slide?.linkType ?? "CUSTOM_URL");
  const [product, setProduct] = useState<PickedProduct | null>(slide?.product ? { id: slide.product.id, title: slide.product.title, slug: slide.product.slug, image: slide.product.image, price: slide.product.price } : null);
  const [categoryId, setCategoryId] = useState(slide?.categoryId ? String(slide.categoryId) : "");
  const [customUrl, setCustomUrl] = useState(slide?.customUrl ?? "");
  const [categories, setCategories] = useState<{ id: number; title: string }[]>([]);
  const [status, setStatus] = useState<Status>(slide?.status ?? "ACTIVE"), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linkType !== "CATEGORY" || categories.length) return;
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/catalog/categories?page=1&perPage=100");
      const payload = await response.json().catch(() => ({}));
      setCategories(collectionFromApi<{ id: number; title: string }>(payload));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [linkType, categories.length]);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Hero images must be JPG, PNG or WebP files."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Hero images must be 5 MB or smaller."); return; }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file); setImagePreview(URL.createObjectURL(file)); setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (linkType === "PRODUCT" && !product) throw new Error("Choose a product to link this slide to.");
      if (linkType === "CATEGORY" && !categoryId) throw new Error("Choose a category to link this slide to.");
      if (linkType === "CUSTOM_URL" && !customUrl.trim()) throw new Error("Enter a URL for this slide to link to.");
      let nextImage = image;
      if (imageFile) {
        const formData = new FormData();
        formData.set("file", imageFile); formData.set("ownerType", "LIBRARY"); formData.set("ownerId", "0");
        formData.set("collection", "hero-slides"); formData.set("altText", imageAlt.trim() || heading.trim() || "Hero slide");
        const uploadResponse = await fetch("/api/media", { method: "POST", body: formData });
        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) throw new Error(apiMessage(uploadPayload, "The image could not be uploaded."));
        nextImage = ((uploadPayload.data ?? uploadPayload) as MediaItem).url;
      }
      const body = {
        eyebrow: eyebrow.trim() || undefined, heading: heading.trim(), highlight: highlight.trim() || undefined, ending: ending.trim() || undefined,
        description: description.trim() || undefined, overlayBadge: overlayBadge.trim() || undefined, specification: specification.trim() || undefined,
        image: nextImage ?? undefined, imageAlt: imageAlt.trim() || undefined, imageFit, imagePosition: imagePosition.trim() || undefined,
        ctaLabel: ctaLabel.trim() || undefined, linkType,
        productId: linkType === "PRODUCT" ? product?.id : undefined,
        categoryId: linkType === "CATEGORY" ? Number(categoryId) : undefined,
        customUrl: linkType === "CUSTOM_URL" ? customUrl.trim() : undefined,
        status,
      };
      const response = await fetch(slide ? `/api/hero-slides/${slide.id}` : "/api/hero-slides", { method: slide ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Hero slide could not be saved.")); onClose(); await onSaved();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Hero slide could not be saved."); } finally { setSaving(false); }
  }

  const previewSrc = imagePreview ?? (image ? (image.startsWith("/uploads/") ? mediaFileUrl(image) : image) : null);
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="top-0 right-0 left-auto flex h-full max-w-10xl translate-x-0 translate-y-0 flex-col rounded-none data-open:slide-in-from-right data-open:zoom-in-100 data-closed:slide-out-to-right data-closed:zoom-out-100"><DialogHeader><DialogTitle>{slide ? "Edit hero slide" : "Add hero slide"}</DialogTitle><DialogDescription>Shown in the homepage hero carousel.</DialogDescription></DialogHeader><form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="flex-1 space-y-4 overflow-y-auto pr-1">
  <div className="flex items-center gap-3"><div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border-strong bg-canvas">{previewSrc ? <NextImage unoptimized src={previewSrc} width={96} height={64} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-ink-faint" />}</div><div><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="hidden" /><button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Upload className="h-3.5 w-3.5" />{imageFile ? "Replace selection" : image ? "Replace image" : "Choose image"}</button><p className="mt-1.5 text-[10.5px] text-ink-muted">JPG, PNG or WebP, up to 5 MB. Recommended 1920×960px (2:1).</p></div></div>
  <label className="block text-[13px] font-semibold text-ink-secondary">Image ALT text<input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the photo for screen readers" className={inputClass} /></label>
  <div className="grid grid-cols-2 gap-3"><label className="text-[13px] font-semibold text-ink-secondary">Image focal point<input value={imagePosition} onChange={(event) => setImagePosition(event.target.value)} placeholder="e.g. 68% center" className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Image fit<select value={imageFit} onChange={(event) => setImageFit(event.target.value as "cover" | "contain")} className={inputClass}><option value="cover">Cover (full-bleed photography)</option><option value="contain">Contain (isolated product cutout)</option></select></label></div>
  <label className="block text-[13px] font-semibold text-ink-secondary">Eyebrow tag<input value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} placeholder="e.g. Cordless Power for the Jobsite" className={inputClass} /></label>
  <div className="grid grid-cols-3 gap-3"><label className="text-[13px] font-semibold text-ink-secondary">Heading<input required value={heading} onChange={(event) => setHeading(event.target.value)} placeholder="Built for the" className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Highlight (accent word)<input value={highlight} onChange={(event) => setHighlight(event.target.value)} placeholder="Demands" className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Ending<input value={ending} onChange={(event) => setEnding(event.target.value)} placeholder="of Real Work." className={inputClass} /></label></div>
  <label className="block text-[13px] font-semibold text-ink-secondary">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={`${inputClass} h-auto resize-y py-2`} /></label>
  <label className="block text-[13px] font-semibold text-ink-secondary">CTA button label<input value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Shop Power Tools" className={inputClass} /></label>

  <div className="rounded-lg border border-border bg-surface p-3">
    <label className="block text-[13px] font-semibold text-ink-secondary">Links to<select value={linkType} onChange={(event) => { setLinkType(event.target.value as LinkType); setProduct(null); setCategoryId(""); setCustomUrl(""); }} className={`${inputClass} mt-2`}><option value="PRODUCT">A product</option><option value="CATEGORY">A category</option><option value="CUSTOM_URL">A custom URL</option></select></label>
    {linkType === "PRODUCT" ? (
      <div className="mt-3">
        <ProductPicker value={product} onChange={setProduct} />
        <p className="mt-1.5 text-[10.5px] text-ink-muted">The overlay card&apos;s title, reference and price are pulled live from this product - they update automatically if its price changes.</p>
      </div>
    ) : linkType === "CATEGORY" ? (
      <label className="mt-3 block text-[13px] font-semibold text-ink-secondary">Category<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}><option value="">Select a category…</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
    ) : (
      <label className="mt-3 block text-[13px] font-semibold text-ink-secondary">URL<input required value={customUrl} onChange={(event) => setCustomUrl(event.target.value)} placeholder="/deals" className={inputClass} /></label>
    )}
  </div>

  <div className="grid grid-cols-2 gap-3"><label className="text-[13px] font-semibold text-ink-secondary">Overlay badge<input value={overlayBadge} onChange={(event) => setOverlayBadge(event.target.value)} placeholder="e.g. Job Site Spotlight" className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Overlay spec line{linkType === "PRODUCT" ? " (optional override)" : ""}<input value={specification} onChange={(event) => setSpecification(event.target.value)} placeholder={linkType === "PRODUCT" ? "Auto-filled from the product if left blank" : "e.g. 12,000 RPM · Kickback Brake"} className={inputClass} /></label></div>
  <p className="text-[10.5px] text-ink-muted">The floating product-info card (badge, reference, price) only appears on the storefront when a product is linked.</p>

  <label className="block text-[13px] font-semibold text-ink-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
  </div>
  <DialogFooter className="mt-4 rounded-none"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form></DialogContent></Dialog>;
}

function BannerDialog({ banner, onClose, onSaved }: { banner: Banner | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(banner?.title ?? ""), [slug, setSlug] = useState(banner?.slug ?? "");
  const [linkType, setLinkType] = useState<LinkType>(banner?.linkType ?? "CUSTOM_URL");
  const [target, setTarget] = useState(banner ? String(banner.productId ?? banner.categoryId ?? banner.brandId ?? banner.customUrl ?? "") : "");
  const [position, setPosition] = useState(banner?.position ?? ""), [displayOrder, setDisplayOrder] = useState(banner?.displayOrder != null ? String(banner.displayOrder) : "0");
  const [status, setStatus] = useState<Status>(banner?.status ?? "ACTIVE"), [saving, setSaving] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const body: Record<string, unknown> = { title: title.trim(), slug: slug.trim(), linkType, position: position.trim(), displayOrder: Number(displayOrder), status };
    if (linkType === "PRODUCT") body.productId = Number(target); else if (linkType === "CATEGORY") body.categoryId = Number(target); else if (linkType === "BRAND") body.brandId = Number(target); else body.customUrl = target.trim();
    try { const response = await fetch(banner ? `/api/banners/${banner.id}` : "/api/banners", { method: banner ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Banner could not be saved.")); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Banner could not be saved."); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{banner ? "Edit banner" : "Add banner"}</DialogTitle><DialogDescription>Promotional banner shown in a storefront position.</DialogDescription></DialogHeader><form onSubmit={(event) => void submit(event)}>{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}<div className="grid grid-cols-2 gap-3"><label className="text-[13px] font-semibold text-ink-secondary">Title<input required value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Slug<input required value={slug} onChange={(event) => setSlug(event.target.value)} className={`${inputClass} font-mono`} /></label></div><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[13px] font-semibold text-ink-secondary">Link type<select value={linkType} onChange={(event) => setLinkType(event.target.value as LinkType)} className={inputClass}><option value="PRODUCT">Product</option><option value="CATEGORY">Category</option><option value="BRAND">Brand</option><option value="CUSTOM_URL">Custom URL</option></select></label><label className="text-[13px] font-semibold text-ink-secondary">{linkType === "CUSTOM_URL" ? "URL" : `${linkType.charAt(0)}${linkType.slice(1).toLowerCase()} ID`}<input required value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass} /></label></div><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[13px] font-semibold text-ink-secondary">Position<input required value={position} onChange={(event) => setPosition(event.target.value)} placeholder="e.g. homepage-mid" className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Display order<input type="number" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} className={inputClass} /></label></div><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><DialogFooter className="mt-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form></DialogContent></Dialog>;
}

function SectionDialog({ section, onClose, onSaved }: { section: FeaturedSection | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(section?.title ?? ""), [slug, setSlug] = useState(section?.slug ?? "");
  const [sectionType, setSectionType] = useState<SectionType>(section?.sectionType ?? "FEATURED");
  const [manualIds, setManualIds] = useState(section?.manualProducts.map((product) => product.productId).join(", ") ?? "");
  const [status, setStatus] = useState<Status>(section?.status ?? "ACTIVE"), [saving, setSaving] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const body: Record<string, unknown> = { title: title.trim(), slug: slug.trim(), sectionType, status };
    if (sectionType === "MANUAL") body.manualProductIds = manualIds.split(",").map((value) => value.trim()).filter(Boolean).map(Number);
    try { const response = await fetch(section ? `/api/featured-sections/${section.id}` : "/api/featured-sections", { method: section ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Featured section could not be saved.")); onClose(); await onSaved(); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Featured section could not be saved."); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{section ? "Edit featured section" : "Add featured section"}</DialogTitle><DialogDescription>A product rail shown on the storefront.</DialogDescription></DialogHeader><form onSubmit={(event) => void submit(event)}>{error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}<div className="grid grid-cols-2 gap-3"><label className="text-[13px] font-semibold text-ink-secondary">Title<input required value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label><label className="text-[13px] font-semibold text-ink-secondary">Slug<input required value={slug} onChange={(event) => setSlug(event.target.value)} className={`${inputClass} font-mono`} /></label></div><label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Section type<select value={sectionType} onChange={(event) => setSectionType(event.target.value as SectionType)} className={inputClass}><option value="NEWLY_ADDED">Newly added</option><option value="FEATURED">Featured</option><option value="BEST_SELLER">Best seller</option><option value="TOP_RATED">Top rated</option><option value="MANUAL">Manual selection</option></select></label>{sectionType === "MANUAL" ? <label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Product IDs (comma-separated)<input value={manualIds} onChange={(event) => setManualIds(event.target.value)} placeholder="e.g. 12, 45, 78" className={inputClass} /></label> : null}<label className="mt-4 block text-[13px] font-semibold text-ink-secondary">Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className={inputClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><DialogFooter className="mt-4"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter></form></DialogContent></Dialog>;
}
