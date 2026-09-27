"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Building2, LoaderCircle, MoreHorizontal, PackageCheck, Pencil, Plus, Search, Tag } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mediaFileUrl } from "@/lib/media";

type Item = { id: number; title: string; slug: string; status: "ACTIVE" | "INACTIVE"; _count: { products: number }; city?: string | null; countryCode?: string; logo?: string | null; logoAlt?: string | null };

export function BrandsSuppliersPage() {
	const params = useSearchParams();
	const tab = params.get("tab") === "suppliers" ? "suppliers" : "brands";
	const [brands, setBrands] = useState<Item[]>([]);
	const [suppliers, setSuppliers] = useState<Item[]>([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");

	useEffect(() => {
		const timer = window.setTimeout(async () => {
			setLoading(true);
			const [brandResponse, supplierResponse] = await Promise.all([
				fetch("/api/catalog/brands"),
				fetch("/api/catalog/suppliers"),
			]);
			const [brandPayload, supplierPayload] = await Promise.all([brandResponse.json(), supplierResponse.json()]);
			const brandRows = Array.isArray(brandPayload) ? brandPayload : Array.isArray(brandPayload.data) ? brandPayload.data : brandPayload.data?.items ?? brandPayload.items ?? [];
			const supplierRows = Array.isArray(supplierPayload) ? supplierPayload : Array.isArray(supplierPayload.data) ? supplierPayload.data : supplierPayload.data?.items ?? supplierPayload.items ?? [];
			setBrands(brandRows);
			setSuppliers(supplierRows);
			setLoading(false);
		}, 0);
		return () => clearTimeout(timer);
	}, []);

	const items = tab === "brands" ? brands : suppliers;
	const shown = useMemo(() => items.filter((item) => !q || `${item.title} ${item.slug} ${item.city ?? ""}`.toLowerCase().includes(q.toLowerCase())), [items, q]);

	async function toggle(item: Item) {
		const next = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
		const endpoint = tab === "brands" ? "brands" : "suppliers";
		await fetch(`/api/catalog/${endpoint}/${item.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: next }),
		});
		if (tab === "brands") setBrands((current) => current.map((row) => row.id === item.id ? { ...row, status: next } : row));
		else setSuppliers((current) => current.map((row) => row.id === item.id ? { ...row, status: next } : row));
	}

	return (
		<div>
			<div className="flex items-start justify-between">
				<div>
					<p className="text-xs text-ink-muted">Catalog</p>
					<h1 className="mt-2 text-[22px] font-semibold text-ink">Brands &amp; suppliers</h1>
					<p className="mt-1 text-[13.5px] text-ink-muted">Manage manufacturers and the companies that supply your catalogue.</p>
				</div>
				<Link href={tab === "brands" ? "/brands/new" : "/suppliers/new"} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white">
					<Plus className="h-4 w-4" />Add {tab === "brands" ? "brand" : "supplier"}
				</Link>
			</div>
			<div className="mt-5 flex border-b border-border">
				<Link href="/brands" className={`px-4 py-3 text-xs font-semibold ${tab === "brands" ? "border-b-2 border-ink text-ink" : "text-ink-muted"}`}>Brands</Link>
				<Link href="/brands?tab=suppliers" className={`px-4 py-3 text-xs font-semibold ${tab === "suppliers" ? "border-b-2 border-ink text-ink" : "text-ink-muted"}`}>Suppliers</Link>
			</div>
			<div className="mt-4 grid gap-3 sm:grid-cols-3">
				<Metric icon={tab === "brands" ? Tag : Building2} label={`Total ${tab}`} value={items.length} />
				<Metric icon={PackageCheck} label="Products assigned" value={items.reduce((total, item) => total + item._count.products, 0)} />
				<Metric icon={Building2} label="Enabled" value={items.filter((item) => item.status === "ACTIVE").length} />
			</div>
			<section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
				<div className="flex items-center justify-between border-b border-border p-4">
					<h2 className="text-[13.5px] font-semibold text-ink">{tab === "brands" ? "Brands" : "Suppliers"} ({shown.length})</h2>
					<label className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
						<input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search by name" className="h-9 w-64 rounded-md border border-border-strong pl-9 pr-3 text-xs outline-none" />
					</label>
				</div>
				<table className="w-full min-w-[650px] text-left">
					<thead className="bg-canvas text-[10.5px] uppercase tracking-wide text-ink-muted">
						<tr>
							<th className="px-4 py-3">ID</th>
							<th className="px-4 py-3">Name</th>
							{tab === "suppliers" ? <th className="px-4 py-3">Location</th> : null}
							<th className="px-4 py-3 text-center">Products</th>
							<th className="px-4 py-3 text-center">Enabled</th>
							<th className="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{loading ? (
							<tr><td colSpan={6} className="h-36"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /></td></tr>
						) : shown.map((item) => (
							<tr key={item.id} className="hover:bg-canvas">
								<td className="px-4 py-3 font-mono text-xs text-ink-muted">{item.id}</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-3">
										{tab === "brands" ? (
											<span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-canvas">
												{item.logo ? <Image src={mediaFileUrl(item.logo)} alt={item.logoAlt || ""} width={32} height={32} unoptimized className="h-full w-full object-contain" /> : <Tag aria-hidden="true" className="h-4 w-4 text-ink-muted" />}
											</span>
										) : null}
										<p className="text-[13px] font-semibold text-ink">{item.title}</p>
									</div>
								</td>
								{tab === "suppliers" ? <td className="px-4 py-3 text-xs text-ink-muted">{[item.city, item.countryCode].filter(Boolean).join(", ") || "—"}</td> : null}
								<td className="px-4 py-3 text-center text-xs font-semibold">{item._count.products}</td>
								<td className="px-4 py-3 text-center">
									<button role="switch" aria-checked={item.status === "ACTIVE"} onClick={() => void toggle(item)} className={`relative h-5 w-9 rounded-full ${item.status === "ACTIVE" ? "bg-ink" : "bg-border-strong"}`}>
										<span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${item.status === "ACTIVE" ? "translate-x-4" : "translate-x-0.5"}`} />
									</button>
								</td>
								<td className="px-4 py-3 text-right">
									<DropdownMenu>
										<DropdownMenuTrigger render={<button className="inline-flex h-8 w-8 items-center justify-center rounded-md"><MoreHorizontal className="h-4 w-4" /></button>}>
											<span className="sr-only">Actions</span>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem render={<Link href={`/${tab}/${item.id}/edit`} />}><Pencil />Edit {tab === "brands" ? "brand" : "supplier"}</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>
		</div>
	);
}
function Metric({icon:Icon,label,value}:{icon:typeof Tag;label:string;value:number}){return <div className="rounded-xl border border-border bg-surface p-4 shadow-card"><Icon className="h-4 w-4 text-ink-muted"/><p className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p><p className="mt-1 text-xl font-semibold text-ink">{value}</p></div>}
