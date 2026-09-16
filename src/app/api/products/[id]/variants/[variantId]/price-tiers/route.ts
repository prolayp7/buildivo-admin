import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

type Context = { params: Promise<{ id: string; variantId: string }> };

async function proxy(request: NextRequest, context: Context, method: "GET" | "POST") {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const { id, variantId } = await context.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(variantId)) return NextResponse.json({ message: "Invalid variant ID." }, { status: 400 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/products/${id}/variants/${variantId}/price-tiers`), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: await request.text() } : {}),
      cache: "no-store",
    });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Price tiers are unavailable." }, { status: 503 });
  }
}

export function GET(request: NextRequest, context: Context) { return proxy(request, context, "GET"); }
export function POST(request: NextRequest, context: Context) { return proxy(request, context, "POST"); }
