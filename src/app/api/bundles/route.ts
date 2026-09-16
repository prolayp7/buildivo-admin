import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

async function proxy(request: NextRequest, method: "GET" | "POST") {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  try {
    const query = request.nextUrl.search;
    const response = await fetch(getAdminApiUrl(`admin/bundles${method === "GET" ? query || "?page=1&perPage=100" : ""}`), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: await request.text() } : {}),
      cache: "no-store",
    });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Bundles are unavailable." }, { status: 503 });
  }
}

export function GET(request: NextRequest) { return proxy(request, "GET"); }
export function POST(request: NextRequest) { return proxy(request, "POST"); }
