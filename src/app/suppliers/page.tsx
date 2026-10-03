import { Suspense } from "react";
import { BrandsSuppliersPage } from "@/components/brands/brands-suppliers-page";

export default function SuppliersPage() {
  return <Suspense fallback={<div className="min-h-80 animate-pulse rounded-xl bg-neutral-tint" />}><BrandsSuppliersPage /></Suspense>;
}