import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

type Context = { params: Promise<{ id: string; variantId: string; tierId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const { id, variantId, tierId } = await context.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(variantId) || !/^\d+$/.test(tierId)) return NextResponse.json({ message: "Invalid price tier ID." }, { status: 400 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/products/${id}/variants/${variantId}/price-tiers/${tierId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Price tiers are unavailable." }, { status: 503 });
  }
}
