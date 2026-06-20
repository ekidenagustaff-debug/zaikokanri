import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== process.env.AUTH_PASSWORD) {
    return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
  }
  await setSession();
  return NextResponse.json({ ok: true });
}
