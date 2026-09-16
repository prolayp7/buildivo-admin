import { notFound } from "next/navigation";
import { BundleForm } from "@/components/bundles/bundle-form";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <BundleForm id={Number(id)} />;
}
