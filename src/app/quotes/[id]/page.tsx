import { notFound } from "next/navigation";
import { QuoteDetail } from "@/components/quotes/quote-detail";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <QuoteDetail id={Number(id)} />;
}
