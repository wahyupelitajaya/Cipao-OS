import { NextRequest, NextResponse } from "next/server";

// VERIFY TOKEN: bebas kamu tentukan (nanti disamakan di Meta dashboard)
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

// 1) Verifikasi webhook (Meta akan request GET hub.challenge)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
}

// 2) Event pesan masuk (Meta akan POST ke sini)
export async function POST(req: NextRequest) {
  const payload = await req.json();

  // sementara: log untuk debug (cek di Vercel Logs)
  console.log("WA_WEBHOOK_PAYLOAD:", JSON.stringify(payload));

  return NextResponse.json({ ok: true }, { status: 200 });
}